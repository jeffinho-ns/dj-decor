-- AlterEnum
ALTER TYPE "TipoAtendimentoEvento" ADD VALUE 'NOTA_INTERNA';

-- AlterTable
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "notas_internas" TEXT;

-- AlterTable
ALTER TABLE "conversas" ADD COLUMN IF NOT EXISTS "notas_internas" TEXT;
