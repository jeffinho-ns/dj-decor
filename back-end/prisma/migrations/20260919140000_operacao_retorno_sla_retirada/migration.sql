-- AlterEnum
ALTER TYPE "TipoMidia" ADD VALUE IF NOT EXISTS 'ASSINATURA_RETIRADA';

-- AlterTable festas
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "retirada_nome" TEXT;
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "retirada_assinatura_em" TIMESTAMP(3);

-- AlterTable ordens_servico
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "retorno_concluido" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "retorno_concluido_em" TIMESTAMP(3);

-- AlterTable itens_romaneio
ALTER TABLE "itens_romaneio" ADD COLUMN IF NOT EXISTS "retornado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable configuracao_negocio
ALTER TABLE "configuracao_negocio" ADD COLUMN IF NOT EXISTS "sla_separacao_horas" INTEGER NOT NULL DEFAULT 3;
