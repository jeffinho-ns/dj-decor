-- Suellem deixa de ser sócia no split geral: comissão só quando for a vendedora da festa.
UPDATE "users"
SET "eh_socia" = false,
    "socia_desde" = NULL
WHERE "nome" = 'Suellem';

-- Cancela repasses pendentes de comissão-sócia da Suellem (já pagos não são alterados).
UPDATE "comissoes" c
SET "status" = 'CANCELADA'
FROM "users" u
WHERE c."beneficiario_id" = u."id"
  AND u."nome" = 'Suellem'
  AND c."tipo" = 'COMISSAO_SOCIA'
  AND c."status" = 'PENDENTE';
