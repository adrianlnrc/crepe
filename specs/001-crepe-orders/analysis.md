# Cross-Artifact Analysis — Crepe Orders

**Date**: 2026-04-30
**Inputs**: [constitution.md](../../.specify/memory/constitution.md), [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [tasks.md](./tasks.md)

Verificação cruzada para garantir que (a) cada princípio da Constituição está endereçado pelo Plan, (b) cada FR/NFR da Spec está coberto por Tasks, (c) cada User Story tem fase dedicada e teste independente, e (d) decisões técnicas batem com os contratos e o data model.

---

## 1. Constitution → Plan/Tasks

| Princípio | Como Plan/Tasks atende | Verificado em | Status |
|---|---|---|---|
| **I. Mobile-First** | Tailwind mobile-first; viewport meta sem zoom (T010); shadcn validado em 375/414; bundle ≤ 150 kB; `inputMode` adequado nos forms (T039). | plan.md §Project Structure; T010, T039, T078, T079 | ✅ |
| **II. FIFO Inviolável** | `ORDER BY created_at, id` em todos os reads de fila; índice composto `idx_orders_event_status_created`; teste T030 cobre desempate por id; T052 valida sob concorrência; trigger `generate_sequence_number` com advisory lock evita gaps. | data-model.md §Índices; T012, T014, T030, T052 | ✅ |
| **III. Zero Fricção** | Sem auth do convidado; form único `/pedido` com `client_key` em localStorage; retomada via `/status/<key>`; QR único por evento. | T038, T039, T056 | ✅ |
| **IV. Tempo Real ≤ 2s** | Supabase Realtime via `postgres_changes`; reconexão automática; RPC com transação atômica (T046); polling de fallback de 10s (T054). | research.md §6, contracts/realtime-channels.md, T048, T050, T054 | ✅ |
| **V. Simplicidade & YAGNI** | Single Next app, sem microserviços; auth simples por código; sem Service Worker / push / SMS; nenhum CRUD de cardápio em UI no MVP (T073 explicitamente adiado). | plan.md §Structure Decision; research.md §3, §7; T073 | ✅ |

**Resultado**: 5/5 princípios cobertos sem violação. Tabela de Complexity Tracking permanece vazia. ✓

---

## 2. Restrições Operacionais → Plan/Tasks

| Restrição | Como atendida | Verificado em |
|---|---|---|
| Disponibilidade 99% no evento | Vercel + Supabase tier free oferecem >> 99%; rollback ≤ 1 min documentado; smoke test pré-evento (T081). | quickstart.md §Rollback rápido; T081 |
| FCP ≤ 1.5s em 4G | Next 15 + RSC; bundle alvo ≤ 150 kB (T079). | T079 |
| Confirmação ≤ 1s | `INSERT ... ON CONFLICT` é < 50 ms tipicamente; resposta da API < 200 ms; UI mostra spinner no botão (T039). | T036, T039 |
| Propagação ≤ 2s | Supabase Realtime p95 ≤ 1s típico. | research.md §2; FR-010 |
| Retry em rede instável | Cliente retry 3× com backoff (T039). | T039 |
| Persistência sobrevive a refresh | Estado lido do servidor via `/api/orders/by-client-key` no RSC (T053, T055). | T053, T055 |
| Privacidade (LGPD light) | RLS impede leitura de PII sem código; logs sem PII (T036); função `purge_event` listada como v2. | data-model.md §Privacidade; T036 |

**Resultado**: todas as restrições da constituição mapeadas. ✓

---

## 3. Functional Requirements → Tasks coverage

| FR | Descrição | Task(s) | Cobertura |
|---|---|---|---|
| **FR-001** | URL pública `/pedido` mobile | T038 | ✅ |
| **FR-002** | Geração de QR | T071, T072 | ✅ |
| **FR-003** | Coleta nome/sobrenome/sabor/ingredientes/observação | T024 (zod), T039 (form) | ✅ |
| **FR-004** | Validação client antes do envio | T024 (schema), T039 (form com zodResolver) | ✅ |
| **FR-005** | Idempotência por client_key | T029 (gen), T036 (ON CONFLICT), T034 (test) | ✅ |
| **FR-006** | Persistência completa do pedido | T012 (schema), T036 (insert) | ✅ |
| **FR-007** | Identificador "Nome Sobrenome #042" | T028 (formatter), T033 (test), T036 (retorna) | ✅ |
| **FR-008** | Painel `/cozinha` com auth | T022, T023, T043, T047, T048 | ✅ |
| **FR-009** | Lista FIFO por created_at | T045 (GET orders), T050 (reorder client) | ✅ |
| **FR-010** | Atualização real-time ≤ 2s | T048, T050 | ✅ |
| **FR-011** | Transições válidas de status | T013 (DB CHECK), T025 (domain), T046 (API) | ✅ |
| **FR-012** | Timestamps em transições | T013 (trigger), T046 (insert order_transitions) | ✅ |
| **FR-013** | Sem reordenação manual | (negativo — não há UI de reorder) | ✅ implícito |
| **FR-014** | Tela de status reflete em tempo real | T056 | ✅ |
| **FR-014a** | Identificador em destaque | T057 | ✅ |
| **FR-014b** | Posição na fila + estimativa quando pending | T058, T054 | ✅ |
| **FR-014c** | Tempo decorrido em preparo | T059 | ✅ |
| **FR-014d** | Tela "PRONTO! Retire no balcão" + vibração + som | T060, T062 | ✅ |
| **FR-014e** | tempo_medio_por_crepe configurável | T012 (campos), T053 (retorna no payload) | ✅ |
| **FR-015** | Retomada em ≤ 6h via localStorage | T039 (salva), T056 (retoma) | ✅ |
| **FR-016** | Motivo de cancelamento exibido | T061 | ✅ |
| **FR-017** | Histórico persistente | T012 (DB) | ✅ |
| **FR-018** | Tela de histórico autenticada | T066, T068 | ✅ |
| **FR-019** | Exportar CSV | T067, T070 | ✅ |
| **FR-020** | Configuração de cardápio | T017 (seed), T073 (doc Studio) — UI completa **adiada para v2** | ⚠️ parcial |
| **FR-021** | Mudanças não afetam pedidos antigos | `ingredient_ids` é snapshot de UUIDs (data-model.md), não FK | ✅ por design |
| **FR-022** | Retry automático no envio | T039 (3x backoff exp) | ✅ |
| **FR-023** | Painel reconecta sozinho | T050 (built-in client + refetch após 5s) | ✅ |

**Gaps identificados**:
- **FR-020 está parcial**: o MVP aceita configuração via Supabase Studio, sem UI de CRUD. A Spec marca isso como P3 (US5) e a decisão está documentada em T073. **OK como aceito**, mas vale registrar como _technical debt_ explícito para v2.

---

## 4. Non-Functional Requirements → Validação

| NFR | Descrição | Como validado | Task(s) |
|---|---|---|---|
| NFR-001 | Mobile ≥ 320px | Viewport 375×667 e 414×896 testados | T078, T079 |
| NFR-002 | Uptime 99% | Vercel + Supabase + smoke test | T081 |
| NFR-003 | Realtime ≤ 2s p95 | Medido em e2e (T051) ainda que com margem 3s | T051 |
| NFR-004 | FCP ≤ 1.5s 4G | Lighthouse no T079 | T079 |
| NFR-005 | Confirmação envio ≤ 1s | UX no spinner (T039); medição manual no smoke | T079, T081 |
| NFR-006 | Privacidade | RLS em data-model; logs sem PII | T015, T036 |
| NFR-007 | WCAG AA | Validação no T078 | T078 |
| NFR-008 | Sobrevive refresh | Estado lido do servidor no RSC | T038, T055 |

**Gap**: NFR-002 (99% uptime) **não tem teste automatizado** — depende de plataforma + smoke. Esse é o limite razoável; documentar que a única "prova" é o smoke + monitoramento durante o evento.

---

## 5. User Stories → Phases & Independent Tests

| Story | Prioridade | Phase | Independent Test definido? | Coberto? |
|---|---|---|---|---|
| **US1** Convidado faz pedido | P1 | Phase 3 | ✅ Spec define; T042 testa via DB | ✅ |
| **US2** Cozinha processa fila | P1 | Phase 4 | ✅ Spec + T051 + T052 (concorrência) | ✅ |
| **US3** Status + tempo + retirada | P2 | Phase 5 | ✅ T064, T065 | ✅ |
| **US4** Histórico + CSV | P2 | Phase 6 | ✅ T070 (csv unit) + manual | ✅ |
| **US5** Cardápio + QR | P3 | Phase 7 | ✅ T071 (QR funcional) | ⚠️ parcial (sem UI de CRUD) |

---

## 6. Entities → Schema → API → UI consistency

| Entidade (Spec) | Tabela (Data Model) | API (Contracts) | UI (Tasks) | Consistente? |
|---|---|---|---|---|
| Order | `orders` | POST /api/orders, GET /api/orders, GET by-client-key, transition | order-form, order-card, status-screen | ✅ |
| Flavor | `flavors` + `flavor_ingredients` | GET /api/event/active | flavor-picker | ✅ |
| Ingredient | `ingredients` | GET /api/event/active | ingredient-checklist | ✅ |
| Event | `events` (+ view `events_public`) | GET /api/event/active | qr/page, login | ✅ |
| OrderTransition | `order_transitions` | gravado em transition | (não exposto em UI no MVP) | ✅ |

**Discrepância detectada e resolvida**: a Spec menciona "número sequencial do pedido no evento" no FR-007 e o Data Model define `sequence_number` único por evento. ✓ Casa.

---

## 7. Acceptance Scenarios → Tests

| Story | Scenario | Test (e2e/unit) |
|---|---|---|
| US1 #1 | Form preenchido → confirmação ≤ 1s | T042 (e2e parcial), tempo medido no smoke (T081) |
| US1 #2 | Bloqueio se nome vazio | T039 (zod no client) — falta teste explícito ⚠️ |
| US1 #3 | Retry após perda de rede | T039 (impl) — falta teste ⚠️ |
| US1 #4 | Double-tap → 1 pedido | T036 (ON CONFLICT) + T034 (idempotency unit) |
| US2 #1 | 3 pedidos em ordem | T052 (concurrency e2e) |
| US2 #2 | Novo pedido aparece em ≤ 2s | T051 (e2e) |
| US2 #3 | Finalizar → sai da lista + status_done | T051 (e2e) |
| US2 #4 | Reconexão Realtime | T050 (impl) — falta e2e ⚠️ |
| US3 #1 | Posição correta na fila | T030 (unit), T058 (impl) |
| US3 #2 | Posição decresce ao finalizar quem está à frente | (impl T050+T054) — **falta teste** ⚠️ |
| US3 #3 | Em preparo mostra tempo decorrido | T059 (impl) — sem teste explícito |
| US3 #4 | "Pronto" com vibração e tela full-screen | T064 (e2e parcial) — vibração não é testável em e2e (Playwright limitado) |
| US3 #5 | Retomar tela após fechar aba | T065 (e2e) |

**Gaps de teste identificados** (não bloqueantes, mas vale registrar):
1. Validação client de campo vazio (US1 #2) — adicionar a T042 como sub-step ou criar T042b.
2. Retry de rede (US1 #3) — difícil em e2e; aceitar cobertura manual na smoke checklist.
3. Reconexão Realtime (US2 #4) — testar manualmente; e2e seria flaky.
4. Decremento de posição em tempo real (US3 #2) — adicionar a T065 como sub-step.

**Recomendação**: registrar esses gaps como **TODOs em comentários nos arquivos de teste correspondentes**, não como tasks novas (princípio V — Simplicidade).

---

## 8. Success Criteria → Mensuração

| SC | Como medir | Quando |
|---|---|---|
| SC-001 (60s para completar) | Cronômetro manual em festa-piloto + Vercel Analytics (event "order_submitted" - "page_loaded") | Pós-piloto |
| SC-002 (≤1% falha) | Logs do Vercel + tabela `orders` vs tentativas (precisa de log adicional) | Durante evento |
| SC-003 (≤2s latência) | Medição manual no smoke (T081); idealmente instrumentar `client_event_received_at - server_inserted_at` | Smoke + piloto |
| SC-004 (99% uptime) | StatusCake/UptimeRobot externo durante o evento | Durante evento |
| SC-005 (FIFO 100%) | Testes T030, T052; auditoria do `order_transitions` pós-evento | Sempre |
| SC-006 (persistência 100%) | Validar count(orders) == count(formulários enviados) — manual | Pós-piloto |
| SC-007 (90% sem ajuda) | Observação humana | Pós-piloto |
| SC-008 (estimativa ±50%) | Comparar `(finished_at - created_at)` vs `estimated_wait_seconds` no histórico | Pós-piloto |
| SC-009 (90% retiram em 90s) | Cozinha cronometra entrega-aviso → retirada | Pós-piloto |

**Gap**: nenhuma task instrumenta SC-002, SC-003, SC-008, SC-009 com dados próprios — dependem de medição manual ou ferramenta externa. **Aceitável** no MVP, pode virar feature de v2 ("Dashboard de métricas"). Já anotado em research.md §11.

---

## 9. Riscos & Recomendações

### Riscos identificados

1. **Vibration API em iOS Safari**: documentado em research.md §7 — fallback visual obrigatório, OK.
2. **Wi-Fi do local de festa instável**: retry no client + Realtime reconnect mitiga, mas **não há modo offline**. Aceito; backup é caderno (quickstart.md).
3. **Concorrência no `sequence_number`**: advisory lock resolve. Testar T014 manualmente com 50 INSERTs paralelos antes do evento.
4. **Free tier Supabase Realtime tem limite de conexões concorrentes** (atualmente 200 client connections). Para 100 convidados + cozinha, está confortável. **Atenção** se a festa for > 200.
5. **Bundle inflado**: shadcn é tree-shaken, mas se importarem componentes em excesso pode estourar 150 kB. T079 valida.

### Recomendações antes de iniciar a implementação

1. **Antes do Phase 5** (US3): reler FR-014a–e em voz alta com alguém para validar que a tela de status está completa.
2. **Adicionar a T036** uma decisão sobre payload conflitante (mesmo `client_key`, dados diferentes): é raro mas possível se o usuário mudar campos sem refresh — atualmente T036 retorna 409, o que pode confundir. **Sugestão**: aceitar idempotência só se o **payload completo** (excluindo `client_key`) for igual ao gravado. Em T036 isso já está descrito; verificar implementação.
3. **Adicionar uma task** explícita pra desabilitar o botão "Iniciar preparo" no painel da cozinha quando outra cozinha (em outro dispositivo) já tiver iniciado o mesmo pedido — caso contrário pode haver doubled UPDATE. (Race condition: dois operadores tocam ao mesmo tempo). Resolução: o `pending → in_progress` deve ser idempotente em SQL — usar `UPDATE ... WHERE status = 'pending'` e checar `rowCount`.

### Sugestões para incorporar antes de `/speckit-implement`

- [ ] **Adicionar T046b**: garantir que `UPDATE orders SET status = 'in_progress' WHERE id = ? AND status = 'pending'` retorne 0 rows se outro operador já transicionou — devolver 409 amigável "Outro operador já iniciou este pedido".
- [ ] **Adicionar T036b**: comparar payload em conflito de idempotência; se igual, retornar 200 com a row existente; se diferente, retornar 409 com mensagem clara.
- [ ] **Documentar limite de Realtime** em quickstart.md (warning para festas > 200 convidados).

---

## 10. Veredicto

| Aspecto | Status |
|---|---|
| Constitution alinhada | ✅ |
| Cobertura RF | ✅ (com FR-020 parcial aceito) |
| Cobertura NFR | ✅ |
| Cobertura US | ✅ |
| Consistência Spec ↔ Plan ↔ Data Model ↔ API ↔ Tasks | ✅ |
| Riscos identificados | ✅ documentados |
| Pronto para `/speckit-implement` | ✅ **com 3 ajustes recomendados acima** |

**Recomendação final**: aplicar os 3 ajustes da §9 (T046b, T036b, doc de limite Realtime) e iniciar a implementação pela Phase 1 + Phase 2.
