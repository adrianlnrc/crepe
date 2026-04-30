# Crepe

Web app mobile-first para festas de aniversário: convidados pedem crepes via QR Code, cozinha gerencia uma fila FIFO em tempo real, pedido pronto chama o convidado para retirar no balcão.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Postgres + Realtime)
- **Vitest** (unit) + **Playwright** (e2e)
- Deploy: **Vercel**

## Spec-Driven Development

Este projeto foi escopado seguindo o [Spec-Kit](https://github.com/github/spec-kit). Os artefatos vivem em `specs/`:

| Arquivo | O que tem |
|---|---|
| [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | 5 princípios inegociáveis (Mobile-First, FIFO, Zero Fricção, Tempo Real, Simplicidade) |
| [`specs/001-crepe-orders/spec.md`](specs/001-crepe-orders/spec.md) | 5 user stories, 23 RFs, 8 RNFs, 9 critérios de sucesso |
| [`specs/001-crepe-orders/plan.md`](specs/001-crepe-orders/plan.md) | Stack, arquitetura, Constitution Check |
| [`specs/001-crepe-orders/research.md`](specs/001-crepe-orders/research.md) | 11 decisões técnicas com alternativas |
| [`specs/001-crepe-orders/data-model.md`](specs/001-crepe-orders/data-model.md) | Schema Postgres, RLS, state machine |
| [`specs/001-crepe-orders/contracts/`](specs/001-crepe-orders/contracts/) | API REST + canais Realtime |
| [`specs/001-crepe-orders/tasks.md`](specs/001-crepe-orders/tasks.md) | 84 tarefas em 8 fases |
| [`specs/001-crepe-orders/analysis.md`](specs/001-crepe-orders/analysis.md) | Cobertura cruzada e gaps |
| [`specs/001-crepe-orders/quickstart.md`](specs/001-crepe-orders/quickstart.md) | Setup local, deploy, smoke checklist pré-evento |

## Comandos

```bash
npm install          # dependências
npm run dev          # Next dev em http://localhost:3000
npm run build        # build de produção
npm run typecheck    # tsc --noEmit
npm run test         # Vitest unit
npm run test:e2e     # Playwright e2e
npm run format       # Prettier
```

## Status

Em desenvolvimento — Phase 1 (scaffold) concluída. Próxima: Phase 2 (migrations, RLS, domínio, testes da constituição).

Veja o detalhamento em [`specs/001-crepe-orders/tasks.md`](specs/001-crepe-orders/tasks.md).
