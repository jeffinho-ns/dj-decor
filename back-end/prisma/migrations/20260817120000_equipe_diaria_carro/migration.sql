-- Equipe prevista na festa, carro próprio vs empresa na OS e diária por dia civil.

ALTER TABLE "festas"
  ADD COLUMN IF NOT EXISTS "montador_equipe_id" TEXT,
  ADD COLUMN IF NOT EXISTS "desmontador_equipe_id" TEXT,
  ADD COLUMN IF NOT EXISTS "montador_carro_proprio" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "desmontador_carro_proprio" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ordens_servico"
  ADD COLUMN IF NOT EXISTS "montador_carro_proprio" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "desmontador_carro_proprio" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "comissoes"
  ADD COLUMN IF NOT EXISTS "dia_referencia" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "comissoes_beneficiario_id_tipo_dia_referencia_idx"
  ON "comissoes"("beneficiario_id", "tipo", "dia_referencia");

ALTER TABLE "configuracao_negocio"
  ADD COLUMN IF NOT EXISTS "diaria_montador_carro_empresa" DECIMAL(10,2) NOT NULL DEFAULT 130,
  ADD COLUMN IF NOT EXISTS "diaria_desmontador_carro_empresa" DECIMAL(10,2) NOT NULL DEFAULT 80;

ALTER TABLE "configuracao_negocio" ALTER COLUMN "diaria_montador" SET DEFAULT 150;
ALTER TABLE "configuracao_negocio" ALTER COLUMN "diaria_desmontador" SET DEFAULT 130;

UPDATE "configuracao_negocio"
SET
  "diaria_montador" = 150,
  "diaria_desmontador" = 130
WHERE "id" = 'default'
  AND "diaria_montador" = 100
  AND "diaria_desmontador" = 70;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'festas_montador_equipe_id_fkey'
  ) THEN
    ALTER TABLE "festas"
      ADD CONSTRAINT "festas_montador_equipe_id_fkey"
      FOREIGN KEY ("montador_equipe_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'festas_desmontador_equipe_id_fkey'
  ) THEN
    ALTER TABLE "festas"
      ADD CONSTRAINT "festas_desmontador_equipe_id_fkey"
      FOREIGN KEY ("desmontador_equipe_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
