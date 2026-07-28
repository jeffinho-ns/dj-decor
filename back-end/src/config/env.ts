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
  COMISSAO_PERCENTUAL_DEFAULT: z.coerce.number().min(0).max(100).default(5),
  /** URL do projeto paralelo de IA / WhatsApp (opcional). */
  WHATSAPP_IA_WEBHOOK_URL: z
    .union([z.string().url(), z.literal("")])
    .optional(),
});

type Env = z.infer<typeof envSchema> & {
  WHATSAPP_IA_WEBHOOK_URL?: string;
};

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Variáveis de ambiente inválidas:",
      parsed.error.flatten().fieldErrors
    );
    process.exit(1);
  }

  const { WHATSAPP_IA_WEBHOOK_URL, ...rest } = parsed.data;

  return {
    ...rest,
    WHATSAPP_IA_WEBHOOK_URL:
      WHATSAPP_IA_WEBHOOK_URL && WHATSAPP_IA_WEBHOOK_URL.length > 0
        ? WHATSAPP_IA_WEBHOOK_URL
        : undefined,
  };
}

export const env: Env = loadEnv();
