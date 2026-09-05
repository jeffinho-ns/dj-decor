-- Galeria de montagem (fotos/vídeos no Firebase) + metadados no Postgres

ALTER TYPE "TipoMidia" ADD VALUE 'MONTAGEM_FOTO';
ALTER TYPE "TipoMidia" ADD VALUE 'MONTAGEM_VIDEO';

ALTER TABLE "midias" ALTER COLUMN "data" DROP NOT NULL;

ALTER TABLE "midias" ADD COLUMN IF NOT EXISTS "storage_path" TEXT;
ALTER TABLE "midias" ADD COLUMN IF NOT EXISTS "visivel_portal" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "midias" ADD COLUMN IF NOT EXISTS "ordem" INTEGER NOT NULL DEFAULT 0;
