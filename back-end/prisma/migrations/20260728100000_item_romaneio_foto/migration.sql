-- AlterTable
ALTER TABLE "itens_romaneio" ADD COLUMN "foto_midia_id" TEXT;

-- AddForeignKey
ALTER TABLE "itens_romaneio" ADD CONSTRAINT "itens_romaneio_foto_midia_id_fkey" FOREIGN KEY ("foto_midia_id") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
