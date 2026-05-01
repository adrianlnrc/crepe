# Constitution Check — Phase 8 (T082)

**Data**: 2026-04-30
**Versão da Constituição**: 1.0.0

---

## I. Mobile-First ✅

- Formulário do convidado (`/pedido`): `inputMode`, `autoComplete`, viewports 320px+, toques 44px+
- Status screen: `min-h-dvh`, flex centrado, max-w-md
- Ready banner: fullscreen com font-size ≥ 48px (text-5xl = 48px)
- Cozinha: grid responsivo, cards scroll vertical
- Histórico: tabela desktop (`hidden sm:block`) + cards mobile (`sm:hidden`)
- QR: layout centralizado, print CSS via `print:shadow-none`

## II. FIFO Inviolável ✅

- Ordenação: `sequence_number ASC, id ASC` em todos os fetches
- Trigger DB `generate_sequence_number()` com `pg_advisory_xact_lock` serializa inserts
- Testes automatizados: `tests/unit/queue.test.ts` cobre 3 pedidos em ordem, empates, estados finalizados
- Realtime: mapa cliente re-ordena a cada UPDATE por `(sequence_number, id)`
- Nenhuma UI expõe reordenação manual

## III. Zero Fricção no Convidado ✅

- Sem criação de conta, sem e-mail, sem app
- Fluxo: QR → form → status (3 telas)
- Campos obrigatórios: nome, sobrenome, sabor. Ingredientes e obs opcionais
- `client_key` gerado silenciosamente no mount, invisível ao usuário
- Retomada da tela de status via `localStorage` — sem reenvio

## IV. Tempo Real para a Cozinha ✅

- Canal Supabase Realtime `kitchen:${eventId}` com `postgres_changes`
- Canal `order:${clientKey}` para status do convidado
- Sem polling na cozinha — apenas Realtime
- Queue position usa polling leve 10s (aceitável para P2)
- Reconexão: Supabase JS SDK reconecta automaticamente

## V. Simplicidade & YAGNI ✅

- Sem multi-tenant, pagamento, dark mode, i18n, notificações push
- Auth da cozinha: código compartilhado simples (HMAC-SHA256 signed cookie)
- Rate limiting: Map em memória (adequado para evento local)
- CSV export: função pura sem libs externas (só nativas)
- QR: lib `qrcode` — zero abstração adicional

## Restrições Operacionais

- **Build size** `/pedido`: 29.1 kB (< 150 kB ✅)
- **Build size** `/status/[clientKey]`: 4.49 kB ✅
- **Idempotência**: `client_key` UNIQUE + `ON CONFLICT DO NOTHING` ✅
- **Persistência**: todos os pedidos gravados com `created_at` servidor ✅
- **Privacidade**: nome/sobrenome usados apenas para identificação, sem analytics de PII ✅

## Gaps conhecidos (aceitos para MVP)

- Ícones PWA (`/icon-192.png`, `/icon-512.png`) precisam ser criados antes do evento
- Som `public/sounds/ready.mp3` precisa ser substituído por áudio real (< 200ms)
- Testes E2E (Playwright) pendentes para fluxo completo — manual no smoke checklist
- WCAG: contraste validado visualmente; Lighthouse formal recomendado antes do evento
