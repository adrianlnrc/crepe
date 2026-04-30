# API Contracts — Crepe Orders

Endpoints expostos pelo Next.js (Route Handlers em `app/api/...`).
Todas as respostas em JSON. Erros seguem o formato:

```json
{ "error": { "code": "string", "message": "string", "details": {} } }
```

Códigos comuns: `validation_error` (400/422), `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `event_inactive` (409), `internal` (500).

---

## 1. `POST /api/orders` — Criar pedido (idempotente)

**Quem chama**: convidado, sem auth.

**Headers**: `Content-Type: application/json`

**Body**:
```json
{
  "client_key": "0190e6f0-1234-7abc-9def-000000000001",
  "event_id": "uuid-do-evento-ativo",
  "first_name": "Maria",
  "last_name": "Silva",
  "flavor_id": "uuid-flavor",
  "ingredient_ids": ["uuid-ing-1", "uuid-ing-2"],
  "observation": "sem açúcar"
}
```

Validação (`zod`):
- `client_key`: UUID v7 válido.
- `event_id`: UUID; servidor verifica que está ativo e dentro da janela.
- `first_name`, `last_name`: 1–60 chars, sem caracteres de controle.
- `flavor_id`: deve pertencer ao evento e estar ativo.
- `ingredient_ids`: array (pode ser vazio); todos devem pertencer ao `flavor.flavor_ingredients` e estar ativos.
- `observation`: opcional, ≤ 140 chars.

**Resposta `201 Created`** (novo pedido):
```json
{
  "order": {
    "id": "uuid",
    "client_key": "uuid",
    "sequence_number": 42,
    "first_name": "Maria",
    "last_name": "Silva",
    "flavor_id": "uuid",
    "ingredient_ids": ["uuid-1", "uuid-2"],
    "observation": "sem açúcar",
    "status": "pending",
    "created_at": "2026-04-30T22:01:15.123Z"
  },
  "identifier": "Maria Silva #042"
}
```

**Resposta `200 OK`** (mesmo `client_key` já existente — idempotente):
Mesma estrutura, mas com a linha já gravada.

**Erros**:
- `400 validation_error` — payload inválido.
- `409 event_inactive` — evento fechado, expirado ou não existe.
- `409 conflict` — `client_key` válido mas combinação inconsistente (ex.: payload diferente para mesma key) → erro distinto. Implementação: comparar payload em conflito; se igual, retornar 200; se diferente, 409.

**Idempotência**: garantida pelo `UNIQUE(client_key)` + `INSERT ... ON CONFLICT (client_key) DO NOTHING RETURNING *` seguido de `SELECT` para conflito.

---

## 2. `GET /api/orders/by-client-key/:clientKey` — Buscar pedido pelo client_key

**Quem chama**: tela de status do convidado (RSC inicial e client-side fallback).

**Resposta `200 OK`**:
```json
{
  "order": {
    "id": "uuid",
    "sequence_number": 42,
    "first_name": "Maria",
    "last_name": "Silva",
    "flavor": { "id": "uuid", "name": "Crepe doce de Nutella", "tempo_medio_preparo": 360 },
    "ingredients": [{ "id": "uuid", "name": "Morango" }],
    "observation": "sem açúcar",
    "status": "in_progress",
    "cancellation_reason": null,
    "created_at": "2026-04-30T22:01:15.123Z",
    "started_at": "2026-04-30T22:08:42.000Z",
    "finished_at": null,
    "queue_position": null,
    "estimated_wait_seconds": null
  },
  "identifier": "Maria Silva #042",
  "event": {
    "tempo_medio_preparo_global": 300
  }
}
```

`queue_position` e `estimated_wait_seconds` são preenchidos apenas quando `status = 'pending'`.

**Erros**: `404 not_found`.

---

## 3. `POST /api/orders/:id/transition` — Transicionar status

**Quem chama**: painel cozinha (cookie `kitchen_session` válido).

**Headers**: `Cookie: kitchen_session=...`

**Body**:
```json
{
  "to_status": "in_progress",
  "reason": null
}
```

Para `cancelled`, `reason` é opcional (≤ 200 chars).

**Resposta `200 OK`**:
```json
{
  "order": { "...campos atualizados..." },
  "transition": { "id": 123, "from_status": "pending", "to_status": "in_progress", "created_at": "..." }
}
```

**Validação**:
- Cookie válido (middleware do Next).
- `to_status` deve ser uma transição válida a partir do status atual (state machine — ver [data-model.md](../data-model.md)).
- `id` existe e pertence ao evento ativo.

**Side effects**:
- Atualiza `started_at` quando `to_status = 'in_progress'`.
- Atualiza `finished_at` quando `to_status` é `done` ou `cancelled`.
- Insere registro em `order_transitions` (atômico, mesma transação).

**Erros**:
- `401 unauthorized` — sem cookie ou expirado.
- `404 not_found`.
- `422 validation_error` — transição inválida (ex.: `done → pending`).

---

## 4. `POST /api/kitchen/login` — Validar código da cozinha

**Body**:
```json
{ "code": "1234" }
```

**Resposta `200 OK`**: seta cookie httpOnly `kitchen_session` (TTL 12 h, SameSite=Strict, Secure em prod).
```json
{ "ok": true }
```

**Erros**:
- `401 unauthorized` — código incorreto. Após 5 tentativas em 5 min do mesmo IP, retorna `429 too_many_requests` (rate limit em memória ou Vercel KV se disponível).

---

## 5. `POST /api/kitchen/logout`

Limpa o cookie. `200 OK`.

---

## 6. `GET /api/orders` — Lista para painel da cozinha

**Quem chama**: painel cozinha (cookie válido).

**Query params**:
- `status` (opcional, default = `pending,in_progress`): CSV de status.
- `event_id` (opcional, default = evento ativo).

**Resposta `200 OK`**:
```json
{
  "orders": [
    {
      "id": "uuid",
      "sequence_number": 42,
      "first_name": "Maria",
      "last_name": "Silva",
      "flavor": { "id": "uuid", "name": "Crepe doce de Nutella" },
      "ingredients": [{ "id": "uuid", "name": "Morango" }],
      "observation": "sem açúcar",
      "status": "pending",
      "created_at": "...",
      "identifier": "Maria Silva #042"
    }
  ]
}
```

Ordenação: `created_at ASC, id ASC`.

---

## 7. `GET /api/history` — Histórico de finalizados

**Quem chama**: tela de histórico (cookie válido).

**Query params**:
- `event_id` (default = evento ativo).
- `from`, `to` (timestamps opcionais).
- `status` (default = `done,cancelled`).

**Resposta**: mesma estrutura do `/api/orders` mas inclui `started_at`, `finished_at`, `cancellation_reason` e `duration_seconds`.

---

## 8. `GET /api/export/csv` — Exportar histórico em CSV

**Quem chama**: tela de histórico (cookie válido).

**Query params**: mesmos do `/api/history`.

**Resposta**: `Content-Type: text/csv; charset=utf-8`, header + linhas:
```
sequence_number,first_name,last_name,flavor,ingredients,observation,status,created_at,started_at,finished_at,duration_seconds,cancellation_reason
42,Maria,Silva,Crepe doce de Nutella,"Morango;Banana",sem açúcar,done,2026-04-30T22:01:15Z,2026-04-30T22:08:42Z,2026-04-30T22:13:01Z,706,
```

---

## 9. `GET /api/event/active` — Detalhes do evento ativo

**Quem chama**: público, lê dados não sensíveis para popular o formulário.

**Resposta `200 OK`**:
```json
{
  "event": {
    "id": "uuid",
    "name": "Aniversário Maria 30 anos",
    "starts_at": "...",
    "ends_at": "...",
    "is_active": true
  },
  "flavors": [
    {
      "id": "uuid",
      "name": "Crepe doce de Nutella",
      "category": "doce",
      "ingredients": [{ "id": "uuid", "name": "Morango" }, { "id": "uuid", "name": "Banana" }]
    }
  ]
}
```

**Erros**:
- `404 not_found` — não há evento ativo. Frontend exibe "Evento não está ativo".

---

## Server Actions (alternativa)

Onde fizer sentido, alguns endpoints acima podem ser implementados como Server Actions consumidas direto pelos formulários do Next 15. Os contratos de payload são idênticos. Endpoints REST permanecem como fallback público (CORS aberto para o domínio Vercel).
