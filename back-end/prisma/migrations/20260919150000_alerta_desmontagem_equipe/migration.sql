-- AlterTable ordens_servico
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "montagem_local_concluida_em" TIMESTAMP(3);
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "alerta_desmontagem_enviado_em" TIMESTAMP(3);
