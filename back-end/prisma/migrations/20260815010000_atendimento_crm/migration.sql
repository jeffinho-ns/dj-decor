-- CreateEnum
CREATE TYPE "CanalAtendimento" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'MANUAL');
CREATE TYPE "ModoAtendimento" AS ENUM ('AI', 'HUMANO', 'HIBRIDO');
CREATE TYPE "StatusConversa" AS ENUM ('ABERTA', 'AGUARDANDO', 'FECHADA');
CREATE TYPE "DirecaoMensagem" AS ENUM ('IN', 'OUT');
CREATE TYPE "TipoAtendimentoEvento" AS ENUM (
  'CRIADA',
  'MENSAGEM',
  'HANDOFF',
  'TAKEOVER',
  'DEVOLVER_IA',
  'TOOL_CALL',
  'TOOL_RESULT',
  'FECHADA',
  'ATRIBUICAO'
);

-- CreateTable
CREATE TABLE "conversas" (
    "id" TEXT NOT NULL,
    "canal" "CanalAtendimento" NOT NULL DEFAULT 'WHATSAPP',
    "external_thread_id" TEXT NOT NULL,
    "contato_externo" TEXT,
    "contato_nome" TEXT,
    "modo" "ModoAtendimento" NOT NULL DEFAULT 'AI',
    "status" "StatusConversa" NOT NULL DEFAULT 'ABERTA',
    "ultima_mensagem_em" TIMESTAMP(3),
    "resumo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "cliente_id" TEXT,
    "vendedor_id" TEXT,
    "festa_id" TEXT,

    CONSTRAINT "conversas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mensagens_canal" (
    "id" TEXT NOT NULL,
    "direcao" "DirecaoMensagem" NOT NULL,
    "texto" TEXT,
    "midia_url" TEXT,
    "midia_mime_type" TEXT,
    "provider_message_id" TEXT,
    "status_envio" TEXT,
    "autor_tipo" TEXT NOT NULL DEFAULT 'CLIENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversa_id" TEXT NOT NULL,
    "festa_id" TEXT,

    CONSTRAINT "mensagens_canal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "atendimento_eventos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAtendimentoEvento" NOT NULL,
    "payload" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversa_id" TEXT NOT NULL,
    "autor_id" TEXT,

    CONSTRAINT "atendimento_eventos_pkey" PRIMARY KEY ("id")
);

-- Indexes / unique
CREATE UNIQUE INDEX "conversas_canal_external_thread_id_key" ON "conversas"("canal", "external_thread_id");
CREATE INDEX "conversas_status_ultima_mensagem_em_idx" ON "conversas"("status", "ultima_mensagem_em");
CREATE INDEX "conversas_vendedor_id_idx" ON "conversas"("vendedor_id");
CREATE INDEX "conversas_cliente_id_idx" ON "conversas"("cliente_id");
CREATE UNIQUE INDEX "mensagens_canal_provider_message_id_key" ON "mensagens_canal"("provider_message_id");
CREATE INDEX "mensagens_canal_conversa_id_criado_em_idx" ON "mensagens_canal"("conversa_id", "criado_em");
CREATE INDEX "atendimento_eventos_conversa_id_criado_em_idx" ON "atendimento_eventos"("conversa_id", "criado_em");

-- FKs
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversas" ADD CONSTRAINT "conversas_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mensagens_canal" ADD CONSTRAINT "mensagens_canal_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mensagens_canal" ADD CONSTRAINT "mensagens_canal_festa_id_fkey" FOREIGN KEY ("festa_id") REFERENCES "festas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "atendimento_eventos" ADD CONSTRAINT "atendimento_eventos_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "atendimento_eventos" ADD CONSTRAINT "atendimento_eventos_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
