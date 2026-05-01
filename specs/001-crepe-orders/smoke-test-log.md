# Smoke Test Log — Crepe Orders

## Checklist pré-evento (T081)

Executar antes de cada festa. Marcar ✅ ou ❌ com observação.

### Infraestrutura
- [ ] Supabase online: `supabase status` mostra `supabase local development setup is running`
- [ ] Variáveis de ambiente configuradas em `.env.local`
- [ ] Deploy no Vercel (ou `npm run build && npm start`) sem erros
- [ ] Evento ativo criado no banco com `kitchen_code_hash` configurado

### Jornada do Convidado
- [ ] Abrir `/pedido?event=<id>` em celular 375px — formulário renderiza
- [ ] Preencher nome + sobrenome + sabor + ingrediente + obs → Enviar
- [ ] Confirmação visual em ≤ 1s
- [ ] Redirecionamento para `/status/<client_key>`
- [ ] Status mostra "Na fila" com posição e estimativa

### Painel da Cozinha
- [ ] Abrir `/cozinha/login` → autenticar com código do evento
- [ ] Pedido enviado acima aparece em ≤ 2s sem F5
- [ ] Clicar "Iniciar preparo" → card move para "EM PREPARO", timer inicia
- [ ] Tela do convidado muda para "Em preparo" em ≤ 2s
- [ ] Clicar "Finalizar" → card sai da lista
- [ ] Tela do convidado mostra "PRONTO! Retire no balcão" em ≤ 2s
- [ ] Vibração disparada no celular (se permitido pelo navegador)

### QR Code
- [ ] Abrir `/qr` → QR Code gerado apontando para URL correta
- [ ] Escanear QR com celular → abre formulário do pedido
- [ ] "Baixar PNG" → arquivo salvo no dispositivo
- [ ] "Imprimir" → layout print mostra apenas o QR

### Histórico
- [ ] Abrir `/historico` → pedido finalizado aparece
- [ ] Filtro por status "Finalizado" funciona
- [ ] "Exportar CSV" → arquivo baixado com dados corretos

### Resiliência
- [ ] Double-tap no botão Enviar → apenas 1 pedido no banco
- [ ] Cancelar pedido na cozinha → convidado vê "Cancelado" em ≤ 2s
- [ ] Desconectar internet no tablet da cozinha por 30s → ao reconectar, painel sincroniza

---

## Registros de execução

| Data | Executado por | Resultado | Observações |
|---|---|---|---|
| — | — | — | Primeira execução pendente |
