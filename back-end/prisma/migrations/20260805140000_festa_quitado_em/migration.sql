-- Data em que a festa ficou quitada (para regra de sócia a partir da quitação)
ALTER TABLE "festas" ADD COLUMN "quitado_em" TIMESTAMP(3);

-- Tudo que já estava pago/com comissão: quitado ANTES da Suellem entrar (05/08/2026)
UPDATE "festas" f
SET "quitado_em" = TIMESTAMP '2026-08-04 12:00:00'
WHERE "quitado_em" IS NULL
  AND (
    f."status" IN ('PAGO', 'FECHADO', 'EM_MONTAGEM', 'CONCLUIDO')
    OR EXISTS (
      SELECT 1 FROM "comissoes" c WHERE c."festa_id" = f."id"
    )
  );

-- Garante data de sócia da Suellem = 05/08/2026 (quitações a partir daqui)
UPDATE "users"
SET "socia_desde" = TIMESTAMP '2026-08-05 12:00:00',
    "eh_socia" = true
WHERE "nome" = 'Suellem';
