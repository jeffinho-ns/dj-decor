import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET deve ter no mínimo 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  /** Percentual padrão de comissão ao confirmar pagamento (0–100). */
  COMISSAO_PERCENTUAL_DEFAULT: z.coerce.number().min(0).max(100).default(10),
  /** Meta semanal de comissão confirmada para gamificação (R$). */
  COMISSAO_META_SEMANAL: z.coerce.number().min(0).default(500),
  /** URL do projeto paralelo de IA / WhatsApp (opcional, legado). */
  WHATSAPP_IA_WEBHOOK_URL: z
    .union([z.string().url(), z.literal("")])
    .optional(),
  /** Horas de cura pós-festa antes da unidade voltar ao estoque (anti-overbooking). */
  ESTOQUE_CURA_HORAS: z.coerce.number().min(0).default(12),
  /** Horas sem retorno QR para gerar alerta de peça sumida. */
  QR_ALERTA_HORAS: z.coerce.number().min(1).default(36),
  /** OpenAI — agente de atendimento (opcional; sem chave a IA fica desligada). */
  OPENAI_API_KEY: z.union([z.string().min(1), z.literal("")]).optional(),
  OPENAI_MODEL: z.string().default("gpt-5.2"),
  /** Meta Cloud API — WhatsApp / Instagram Messaging. */
  META_ACCESS_TOKEN: z.union([z.string().min(1), z.literal("")]).optional(),
  META_PHONE_NUMBER_ID: z.union([z.string().min(1), z.literal("")]).optional(),
  META_APP_SECRET: z.union([z.string().min(1), z.literal("")]).optional(),
  META_VERIFY_TOKEN: z.union([z.string().min(1), z.literal("")]).optional(),
  META_IG_PAGE_ID: z.union([z.string().min(1), z.literal("")]).optional(),
});

type Env = z.infer<typeof envSchema> & {
  WHATSAPP_IA_WEBHOOK_URL?: string;
  OPENAI_API_KEY?: string;
  META_ACCESS_TOKEN?: string;
  META_PHONE_NUMBER_ID?: string;
  META_APP_SECRET?: string;
  META_VERIFY_TOKEN?: string;
  META_IG_PAGE_ID?: string;
};

function optionalUrl(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function optionalStr(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Variáveis de ambiente inválidas:",
      parsed.error.flatten().fieldErrors
    );
    process.exit(1);
  }

  const data = parsed.data;

  return {
    ...data,
    WHATSAPP_IA_WEBHOOK_URL: optionalUrl(data.WHATSAPP_IA_WEBHOOK_URL),
    OPENAI_API_KEY: optionalStr(data.OPENAI_API_KEY),
    META_ACCESS_TOKEN: optionalStr(data.META_ACCESS_TOKEN),
    META_PHONE_NUMBER_ID: optionalStr(data.META_PHONE_NUMBER_ID),
    META_APP_SECRET: optionalStr(data.META_APP_SECRET),
    META_VERIFY_TOKEN: optionalStr(data.META_VERIFY_TOKEN),
    META_IG_PAGE_ID: optionalStr(data.META_IG_PAGE_ID),
  };
}

export const env: Env = loadEnv();
