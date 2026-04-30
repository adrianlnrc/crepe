# Research & Technical Decisions

**Feature**: Crepe Orders | **Date**: 2026-04-30

Este documento captura as decisões técnicas e as alternativas que foram descartadas. Cada entrada segue: **Decisão · Por quê · Alternativas rejeitadas**.

---

## 1. Framework: Next.js 15 (App Router)

**Decisão**: Next.js 15 com App Router, React 19, RSC quando útil e Server Actions para mutações.

**Por quê**:
- Mobile-first com Tailwind atinge FCP ≤ 1.5 s no edge da Vercel sem esforço.
- App Router permite renderizar a tela de status do convidado parcialmente no servidor (estado inicial vindo do banco) e hidratar com cliente que ouve Realtime — evita flash de "loading" e atende o requisito de retomar estado em ≤ 6 h.
- Mesma codebase serve formulário (público), painel cozinha (autenticado por cookie) e API.

**Rejeitados**:
- **Vite + React SPA**: precisa de hosting separado para API; perde SSR (FCP pior em 4G); mais cola.
- **SvelteKit**: perda da skill `ui-ux-pro-max` que está otimizada pra React/shadcn.
- **Pages Router (Next 14)**: API antiga, sem RSC, sem Server Actions — mais código pra menos benefício.

---

## 2. Backend & Banco: Supabase (Postgres + Realtime)

**Decisão**: Supabase como Postgres gerenciado + canal Realtime (Postgres Changes via WebSocket).

**Por quê**:
- **Realtime nativo**: o canal `postgres_changes` propaga INSERT/UPDATE/DELETE com latência típica < 500 ms. Atende NFR-003 (≤ 2 s p95) com folga e reconexão automática.
- **FIFO em Postgres**: `ORDER BY created_at, id` é trivial e tem semântica forte. Em NoSQL (Firestore) garantir ordem total exige workarounds.
- **RLS** dá controle de acesso fino sem precisar de servidor de auth próprio.
- **Tier free** (até 500 MB e 2 GB de bandwidth) cobre confortavelmente uma festa.
- **Migrações SQL versionadas** via `supabase/migrations/`.

**Rejeitados**:
- **Firebase Firestore**: NoSQL dificulta queries de histórico e ordenação determinística; custo cresce com `onSnapshot` em coleções grandes.
- **Backend próprio (Next routes + SQLite + SSE)**: SSE é mais frágil em mobile com app em background; SQLite no Vercel exige Turso ou similar; mais código de cola, sem ganho prático.
- **PlanetScale / Neon + Pusher**: dois serviços para fazer o que Supabase faz num só.

---

## 3. Autenticação do painel da cozinha

**Decisão**: Código curto (4-6 dígitos) compartilhado verbalmente. Validação no servidor via comparação `bcrypt` contra hash armazenado em `events.kitchen_code_hash`. Sucesso seta um **cookie httpOnly** (`kitchen_session`) com TTL de 12 h, lido pelo middleware do Next para liberar `/cozinha` e `/historico`.

**Por quê**:
- Coerente com princípio III (Zero Fricção): cozinha digita 1 código uma vez no dispositivo do evento.
- Não precisa de Supabase Auth (que é overkill aqui — não há identidade individual a rastrear).
- Cookie httpOnly impede JS malicioso de roubar a sessão; SameSite=Strict.

**Rejeitados**:
- **Supabase Auth (magic link / OTP por email)**: cozinha em festa não tem email à mão; fricção desnecessária.
- **Sem auth, só URL "secreta"**: URL vazaria em screenshots ou logs; cookie é mais robusto.
- **JWT em localStorage**: vulnerável a XSS — cookie httpOnly é o padrão moderno.

---

## 4. Idempotência do envio do pedido

**Decisão**: Cliente gera um `client_key` (UUID v7) ao montar o formulário. Inclui no body do POST. Servidor faz `INSERT ... ON CONFLICT (client_key) DO NOTHING RETURNING *`; em conflito, faz `SELECT` e retorna o registro existente. Coluna `client_key` tem `UNIQUE`.

**Por quê**:
- UUID v7 carrega timestamp embutido — útil para debugging e ordenação secundária.
- `ON CONFLICT` é atômico no Postgres; sem race conditions.
- Cliente pode reenviar com segurança em qualquer cenário (rede instável, double-tap, retry automático).

**Rejeitados**:
- **Idempotency-Key como header HTTP**: padrão também válido, mas exige tabela de log à parte (`idempotency_keys`); UNIQUE constraint na coluna é mais simples para este caso.
- **Hash do payload**: dois pedidos legítimos idênticos do mesmo convidado seriam dedupados — bug.

---

## 5. Cálculo de posição na fila e tempo estimado

**Decisão**:
- **Posição**: `SELECT count(*) + 1 FROM orders WHERE event_id = ? AND status = 'pending' AND (created_at, id) < (?, ?)`. O cliente assina o canal Realtime de orders e recalcula localmente quando vê transições.
- **Tempo estimado**: `posição × tempo_medio_segundos`, onde `tempo_medio_segundos = COALESCE(flavor.tempo_medio_preparo, event.tempo_medio_preparo_global, 300)`.
- **Tempo decorrido**: `now() - started_at` quando status = `in_progress`, atualizado a cada 1 s no client via `setInterval`.

**Por quê**:
- Cálculo no client (após assinar canal) reduz round-trips.
- Estimativa é deliberadamente simples — princípio V. SC-008 admite ±50% de erro.
- Server-side recalculation só ocorre no carregamento inicial da página de status (via RSC).

**Rejeitados**:
- **Modelo preditivo (ML / regressão)**: muito além do escopo de festa.
- **Tempo médio rolante das últimas 5 finalizações**: melhor acurácia mas adiciona estado, queries extras, e complexidade. Pode entrar em v2 se SC-008 falhar repetidamente.

---

## 6. Realtime: estratégia de subscription

**Decisão**:
- **Painel cozinha** assina `postgres_changes` na tabela `orders` filtrado por `event_id = current` e `status IN ('pending', 'in_progress')`.
- **Tela de status do convidado** assina filtrado por `client_key = ?` (apenas o próprio pedido).
- Reconexão é gerenciada pelo client do Supabase (built-in com backoff exponencial).

**Por quê**:
- Filtro por `event_id` impede que cozinha receba eventos de eventos antigos.
- Filtro por `client_key` na tela do convidado garante que ele só receba seu próprio pedido (defense-in-depth + RLS).
- Não precisamos de "broadcast" ou "presence" — apenas sincronização de tabela.

**Rejeitados**:
- **Polling a cada N segundos**: fácil mas viola NFR-003 sem ser muito barato em latência percebida.
- **Custom WebSocket no Next**: Vercel serverless não roda WebSocket persistente; precisaria de Worker separado.

---

## 7. Vibração e feedback ao "Pronto"

**Decisão**:
- Usar `navigator.vibrate([200, 100, 200])` quando status muda para `done` na tela de status. Falha silenciosa se a API não estiver disponível (Safari iOS) ou usuário não tiver gesture permission ainda.
- Tocar áudio curto (~200 ms) via `<audio>` HTML5 com fallback se autoplay bloquear (mobile geralmente exige interação prévia — o envio do pedido conta como interação, então muda autoplay policy a favor).
- **Aviso visual sempre presente** como fallback obrigatório (FR-014d): tela inteira em verde, ícone grande, mensagem "PRONTO! Retire no balcão".

**Por quê**:
- A constituição prioriza UX confiável; falha silenciosa de APIs opcionais não pode impedir o aviso.
- Texto + cor + ícone garantem que mesmo em modo silencioso o convidado vê.

**Rejeitados**:
- **Web Push notifications**: exige Service Worker registrado e permissão antecipada — viola Zero Fricção.
- **SMS / WhatsApp**: requer telefone do convidado e gateway pago. Fora do escopo.

---

## 8. Geração de QR code

**Decisão**: Página administrativa simples (`/qr`, protegida pelo código da cozinha) que aceita `event_id` e renderiza o QR com `qrcode` (browser-side) apontando para `https://<host>/pedido?event=<id>`. Botões "Baixar PNG" e "Imprimir".

**Por quê**:
- Anfitrião gera o QR uma vez antes da festa.
- Sem dependência de serviço externo de QR.
- URL pública codifica o evento via query param para suportar múltiplos eventos (mesma instância pode hospedar vários, embora apenas um esteja "ativo" por vez).

**Rejeitados**:
- **QR estático com URL fixa**: forçaria reuso do mesmo `event_id` toda festa, perdendo histórico separado.
- **Serviço externo (qr.io etc.)**: dependência desnecessária; lib é 7 KB.

---

## 9. Estratégia de testes

**Decisão**:
- **Vitest** para unit em `lib/domain/`: queue ordering, idempotency keys, identifier formatting, state machine das transições, cálculo de tempo.
- **Playwright** para 1 e2e cobrindo o happy path completo (form → pedido criado → painel cozinha vê → finaliza → tela do convidado mostra "Pronto") e 1 teste de concorrência (5 pedidos simultâneos preservam FIFO).
- Sem TDD rígido, mas regras de fila (princípio II) **devem** ter teste antes do merge.

**Por quê**:
- Pragmatismo (NFR não exige cobertura, constituição exige "FIFO testado").
- Playwright tem boa integração com Next e roda em CI.

**Rejeitados**:
- **TDD completo + 80% cobertura**: exige emenda à constituição; não é o que o escopo justifica.
- **Apenas e2e (sem unit)**: regras de fila são refinadas e merecem testes rápidos.

---

## 10. Observabilidade

**Decisão**:
- **Vercel Analytics** (built-in, gratuito) para Web Vitals.
- **Supabase Logs** para queries lentas e erros do Postgres.
- Log estruturado simples no servidor via `console.log(JSON.stringify({...}))` — Vercel agrega.
- Sem APM dedicado (Sentry/Datadog) no MVP.

**Por quê**:
- Princípio V (Simplicidade). Para uma festa, Vercel + Supabase logs cobrem 95% dos casos.
- SC-005 (FIFO 100%) é detectado por testes, não por monitoramento em prod.

**Rejeitados**:
- **Sentry**: bom mas adiciona overhead e setup; reconsiderar se for usado em múltiplos eventos.

---

## 11. Acessibilidade (NFR-007)

**Decisão**:
- Componentes shadcn já vêm com Radix por baixo (acessível por padrão).
- `<input type="text" inputMode="..." autoComplete="given-name"...>` em cada campo.
- Labels associadas (`<label htmlFor>`).
- Contraste WCAG AA verificado no Tailwind (paleta neutra com primary com contraste suficiente).
- Aviso "Pronto" usa cor + ícone + texto (não depende só de cor).

**Rejeitados**:
- WCAG AAA: além do necessário para o público de festa.

---

## Pontos abertos (a revisitar pós-piloto)

1. **Recalibração automática do tempo médio**: se SC-008 falhar (acurácia < 80%), considerar média móvel das últimas N finalizações.
2. **Cache offline (PWA)**: se rede do local de festa for muito ruim, considerar Service Worker + IndexedDB para queue local. Não no MVP.
3. **Dashboard de métricas pós-evento**: contagem por sabor, tempo médio real vs estimado, pico de fila. Trivial de adicionar usando os dados já em Postgres.
