-- AlterEnum
ALTER TYPE "TipoMidia" ADD VALUE 'REFERENCIA_BOLAS';

-- AlterTable
ALTER TABLE "midias" ADD COLUMN "pedido_bolas_id" TEXT;

-- CreateTable
CREATE TABLE "pedido_bolas_compras" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" TEXT,
    "comprado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedido_id" TEXT NOT NULL,

    CONSTRAINT "pedido_bolas_compras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "midias_pedido_bolas_id_idx" ON "midias"("pedido_bolas_id");

-- CreateIndex
CREATE INDEX "pedido_bolas_compras_pedido_id_comprado_idx" ON "pedido_bolas_compras"("pedido_id", "comprado");

-- AddForeignKey
ALTER TABLE "midias" ADD CONSTRAINT "midias_pedido_bolas_id_fkey" FOREIGN KEY ("pedido_bolas_id") REFERENCES "pedidos_bolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_bolas_compras" ADD CONSTRAINT "pedido_bolas_compras_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos_bolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
