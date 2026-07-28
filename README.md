# DJ Decor

Sistema de gestão de agendamento de decorações de festas.

## Arquitetura

| Camada | Tecnologia | Deploy |
|--------|------------|--------|
| Frontend | Next.js (App Router) + Tailwind + Shadcn UI | Vercel |
| Backend | Node.js + Express + Prisma | Render (Web Service) |
| Banco | PostgreSQL | Render |

```
dj-decor/
├── frontend/   # Next.js → Vercel
└── back-end/   # API Express → Render
```

## Pré-requisitos

- Node.js 20+
- PostgreSQL (local ou Render)
- Contas Vercel + Render para produção

## Setup local

### 1. Backend

```bash
cd back-end
cp .env.example .env
# Edite DATABASE_URL, FRONTEND_URL e JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

API em `http://localhost:3333`

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3333
npm install
npm run dev
```

App em `http://localhost:3000` → redireciona para `/login`

## Autenticação

Login com **nome + senha** (JWT). O e-mail é opcional e pode ser definido/atualizado em `/perfil`, junto com a troca de senha.

### Equipe (após seed)

Senha temporária de todos: `@123Mudar`

| Cargo (UI) | Role | Nomes |
|------------|------|-------|
| SuperAdmin | `ADMIN` | Jefferson, Jonathan |
| Gerente | `GERENTE` | Debora, Suellem, Lorena |
| Vendedor | `VENDEDOR` | Vitória, Lais, Rodrigo |
| Montador | `MONTADOR` | Carlos, Bruno |

Montador tem acesso apenas de leitura às festas (agenda de montagem); não pode criar, editar ou remover vendas.

### Endpoints de auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | `{ nome, senha }` → `{ token, user }` |
| GET | `/api/auth/me` | Usuário do token |
| PATCH | `/api/auth/perfil` | Atualiza e-mail e/ou senha do usuário autenticado — `{ email?, senhaAtual?, novaSenha? }` → `{ user }` |
| POST | `/api/auth/logout` | Encerramento (stateless) |

Em `NODE_ENV=development`, `Bearer mock-vendedor` ainda é aceito por compatibilidade.

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/festas` | Listar festas (VENDEDOR, GERENTE, ADMIN, MONTADOR) |
| GET | `/api/festas/:id` | Detalhe (VENDEDOR, GERENTE, ADMIN, MONTADOR) |
| POST | `/api/festas` | Criar venda — inclui horário festa/montagem, tamanho, extras (VENDEDOR, GERENTE, ADMIN) |
| PUT | `/api/festas/:id` | Atualizar (VENDEDOR, GERENTE, ADMIN) |
| PATCH | `/api/festas/:id/checklist` | Atualizar checklist de itens extras — `{ itensExtrasConcluidos: string[] }` (VENDEDOR, GERENTE, ADMIN, MONTADOR) |
| DELETE | `/api/festas/:id` | Remover (VENDEDOR, GERENTE, ADMIN) |
| PATCH | `/api/festas/:id/status` | Alterar status Kanban — `{ status }` (VENDEDOR, GERENTE, ADMIN) |
| GET | `/api/festas/:id/pagamentos` | Listar pagamentos da festa |
| POST | `/api/festas/:id/pagamentos` | Registrar pagamento — `{ valor, tipo? }` (default `PIX`, status `PENDENTE`) |
| PATCH | `/api/pagamentos/:id/confirmar` | Confirmar pagamento — `{ comprovanteMidiaId? }`; gera comissão e pode mover festa para `PAGO` |
| GET | `/api/produtos` | Listar produtos + unidades (ADMIN, GERENTE, VENDEDOR) |
| POST | `/api/produtos` | Criar produto (ADMIN, GERENTE) |
| PATCH | `/api/produtos/:id` | Atualizar produto (ADMIN, GERENTE) |
| POST | `/api/produtos/:id/unidades` | Adicionar unidade física / QR (ADMIN, GERENTE) |
| GET | `/api/estoque/disponibilidade` | Unidades livres no intervalo `?produtoId&inicio&fim` |
| POST | `/api/estoque/reservar` | Reservar unidade (anti-overbooking; 409 se conflito) |
| DELETE | `/api/estoque/reservas/:id` | Liberar reserva (ADMIN, GERENTE) |
| GET | `/api/estoque/festas/:festaId` | Reservas de estoque vinculadas à festa |
| POST | `/api/midias` | Upload multipart (`file` + `tipo` + `festaId?`) — Bytes no Postgres, máx. 2 MB |
| GET | `/api/midias/:id` | Stream da imagem autenticado |
| POST | `/api/webhooks/atendimento-ia` | Webhook IA/WhatsApp (200); `dispatch:true` + `template` registra via adapter |

### Fase 2 — OS, romaneio, check-in e QR (montagem)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/os/hoje` | OS/festas de montagem do dia (MONTADOR, GERENTE, ADMIN) |
| GET | `/api/os/:id` | Detalhe da OS com itens de romaneio e festa/cliente |
| POST | `/api/os/:id/romaneio/itens` | Adicionar item — `{ unidadeId?, descricao? }` (MONTADOR+) |
| PATCH | `/api/os/:id/romaneio/itens/:itemId` | Marcar `{ carregado?, conferido? }` (MONTADOR+) |
| POST | `/api/os/:id/romaneio/concluir` | Concluir romaneio → status `ROMANEIO` / `EM_TRANSITO` |
| POST | `/api/os/:id/checkin` | Check-in geolocalizado — `{ lat, lng }` → status `CHECKIN` |
| POST | `/api/os/:id/foto-final` | Foto final — `{ midiaId }` ou multipart; finaliza OS/festa |
| POST | `/api/qr/scan` | Scan QR — `{ codigoQr, tipo: SAIDA_GALPAO\|ENTRADA_RETORNO, osId?, lat?, lng? }` |

A OS é criada automaticamente (`ABERTA`) quando a festa avança para `FECHADO` ou `EM_MONTAGEM`. O seed inclui uma OS demo com 2 itens de romaneio descritivos (sem unidade física).

### Fase 3 — contrato PDF e WhatsApp (em breve)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/festas/:id/contrato` | Gera/registra contrato de locação — **stub** retorna `{ id, geradoEm }`; PDF real via Puppeteer na Fase 3 |
| POST | `/api/webhooks/atendimento-ia` | Já registra mensagens; envio real via `WHATSAPP_IA_WEBHOOK_URL` |

Adapter PDF: `back-end/src/integrations/pdf.ts` (`PdfAdapter.gerarContratoLocacao`). Adapter WhatsApp: `back-end/src/integrations/whatsapp.ts`.

### Status da festa (Kanban)

`ORCAMENTO` → `AGUARDANDO_PAGAMENTO` → `PAGO` → `FECHADO` → `EM_MONTAGEM` → `CONCLUIDO` (ou `CANCELADO` em qualquer etapa).

Ao confirmar o primeiro pagamento, a API cria `Comissao` para o vendedor (`COMISSAO_PERCENTUAL_DEFAULT`, padrão 5%) e pode promover a festa para `PAGO`.

## Rotas do frontend

| Rota | Acesso |
|------|--------|
| `/login` | Público |
| `/dashboard` | Autenticado — agenda mensal (home pós-login) com status e valores |
| `/calendario` | Redireciona para `/dashboard` |
| `/vendas` | Autenticado (exceto Montador) — **Kanban** por coluna de status |
| `/vendas/nova` | Autenticado (exceto Montador) |
| `/estoque` | ADMIN / GERENTE — catálogo + disponibilidade + reserva anti-overbooking |
| `/perfil` | Autenticado (todos os roles, incluindo Montador) — trocar e-mail/senha |
| `/montagem` | Autenticado — checklist do dia (home do Montador) |

## Smoke test local (curl)

Pré-requisito: backend em `http://localhost:3333`, seed executado (`npm run prisma:seed`).

```bash
# 1) Token (use Vitória ou Debora)
TOKEN=$(curl -s -X POST http://localhost:3333/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Vitória","senha":"@123Mudar"}' | jq -r .token)

# 2) Festa demo (AGUARDANDO_PAGAMENTO) — pegue o id
FESTA_ID=$(curl -s http://localhost:3333/api/festas \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.tema | contains("demo")) | .id' | head -1)

# 3) Produto e unidade para reserva
PRODUTO_ID=$(curl -s http://localhost:3333/api/produtos \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
UNIDADE_ID=$(curl -s http://localhost:3333/api/produtos \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].unidades[0].id')

INICIO=$(date -u -v+1d +%Y-%m-%dT10:00:00.000Z 2>/dev/null || date -u -d '+1 day' +%Y-%m-%dT10:00:00.000Z)
FIM=$(date -u -v+1d +%Y-%m-%dT18:00:00.000Z 2>/dev/null || date -u -d '+1 day' +%Y-%m-%dT18:00:00.000Z)

# 4) Disponibilidade
curl -s "http://localhost:3333/api/estoque/disponibilidade?produtoId=$PRODUTO_ID&inicio=$INICIO&fim=$FIM" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5) Reservar — 201
curl -s -X POST http://localhost:3333/api/estoque/reservar \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"unidadeId\":\"$UNIDADE_ID\",\"festaId\":\"$FESTA_ID\",\"inicio\":\"$INICIO\",\"fim\":\"$FIM\"}" | jq .

# 6) Overbooking — mesma unidade/período → 409
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3333/api/estoque/reservar \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"unidadeId\":\"$UNIDADE_ID\",\"festaId\":\"$FESTA_ID\",\"inicio\":\"$INICIO\",\"fim\":\"$FIM\"}"

# 7) Pagamento PIX pendente
PAG_ID=$(curl -s -X POST "http://localhost:3333/api/festas/$FESTA_ID/pagamentos" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"valor":850,"tipo":"PIX"}' | jq -r .id)

# 8) Confirmar pagamento (opcional: comprovanteMidiaId após POST /api/midias)
curl -s -X PATCH "http://localhost:3333/api/pagamentos/$PAG_ID/confirmar" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{}' | jq .

# 9) Conferir status PAGO + pagamentos
curl -s "http://localhost:3333/api/festas/$FESTA_ID/pagamentos" \
  -H "Authorization: Bearer $TOKEN" | jq .
curl -s http://localhost:3333/api/festas \
  -H "Authorization: Bearer $TOKEN" | jq ".[] | select(.id==\"$FESTA_ID\") | {id, status, valor}"
```

Passos 7–9 exigem a API de pagamentos da Fase 1 (`pagamentos.routes.ts`). Passos 4–6 funcionam após a Fase 0.

### Smoke test Fase 2 — check-in e QR (curl)

Requer backend Fase 2 (`os.routes.ts`, `qr.routes.ts`) e seed com OS demo. Use o montador **Carlos** (`@123Mudar`).

```bash
# Token montador
TOKEN=$(curl -s -X POST http://localhost:3333/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Carlos","senha":"@123Mudar"}' | jq -r .token)

# OS demo (festa seed → OrdemServico ABERTA)
OS_ID=$(curl -s http://localhost:3333/api/os/hoje \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id // .[0].ordemServico.id // empty')

# Check-in geolocalizado — 200
curl -s -X POST "http://localhost:3333/api/os/$OS_ID/checkin" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"lat":-23.5505,"lng":-46.6333}' | jq .

# Scan QR saída do galpão (codigoQr do seed: DJ-MESA-001)
curl -s -X POST http://localhost:3333/api/qr/scan \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"codigoQr\":\"DJ-MESA-001\",\"tipo\":\"SAIDA_GALPAO\",\"osId\":\"$OS_ID\",\"lat\":-23.55,\"lng\":-46.63}" | jq .

# Contrato stub (Fase 3 foundation)
FESTA_ID=$(curl -s http://localhost:3333/api/os/hoje \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].festaId // .[0].festa.id // empty')
curl -s -X POST "http://localhost:3333/api/festas/$FESTA_ID/contrato" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Se `OS_ID` vier vazio, rode `npm run prisma:seed` e confira que a festa demo tem `OrdemServico` vinculada.


## Deploy

### Backend (Render)

1. Crie um PostgreSQL no Render e copie a `DATABASE_URL`.
2. Web Service apontando para este repositório:
   - **Root Directory:** `back-end`
   - **Build:** `npm install --include=dev && npx prisma generate && npm run build`
   - **Start:** `npx prisma migrate deploy && npx prisma db seed && npm start`
   - **Environment:**
     - `DATABASE_URL`
     - `FRONTEND_URL` = `https://dj-decor.vercel.app`
     - `JWT_SECRET` (gere um valor forte; o `render.yaml` pode gerar automaticamente)
     - `JWT_EXPIRES_IN` = `7d`
     - `COMISSAO_PERCENTUAL_DEFAULT` = `5` (opcional)
     - `NODE_ENV` = `production`
     - `WHATSAPP_IA_WEBHOOK_URL` (opcional) = URL do projeto paralelo de IA/WhatsApp

### Frontend (Vercel)

Produção única: projeto **dj-decor** → https://dj-decor.vercel.app

1. Importe o repositório na Vercel (um projeto só).
2. **Root Directory:** `frontend`
3. Environment:
   - `NEXT_PUBLIC_API_URL` = URL do Web Service no Render (ex: `https://dj-decor.onrender.com`)
4. Redeploy após alterar variáveis `NEXT_PUBLIC_*`.

Não mantenha um segundo projeto Vercel no mesmo repositório (ex.: `dj-decor-r`); isso gera deploys duplicados.

## Modelo de dados (Prisma)

- **User** — nome (login), senha, role ADMIN (Dono) | GERENTE | VENDEDOR | MONTADOR; e-mail opcional
- **Cliente** — nome, telefone
- **Festa** — pedido/venda; status Kanban-ready (`ORCAMENTO` … `CANCELADO`); relaciona Cliente + User
- **Produto / UnidadeProduto** — catálogo + unidades físicas com `codigoQr`
- **ReservaEstoque** — alocação por janela `inicio`/`fim` com anti-overbooking
- **Pagamento / Comissao** — Fase 1: registro PIX, confirmação e comissão automática
- **Midia** — imagens em `BYTEA` (máx. 2 MB); comprovante PIX vincula ao pagamento
- **MovimentacaoQr / Contrato / MensagemWhatsApp** — Fase 2: scan QR saída/entrada; Fase 3: contrato PDF (stub) + adapter WhatsApp para projeto IA paralelo
- **OrdemServico / ItemRomaneio** — Fase 2: romaneio, check-in geo, foto final

## Repositório

https://github.com/jeffinho-ns/dj-decor.git
