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
└── backend/    # API Express → Render
```

## Pré-requisitos

- Node.js 20+
- PostgreSQL (local ou Render)
- Contas Vercel + Render para produção

## Setup local

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edite DATABASE_URL e FRONTEND_URL
npm install
npx prisma migrate dev --name init
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

App em `http://localhost:3000` (redireciona para `/vendas`)

## Autenticação mock (Vendedor)

Nas rotas de festas, envie um dos headers:

- `Authorization: Bearer mock-vendedor`
- `X-User-Role: VENDEDOR`

Opcional: `X-User-Id` para associar a um `User` existente.

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/festas` | Listar festas (vendedor) |
| GET | `/api/festas/:id` | Detalhe |
| POST | `/api/festas` | Criar venda |
| PUT | `/api/festas/:id` | Atualizar |
| DELETE | `/api/festas/:id` | Remover |
| POST | `/api/webhooks/atendimento-ia` | Webhook IA/WhatsApp (200) |

## Deploy

### Backend (Render)

1. Crie um PostgreSQL no Render e copie a `DATABASE_URL` (Internal ou External).
2. Crie um Web Service apontando para este repositório:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm start`
   - **Environment:**
     - `DATABASE_URL`
     - `FRONTEND_URL` = URL da Vercel (ex: `https://dj-decor.vercel.app`)
     - `NODE_ENV` = `production`
   - Porta: use `process.env.PORT` (já configurado)

### Frontend (Vercel)

1. Importe o repositório na Vercel.
2. **Root Directory:** `frontend`
3. Environment:
   - `NEXT_PUBLIC_API_URL` = URL do Web Service no Render (ex: `https://dj-decor-api.onrender.com`)

## Modelo de dados (Prisma)

- **User** — ADMIN | GERENTE | VENDEDOR
- **Cliente** — nome, telefone
- **Festa** — data, status (ORCAMENTO | FECHADO | CONCLUIDO), valor, tema, endereço; relaciona Cliente + User (vendedor)

## Repositório

https://github.com/jeffinho-ns/dj-decor.git
