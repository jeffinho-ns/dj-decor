-- CreateEnum
CREATE TYPE "StatusDesconto" AS ENUM ('NENHUM', 'PENDENTE', 'APROVADO', 'RECUSADO');

-- AlterTable
ALTER TABLE "festas" ADD COLUMN "valor_original" DECIMAL(10,2);
ALTER TABLE "festas" ADD COLUMN "desconto_percentual" DECIMAL(5,2);
ALTER TABLE "festas" ADD COLUMN "desconto_status" "StatusDesconto" NOT NULL DEFAULT 'NENHUM';
ALTER TABLE "festas" ADD COLUMN "desconto_solicitado_por_id" TEXT;
ALTER TABLE "festas" ADD COLUMN "desconto_aprovado_por_id" TEXT;

-- AddForeignKey
ALTER TABLE "festas" ADD CONSTRAINT "festas_desconto_solicitado_por_id_fkey" FOREIGN KEY ("desconto_solicitado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "festas" ADD CONSTRAINT "festas_desconto_aprovado_por_id_fkey" FOREIGN KEY ("desconto_aprovado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
