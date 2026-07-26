-- CreateEnum
CREATE TYPE "TamanhoDecoracao" AS ENUM ('P', 'M', 'G', 'GG');

-- AlterTable
ALTER TABLE "festas"
  ADD COLUMN "horario_montagem" TIMESTAMP(3),
  ADD COLUMN "tamanho_decoracao" "TamanhoDecoracao",
  ADD COLUMN "itens_extras" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing rows (hora 08:00 montagem / mantém data_evento)
UPDATE "festas"
SET
  "horario_montagem" = COALESCE("horario_montagem", "data_evento" - INTERVAL '4 hours'),
  "tamanho_decoracao" = COALESCE("tamanho_decoracao", 'M'::"TamanhoDecoracao");

ALTER TABLE "festas"
  ALTER COLUMN "horario_montagem" SET NOT NULL,
  ALTER COLUMN "tamanho_decoracao" SET NOT NULL;
