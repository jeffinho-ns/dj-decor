-- AlterEnum StatusFesta (additive)
ALTER TYPE "StatusFesta" ADD VALUE 'AGUARDANDO_PAGAMENTO';
ALTER TYPE "StatusFesta" ADD VALUE 'PAGO';
ALTER TYPE "StatusFesta" ADD VALUE 'EM_MONTAGEM';
ALTER TYPE "StatusFesta" ADD VALUE 'CANCELADO';

-- CreateEnum
CREATE TYPE "StatusUnidade" AS ENUM ('DISPONIVEL', 'RESERVADA', 'EM_USO', 'MANUTENCAO');
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'CONFIRMADO', 'ESTORNADO');
CREATE TYPE "TipoPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO', 'OUTRO');
CREATE TYPE "StatusOS" AS ENUM ('ABERTA', 'ROMANEIO', 'EM_TRANSITO', 'CHECKIN', 'FINALIZADA');
CREATE TYPE "TipoMidia" AS ENUM ('REFERENCIA_FESTA', 'ITEM', 'COMPROVANTE_PIX', 'MONTAGEM_FINAL', 'CONTRATO');
CREATE TYPE "TipoMovimentacao" AS ENUM ('SAIDA_GALPAO', 'ENTRADA_RETORNO');
CREATE TYPE "StatusComissao" AS ENUM ('PENDENTE', 'PAGA', 'CANCELADA');
CREATE TYPE "StatusMensagemWhatsApp" AS ENUM ('PENDENTE', 'ENVIADA', 'FALHA');

-- CreateTable produtos
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor_aluguel" DECIMAL(10,2) NOT NULL,
    "tema" TEXT,
    "requer_qr" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable unidades_produto
CREATE TABLE "unidades_produto" (
    "id" TEXT NOT NULL,
    "codigo_qr" TEXT NOT NULL,
    "etiqueta" TEXT,
    "status" "StatusUnidade" NOT NULL DEFAULT 'DISPONIVEL',
    "produto_id" TEXT NOT NULL,
    CONSTRAINT "unidades_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable reservas_estoque
CREATE TABLE "reservas_estoque" (
    "id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "festa_id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    CONSTRAINT "reservas_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable midias
CREATE TABLE "midias" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "tipo" "TipoMidia" NOT NULL,
    "filename" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "festa_id" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    CONSTRAINT "midias_pkey" PRIMARY KEY ("id")
);

-- CreateTable pagamentos
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoPagamento" NOT NULL DEFAULT 'PIX',
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "confirmado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "festa_id" TEXT NOT NULL,
    "comprovante_midia_id" TEXT,
    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable comissoes
CREATE TABLE "comissoes" (
    "id" TEXT NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusComissao" NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "festa_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable ordens_servico
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL,
    "status" "StatusOS" NOT NULL DEFAULT 'ABERTA',
    "checkin_lat" DOUBLE PRECISION,
    "checkin_lng" DOUBLE PRECISION,
    "checkin_at" TIMESTAMP(3),
    "romaneio_concluido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "festa_id" TEXT NOT NULL,
    "montador_id" TEXT,
    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable itens_romaneio
CREATE TABLE "itens_romaneio" (
    "id" TEXT NOT NULL,
    "descricao" TEXT,
    "carregado" BOOLEAN NOT NULL DEFAULT false,
    "conferido" BOOLEAN NOT NULL DEFAULT false,
    "os_id" TEXT NOT NULL,
    "unidade_id" TEXT,
    CONSTRAINT "itens_romaneio_pkey" PRIMARY KEY ("id")
);

-- CreateTable movimentacoes_qr
CREATE TABLE "movimentacoes_qr" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unidade_id" TEXT NOT NULL,
    "os_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "movimentacoes_qr_pkey" PRIMARY KEY ("id")
);

-- CreateTable contratos
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "pdf_data" BYTEA,
    "pdf_url" TEXT,
    "hash" TEXT,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "festa_id" TEXT NOT NULL,
    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable mensagens_whatsapp
CREATE TABLE "mensagens_whatsapp" (
    "id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "telefone" TEXT,
    "payload" JSONB,
    "provider_id" TEXT,
    "status" "StatusMensagemWhatsApp" NOT NULL DEFAULT 'PENDENTE',
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_em" TIMESTAMP(3),
    "festa_id" TEXT,
    CONSTRAINT "mensagens_whatsapp_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "unidades_produto_codigo_qr_key" ON "unidades_produto"("codigo_qr");
CREATE UNIQUE INDEX "pagamentos_comprovante_midia_id_key" ON "pagamentos"("comprovante_midia_id");
CREATE UNIQUE INDEX "ordens_servico_festa_id_key" ON "ordens_servico"("festa_id");
CREATE UNIQUE INDEX "contratos_festa_id_key" ON "contratos"("festa_id");

-- Indexes
CREATE INDEX "unidades_produto_produto_id_status_idx" ON "unidades_produto"("produto_id", "status");
CREATE INDEX "reservas_estoque_unidade_id_inicio_fim_idx" ON "reservas_estoque"("unidade_id", "inicio", "fim");
CREATE INDEX "reservas_estoque_festa_id_idx" ON "reservas_estoque"("festa_id");
CREATE INDEX "midias_festa_id_idx" ON "midias"("festa_id");
CREATE INDEX "pagamentos_festa_id_idx" ON "pagamentos"("festa_id");
CREATE INDEX "comissoes_vendedor_id_idx" ON "comissoes"("vendedor_id");
CREATE INDEX "comissoes_festa_id_idx" ON "comissoes"("festa_id");
CREATE INDEX "itens_romaneio_os_id_idx" ON "itens_romaneio"("os_id");
CREATE INDEX "movimentacoes_qr_unidade_id_idx" ON "movimentacoes_qr"("unidade_id");
CREATE INDEX "movimentacoes_qr_os_id_idx" ON "movimentacoes_qr"("os_id");
CREATE INDEX "mensagens_whatsapp_festa_id_idx" ON "mensagens_whatsapp"("festa_id");

-- Foreign keys
ALTER TABLE "unidades_produto" ADD CONSTRAINT "unidades_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservas_estoque" ADD CONSTRAINT "reservas_estoque_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservas_estoque" ADD CONSTRAINT "reservas_estoque_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "midias" ADD CONSTRAINT "midias_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "midias" ADD CONSTRAINT "midias_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_comprovante_midia_id_fkey" FOREIGN KEY ("comprovante_midia_id") REFERENCES "midias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_montador_id_fkey" FOREIGN KEY ("montador_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "itens_romaneio" ADD CONSTRAINT "itens_romaneio_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "itens_romaneio" ADD CONSTRAINT "itens_romaneio_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimentacoes_qr" ADD CONSTRAINT "movimentacoes_qr_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimentacoes_qr" ADD CONSTRAINT "movimentacoes_qr_os_id_fkey" FOREIGN KEY ("os_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimentacoes_qr" ADD CONSTRAINT "movimentacoes_qr_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mensagens_whatsapp" ADD CONSTRAINT "mensagens_whatsapp_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
