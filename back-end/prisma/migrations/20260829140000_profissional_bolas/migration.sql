-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BOLISTA';

-- CreateEnum
CREATE TYPE "StatusPedidoBolas" AS ENUM ('RASCUNHO', 'CONFIRMADO', 'EM_MONTAGEM', 'MONTADO', 'DESMONTADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusRepasseBolas" AS ENUM ('PENDENTE', 'PAGO');

-- AlterTable
ALTER TABLE "configuracao_negocio" ADD COLUMN "markup_bolas_percentual" DECIMAL(5,2) NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "catalogo_bolas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valor_tabela" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por_id" TEXT,

    CONSTRAINT "catalogo_bolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_bolas" (
    "id" TEXT NOT NULL,
    "data_evento" TIMESTAMP(3) NOT NULL,
    "horario_montagem" TIMESTAMP(3) NOT NULL,
    "horario_desmontagem" TIMESTAMP(3),
    "tema" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "cliente_telefone" TEXT NOT NULL,
    "observacoes" TEXT,
    "cores" TEXT,
    "instrucoes" TEXT,
    "valor_tabela" DECIMAL(10,2) NOT NULL,
    "valor_cliente" DECIMAL(10,2) NOT NULL,
    "taxa_empresa" DECIMAL(10,2) NOT NULL,
    "markup_percentual" DECIMAL(5,2) NOT NULL,
    "status" "StatusPedidoBolas" NOT NULL DEFAULT 'CONFIRMADO',
    "montagem_concluida" BOOLEAN NOT NULL DEFAULT false,
    "desmontagem_concluida" BOOLEAN NOT NULL DEFAULT false,
    "status_pagamento_cliente" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "status_repasse" "StatusRepasseBolas" NOT NULL DEFAULT 'PENDENTE',
    "repassado_em" TIMESTAMP(3),
    "repasse_obs" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "festa_id" TEXT,
    "bolista_id" TEXT NOT NULL,

    CONSTRAINT "pedidos_bolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_bolas_itens" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "valor_tabela_unit" DECIMAL(10,2) NOT NULL,
    "valor_cliente_unit" DECIMAL(10,2) NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "catalogo_bola_id" TEXT,

    CONSTRAINT "pedido_bolas_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_bolas_festa_id_key" ON "pedidos_bolas"("festa_id");

-- CreateIndex
CREATE INDEX "pedidos_bolas_bolista_id_data_evento_idx" ON "pedidos_bolas"("bolista_id", "data_evento");

-- CreateIndex
CREATE INDEX "pedidos_bolas_status_idx" ON "pedidos_bolas"("status");

-- CreateIndex
CREATE INDEX "pedidos_bolas_status_repasse_idx" ON "pedidos_bolas"("status_repasse");

-- CreateIndex
CREATE INDEX "pedido_bolas_itens_pedido_id_idx" ON "pedido_bolas_itens"("pedido_id");

-- AddForeignKey
ALTER TABLE "catalogo_bolas" ADD CONSTRAINT "catalogo_bolas_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_bolas" ADD CONSTRAINT "pedidos_bolas_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_bolas" ADD CONSTRAINT "pedidos_bolas_bolista_id_fkey" FOREIGN KEY ("bolista_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_bolas_itens" ADD CONSTRAINT "pedido_bolas_itens_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos_bolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_bolas_itens" ADD CONSTRAINT "pedido_bolas_itens_catalogo_bola_id_fkey" FOREIGN KEY ("catalogo_bola_id") REFERENCES "catalogo_bolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
