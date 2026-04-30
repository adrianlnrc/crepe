---
description: "Task breakdown — Crepe Orders"
---

# Tasks: Crepe Orders — Fluxo Convidado → Cozinha

**Input**: Design documents from `specs/001-crepe-orders/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/
**Date**: 2026-04-30

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências entre si)
- **[Story]**: A qual user story a tarefa pertence (US1…US5)
- Caminhos de arquivo são exatos e seguem [plan.md → Project Structure](./plan.md)

> **Tests**: a constituição obriga testes para FIFO (princípio II) e idempotência. Demais testes seguem a estratégia pragmática definida em [research.md §9](./research.md). Tarefas de teste estão marcadas no fluxo onde aplicável e não são opcionais para os pontos críticos.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Boot do projeto e tooling mínimo. Sem isso, nada compila.

- [ ] **T001** Inicializar projeto Next.js 15 com TypeScript em `/` — `pnpm create next-app@15 . --ts --tailwind --app --eslint --src-dir=false --import-alias="@/*"`. Garantir `package.json` com Node engines = `22`.
- [ ] **T002** [P] Adicionar dependências runtime em `package.json`: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `qrcode`, `date-fns`, `bcryptjs`, `uuid`. Rodar `pnpm install`.
- [ ] **T003** [P] Adicionar dependências dev: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`, `prettier`, `@types/bcryptjs`, `@types/uuid`. Configurar scripts em `package.json` (`test`, `test:e2e`, `format`, `typecheck`).
- [ ] **T004** [P] Criar `vitest.config.ts` na raiz com alias `@/*` apontando pra raiz e `setupFiles: ['./tests/unit/setup.ts']`. Criar `tests/unit/setup.ts` vazio (placeholder pra mocks futuros).
- [ ] **T005** [P] Criar `playwright.config.ts` com base URL `http://localhost:3000`, projeto único Chromium, `webServer: { command: 'pnpm dev' }`.
- [ ] **T006** [P] Criar `.env.example` com as variáveis listadas em [quickstart.md](./quickstart.md).
- [ ] **T007** [P] Configurar Tailwind em `tailwind.config.ts`: content globs `./app/**/*.{ts,tsx}` e `./components/**/*.{ts,tsx}`. Plugin `@tailwindcss/forms`. Tokens base de cor (primary, success para "Pronto", danger para cancelamento) em `app/globals.css`.
- [ ] **T008** [P] Inicializar shadcn/ui: `pnpm dlx shadcn@latest init` (cor base neutral, CSS variables on). Adicionar componentes que serão usados: `button`, `input`, `label`, `textarea`, `checkbox`, `select`, `card`, `badge`, `dialog`, `toast`. Saída em `components/ui/`.
- [ ] **T009** Criar `lib/utils.ts` com `cn()` (clsx + tailwind-merge) — necessário para shadcn. Adicionar `clsx` e `tailwind-merge` se não vieram.
- [ ] **T010** Configurar viewport meta em `app/layout.tsx`: `viewport: { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false }` (impede zoom acidental no form). Definir `lang="pt-BR"`.
- [ ] **T011** [P] Inicializar Supabase local: `supabase init` na raiz. Commit `supabase/config.toml`. Criar pasta `supabase/migrations/` (vazia por enquanto).

**Checkpoint Phase 1**: `pnpm dev` sobe Next na porta 3000; `pnpm test` roda Vitest sem testes; `pnpm test:e2e` baixa browsers do Playwright.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: schema do banco, RLS, clients Supabase, auth da cozinha, lógica de domínio testável. **Bloqueia todas as user stories.**

### Database & Migrations

- [ ] **T012** Criar `supabase/migrations/0001_initial_schema.sql` com as tabelas `events`, `flavors`, `ingredients`, `flavor_ingredients`, `orders`, `order_transitions` exatamente como em [data-model.md](./data-model.md). Incluir índices `idx_orders_event_status_created` e `idx_orders_event_finished_at`.
- [ ] **T013** Criar `supabase/migrations/0002_state_machine_check.sql`: trigger BEFORE UPDATE em `orders` que valida transições válidas (`pending→in_progress`, `pending→cancelled`, `in_progress→done`, `in_progress→cancelled`) e atualiza `started_at`/`finished_at` quando o status correspondente for atingido.
- [ ] **T014** Criar `supabase/migrations/0003_sequence_trigger.sql`: função `generate_sequence_number()` + trigger BEFORE INSERT em `orders` que preenche `sequence_number` por evento usando `pg_advisory_xact_lock(hashtext(event_id::text))` para serializar dentro da transação.
- [ ] **T015** Criar `supabase/migrations/0004_rls_policies.sql`: habilitar RLS em todas as tabelas; policies conforme [data-model.md → RLS](./data-model.md). Incluir testes manuais em comentário SQL para cada policy.
- [ ] **T016** Criar `supabase/migrations/0005_views.sql`: view `events_public` (sem `kitchen_code_hash`).
- [ ] **T017** Criar `supabase/migrations/0099_seed_demo.sql`: 1 evento ativo "Festa Demo" com `kitchen_code_hash` de `1234`, 4 flavors (2 doces + 2 salgados), 8 ingredients, vínculos. **Marcar para rodar apenas em desenvolvimento** (comentário no topo: `-- Run only locally`).
- [ ] **T018** Aplicar migrações: `supabase start` + `supabase db reset` (que aplica todas em ordem). Validar via `supabase db diff` que está limpo.

### Supabase clients

- [ ] **T019** [P] Criar `lib/supabase/server.ts`: factory `createSupabaseServerClient()` usando `@supabase/ssr` com cookies do Next; exportar também `createSupabaseAdminClient()` que usa `SUPABASE_SERVICE_ROLE_KEY` (apenas para handlers de mutação privilegiada).
- [ ] **T020** [P] Criar `lib/supabase/browser.ts`: factory `createSupabaseBrowserClient()` (anon key, com Realtime habilitado).
- [ ] **T021** [P] Criar `lib/supabase/middleware.ts`: helper para rodar dentro de Next middleware refrescando sessão Supabase (apenas estrutura — não usaremos auth Supabase, mas o helper pode ler cookies de kitchen).

### Auth da cozinha

- [ ] **T022** Criar `lib/auth/kitchen.ts` com:
  - `verifyKitchenCode(code: string, eventId: string): Promise<boolean>` — busca `kitchen_code_hash` e compara com bcrypt.
  - `signKitchenSession(eventId: string): string` — HMAC-SHA256 do `eventId + expiresAt` usando `KITCHEN_SESSION_SECRET`.
  - `verifyKitchenSession(token: string): { eventId: string } | null`.
- [ ] **T023** Criar `middleware.ts` na raiz: matcher `/cozinha/:path*` e `/historico/:path*` e `/api/kitchen/:path*` (exceto `/api/kitchen/login`) e `/api/orders/:id/transition`. Verifica cookie `kitchen_session`; redireciona para `/cozinha/login` se inválido em rotas de página, ou `401` em rotas de API.

### Validation schemas

- [ ] **T024** [P] Criar `lib/validation/order-schema.ts` com Zod:
  - `createOrderSchema` (client_key UUID v7, event_id UUID, first_name/last_name 1-60, flavor_id UUID, ingredient_ids UUID array, observation ≤140 opcional).
  - `transitionSchema` (to_status enum, reason ≤200 opcional).
  - `kitchenLoginSchema` (code string).

### Domain logic (puro, testável)

- [ ] **T025** [P] Criar `lib/domain/order.ts`: tipos `Order`, `OrderStatus`, `Actor`; const `VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]>`; função `canTransition(from, to): boolean`.
- [ ] **T026** [P] Criar `lib/domain/queue.ts`: função `calculateQueuePosition(order: Order, allPending: Order[]): number` que aplica ordenação `(created_at, id)` e retorna 1-indexed.
- [ ] **T027** [P] Criar `lib/domain/estimate.ts`: função `estimateWaitSeconds(position: number, tempoMedioSegundos: number): number` (= position × tempoMedio).
- [ ] **T028** [P] Criar `lib/domain/identifier.ts`: função `formatOrderIdentifier(firstName: string, lastName: string, sequenceNumber: number): string` retornando `"Maria Silva #042"` (zero-pad 3 dígitos).
- [ ] **T029** [P] Criar `lib/domain/idempotency.ts`: função `generateClientKey(): string` retornando UUID v7 (usar `uuid` lib v9+ que suporta v7) e `isValidClientKey(s: string): boolean`.

### Tests para domínio (constituição: FIFO + idempotência)

- [ ] **T030** [P] Criar `tests/unit/queue.test.ts` cobrindo:
  - 3 pedidos em ordem de `created_at` retornam posições 1, 2, 3.
  - Empate de `created_at` é desempatado por `id` (lex ascendente).
  - Pedidos `in_progress` ou `done` não contam para posição de pendentes.
  - Pedido cancelado é removido da fila imediatamente.
- [ ] **T031** [P] Criar `tests/unit/transitions.test.ts`: matriz de todas as transições, válidas retornam `true`, inválidas (`done→pending`, `cancelled→done`, etc.) retornam `false`.
- [ ] **T032** [P] Criar `tests/unit/estimate.test.ts`: `estimateWaitSeconds(3, 300) === 900`; posição 0 → 0; tempos médios diferentes por sabor.
- [ ] **T033** [P] Criar `tests/unit/identifier.test.ts`: `formatOrderIdentifier('Maria','Silva',42) === 'Maria Silva #042'`; sequência 7 → `#007`; sequência 1234 → `#1234`.
- [ ] **T034** [P] Criar `tests/unit/idempotency.test.ts`: `generateClientKey()` retorna UUID v7 válido; `isValidClientKey` rejeita v4, strings vazias, formatos errados.

**Checkpoint Phase 2**: `pnpm test` passa todos. `supabase status` mostra DB rodando. Middleware do Next bloqueia `/cozinha` sem cookie. Todas as user stories podem iniciar agora.

---

## Phase 3: User Story 1 - Convidado faz um pedido (Priority: P1) 🎯 MVP

**Goal**: convidado escaneia QR, preenche form, envia, vê confirmação com identificador.

**Independent Test**: abrir `/pedido?event=<id>`, preencher e enviar; pedido aparece em `orders` com `status='pending'` e `sequence_number` correto.

### API & service layer

- [ ] **T035** [US1] Criar `app/api/event/active/route.ts` (`GET`): retorna `events_public` ativo + `flavors` ativos + `ingredients` ativos + `flavor_ingredients`. Usar Supabase server client (anon — RLS protege).
- [ ] **T036** [US1] Criar `app/api/orders/route.ts` (`POST`): validar body com `createOrderSchema`, verificar evento ativo, fazer `INSERT ... ON CONFLICT (client_key) DO NOTHING RETURNING *` via Service Role; em conflito (zero rows), `SELECT` o existente; retornar `{ order, identifier }`. Logar `{ event_id, order_id }` (sem PII).
- [ ] **T036b** [US1] Em `app/api/orders/route.ts` (POST), implementar **idempotência estrita**: ao detectar conflito por `client_key`, comparar o payload recebido com o registro existente nos campos `event_id`, `first_name`, `last_name`, `flavor_id`, `ingredient_ids` (set-equal, ordem irrelevante), `observation` (normalizado: trim + null se vazio).
  - Se **idênticos**: retornar `200 OK` com a row existente (idempotente).
  - Se **diferentes**: retornar `409 conflict` com `{ error: { code: 'client_key_reused', message: 'Mesmo client_key com payload diferente — gere uma nova chave' } }`.
  - Adicionar teste unit em `tests/unit/idempotency-payload.test.ts` para o normalizador (`normalizeOrderPayload`) extraído para `lib/domain/idempotency.ts`.

### UI

- [ ] **T037** [US1] Criar `app/page.tsx`: landing simples que detecta `?event=<id>` e redireciona para `/pedido?event=<id>`; sem o param, mostra mensagem amigável "Acesse pelo QR code".
- [ ] **T038** [US1] Criar `app/pedido/page.tsx` (RSC): chama `/api/event/active`; se `404`, renderiza tela "Evento não está ativo"; passa dados para `<OrderForm>` client component.
- [ ] **T039** [US1] Criar `app/pedido/_components/order-form.tsx` ('use client'):
  - `react-hook-form` + zodResolver(`createOrderSchema`).
  - Gera `client_key` (UUID v7) no `useEffect` do mount.
  - Campos: nome, sobrenome, sabor (radio cards), ingredientes (checkboxes baseados no `flavor_ingredients`), observação (textarea contador 0/140).
  - `inputMode="text"` com `autoComplete="given-name"` / `family-name"`.
  - Botão "Enviar" desabilitado durante submit; spinner.
  - Em sucesso, redireciona para `/status/<client_key>`.
  - Em erro de rede: retry automático 3x com backoff (1s, 2s, 4s) — mostra "Reenviando…" sem perder os dados.
  - Persistir client_key no `localStorage` na key `crepe:lastClientKey` antes do POST (para idempotência cross-refresh).
- [ ] **T040** [US1] Criar `app/pedido/_components/flavor-picker.tsx`: cards mobile-friendly (mínimo 44 px de toque), categoria doce/salgado em duas colunas em viewport ≥ 640 px.
- [ ] **T041** [US1] Criar `app/pedido/_components/ingredient-checklist.tsx`: lista renderizada dinamicamente quando o sabor muda; checkbox grande, com label clicável.

### E2E

- [ ] **T042** [US1] Criar `tests/e2e/happy-path.spec.ts` (parcial — escopo US1 + US2):
  - Iniciar com seed demo.
  - Em viewport 375×667 abrir `/pedido?event=<seed>`, preencher, enviar.
  - Aguardar redirect para `/status/<key>`.
  - Validar via API/DB que existe 1 row em `orders` com os dados certos e `status='pending'`.

**Checkpoint US1**: convidado consegue criar um pedido e ver o identificador. MVP nível 1. Ainda não há cozinha.

---

## Phase 4: User Story 2 - Cozinha vê e processa a fila (Priority: P1) 🎯 MVP

**Goal**: cozinha autentica, vê fila FIFO, transiciona estados; novos pedidos aparecem em ≤ 2 s.

**Independent Test**: com pedidos pré-existentes, abrir `/cozinha`, autenticar, validar ordem; chegar novo pedido via API → painel atualiza.

### API

- [ ] **T043** [P] [US2] Criar `app/api/kitchen/login/route.ts` (`POST`): valida body, chama `verifyKitchenCode`, em sucesso seta cookie `kitchen_session` (httpOnly, SameSite=Strict, Secure em prod, TTL 12h). Rate limit em memória: 5 tentativas/IP em 5 min → 429.
- [ ] **T044** [P] [US2] Criar `app/api/kitchen/logout/route.ts` (`POST`): expira cookie, retorna 200.
- [ ] **T045** [P] [US2] Criar `app/api/orders/route.ts` (`GET` — adicionar ao mesmo arquivo do POST): lista pedidos do evento ativo com `status IN ('pending','in_progress')`, ordenado `created_at ASC, id ASC`. Inclui `flavor` e `ingredients` (joins).
- [ ] **T046** [US2] Criar `app/api/orders/[id]/transition/route.ts` (`POST`): valida cookie via middleware (já feito), valida body, busca order, valida transição via `canTransition`, executa UPDATE + INSERT em `order_transitions` numa transação RPC (ou função SQL). Retorna order atualizado.
- [ ] **T046b** [US2] Em `app/api/orders/[id]/transition/route.ts`, blindar **race condition entre dois operadores**: usar `UPDATE orders SET status = $to_status, started_at = ..., finished_at = ... WHERE id = $id AND status = $expected_from_status RETURNING *`. Se `rowCount = 0`:
  - Buscar o registro atual e comparar `status` real com `to_status` requisitado:
    - Se já está em `to_status`: retornar `200 OK` (idempotente — outro operador chegou primeiro com a mesma intenção).
    - Caso contrário: retornar `409 conflict` com `{ error: { code: 'transition_race', message: 'Outro operador já atualizou este pedido', current_status: '...' } }`.
  - No painel cozinha (T049/T050), tratar 409 mostrando toast amigável e refrescando o card via Realtime.
  - Adicionar teste e2e em `tests/e2e/concurrency.spec.ts` (já existente em T052) cobrindo: 2 sessões autenticadas tocam "Iniciar preparo" simultaneamente — exatamente uma vence, a outra recebe 409 sem corromper estado.

### UI

- [ ] **T047** [US2] Criar `app/cozinha/login/page.tsx`: form simples com input numérico (`inputMode="numeric"`), 4-6 dígitos, POST para `/api/kitchen/login`.
- [ ] **T048** [US2] Criar `app/cozinha/page.tsx` (RSC + client): RSC carrega lista inicial via `GET /api/orders`; client component subscreve `postgres_changes` em `orders` filtrado por `event_id`. Layout: lista vertical em mobile, grid de 2-3 colunas em ≥ 768 px.
- [ ] **T049** [US2] Criar `app/cozinha/_components/order-card.tsx`: card mostrando identificador (`Maria Silva #042`), sabor, ingredientes, observação, tempo decorrido desde `created_at`. Botões "Iniciar preparo" (quando pending) e "Finalizar" (quando in_progress) e "Cancelar" (qualquer estado pré-done) — com `<Dialog>` shadcn pra confirmar cancelamento e capturar motivo.
- [ ] **T050** [US2] Criar `app/cozinha/_components/realtime-orders-list.tsx` ('use client'): hook customizado `useKitchenOrders(eventId, initial)`:
  - Estado local: `Map<id, Order>`.
  - Subscribe ao canal `kitchen:${eventId}`.
  - Em INSERT: adiciona ao map.
  - Em UPDATE: atualiza ou remove se status final.
  - Em desconexão > 5s: refaz `GET /api/orders` ao reconectar.
  - Reordena por `(created_at, id)` antes de renderizar.

### E2E

- [ ] **T051** [US2] Estender `tests/e2e/happy-path.spec.ts`:
  - Após criar pedido (T042), abrir `/cozinha/login` em outra aba, autenticar com `1234`.
  - Validar que o pedido aparece em ≤ 3 s (margem sobre os 2 s de SLO).
  - Tocar "Iniciar preparo" → status muda para `in_progress`.
  - Tocar "Finalizar" → card sai da lista; `orders.status='done'` no DB.
- [ ] **T052** [P] [US2] Criar `tests/e2e/concurrency.spec.ts`: cria 5 pedidos via API em paralelo (timestamps próximos), abre painel, valida que aparecem na ordem `created_at ASC, id ASC` (NÃO ordem de chegada do evento Realtime).

**Checkpoint US2**: loop completo convidado → cozinha → finalizado funciona. **MVP entregável** se a tela de status do convidado for "estática" (mostra só `pending`/etc. sem tempo real).

---

## Phase 5: User Story 3 - Status, tempo e retirada no balcão (Priority: P2)

**Goal**: tela de status rica, com posição na fila, tempo estimado, tempo decorrido em preparo, e tela "PRONTO! Retire no balcão" com vibração.

**Independent Test**: com pedido em `pending`, tela mostra posição correta; muda para `in_progress` → mostra cronômetro; muda para `done` → tela cheia "Pronto" + vibração no celular.

### API

- [ ] **T053** [P] [US3] Criar `app/api/orders/by-client-key/[clientKey]/route.ts` (`GET`): retorna pedido + `flavor` + `ingredients` resolvidos + `event.tempo_medio_preparo_global` + (se status=`pending`) `queue_position` e `estimated_wait_seconds`. RLS impede ler de outro client_key.
- [ ] **T054** [P] [US3] Criar `app/api/orders/queue-position/route.ts` (`GET ?client_key=...`): leve, retorna apenas `{ position, estimated_wait_seconds, status }`. Usado pelo polling de 10s.

### UI

- [ ] **T055** [US3] Criar `app/status/[clientKey]/page.tsx` (RSC): chama `by-client-key`; passa snapshot inicial para client component. Se 404, renderiza fallback "Pedido não encontrado — escaneie o QR para fazer um novo".
- [ ] **T056** [US3] Criar `app/status/[clientKey]/_components/status-screen.tsx` ('use client'):
  - Mostra `<IdentifierBadge>` em destaque.
  - Switch por status:
    - `pending`: `<QueuePosition position estimateSeconds />` — atualiza via polling 10s + canal Realtime do próprio pedido.
    - `in_progress`: `<InPreparation startedAt />` — cronômetro local com `setInterval(1s)`.
    - `done`: `<ReadyBanner />` em modo full-screen.
    - `cancelled`: `<CancelledNotice reason />`.
  - Subscribe ao canal `order:${clientKey}` para receber UPDATE.
  - On mount, salva `client_key` no `localStorage` (key `crepe:lastClientKey`) — permite retomar via `/status/<chave>` em até 6h.
- [ ] **T057** [P] [US3] Criar `app/status/[clientKey]/_components/identifier-badge.tsx`: nome + sobrenome em fonte grande, número `#042` ainda maior, em `<Card>` shadcn destacado.
- [ ] **T058** [P] [US3] Criar `app/status/[clientKey]/_components/queue-position.tsx`: "Você é o 3º na fila" + "Tempo estimado: ~15 min" (formatação amigável via `date-fns`). Hook `useQueuePosition(clientKey)` que faz polling a cada 10s + atualiza on Realtime UPDATE.
- [ ] **T059** [P] [US3] Criar `app/status/[clientKey]/_components/in-preparation.tsx`: "Em preparo • há 2:30 min" — cronômetro client-side derivado de `started_at`.
- [ ] **T060** [US3] Criar `app/status/[clientKey]/_components/ready-banner.tsx`:
  - Tela cheia, fundo verde alto contraste, ícone de check enorme, texto "PRONTO! Retire no balcão" (font-size ≥ 48 px em mobile).
  - `useEffect` no mount: dispara `navigator.vibrate?.([200, 100, 200])` (try/catch silencioso) e tenta tocar `<audio>` (autoplay possível porque envio do pedido contou como gesture; ainda assim com `try/catch`).
  - Botão grande "Já retirei" que volta para landing (apenas UI — não muda estado).
- [ ] **T061** [P] [US3] Criar `app/status/[clientKey]/_components/cancelled-notice.tsx`: mostra motivo se houver, em tom neutro (não alarmante), com instrução "Procure a cozinha se tiver dúvida".
- [ ] **T062** [US3] Adicionar `<audio>` em `public/sounds/ready.mp3` (curto, ≤ 200 ms). Documentar no README como substituir.

### Bridge entre US1 e US3

- [ ] **T063** [US3] Atualizar `app/pedido/_components/order-form.tsx` (T039): após sucesso do POST, redirecionar para `/status/${client_key}` (já estava planejado mas confirma que a rota existe agora).

### E2E

- [ ] **T064** [US3] Estender `tests/e2e/happy-path.spec.ts`:
  - Após cozinha finalizar (T051), validar que a aba do convidado mostra `<ReadyBanner />`.
  - Validar que `data-testid="ready-banner"` está presente e tem o texto correto.
- [ ] **T065** [P] [US3] Criar `tests/e2e/status-resume.spec.ts`: criar pedido, fechar aba, reabrir `/status/<client_key>` em outra sessão (mesmo navegador) — valida que a tela retoma sem reenviar.

**Checkpoint US3**: jornada completa polida. Convidado sabe quando buscar.

---

## Phase 6: User Story 4 - Histórico e exportação CSV (Priority: P2)

**Goal**: anfitrião vê todos os pedidos finalizados pós-evento e exporta CSV.

**Independent Test**: com pedidos finalizados no DB, abrir `/historico`, verificar listagem; clicar em "Exportar CSV", validar conteúdo do arquivo.

### API

- [ ] **T066** [P] [US4] Criar `app/api/history/route.ts` (`GET`): query params `event_id`, `from`, `to`, `status` (default `done,cancelled`); inclui `duration_seconds` calculado. Cookie obrigatório.
- [ ] **T067** [P] [US4] Criar `app/api/export/csv/route.ts` (`GET`): mesma query, mas serializa CSV (RFC 4180, escape de aspas/quebras de linha) com header `Content-Type: text/csv; charset=utf-8` e `Content-Disposition: attachment; filename="festa-<slug>-<date>.csv"`.

### UI

- [ ] **T068** [US4] Criar `app/historico/page.tsx`: tabela responsiva com filtro por data (date-range), filtro por status (chip toggle), botão "Exportar CSV" (link para o endpoint preservando filtros). Em mobile vira lista de cards.
- [ ] **T069** [P] [US4] Criar `app/historico/_components/history-table.tsx` e `_components/history-filters.tsx`.

### Tests

- [ ] **T070** [P] [US4] Criar `tests/unit/csv.test.ts`: função pura `serializeOrdersToCsv(orders): string` (extrair de T067 para `lib/utils/csv.ts`) — testa escape de vírgula, aspas, quebra de linha, ingredientes múltiplos.

**Checkpoint US4**: anfitrião tem o relatório pós-festa.

---

## Phase 7: User Story 5 - Configuração de cardápio + QR (Priority: P3)

**Goal**: anfitrião gera QR do evento e (futuramente) edita cardápio via UI; v1 aceita edição via Supabase Studio.

**Independent Test**: gerar QR, escanear, abrir form com cardápio correto.

### UI mínima

- [ ] **T071** [US5] Criar `app/qr/page.tsx` (cookie obrigatório): seleciona `event_id` (default = evento ativo), renderiza QR via `qrcode` (canvas) apontando para `${origin}/pedido?event=${id}`. Botões "Baixar PNG" e "Imprimir" (`window.print()` com CSS print-only).
- [ ] **T072** [P] [US5] Adicionar CSS print em `app/globals.css`: ao imprimir `/qr`, renderizar apenas o QR centralizado em A4.
- [ ] **T073** [US5] **Documentar** em `quickstart.md` (já parcialmente feito — confirmar) o passo a passo de criar evento e flavors via Supabase Studio. UI completa de CRUD de cardápio fica para v2 (anotar em research.md → "Pontos abertos").

**Checkpoint US5**: ciclo de criação de evento documentado e operacional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] **T074** [P] Criar `README.md` na raiz com badge de stack, link pra spec, comandos básicos, link pra [quickstart.md](./quickstart.md).
- [ ] **T075** [P] Adicionar `.gitignore` com `.env.local`, `node_modules`, `.next`, `playwright-report`, `test-results`, `public/qr/`.
- [ ] **T076** Configurar **Vercel Analytics**: instalar `@vercel/analytics`, adicionar `<Analytics />` no `app/layout.tsx`.
- [ ] **T077** [P] Adicionar `app/manifest.webmanifest` (PWA mínimo: nome, icons, theme color) — só metadata, sem service worker no MVP.
- [ ] **T078** [P] Validar contraste WCAG AA em todas as telas (Lighthouse + manual). Ajustar tokens se necessário.
- [ ] **T079** Rodar `pnpm build` e validar:
  - Bundle de `/pedido` ≤ 150 kB gzipped (`next build --profile`).
  - FCP ≤ 1.5 s em throttle 4G no DevTools.
- [ ] **T080** [P] Criar `.github/workflows/ci.yml`: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` em push/PR. E2E em workflow separado opcional.
- [ ] **T081** Executar **smoke checklist pré-evento** de [quickstart.md](./quickstart.md) em ambiente staging. Documentar resultado em `specs/001-crepe-orders/smoke-test-log.md`.
- [ ] **T082** **Validar Constituição** — reler [.specify/memory/constitution.md](../../.specify/memory/constitution.md) e checar:
  - Mobile-first ✅ em todos os componentes.
  - FIFO ✅ testado por T030 e T052.
  - Zero Fricção ✅ — sem login do convidado.
  - Tempo Real ≤ 2s ✅ via Realtime.
  - Simplicidade ✅ — nenhum CRUD além do necessário.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: começa imediatamente.
- **Phase 2 (Foundational)**: depende do Setup. **BLOQUEIA todas as user stories.**
- **Phase 3 (US1)** e **Phase 4 (US2)**: ambas dependem da Phase 2. Podem ser feitas em paralelo (US1 toca em `app/pedido/*` + `app/api/orders/route.ts (POST)`; US2 toca em `app/cozinha/*` + `app/api/orders/route.ts (GET)` + `app/api/orders/[id]/transition`). **Conflito possível** em `app/api/orders/route.ts` — coordenar.
- **Phase 5 (US3)**: depende de Phase 4 (precisa que cozinha possa transicionar pra ver `done` propagar pro convidado).
- **Phase 6 (US4)**: depende de Phase 4 (precisa de pedidos finalizados).
- **Phase 7 (US5)**: depende de Phase 1 + dados do seed (pode começar cedo na verdade).
- **Phase 8 (Polish)**: depende de tudo.

### Within Each Phase

- Migrations (T012–T017) sequenciais.
- Domain pure (T025–T029) [P] entre si.
- Tests de domínio (T030–T034) [P] entre si, depois das funções existirem.
- Implementação UI dentro de uma user story tem ordem natural: API → page (RSC) → componentes client.

### Parallel Opportunities

```
Setup [P]: T002, T003, T004, T005, T006, T007, T008, T011
Foundational [P]: T019, T020, T021, T024, T025, T026, T027, T028, T029
Tests domain [P]: T030, T031, T032, T033, T034
US1 + US2 simultaneamente após Phase 2 (com cuidado em app/api/orders/route.ts)
Polish [P]: T074, T075, T077, T078, T080
```

---

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2 (Foundational).
2. Phase 3 (US1) + Phase 4 (US2) — entrega o loop mínimo. Demo.
3. Pausa: validar com 5-10 pedidos manuais que o loop funciona.
4. Phase 5 (US3) — eleva a experiência ao nível esperado pra evento real.
5. Phase 6 (US4) — entrega o relatório.
6. Phase 7 (US5) — gera o QR.
7. Phase 8 — polish + smoke test.

### Estimativa grosseira

Para 1 dev:
- Phase 1+2: ~1 dia.
- Phase 3+4: ~2 dias.
- Phase 5: ~1 dia.
- Phase 6: ~0.5 dia.
- Phase 7: ~0.5 dia.
- Phase 8: ~0.5 dia.
- **Total: ~5.5 dias de trabalho focado.**

Margem de segurança recomendada: + 30%, então ~7-8 dias entre o início e o evento.

---

## Notes

- Todas as tarefas marcadas `[P]` operam em arquivos diferentes; podem rodar em paralelo se houver capacidade (humana ou multi-agent).
- A constituição prevalece: testes de FIFO (T030) e idempotência (T034) **não são opcionais**.
- Commits frequentes — um por tarefa ou grupo lógico de [P]s.
- Após cada checkpoint, fazer um deploy em staging (ou rodar `pnpm build && pnpm start`) para validar.
- Nada além desta lista deve ser implementado sem registrar em `tasks.md` ou abrir nova feature spec.
