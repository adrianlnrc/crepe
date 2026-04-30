# Quickstart — Crepe Orders

Como rodar o projeto local, fazer deploy e operar o sistema durante uma festa.

## Pré-requisitos

- **Node.js 22 LTS** (`nvm install 22 && nvm use 22`)
- **pnpm 9+** (ou npm/yarn — exemplos abaixo usam pnpm)
- **Supabase CLI** (`brew install supabase/tap/supabase`) — para rodar Postgres local
- Conta na **Vercel** e **Supabase** (free tier serve)

## Setup local

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir Postgres local com Supabase
supabase start
# anota as URLs e keys que aparecem no output

# 3. Rodar migrações
supabase db push   # ou: supabase migration up

# 4. Configurar .env.local
cp .env.example .env.local
# Edita: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 5. Seed de demonstração (cria evento "Festa Demo" + cardápio)
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/migrations/0099_seed_demo.sql

# 6. Rodar Next em dev
pnpm dev
```

Abrir no celular (ou DevTools no modo mobile):
- `http://localhost:3000/pedido?event=<event_id_do_seed>` — formulário do convidado
- `http://localhost:3000/cozinha` — painel (login com código `1234` no seed)
- `http://localhost:3000/historico` — histórico

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Anon key (RLS protege) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Service Role para mutations privilegiadas |
| `KITCHEN_SESSION_SECRET` | server only | Segredo HMAC para assinar o cookie de sessão da cozinha |
| `NEXT_PUBLIC_DEFAULT_TEMPO_PREPARO` | client | Default de fallback para tempo médio (segundos), usado se o evento não definir |

## Comandos

```bash
pnpm dev              # Next dev server
pnpm build            # build prod
pnpm start            # roda build localmente
pnpm test             # vitest unit
pnpm test:e2e         # playwright e2e (precisa de servidor rodando)
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm format           # prettier
```

## Deploy

### Supabase (uma vez por ambiente)

1. Criar projeto no [supabase.com](https://supabase.com).
2. `supabase link --project-ref <ref>`
3. `supabase db push` para aplicar migrations.
4. Anotar URL, Anon Key e Service Role Key.

### Vercel

1. `vercel link`
2. Configurar variáveis de ambiente no dashboard (mesmas do `.env.local` apontando para o Supabase de prod).
3. `vercel --prod` ou push pro `main` se conectado ao GitHub.
4. Apontar domínio (opcional): `crepe.<seu-dominio>.com`.

## Criando um novo evento

1. Logar no painel da cozinha com qualquer código existente OU usar Supabase Studio.
2. Inserir uma linha em `events` com `is_active = true` e `kitchen_code_hash = bcrypt('<seu-codigo>')`. Hash gerado com:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('1234', 10))"
   ```
3. Inserir flavors e ingredients via Supabase Studio ou seed customizado.
4. Acessar `/qr` (autenticado) para gerar e baixar o PNG do QR code do novo evento.
5. Imprimir e afixar.

## Limites de capacidade conhecidos

> **⚠️ Atenção — Supabase Realtime free tier**: limite de **200 conexões concorrentes** simultâneas no plano gratuito (verificar em [supabase.com/pricing](https://supabase.com/pricing) — pode mudar). Cada convidado com a tela de status aberta + cada dispositivo da cozinha consome 1 conexão.
>
> **Estimativa para esta festa (~85 convidados)**: ~85-100 conexões concorrentes no pico (convidados + 1-2 dispositivos da cozinha). **Folga de mais de 2x sobre o limite — sem risco de teto.**
>
> **Para festas futuras acima de 180 convidados**: upgrade para Supabase Pro (US$ 25/mês — limite de 500 conexões), ou implementar fallback de polling-only (desabilitar Realtime no client e fazer GET a cada 5s) via feature flag.
>
> **Outros tetos do free tier a observar**: 500 MB de banco (≫ suficiente — 1 pedido ≈ 1 KB), 2 GB de bandwidth/mês, 50 MB de Realtime egress/dia.

## Checklist pré-evento

> Rodar isto **antes** da festa, idealmente 1 h antes do início.

- [ ] Evento ativo confirmado: `SELECT * FROM events WHERE is_active = true;` retorna 1 linha.
- [ ] Flavors e ingredients ativos populados (mínimo 2 sabores).
- [ ] QR code aponta para o domínio correto e abre o formulário (escaneou e testou no celular).
- [ ] Pedido de teste sai do form até "Pronto" sem erro.
- [ ] Painel da cozinha conecta (Realtime ativo — ícone verde no canto da tela).
- [ ] Vibração funciona no celular alvo (testar em iOS Safari + Android Chrome — Safari pode ignorar).
- [ ] Tempo médio configurado para cada sabor ou no evento.
- [ ] Wi-Fi do local testado: latência ≤ 200 ms até `vercel.com`.
- [ ] Plano de fallback offline definido (caderno de papel) caso disponibilidade caia.
- [ ] **Estimativa de convidados ≤ 85** (bem abaixo do limite de 200 conexões Realtime do free tier — sem risco de teto).
- [ ] Tablet/celular da cozinha carregado e em modo "não desligar a tela".

## Operação durante o evento

- **Anfitrião** mantém aberto o painel da cozinha em segundo plano (ou um dispositivo dedicado) e exporta CSV ao fim do evento.
- **Cozinha** toca em "Iniciar preparo" no card de cima da fila quando começa, e em "Finalizar" quando entrega — nunca pula a ordem.
- **Cancelamento**: se um ingrediente acabar, tocar em "Cancelar" e digitar motivo curto ("Acabou Nutella").

## Rollback rápido

Se algo dá errado durante o evento:

1. **Vercel**: dashboard → Deployments → "Promote to Production" no deploy anterior estável.
2. **Supabase**: migration nova com problema → `supabase migration repair --status reverted <version>` + ajuste.
3. **Disable hotfix flag** se uma feature estiver com problema: `UPDATE events SET feature_flags = ... WHERE is_active = true;` (usado apenas se algum gate for adicionado em v2).

Tempo alvo de rollback: ≤ 1 min.

## Pós-evento

```bash
# Exportar histórico
curl -H "Cookie: kitchen_session=..." "https://<host>/api/export/csv?event_id=..." > festa-2026-04-30.csv

# (Opcional) Limpar PII após confirmação do anfitrião
# Implementar v2 — função SQL purge_event(uuid)
```
