# Crepe

Web app mobile-first para festas: convidados pedem crepes via QR Code, cozinha gerencia fila FIFO em tempo real, pedido pronto chama o convidado no celular.

## Testar localmente

### 1. Pré-requisitos

- Node 22 + Docker Desktop rodando
- Clone o repositório e instale as dependências:

```bash
npm install
```

### 2. Subir o banco

```bash
npx supabase start
```

Na primeira execução baixa ~600 MB de imagens Docker. Nas seguintes leva ~10 s. O seed já cria o evento demo com 6 sabores e 13 ingredientes.

### 3. Configurar variáveis de ambiente

Crie `.env.local` na raiz (as chaves aparecem no output do `supabase start`):

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
KITCHEN_SESSION_SECRET=qualquer-string-com-32-chars-min
NEXT_PUBLIC_DEFAULT_TEMPO_PREPARO=300
```

> As chaves locais são fixas — veja `.env.example` para os valores padrão.

### 4. Rodar o servidor

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## Roteiro de teste

### Visão do convidado

1. Abra: [`http://localhost:3000/pedido?event=550e8400-e29b-41d4-a716-446655440000`](http://localhost:3000/pedido?event=550e8400-e29b-41d4-a716-446655440000)
2. Preencha nome, sobrenome, escolha um sabor, marque ingredientes e clique **Fazer Pedido**
3. Você vai para `/status/<key>` — veja a posição na fila e o tempo estimado

### Visão da cozinha

1. Em outra aba, acesse: [`http://localhost:3000/cozinha/login`](http://localhost:3000/cozinha/login)
2. Código: **`1234`**
3. O pedido aparece na fila em tempo real
4. Clique **Iniciar** → a tela do convidado muda para "Em preparo" com cronômetro
5. Clique **Finalizar** → a tela do convidado vira a tela verde **"PRONTO! Retire no balcão"** (com vibração se no celular)

### Histórico e QR

- [`/historico`](http://localhost:3000/historico) — pedidos finalizados, filtros e exportação CSV
- [`/qr`](http://localhost:3000/qr) — QR Code do evento para imprimir ou baixar PNG

---

## Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run typecheck    # checar tipos TypeScript
npm run test         # testes unitários (Vitest)
npm run lint         # lint (ESLint)
```

## Stack

- **Next.js 15** App Router + **React 19** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** — Postgres + Realtime WebSockets
- Deploy: **Vercel**

## Rotas

| URL | Acesso | Descrição |
|---|---|---|
| `/pedido?event=<id>` | Público | Formulário de pedido do convidado |
| `/status/<client_key>` | Público | Status em tempo real + posição na fila |
| `/cozinha/login` | Público | Login da cozinha por código |
| `/cozinha` | Cozinha | Fila FIFO em tempo real |
| `/historico` | Cozinha | Pedidos finalizados + exportar CSV |
| `/qr` | Cozinha | Gerar e baixar QR Code do evento |

## Arquitetura e spec

Projeto desenvolvido com [Spec-Driven Development](https://github.com/github/spec-kit). Documentação completa em [`specs/001-crepe-orders/`](specs/001-crepe-orders/).
