-- ItemRomaneio.montado
ALTER TABLE "itens_romaneio" ADD COLUMN IF NOT EXISTS "montado" BOOLEAN NOT NULL DEFAULT false;

-- OrdemServico.montagemLocalConcluida
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "montagem_local_concluida" BOOLEAN NOT NULL DEFAULT false;
