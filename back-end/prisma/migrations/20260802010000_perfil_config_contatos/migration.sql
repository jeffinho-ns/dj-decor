-- AlterTable
ALTER TABLE "users" ADD COLUMN "telefone" TEXT;

-- AlterTable
ALTER TABLE "configuracao_negocio" ADD COLUMN "telefone_empresa" TEXT;
ALTER TABLE "configuracao_negocio" ADD COLUMN "whatsapp_empresa" TEXT;
ALTER TABLE "configuracao_negocio" ADD COLUMN "endereco_empresa" TEXT;
