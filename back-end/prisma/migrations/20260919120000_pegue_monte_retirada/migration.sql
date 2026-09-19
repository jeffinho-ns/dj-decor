-- Pegue e Monte: rastreio de separação / retirada pelo cliente
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "separacao_concluida_em" TIMESTAMP(3);
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "pronto_retirada_em" TIMESTAMP(3);
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "retirado_cliente_em" TIMESTAMP(3);
