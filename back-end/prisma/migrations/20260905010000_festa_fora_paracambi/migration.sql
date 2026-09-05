-- AlterTable
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "fora_paracambi" BOOLEAN NOT NULL DEFAULT false;
