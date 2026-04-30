# Crepe Constitution
<!-- Web app de pedidos de crepe para festas de aniversário, com fluxo convidado → cozinha via QR Code -->

## Core Principles

### I. Mobile-First (NON-NEGOTIABLE)
Toda a jornada do convidado é projetada para celular em portrait. Componentes precisam funcionar em telas a partir de 320px de largura, com toques (não hover) e teclado virtual sempre considerados. Nenhuma funcionalidade do convidado pode depender de desktop. Painel da cozinha pode ser otimizado para tablet/desktop, mas nunca em detrimento da experiência mobile do convidado.

### II. FIFO Inviolável (NON-NEGOTIABLE)
A ordem de preparo na cozinha segue estritamente a ordem de chegada do pedido (`created_at`). Não existe priorização manual, "fura-fila" ou reordenação por tipo de crepe. Quando dois pedidos chegam no mesmo instante, o desempate é determinístico (ex.: ID monotônico). Qualquer recurso que viole FIFO precisa de emenda explícita à constituição.

### III. Zero Fricção no Convidado
O convidado não cria conta, não confirma e-mail, não baixa app. O fluxo é: escanear QR → preencher (nome, sobrenome, ingredientes) → enviar → ver status. Nenhum campo opcional que não agregue valor direto à preparação do crepe. Se um campo pode ser omitido sem afetar o pedido, ele não existe.

### IV. Tempo Real para a Cozinha
A cozinha vê novos pedidos com latência ≤ 2 segundos a partir do envio. Estados do pedido (pendente, em preparo, finalizado) propagam em tempo real (WebSocket / SSE / Realtime DB). Nenhum F5 manual deve ser necessário durante o serviço.

### V. Simplicidade & YAGNI
O escopo é uma festa, não um produto SaaS. Não construímos: multi-tenant, autenticação de convidado, pagamento, cardápio dinâmico CRUD complexo, analytics, i18n, dark mode, notificações push. Toda feature além do fluxo `convidado → fila → cozinha → finalizado` precisa de justificativa escrita. Em dúvida entre uma solução simples e uma genérica, vence a simples.

## Restrições Operacionais

- **Disponibilidade**: 99% durante a janela do evento (mínimo 4h contínuas sem indisponibilidade > 1min). Fora do evento, indisponibilidade é aceitável.
- **Desempenho**: First Contentful Paint ≤ 1.5s em 4G; envio de pedido com confirmação visual ≤ 1s; propagação para a cozinha ≤ 2s.
- **Tolerância a rede instável**: A tela de envio precisa lidar com retry automático em caso de falha de rede; pedido nunca pode ser perdido silenciosamente.
- **Persistência**: Pedidos finalizados ficam armazenados em base de dados, recuperáveis após o evento. Pedidos em andamento sobrevivem a refresh do navegador (estado lido do servidor, não apenas do cliente).
- **Privacidade**: Nome e sobrenome são dados pessoais; usar apenas para identificação do pedido, não compartilhar com terceiros, não persistir além do evento sem consentimento.

## Workflow & Quality Gates

- **Spec antes de código**: Toda feature passa pelo fluxo Spec-Kit (`specify → clarify → plan → tasks → implement`). Código sem spec correspondente é rejeitado.
- **Validação de UI mobile**: Toda alteração na jornada do convidado é testada em viewport 375×667 (iPhone SE) e 414×896 (iPhone 11) antes do merge.
- **Testes de fila**: Lógica de FIFO tem teste automatizado obrigatório (unit ou integração) cobrindo: ordem por timestamp, desempate determinístico, e estados de transição.
- **Smoke test pré-evento**: Antes de cada festa, rodar checklist: QR aponta para URL correta, painel cozinha conecta em tempo real, pedido de teste sai da fila ao ser finalizado, banco grava pedido finalizado.
- **Reversibilidade**: Toda mudança em produção durante o evento precisa ter rollback < 1 min (feature flag, deploy anterior, ou variável de ambiente).

## Governance

Esta constituição prevalece sobre quaisquer práticas posteriores. Toda PR deve verificar conformidade com os 5 princípios; violações exigem emenda registrada antes do merge. Complexidade adicional precisa ser justificada por escrito no `plan.md` da feature. Em conflito entre princípios, a ordem de precedência é: II (FIFO) > IV (Tempo Real) > I (Mobile-First) > III (Zero Fricção) > V (Simplicidade). Ambiguidades devem ser resolvidas em sessão de `/speckit-clarify` antes de virarem código.

**Version**: 1.0.0 | **Ratified**: 2026-04-30 | **Last Amended**: 2026-04-30
