-- Alerta de compra antecipada quando a festa fecha com itens sem estoque suficiente
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "alerta_compra_estoque" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "itens_falta_estoque" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
