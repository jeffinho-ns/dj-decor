-- Data do fechamento da venda (pipeline da planilha ≠ vendas novas após a sócia)
ALTER TABLE "festas" ADD COLUMN "venda_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Tudo que já existia (planilha ago–out, etc.) = venda fechada ANTES da Suellem
UPDATE "festas"
SET "venda_em" = TIMESTAMP '2026-08-04 12:00:00';
