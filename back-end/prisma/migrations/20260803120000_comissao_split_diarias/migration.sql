-- Regras de comissão/diárias: sócias, dona, elegibilidade por mês, desmontador

CREATE TYPE "TipoRepasse" AS ENUM (
  'COMISSAO_VENDEDOR',
  'COMISSAO_SOCIA',
  'COMISSAO_DONA',
  'DIARIA_MONTAGEM',
  'DIARIA_DESMONTAGEM'
);

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "eh_socia" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "eh_dona" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users" SET "eh_socia" = true WHERE "nome" IN ('Lorena', 'Suellem');
UPDATE "users" SET "eh_dona" = true WHERE "nome" = 'Debora';

ALTER TABLE "configuracao_negocio"
  ADD COLUMN IF NOT EXISTS "comissao_socia_percentual" DECIMAL(5,2) NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "diaria_montador" DECIMAL(10,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "diaria_desmontador" DECIMAL(10,2) NOT NULL DEFAULT 70;

UPDATE "configuracao_negocio"
SET "comissao_percentual" = 10
WHERE "id" = 'default' AND "comissao_percentual" = 5;

ALTER TABLE "ordens_servico"
  ADD COLUMN IF NOT EXISTS "desmontador_id" TEXT;

ALTER TABLE "ordens_servico"
  DROP CONSTRAINT IF EXISTS "ordens_servico_desmontador_id_fkey";

ALTER TABLE "ordens_servico"
  ADD CONSTRAINT "ordens_servico_desmontador_id_fkey"
  FOREIGN KEY ("desmontador_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Comissões: renomear beneficiário, tipo e elegível
ALTER TABLE "comissoes"
  ADD COLUMN IF NOT EXISTS "tipo" "TipoRepasse" NOT NULL DEFAULT 'COMISSAO_VENDEDOR',
  ADD COLUMN IF NOT EXISTS "elegivel_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comissoes' AND column_name = 'vendedor_id'
  ) THEN
    ALTER TABLE "comissoes" RENAME COLUMN "vendedor_id" TO "beneficiario_id";
  END IF;
END $$;

ALTER TABLE "comissoes" ALTER COLUMN "percentual" DROP NOT NULL;

UPDATE "comissoes" c
SET "elegivel_em" = date_trunc('month', f."data_evento")
FROM "festas" f
WHERE f."id" = c."festa_id";

ALTER TABLE "comissoes" DROP CONSTRAINT IF EXISTS "comissoes_vendedor_id_fkey";
ALTER TABLE "comissoes" DROP CONSTRAINT IF EXISTS "comissoes_beneficiario_id_fkey";

ALTER TABLE "comissoes"
  ADD CONSTRAINT "comissoes_beneficiario_id_fkey"
  FOREIGN KEY ("beneficiario_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "comissoes_vendedor_id_idx";
CREATE INDEX IF NOT EXISTS "comissoes_beneficiario_id_idx" ON "comissoes"("beneficiario_id");
CREATE INDEX IF NOT EXISTS "comissoes_status_elegivel_em_idx" ON "comissoes"("status", "elegivel_em");

-- Remove duplicatas antigas antes do unique (mantém a mais recente)
DELETE FROM "comissoes" a
USING "comissoes" b
WHERE a."festa_id" = b."festa_id"
  AND a."beneficiario_id" = b."beneficiario_id"
  AND a."tipo" = b."tipo"
  AND a."criado_em" < b."criado_em";

ALTER TABLE "comissoes" DROP CONSTRAINT IF EXISTS "comissoes_festa_id_beneficiario_id_tipo_key";
ALTER TABLE "comissoes"
  ADD CONSTRAINT "comissoes_festa_id_beneficiario_id_tipo_key"
  UNIQUE ("festa_id", "beneficiario_id", "tipo");
