# Realtime Channels — Crepe Orders

Backend de tempo real: **Supabase Realtime** (Postgres Changes via WebSocket).

## Canal 1 — Painel da cozinha

**Subscription** (no `app/cozinha/page.tsx` após auth):

```ts
const channel = supabase
  .channel(`kitchen:${eventId}`)
  .on(
    'postgres_changes',
    {
      event: '*',                    // INSERT | UPDATE | DELETE
      schema: 'public',
      table: 'orders',
      filter: `event_id=eq.${eventId}`,
    },
    (payload) => {
      // Recalcula a fila no client
    }
  )
  .subscribe();
```

**Eventos esperados e ações no client**:

| Evento | `new.status` | `old.status` | Ação no painel |
|---|---|---|---|
| INSERT | `pending` | — | Adiciona card no fim da lista pendente |
| UPDATE | `in_progress` | `pending` | Move card para "Em preparo" |
| UPDATE | `done` | `in_progress` | Remove card da lista (vai pro histórico) |
| UPDATE | `cancelled` | `pending` ou `in_progress` | Remove card |

A reordenação é determinada por `created_at, id` ASC sempre — nunca pela ordem dos eventos chegarem.

**Tolerância a falhas**: se o cliente perder conexão por mais de 5 s, refaz `GET /api/orders` ao reconectar para sincronizar estado completo (em vez de confiar só no replay de eventos perdidos, que o Supabase não garante > poucos segundos).

---

## Canal 2 — Tela de status do convidado

**Subscription** (no `app/status/[clientKey]/page.tsx`):

```ts
const channel = supabase
  .channel(`order:${clientKey}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `client_key=eq.${clientKey}`,
    },
    (payload) => {
      // Atualiza status local + dispara feedback no 'done'
    }
  )
  .subscribe();
```

**Eventos e UI**:

| `new.status` | UI |
|---|---|
| `pending` | Mostra posição na fila + tempo estimado (ambos calculados via `GET /api/orders/by-client-key`). |
| `in_progress` | Mostra "Em preparo" + tempo decorrido (cliente cronometra a partir de `started_at`). |
| `done` | Tela full-screen "PRONTO! Retire no balcão" + `navigator.vibrate([200,100,200])` + áudio curto. |
| `cancelled` | Mostra motivo se houver, com tom neutro. |

**Reconexão**: se a conexão cair, ao reconectar dispara `GET /api/orders/by-client-key/:clientKey` para refrescar.

**Recalculo de fila**: para que o convidado veja a posição decrementar quando alguém à frente é finalizado, o cliente também assina (read-only) o canal `kitchen:eventId` filtrado apenas pelos eventos `UPDATE` com `to_status` em `done | cancelled`. Como `RLS` permite ao `anon` ler apenas registros do próprio `client_key` em `orders`, esse canal alternativo é uma **chamada periódica leve** ao endpoint `/api/orders/by-client-key` (every 10 s) ou um endpoint específico `/api/orders/queue-position?client_key=...` que retorna apenas posição + estimativa. O frontend escolhe a estratégia.

> **Decisão**: usar o endpoint `GET /api/orders/queue-position?client_key=...` chamado a cada 10 s + on `UPDATE` do próprio canal. Mantém RLS estrito (convidado nunca vê dados de outros pedidos) e simples.

---

## Canal 3 — Histórico (não usa Realtime)

A tela de histórico é estática por evento (carrega via `GET /api/history`). Não há valor em tempo real para registros já finalizados.

---

## Garantias e SLOs

- **Latência alvo**: p95 ≤ 2 s da gravação no Postgres até o evento chegar no client (NFR-003).
- **Reconexão**: gerenciada pelo client do Supabase (backoff exponencial, sem retry manual no app code).
- **Ordering**: Realtime entrega eventos na ordem das transações Postgres. Não confiar nessa ordem para FIFO — sempre reordenar pelo `created_at, id` no client.
- **Dedup**: events podem ser duplicados em casos raros de reconexão; client deve dedupar por `id`.
