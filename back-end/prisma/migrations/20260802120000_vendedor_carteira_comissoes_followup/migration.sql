-- AlterTable users
ALTER TABLE "users" ADD COLUMN "comissao_meta_semanal" DECIMAL(10,2);

-- AlterTable clientes
ALTER TABLE "clientes" ADD COLUMN "observacoes" TEXT;
ALTER TABLE "clientes" ADD COLUMN "origem" TEXT;
ALTER TABLE "clientes" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "clientes" ADD COLUMN "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "clientes" ADD COLUMN "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "clientes_telefone_idx" ON "clientes"("telefone");

-- AlterTable follow_up_contatos
ALTER TABLE "follow_up_contatos" ADD COLUMN "proximo_contato_em" TIMESTAMP(3);
CREATE INDEX "follow_up_contatos_proximo_contato_em_idx" ON "follow_up_contatos"("proximo_contato_em");
