# Data Model — Crepe Orders

**Storage**: Supabase Postgres 15+
**Migrations dir**: `supabase/migrations/`

## Visão geral

```
events (1) ──< orders (1) ──< order_transitions
events (1) ──< flavors (M) ──< flavor_ingredients >── (M) ingredients
                              orders.flavor_id ──> flavors.id
                              orders.ingredient_ids[] ──> ingredients.id
```

## Tabelas

### `events`

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `name` | `text` | NOT NULL | Ex.: "Aniversário Maria 30 anos" |
| `slug` | `text` | UNIQUE, NOT NULL | Usado em URLs amigáveis |
| `starts_at` | `timestamptz` | NOT NULL | |
| `ends_at` | `timestamptz` | NOT NULL, CHECK (`ends_at > starts_at`) | |
| `is_active` | `boolean` | NOT NULL, default `true` | Apenas 1 ativo por vez (verificado em app) |
| `kitchen_code_hash` | `text` | NOT NULL | bcrypt hash do código compartilhado |
| `tempo_medio_preparo_global` | `int` | NOT NULL, default `300` | Em segundos |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

### `flavors`

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `event_id` | `uuid` | NOT NULL, FK → events(id) ON DELETE CASCADE | |
| `name` | `text` | NOT NULL | Ex.: "Crepe doce de Nutella" |
| `category` | `text` | NOT NULL, CHECK (`category IN ('doce','salgado')`) | |
| `tempo_medio_preparo` | `int` | NULL | Override sobre o do evento |
| `is_active` | `boolean` | NOT NULL, default `true` | |
| `display_order` | `int` | NOT NULL, default `0` | Para ordenar no menu |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

UNIQUE (`event_id`, `name`).

### `ingredients`

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `event_id` | `uuid` | NOT NULL, FK → events(id) ON DELETE CASCADE | |
| `name` | `text` | NOT NULL | Ex.: "Chocolate" |
| `is_active` | `boolean` | NOT NULL, default `true` | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

UNIQUE (`event_id`, `name`).

### `flavor_ingredients` (join)

| Coluna | Tipo | Constraints |
|---|---|---|
| `flavor_id` | `uuid` | FK → flavors(id) ON DELETE CASCADE |
| `ingredient_id` | `uuid` | FK → ingredients(id) ON DELETE CASCADE |

PK composta (`flavor_id`, `ingredient_id`).

### `orders`

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `event_id` | `uuid` | NOT NULL, FK → events(id) | |
| `client_key` | `uuid` | NOT NULL, UNIQUE | UUID v7 gerado no client; idempotência |
| `sequence_number` | `int` | NOT NULL | Sequencial **por evento** (gerado por trigger ou função) |
| `first_name` | `text` | NOT NULL, CHECK (length > 0 AND length ≤ 60) | |
| `last_name` | `text` | NOT NULL, CHECK (length > 0 AND length ≤ 60) | |
| `flavor_id` | `uuid` | NOT NULL, FK → flavors(id) | |
| `ingredient_ids` | `uuid[]` | NOT NULL, default `'{}'` | Snapshot — não FK para preservar histórico mesmo após delete |
| `observation` | `text` | NULL, CHECK (length ≤ 140) | |
| `status` | `text` | NOT NULL, default `'pending'`, CHECK (`status IN ('pending','in_progress','done','cancelled')`) | |
| `cancellation_reason` | `text` | NULL, CHECK (length ≤ 200) | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `started_at` | `timestamptz` | NULL | quando virou `in_progress` |
| `finished_at` | `timestamptz` | NULL | quando virou `done` ou `cancelled` |

**Índices**:
- `idx_orders_event_status_created` ON (`event_id`, `status`, `created_at`, `id`) — usado pelo painel cozinha (FIFO) e cálculo de posição.
- `idx_orders_client_key` ON (`client_key`) — já implícito pelo UNIQUE.
- `idx_orders_event_finished_at` ON (`event_id`, `finished_at` DESC) WHERE `status` IN ('done','cancelled') — usado pelo histórico.

**Função `generate_sequence_number()`** (trigger BEFORE INSERT):
```sql
SELECT COALESCE(MAX(sequence_number), 0) + 1
INTO NEW.sequence_number
FROM orders
WHERE event_id = NEW.event_id;
```
Concorrência: o `INSERT` com `ON CONFLICT (client_key) DO NOTHING` somado a um lock advisory por `event_id` na função evita gaps e duplicatas no `sequence_number`. Detalhes na migration.

### `order_transitions`

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `bigserial` | PK | |
| `order_id` | `uuid` | NOT NULL, FK → orders(id) ON DELETE CASCADE | |
| `from_status` | `text` | NULL | NULL na criação |
| `to_status` | `text` | NOT NULL | |
| `actor` | `text` | NOT NULL, CHECK (`actor IN ('guest','kitchen','host','system')`) | |
| `reason` | `text` | NULL, CHECK (length ≤ 200) | Para cancelamentos |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

Índice em (`order_id`, `created_at`).

## State machine de `orders.status`

```
                ┌──────────────┐
   guest        │              │   kitchen
   inserts ───▶ │   pending    │ ──────────▶ in_progress
                │              │
                └──────┬───────┘
                       │              kitchen
                       │   ┌──────────────────┐
                       └──▶│   cancelled      │◀── kitchen / host
                           └──────────────────┘     (qualquer estado pré-done)
                                  ▲
                                  │
                in_progress ──────┘    in_progress ──▶ done
```

Transições válidas (validadas em `lib/domain/order.ts` + CHECK constraint em DB):
- `pending → in_progress` (kitchen)
- `pending → cancelled` (kitchen | host)
- `in_progress → done` (kitchen)
- `in_progress → cancelled` (kitchen | host)

Inválidas: qualquer outra. Tentativa retorna 422.

## Row-Level Security

Habilitar RLS em **todas** as tabelas. Roles:
- `anon` — convidado anônimo (browser sem auth Supabase).
- `authenticated` — não usado neste projeto.
- `service_role` — usado pelo backend Next via Service Key (server-side).

**Política de leitura** em `flavors`, `ingredients`, `flavor_ingredients`:
- `anon` pode ler quando `is_active = true` e o `event_id` corresponde ao evento ativo.

**Política de escrita** em `orders`:
- `anon` pode INSERT desde que `event_id` é um evento ativo e `status = 'pending'`.
- `anon` pode SELECT apenas linhas onde o `client_key` é o seu próprio (filtro vem no client).
- UPDATE: somente `service_role` (transição via API server, validada pelo cookie da cozinha).

**Política de escrita** em `order_transitions`:
- INSERT somente via `service_role`.

**Política em `events`**:
- `anon` pode SELECT do evento ativo (campos públicos via view `events_public` que omite `kitchen_code_hash`).
- Modificações apenas via `service_role`.

## Migrations

```
supabase/migrations/
├── 0001_initial_schema.sql        # Tabelas, índices, FKs
├── 0002_state_machine_check.sql   # CHECK constraint nas transições
├── 0003_sequence_trigger.sql      # Trigger generate_sequence_number
├── 0004_rls_policies.sql          # Habilita RLS + policies
├── 0005_views.sql                 # events_public view
└── 0099_seed_demo.sql             # Seed do evento demo (apenas em dev)
```

## Considerações sobre privacidade (NFR-006)

- `first_name` e `last_name` são PII. Nunca expostos a `anon` exceto via WebSocket filtrado pelo próprio `client_key`.
- Política de retenção: anfitrião exporta CSV pós-evento; após confirmação, função SQL `purge_event(event_id)` apaga os pedidos preservando contagem agregada (opcional v2).
- Sem logs de PII em texto claro do lado do servidor; logar apenas `order_id` e `event_id`.
