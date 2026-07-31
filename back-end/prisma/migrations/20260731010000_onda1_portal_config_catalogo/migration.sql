-- AlterEnum TipoMidia
ALTER TYPE "TipoMidia" ADD VALUE IF NOT EXISTS 'CLIENTE_REFERENCIA';
ALTER TYPE "TipoMidia" ADD VALUE IF NOT EXISTS 'LOGO_EMPRESA';
ALTER TYPE "TipoMidia" ADD VALUE IF NOT EXISTS 'CATALOGO_ITEM';
ALTER TYPE "TipoMidia" ADD VALUE IF NOT EXISTS 'ASSINATURA_CLIENTE';

-- CreateEnum TipoCatalogoAddon
DO $$ BEGIN
  CREATE TYPE "TipoCatalogoAddon" AS ENUM ('ADDON', 'EXTRA_METROS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User.ativo
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;

-- Festa portal + avaliação
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "portal_token" TEXT;
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "assinatura_cliente_em" TIMESTAMP(3);
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "avaliacao_nota" INTEGER;
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "avaliacao_comentario" TEXT;
ALTER TABLE "festas" ADD COLUMN IF NOT EXISTS "avaliacao_em" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "festas_portal_token_key" ON "festas"("portal_token");

-- Pagamento PIX fields
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "pix_txid" TEXT;
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "pix_qr_code" TEXT;
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "pix_copia_cola" TEXT;
ALTER TABLE "pagamentos" ADD COLUMN IF NOT EXISTS "pix_expires_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "pagamentos_pix_txid_idx" ON "pagamentos"("pix_txid");

-- Comissao.pagoEm
ALTER TABLE "comissoes" ADD COLUMN IF NOT EXISTS "pago_em" TIMESTAMP(3);

-- Midia.uploadedById nullable
ALTER TABLE "midias" ALTER COLUMN "uploaded_by_id" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "midias_tipo_idx" ON "midias"("tipo");

-- ConfiguracaoNegocio
CREATE TABLE IF NOT EXISTS "configuracao_negocio" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "comissao_percentual" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "comissao_meta_semanal" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "clausulas_contrato" TEXT,
    "nome_empresa" TEXT NOT NULL DEFAULT 'DJ Decor',
    "slogan_empresa" TEXT NOT NULL DEFAULT 'Decoração de Festas · Locação de Materiais',
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logo_midia_id" TEXT,
    CONSTRAINT "configuracao_negocio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "configuracao_negocio_logo_midia_id_key" ON "configuracao_negocio"("logo_midia_id");

-- CatalogoKit
CREATE TABLE IF NOT EXISTS "catalogo_kits" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao_curta" TEXT NOT NULL,
    "valor_equipe" DECIMAL(10,2) NOT NULL,
    "valor_pegue_e_monte" DECIMAL(10,2),
    "tamanho_sugerido" "TamanhoDecoracao" NOT NULL,
    "itens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagem_midia_id" TEXT,
    CONSTRAINT "catalogo_kits_pkey" PRIMARY KEY ("id")
);

-- CatalogoAddon
CREATE TABLE IF NOT EXISTS "catalogo_addons" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoCatalogoAddon" NOT NULL DEFAULT 'ADDON',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagem_midia_id" TEXT,
    CONSTRAINT "catalogo_addons_pkey" PRIMARY KEY ("id")
);

-- FollowUpContato
CREATE TABLE IF NOT EXISTS "follow_up_contatos" (
    "id" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "nota" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "festa_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "follow_up_contatos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "follow_up_contatos_festa_id_idx" ON "follow_up_contatos"("festa_id");

-- FKs (ignore if exist)
DO $$ BEGIN
  ALTER TABLE "configuracao_negocio" ADD CONSTRAINT "configuracao_negocio_logo_midia_id_fkey" FOREIGN KEY ("logo_midia_id") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "catalogo_kits" ADD CONSTRAINT "catalogo_kits_imagem_midia_id_fkey" FOREIGN KEY ("imagem_midia_id") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "catalogo_addons" ADD CONSTRAINT "catalogo_addons_imagem_midia_id_fkey" FOREIGN KEY ("imagem_midia_id") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "follow_up_contatos" ADD CONSTRAINT "follow_up_contatos_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "follow_up_contatos" ADD CONSTRAINT "follow_up_contatos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
