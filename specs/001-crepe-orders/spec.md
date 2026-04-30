# Feature Specification: Crepe Orders — Fluxo Convidado → Cozinha

**Feature Branch**: `001-crepe-orders`
**Created**: 2026-04-30
**Status**: Draft
**Input**: User description: "Web app que o convidado da festa acessa via QR code, preenche nome e sobrenome, monta o pedido (crepe + ingredientes), envia para a cozinha. A cozinha visualiza os pedidos em fila FIFO e, ao finalizar, o pedido é gravado no histórico."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Convidado faz um pedido (Priority: P1)

Um convidado chega à festa, vê o QR code afixado em um totem/mesa, escaneia com a câmera do celular e abre uma página web mobile-first. Preenche nome e sobrenome, escolhe um sabor de crepe a partir do cardápio do dia, marca os ingredientes/recheios desejados, opcionalmente adiciona uma observação curta (ex.: "sem açúcar"), e toca em **Enviar**. Recebe na tela uma confirmação de que o pedido entrou na fila, com um identificador visível (ex.: número curto ou primeiro nome) para reconhecer o pedido quando chamado.

**Why this priority**: É o coração do produto. Sem essa jornada não existe valor — toda a constituição se ancora nela. Sem ela, não há pedido para a cozinha processar.

**Independent Test**: Pode ser totalmente testado abrindo a URL no celular, preenchendo o formulário e verificando que o pedido aparece persistido (mesmo que a tela da cozinha ainda não exista — basta inspecionar o registro no banco de dados). Entrega o valor de "captura de pedido digital sem fricção".

**Acceptance Scenarios**:

1. **Given** um convidado abre a URL pelo QR no celular, **When** ele preenche todos os campos obrigatórios e toca em Enviar, **Then** o sistema confirma visualmente em ≤ 1 s e exibe o status "Na fila" com o identificador do pedido.
2. **Given** o convidado tentou enviar com nome em branco, **When** toca em Enviar, **Then** o sistema bloqueia o envio e destaca o campo faltante.
3. **Given** o convidado perde conexão durante o envio, **When** a rede volta dentro de 30 s, **Then** o pedido é enviado automaticamente sem que ele precise reescrever os dados.
4. **Given** o convidado dá dois toques rápidos no botão Enviar, **When** o segundo toque ocorre dentro de 2 s, **Then** apenas um pedido é registrado.

---

### User Story 2 — Cozinha vê e processa a fila (Priority: P1)

O operador da cozinha abre o painel em um tablet/celular/laptop posicionado na bancada de preparo. O painel mostra todos os pedidos pendentes na ordem em que chegaram (mais antigo no topo). Para cada pedido, vê o nome do convidado, o sabor escolhido, os ingredientes marcados e a observação. Quando começa a preparar, toca em **Iniciar preparo**; o card muda para "Em preparo". Quando termina, toca em **Finalizar**; o card sai da fila e o convidado vê seu status atualizar.

**Why this priority**: Sem o painel da cozinha, os pedidos enviados acumulam sem destino. P1 junto com a US 1 — os dois precisam coexistir para fechar o loop mínimo de valor.

**Independent Test**: Pode ser testado injetando pedidos de teste no banco e abrindo o painel: a fila deve carregar em ordem, transições de estado devem funcionar, e novos pedidos inseridos enquanto o painel está aberto devem aparecer em ≤ 2 s sem F5.

**Acceptance Scenarios**:

1. **Given** existem 3 pedidos pendentes (A criado às 19:00, B às 19:01, C às 19:02), **When** a cozinha abre o painel, **Then** vê A no topo, depois B, depois C.
2. **Given** o painel está aberto e exibe 2 pedidos, **When** um novo pedido chega, **Then** aparece no painel em ≤ 2 s sem ação manual e ocupa a posição correta da fila.
3. **Given** a cozinha toca em "Finalizar" no pedido A, **When** a ação é confirmada, **Then** o pedido sai da lista de pendentes, é gravado como finalizado com timestamp, e o convidado vê o status "Pronto".
4. **Given** a cozinha cai a internet por 30 s, **When** a conexão volta, **Then** o painel reconecta sozinho e refaz a sincronização sem perder pedidos.

---

### User Story 3 — Convidado acompanha status, tempo e é chamado para retirar (Priority: P2)

Após enviar o pedido, o convidado permanece em uma tela de status que exibe:
- O **identificador** do pedido (nome + sobrenome + número, ex.: "Maria Silva #042") em destaque.
- O **estado atual**: "Na fila" → "Em preparo" → "Pronto — retire no balcão".
- A **posição atual na fila** (quando estado = "Na fila"; ex.: "3º na fila").
- Uma **estimativa de tempo de espera** calculada como `posição × tempo_médio_por_crepe` (configurável; default razoável definido pelo anfitrião antes do evento), atualizada em tempo real conforme a fila avança.
- O **tempo decorrido** desde o envio.

Quando a cozinha marca o pedido como "Pronto", a tela do convidado muda imediatamente para um estado de destaque visual ("**PRONTO! Retire no balcão**" — alto contraste, com vibração leve no celular se permitida pelo navegador) para chamar a atenção mesmo se o celular estiver no bolso ou a tela esmaecida.

A tela continua viva mesmo se o convidado bloquear/desbloquear o celular ou fechar e reabrir a aba (estado retomado via identificador local em até 6 h).

**Why this priority**: Reduz ansiedade do convidado, diminui interrupções do tipo "meu crepe já saiu?" e garante que ele saiba que pode buscar no balcão. P2 porque o loop mínimo (US 1 + US 2) ainda funciona sem essa tela rica — a cozinha pode chamar verbalmente em última instância — mas a experiência fica muito melhor com ela.

**Independent Test**: Enviar um pedido, observar a tela mostrando posição na fila e tempo estimado; mudar manualmente o estado no banco para "in_progress", depois "done"; verificar que cada transição reflete em ≤ 2 s e que o estado "Pronto" é visualmente inconfundível.

**Acceptance Scenarios**:

1. **Given** o pedido foi enviado e está com status "Na fila" na 3ª posição, **When** a tela renderiza, **Then** exibe "3º na fila" e estimativa de espera ≈ 3 × tempo_médio_por_crepe.
2. **Given** o pedido na frente do convidado (2ª posição) é finalizado, **When** o evento propaga, **Then** a tela do convidado atualiza para "2º na fila" e a estimativa decresce em ≤ 2 s.
3. **Given** o pedido está "Em preparo", **When** a tela renderiza, **Then** exibe "Em preparo" e o tempo decorrido desde o início do preparo, sem mais mostrar posição na fila.
4. **Given** a cozinha marca o pedido como "Pronto", **When** a transição propaga, **Then** a tela do convidado em ≤ 2 s exibe "PRONTO! Retire no balcão" com destaque visual de alto contraste e dispara vibração/aviso sonoro (best-effort).
5. **Given** o convidado fechou a aba após enviar, **When** ele reabre a URL no mesmo dispositivo dentro de 6 h, **Then** vê o status atual e a estimativa correta sem precisar reenviar nada.

---

### User Story 4 — Histórico de pedidos finalizados (Priority: P2)

Após o evento, o anfitrião acessa uma tela protegida com a lista de todos os pedidos finalizados (nome, sabor, ingredientes, hora de criação, hora de finalização, duração total). Pode exportar como CSV.

**Why this priority**: Útil para análise pós-festa (consumo, tempo médio de preparo, sabores favoritos). Não é necessário durante o evento — daí P2.

**Independent Test**: Após uma sessão de pedidos, abrir a tela de histórico e validar que todos os finalizados aparecem com os campos corretos e ordenação por hora de finalização.

**Acceptance Scenarios**:

1. **Given** 10 pedidos foram finalizados durante o evento, **When** o anfitrião abre a tela de histórico, **Then** vê os 10 pedidos com todos os campos preenchidos.
2. **Given** o anfitrião toca em Exportar CSV, **When** o download conclui, **Then** o arquivo contém 10 linhas + header com os mesmos dados visíveis na tela.

---

### User Story 5 — Anfitrião configura o cardápio do evento (Priority: P3)

Antes do evento, o anfitrião define quais sabores estarão disponíveis e quais ingredientes podem ser combinados (ex.: "Crepe doce" com ingredientes [chocolate, morango, banana, leite condensado]; "Crepe salgado" com [queijo, presunto, frango, tomate]).

**Why this priority**: O MVP pode rodar com cardápio fixo definido em arquivo de configuração/seed. Uma UI de edição é melhoria, não requisito mínimo. P3.

**Independent Test**: Editar o cardápio (via UI ou arquivo), recarregar a página do convidado, e verificar que as novas opções aparecem.

**Acceptance Scenarios**:

1. **Given** o anfitrião adicionou um novo sabor "Crepe nutella" com ingredientes [nutella, morango, banana], **When** um convidado abre o formulário, **Then** o novo sabor aparece como opção.
2. **Given** o anfitrião removeu um ingrediente, **When** o convidado abre o formulário, **Then** o ingrediente removido não aparece — pedidos antigos que o continham permanecem inalterados no histórico.

---

### Edge Cases

- **Pedido duplicado por double-tap**: idempotência por chave de cliente (ex.: UUID gerado no client) garante que múltiplos retries do mesmo envio resultem em apenas um registro.
- **Convidado escaneia QR em laptop/desktop**: a página deve funcionar (não bloquear), mas é otimizada para celular.
- **Caracteres especiais no nome** (acentos, emojis, sobrenomes compostos com espaço): devem ser aceitos e exibidos corretamente no painel.
- **Pedido enviado mas cozinha nunca finaliza**: ao fim do evento, anfitrião pode marcar pedidos pendentes em massa como "cancelado" para fechar o histórico.
- **Cancelamento pela cozinha**: a cozinha pode marcar um pedido como cancelado (ex.: ingrediente acabou) com motivo curto; o convidado é notificado na tela de status.
- **Janela longa de inatividade no painel da cozinha**: se o painel fica > 5 min sem foco, ao retomar deve refazer fetch do estado atual em vez de confiar em cache.
- **QR escaneado fora da janela do evento**: a página exibe mensagem "Evento não está ativo" se a config indicar evento fechado, em vez de aceitar pedidos órfãos.
- **Limite de comprimento da observação**: campo livre limitado a 140 caracteres para evitar abuso.

## Requirements *(mandatory)*

### Functional Requirements

#### Captura de pedido
- **FR-001**: O sistema MUST expor uma URL pública de pedido (ex.: `/pedido`) acessível sem autenticação, projetada para celular.
- **FR-002**: O sistema MUST gerar e disponibilizar um QR code que aponta para a URL de pedido, exportável em PNG/SVG para impressão.
- **FR-003**: O sistema MUST coletar do convidado: nome (obrigatório), sobrenome (obrigatório), sabor do crepe (obrigatório, escolha única do cardápio ativo), ingredientes (zero ou mais, multi-seleção do cardápio do sabor escolhido), observação (opcional, ≤ 140 caracteres).
- **FR-004**: O sistema MUST validar campos obrigatórios no client antes do envio e exibir mensagens de erro inline.
- **FR-005**: O sistema MUST garantir idempotência do envio: dois envios consecutivos do mesmo formulário (mesma chave de cliente) gravam apenas um pedido.
- **FR-006**: O sistema MUST persistir cada pedido com: id único, nome, sobrenome, sabor, ingredientes, observação, `created_at` (timestamp servidor), `status` inicial = "pending".
- **FR-007**: O sistema MUST retornar ao convidado um identificador composto por **nome + sobrenome + número sequencial do pedido no evento** (ex.: "Maria Silva #042"), exibido com destaque na tela de status para que ela mesma e a cozinha possam localizar o pedido visualmente.

#### Painel da cozinha
- **FR-008**: O sistema MUST oferecer uma URL de painel (ex.: `/cozinha`) com acesso restrito por código/senha simples definido pelo anfitrião.
- **FR-009**: O painel MUST listar todos os pedidos com status "pending" ou "in_progress" em ordem ascendente de `created_at`.
- **FR-010**: O painel MUST atualizar em tempo real (≤ 2 s) ao receber novos pedidos ou mudanças de estado, sem F5.
- **FR-011**: O sistema MUST permitir transições de status: `pending → in_progress`, `in_progress → done`, e (de qualquer um) `→ cancelled` com motivo curto opcional.
- **FR-012**: As transições MUST ser registradas com timestamp de cada mudança.
- **FR-013**: O sistema MUST impedir reordenação manual da fila — a ordem é sempre por `created_at`.

#### Status do convidado
- **FR-014**: Após enviar, o convidado MUST ver uma tela de status que reflete em tempo real o estado atual do seu pedido (`pending` | `in_progress` | `done` | `cancelled`).
- **FR-014a**: A tela MUST exibir o identificador completo (nome + sobrenome + número sequencial) em destaque.
- **FR-014b**: Quando o status é `pending`, a tela MUST exibir a **posição atual na fila** e uma **estimativa de tempo de espera** = `posição × tempo_médio_por_crepe`, atualizadas em tempo real conforme a fila avança.
- **FR-014c**: Quando o status é `in_progress`, a tela MUST exibir o **tempo decorrido desde o início do preparo** e ocultar a posição na fila.
- **FR-014d**: Quando o status muda para `done`, a tela MUST trocar imediatamente para um estado de destaque visual de alto contraste com a mensagem **"PRONTO! Retire no balcão"** e disparar feedback ativo (vibração via Vibration API e/ou som curto), sujeitos à permissão do navegador (best-effort, falha silenciosa se negado).
- **FR-014e**: O sistema MUST suportar configuração do `tempo_médio_por_crepe` por evento (default sugerido: 5 min); idealmente um valor por sabor, com fallback global.
- **FR-015**: O sistema MUST permitir ao convidado retomar a tela de status ao reabrir a URL no mesmo dispositivo dentro de 6 h (via identificador armazenado no client, ex.: localStorage).
- **FR-016**: Em caso de cancelamento pela cozinha, o sistema MUST exibir o motivo na tela do convidado.

#### Histórico
- **FR-017**: O sistema MUST gravar todos os pedidos finalizados (`done` ou `cancelled`) em armazenamento persistente recuperável após o evento.
- **FR-018**: O sistema MUST oferecer uma tela de histórico, protegida pelo mesmo acesso do painel, listando pedidos finalizados com filtro por data e status.
- **FR-019**: O sistema MUST permitir exportar o histórico em CSV.

#### Cardápio
- **FR-020**: O sistema MUST suportar configuração de cardápio (sabores e ingredientes por sabor) por arquivo de configuração ou tela administrativa.
- **FR-021**: Mudanças de cardápio MUST se aplicar apenas a novos pedidos; pedidos já existentes preservam seu conteúdo original.

#### Confiabilidade
- **FR-022**: O sistema MUST tratar falha de rede no envio com retry automático (até 3 tentativas com backoff exponencial) preservando os dados do formulário.
- **FR-023**: O painel da cozinha MUST reconectar automaticamente se a conexão em tempo real cair.

### Non-Functional Requirements

- **NFR-001 (Mobile-first)**: A jornada do convidado MUST funcionar perfeitamente em viewports a partir de 320 px de largura.
- **NFR-002 (Disponibilidade)**: O sistema MUST atingir 99% de uptime durante a janela do evento (mínimo 4 h contínuas com indisponibilidade < 1 min).
- **NFR-003 (Latência tempo-real)**: Propagação de eventos pedido→cozinha e cozinha→convidado ≤ 2 s no p95.
- **NFR-004 (Performance)**: First Contentful Paint ≤ 1.5 s em conexão 4G no formulário do convidado.
- **NFR-005 (Confirmação)**: Após o toque em Enviar com sucesso, confirmação visual em ≤ 1 s.
- **NFR-006 (Privacidade)**: Dados pessoais (nome, sobrenome) são armazenados apenas para identificação do pedido, não compartilhados com terceiros, e podem ser apagados após o evento sob solicitação.
- **NFR-007 (Acessibilidade)**: Formulário do convidado MUST atender contraste WCAG AA e navegação por teclado virtual (labels associadas, autocompletar adequado).
- **NFR-008 (Resiliência)**: Pedido em andamento MUST sobreviver a refresh do navegador (estado lido do servidor).

### Key Entities

- **Order (Pedido)**: representa um pedido de crepe. Atributos: id, client_key (idempotência), nome, sobrenome, flavor_id, ingredient_ids[], observacao, status (`pending` | `in_progress` | `done` | `cancelled`), motivo_cancelamento (opcional), created_at, started_at, finished_at.
- **Flavor (Sabor)**: opção de base do crepe disponível no cardápio. Atributos: id, nome, categoria (`doce` | `salgado`), ingredientes_compatíveis[], tempo_medio_preparo (segundos, opcional — fallback para o tempo global do evento), ativo (boolean).
- **Ingredient (Ingrediente)**: item que compõe um pedido. Atributos: id, nome, ativo (boolean).
- **Event (Evento)**: contexto da festa. Atributos: id, nome, data_inicio, data_fim, codigo_acesso_cozinha (hash, **mesmo código também controla acesso ao histórico**), tempo_medio_preparo_global (em segundos, default 300). Há tipicamente um evento ativo por vez.
- **OrderTransition**: log das mudanças de status. Atributos: id, order_id, de_status, para_status, timestamp, ator (`guest` | `kitchen` | `host`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Tempo de pedido)**: 95% dos convidados completam o pedido (do scan do QR ao toque em Enviar) em ≤ 60 s.
- **SC-002 (Taxa de erro)**: ≤ 1% dos envios falham permanentemente (após retries) durante o evento.
- **SC-003 (Latência percebida)**: 95% das transições de estado aparecem na tela do destinatário em ≤ 2 s.
- **SC-004 (Disponibilidade)**: O sistema fica disponível ≥ 99% do tempo da janela do evento.
- **SC-005 (FIFO correto)**: 100% dos pedidos são exibidos no painel em ordem estritamente crescente de `created_at` — divergência é defeito bloqueante.
- **SC-006 (Persistência)**: 100% dos pedidos finalizados estão recuperáveis no histórico após o evento.
- **SC-007 (Conclusão sem ajuda)**: ≥ 90% dos convidados completam o pedido sem precisar de assistência humana (medido por observação na primeira festa-piloto).
- **SC-008 (Acurácia da estimativa)**: O tempo real de espera fica dentro de ±50% da estimativa exibida em ≥ 80% dos pedidos. Erros maiores indicam que o `tempo_médio_por_crepe` precisa ser recalibrado.
- **SC-009 (Retirada após "Pronto")**: ≥ 90% dos convidados retiram o crepe no balcão dentro de 90 s após o estado mudar para "Pronto" (medido pela cozinha em festa-piloto). Métrica que valida que o aviso visual + vibração está funcionando.

## Assumptions

- O evento tem um único cardápio ativo durante sua janela; multi-cardápio simultâneo está fora de escopo.
- Cada submissão do formulário é um pedido individual; não há "carrinho" com múltiplos crepes — se um convidado quer dois crepes, envia o formulário duas vezes. *(Decisão padrão tomada na ausência de clarify; reverter exigiria emenda.)*
- A cozinha tem ao menos um dispositivo dedicado ao painel, com conexão à internet do local da festa.
- O QR code é gerado uma vez antes do evento e impresso/exibido em totens; sua URL é fixa por evento.
- A janela de retomada da tela de status pelo convidado é 6 h (suficiente para a duração média de uma festa).
- A proteção do painel da cozinha é por código curto compartilhado verbalmente, não por login individual — coerente com o princípio de Simplicidade. **O mesmo código protege a tela de histórico.**
- O anfitrião gerencia o cardápio antes do evento; mudanças no meio do evento são suportadas mas raras.
- O modelo de retirada é **balcão**: a cozinha NÃO entrega na mesa. Quando o pedido fica pronto, o convidado é avisado pela tela e busca presencialmente. Por isso o aviso "Pronto" precisa ser visualmente forte e usar feedback ativo (vibração/som best-effort).
- O tempo estimado de espera é uma **aproximação otimizada para reduzir ansiedade**, não uma promessa contratual. Erros de ±50% são aceitáveis; o anfitrião deve recalibrar o `tempo_médio_por_crepe` se observar desvios sistemáticos.
- Pagamento, cardápio com preços, taxa de serviço, gorjeta: todos fora de escopo (festa, não comércio).
- LGPD: nome e sobrenome são tratados como dado pessoal mas o consentimento é tácito ao acessar o QR; uma nota curta de privacidade no rodapé do formulário satisfaz o requisito mínimo. *(Verificar com clarify se o caso de uso justifica algo mais formal.)*
- Vibration API e Web Audio podem não funcionar em todos os navegadores (Safari iOS restringe vibration); o aviso visual é o fallback obrigatório.
