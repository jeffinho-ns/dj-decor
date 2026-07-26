-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GERENTE', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "StatusFesta" AS ENUM ('ORCAMENTO', 'FECHADO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VENDEDOR',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festas" (
    "id" TEXT NOT NULL,
    "data_evento" TIMESTAMP(3) NOT NULL,
    "status" "StatusFesta" NOT NULL DEFAULT 'ORCAMENTO',
    "valor" DECIMAL(10,2) NOT NULL,
    "tema" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,

    CONSTRAINT "festas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "festas" ADD CONSTRAINT "festas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festas" ADD CONSTRAINT "festas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
