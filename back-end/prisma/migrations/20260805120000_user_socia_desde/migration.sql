-- Sócia a partir de uma data: comissão só em festas com dataEvento >= socia_desde
ALTER TABLE "users" ADD COLUMN "socia_desde" TIMESTAMP(3);

-- Suellem entrou na sociedade em 05/08/2026 (festas anteriores não entram no split dela)
UPDATE "users"
SET "socia_desde" = TIMESTAMP '2026-08-05 12:00:00'
WHERE "nome" = 'Suellem' AND "eh_socia" = true;
