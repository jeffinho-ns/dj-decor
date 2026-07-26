-- AlterTable
ALTER TABLE "festas" ADD COLUMN "itens_extras_concluidos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
