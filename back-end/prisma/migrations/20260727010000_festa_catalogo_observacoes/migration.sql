-- AlterTable
ALTER TABLE "festas" ADD COLUMN "kit_catalogo" TEXT;
ALTER TABLE "festas" ADD COLUMN "pegue_e_monte" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "festas" ADD COLUMN "observacoes" TEXT;
