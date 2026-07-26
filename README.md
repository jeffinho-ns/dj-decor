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

Login com **nome + senha** (JWT). O e-mail fica reservado para a página de perfil futura.

### Equipe (após seed)

Senha temporária de todos: `@123Mudar`

| Cargo (UI) | Role | Nomes |
|------------|------|-------|
| SuperAdmin | `ADMIN` | Jefferson, Jonathan |
| Gerente | `GERENTE` | Debora, Suellem, Lorena |
| Vendedor | `VENDEDOR` | Vitória, Lais, Rodrigo |

### Endpoints de auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | `{ nome, senha }` → `{ token, user }` |
| GET | `/api/auth/me` | Usuário do token |
| POST | `/api/auth/logout` | Encerramento (stateless) |

Em `NODE_ENV=development`, `Bearer mock-vendedor` ainda é aceito por compatibilidade.

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/festas` | Listar festas (autenticado) |
| GET | `/api/festas/:id` | Detalhe |
| POST | `/api/festas` | Criar venda |
| PUT | `/api/festas/:id` | Atualizar |
| DELETE | `/api/festas/:id` | Remover |
| POST | `/api/webhooks/atendimento-ia` | Webhook IA/WhatsApp (200) |

## Rotas do frontend

| Rota | Acesso |
|------|--------|
| `/login` | Público |
| `/dashboard` | Autenticado (visão por role) |
| `/vendas` | Autenticado |
| `/vendas/nova` | Autenticado |

## Deploy

### Backend (Render)

1. Crie um PostgreSQL no Render e copie a `DATABASE_URL`.
2. Web Service apontando para este repositório:
   - **Root Directory:** `back-end`
   - **Build:** `npm install --include=dev && npx prisma generate && npm run build`
   - **Start:** `npx prisma migrate deploy && npx prisma db seed && npm start`
   - **Environment:**
     - `DATABASE_URL`
     - `FRONTEND_URL` = URL da Vercel (ex: `https://dj-decor-r.vercel.app`)
     - `JWT_SECRET` (gere um valor forte; o `render.yaml` pode gerar automaticamente)
     - `JWT_EXPIRES_IN` = `7d`
     - `NODE_ENV` = `production`

### Frontend (Vercel)

1. Importe o repositório na Vercel.
2. **Root Directory:** `frontend`
3. Environment:
   - `NEXT_PUBLIC_API_URL` = URL do Web Service no Render (ex: `https://dj-decor.onrender.com`)
4. Redeploy após alterar variáveis `NEXT_PUBLIC_*`.

## Modelo de dados (Prisma)

- **User** — nome (login), senha, role ADMIN (SuperAdmin) | GERENTE | VENDEDOR; e-mail opcional (perfil futuro)
- **Cliente** — nome, telefone
- **Festa** — data, status (ORCAMENTO | FECHADO | CONCLUIDO), valor, tema, endereço; relaciona Cliente + User (vendedor)

## Repositório

https://github.com/jeffinho-ns/dj-decor.git
