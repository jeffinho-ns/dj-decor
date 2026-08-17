-- CreateEnum
CREATE TYPE "FrequenciaPagamentoEquipe" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL');

-- AlterTable
ALTER TABLE "configuracao_negocio"
  ADD COLUMN IF NOT EXISTS "frequencia_pagamento_equipe" "FrequenciaPagamentoEquipe" NOT NULL DEFAULT 'QUINZENAL';
