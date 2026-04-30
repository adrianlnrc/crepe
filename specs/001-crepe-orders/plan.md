# Implementation Plan: Crepe Orders — Fluxo Convidado → Cozinha

**Branch**: `001-crepe-orders` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-crepe-orders/spec.md`

## Summary

Aplicação web mobile-first para festas de aniversário em que convidados pedem crepes via QR code e a cozinha gerencia uma fila FIFO em tempo real. Stack: **Next.js 15 (App Router) + Tailwind + shadcn/ui** no frontend, **Supabase (Postgres + Realtime)** como backend e armazenamento, **Vercel** para deploy. Tempo real é entregue pelo canal Realtime do Supabase (Postgres → WebSocket), garantindo propagação ≤ 2 s sem precisar de servidor de WebSocket próprio. Autenticação do painel de cozinha por código curto compartilhado verbalmente, validado contra hash em tabela do Supabase. Testes pragmáticos com Vitest (unit em regras críticas: FIFO, idempotência, cálculo de fila/tempo) e Playwright (1 e2e cobrindo a jornada completa).

## Technical Context

**Language/Version**: TypeScript 5.6+, Node.js 22 (LTS)
**Primary Dependencies**:
- `next@15` (App Router, React Server Components onde fizer sentido)
- `react@19`, `react-dom@19`
- `tailwindcss@3.4+` + `@tailwindcss/forms`
- `shadcn/ui` (componentes copiados, não dependência)
- `@supabase/supabase-js@2` (client) + `@supabase/ssr` (cookies/middleware no Next)
- `zod` (validação de schema dos inputs)
- `react-hook-form` (form do convidado)
- `qrcode` (geração de QR para impressão pelo anfitrião)
- `date-fns` (formatação de tempo decorrido)

**Storage**: Supabase Postgres (gerenciado). Tabelas: `events`, `flavors`, `ingredients`, `flavor_ingredients`, `orders`, `order_transitions`. Row-Level Security ativo nas tabelas mutáveis.

**Testing**: Vitest 2 (unit + component), Playwright 1.48+ (e2e). Mock de Supabase em testes unit via `@supabase/supabase-js` adapter customizado; Playwright roda contra um banco de teste isolado (Supabase project de staging ou local via `supabase start`).

**Target Platform**: Browsers modernos. Mínimo: Safari 16.4+ e Chrome 120+ (cobre 95%+ dos celulares no Brasil em 2026). Painel cozinha igual.

**Project Type**: Web application — single Next.js app servindo as três rotas (`/pedido`, `/cozinha`, `/historico`) e o backend via Server Actions e Route Handlers. Sem mono-repo separado para client/server.

**Performance Goals**:
- FCP ≤ 1.5 s em 4G no formulário do convidado
- Confirmação de envio ≤ 1 s
- Propagação Realtime ≤ 2 s (p95)
- Bundle do `/pedido` ≤ 150 kB gzipped (apenas o necessário; shadcn é tree-shaken)

**Constraints**:
- 99% uptime durante janela do evento (≥ 4 h)
- Idempotência por client_key na criação de pedidos
- FIFO estrito por `created_at` + `id` desempate
- Funciona em conexão 4G instável (retry, otimismo controlado)

**Scale/Scope**:
- **Festa-alvo concreta**: ≤ 85 convidados, ~70 pedidos em 3-4 h. Pico ~8 pedidos/min.
- Cozinha: 1-2 dispositivos no painel.
- Conexões Realtime concorrentes esperadas no pico: ~85-100 (bem abaixo do limite de 200 do Supabase free tier).
- Não escala horizontal — single-tenant single-event-ativo. Multi-evento é organização lógica via `event_id`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Status |
|-----------|---------------------|:------:|
| **I. Mobile-First** | Tailwind mobile-first (breakpoints `sm`, `md` aditivos); rotas `/pedido` e `/status` desenhadas pra 320 px+; viewport meta tag; toques sem hover; `inputMode` apropriado nos campos. shadcn validado em viewports 375 e 414. | ✅ |
| **II. FIFO Inviolável** | Query do painel cozinha: `ORDER BY created_at ASC, id ASC` com índice composto. Posição do convidado calculada pela mesma ordenação. Nenhuma UI permite reordenar. Teste unit obrigatório. | ✅ |
| **III. Zero Fricção** | Sem login, sem cadastro. Form único na rota `/pedido`. Estado retomado via `localStorage` (chave: `client_key` do último pedido) em até 6h. | ✅ |
| **IV. Tempo Real** | Supabase Realtime via WebSocket (Postgres replication). Latência típica < 500 ms; p95 ≤ 2 s confortável. Reconexão automática built-in no client. | ✅ |
| **V. Simplicidade** | Single Next.js app, sem microserviços. Sem auth complexa (código compartilhado). Sem fila distribuída — Postgres é a fila. Sem cache extra — Realtime + DB resolve. | ✅ |

**Restrições operacionais**:
- 99% uptime: Vercel + Supabase free tiers oferecem >> 99% mensal em condições normais. Plano é monitorar SLO durante o evento, não otimizar pra 99.99%.
- Performance: Next.js + Vercel edge atendem FCP ≤ 1.5 s sem esforço. Bundle será verificado com `next build`.
- Privacidade: nome/sobrenome ficam no Postgres (Supabase) com RLS impedindo leitura sem código da cozinha. Política de retenção: registro fica até o anfitrião exportar o CSV e solicitar limpeza.

**Veredicto**: nenhuma violação. Prosseguir.

## Project Structure

### Documentation (this feature)

```text
specs/001-crepe-orders/
├── plan.md              # Este arquivo
├── research.md          # Decisões de stack e alternativas consideradas
├── data-model.md        # Schema Postgres + RLS + índices
├── quickstart.md        # Como rodar local, deploy, e checklist pré-evento
├── contracts/           # Contratos de API e canais Realtime
│   ├── api-spec.md      # Endpoints REST/Server Actions
│   └── realtime-channels.md  # Canais Supabase Realtime e payloads
└── tasks.md             # Próxima fase (/speckit-tasks)
```

### Source Code (repository root)

```text
crepe/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (viewport, fonts)
│   ├── page.tsx                      # Landing simples → redirect /pedido
│   ├── pedido/
│   │   ├── page.tsx                  # Form de pedido (RSC + client component)
│   │   └── _components/
│   │       └── order-form.tsx        # 'use client'
│   ├── status/
│   │   └── [clientKey]/
│   │       ├── page.tsx              # Tela de status do convidado
│   │       └── _components/
│   │           ├── status-card.tsx
│   │           ├── ready-banner.tsx  # tela "PRONTO! Retire no balcão"
│   │           └── queue-position.tsx
│   ├── cozinha/
│   │   ├── page.tsx                  # Painel (lista FIFO)
│   │   ├── login/page.tsx            # Form do código de acesso
│   │   └── _components/
│   │       └── order-card.tsx
│   ├── historico/
│   │   └── page.tsx                  # Lista finalizados + export CSV
│   ├── api/
│   │   ├── orders/
│   │   │   └── route.ts              # POST cria pedido (idempotente)
│   │   ├── orders/[id]/transition/
│   │   │   └── route.ts              # POST muda status
│   │   ├── kitchen/login/
│   │   │   └── route.ts              # POST valida código → cookie
│   │   └── export/csv/
│   │       └── route.ts              # GET CSV do histórico
│   └── globals.css                   # Tailwind base
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # Server-side client (Service Role)
│   │   ├── browser.ts                # Browser client (anon)
│   │   └── middleware.ts             # Cookie helpers
│   ├── domain/
│   │   ├── order.ts                  # Tipos + transições válidas
│   │   ├── queue.ts                  # Cálculo de posição na fila
│   │   ├── estimate.ts               # Tempo estimado de espera
│   │   └── identifier.ts             # "Nome Sobrenome #042"
│   ├── auth/
│   │   └── kitchen.ts                # Verificação do código (bcrypt)
│   ├── validation/
│   │   └── order-schema.ts           # Zod schemas
│   └── utils.ts                      # cn(), formatadores
│
├── components/
│   └── ui/                           # shadcn primitives (button, input, etc.)
│
├── public/
│   └── qr/                           # QR codes gerados (gitignored)
│
├── tests/
│   ├── unit/
│   │   ├── queue.test.ts             # FIFO + posição
│   │   ├── estimate.test.ts          # cálculo de tempo
│   │   ├── identifier.test.ts
│   │   └── transitions.test.ts       # state machine
│   └── e2e/
│       ├── happy-path.spec.ts        # convidado faz pedido → cozinha finaliza
│       └── concurrency.spec.ts       # 5 pedidos simultâneos preservam FIFO
│
├── supabase/
│   ├── migrations/                   # SQL versionado
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   └── 0003_seed_demo_event.sql
│   └── config.toml                   # Para `supabase start` local
│
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── playwright.config.ts
├── vitest.config.ts
├── package.json
└── README.md
```

**Structure Decision**: Single Next.js app servindo frontend + backend (Route Handlers e Server Actions). O diretório `lib/domain/` isola a lógica de negócio pura (sem dependência de Next ou Supabase) para facilitar testes unitários. O diretório `supabase/` versiona schema e seeds. Não há monorepo — escala da feature não justifica.

## Complexity Tracking

Nenhuma violação dos princípios da constituição. Tabela vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| —         | —          | —                                   |
