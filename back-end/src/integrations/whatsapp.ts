import { StatusMensagemWhatsApp, type Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

export interface WhatsAppDispatchInput {
  template: string;
  telefone?: string | null;
  festaId?: string | null;
  payload?: Prisma.InputJsonValue;
}

export interface WhatsAppDispatchResult {
  id: string;
  status: StatusMensagemWhatsApp;
  forwarded: boolean;
}

function formatarDataEvento(valor: unknown): string {
  if (valor == null) return "data a confirmar";
  const data = typeof valor === "string" ? new Date(valor) : new Date(String(valor));
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarValor(valor: unknown): string {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor ?? "");
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function asRecord(payload: Prisma.InputJsonValue | undefined): Record<string, unknown> {
  if (payload == null) return {};
  if (typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

/**
 * Gera texto pronto em português para o projeto paralelo de IA enviar ao cliente.
 */
export function buildMensagemSugerida(
  template: string,
  payload: Record<string, unknown>
): string {
  const tema = String(payload.tema ?? "sua festa");
  const dataFmt = formatarDataEvento(payload.data);
  const endereco = String(payload.endereco ?? "endereço informado no contrato");

  switch (template) {
    case "pagamento_confirmado":
      return (
        `Olá! 🎉 Recebemos o pagamento da decoração "${tema}" ` +
        `para ${dataFmt}. Valor confirmado: ${formatarValor(payload.valor)}. ` +
        `Em breve nossa equipe entrará em contato com os próximos passos. ` +
        `Obrigado por confiar na DJ festas!`
      );

    case "equipe_a_caminho":
      return (
        `Boa notícia! 🚚 Nossa equipe já saiu para montar a decoração ` +
        `"${tema}" (${dataFmt}). Endereço: ${endereco}. ` +
        `Qualquer dúvida, estamos à disposição. — DJ festas`
      );

    case "montagem_finalizada":
      return (
        `Tudo pronto! ✨ A montagem da decoração "${tema}" foi finalizada ` +
        `com sucesso. Esperamos que sua festa seja inesquecível! ` +
        `— Equipe DJ festas`
      );

    case "upsell_extras": {
      const itens = Array.isArray(payload.itensExtras)
        ? (payload.itensExtras as string[])
        : [];
      const lista =
        itens.length > 0
          ? itens.map((i) => `• ${i}`).join("\n")
          : "• Balões extras\n• Painel adicional\n• Iluminação especial";
      return (
        `Olá! A decoração "${tema}" (${dataFmt}) está confirmada. ` +
        `Que tal deixar a festa ainda mais especial?\n\n` +
        `Temos opções extras disponíveis:\n${lista}\n\n` +
        `Responda esta mensagem se quiser incluir algum item. — DJ festas`
      );
    }

    case "pos_venda_avaliacao":
      return (
        `Esperamos que tenha amado a decoração da festa "${tema}"! 💛 ` +
        `Sua opinião é muito importante para nós. ` +
        `Pode nos contar como foi a experiência? Responda com uma nota de 1 a 5 ` +
        `ou deixe um comentário. Obrigado! — DJ festas`
      );

    default:
      return `Mensagem DJ festas — template: ${template}.`;
  }
}

export function enrichWhatsAppPayload(
  template: string,
  payload: Prisma.InputJsonValue | undefined
): Prisma.InputJsonValue {
  const base = asRecord(payload);
  if (typeof base.mensagemSugerida === "string" && base.mensagemSugerida.length > 0) {
    return base as Prisma.InputJsonValue;
  }
  return {
    ...base,
    mensagemSugerida: buildMensagemSugerida(template, base),
  } as Prisma.InputJsonValue;
}

/**
 * Templates disparados automaticamente pelo backend:
 *
 * - `pagamento_confirmado` — após confirmar pagamento (payload: tema, data, valor, mensagemSugerida)
 * - `upsell_extras` — após pagamento confirmado; oferta de itens extras (payload: tema, data, itensExtras[], mensagemSugerida)
 * - `equipe_a_caminho` — após concluir romaneio / OS EM_TRANSITO (payload: tema, data, endereco, mensagemSugerida)
 * - `montagem_finalizada` — após foto final / OS FINALIZADA (payload: tema, data, mensagemSugerida)
 * - `pos_venda_avaliacao` — após festa CONCLUIDO / foto final; pedido de avaliação (payload: tema, data, mensagemSugerida)
 *
 * Adapter para o projeto paralelo de IA / WhatsApp.
 * Registra a mensagem no banco e, se WHATSAPP_IA_WEBHOOK_URL estiver
 * configurada, encaminha o payload para esse serviço.
 */
export class WhatsAppAdapter {
  async dispatch(input: WhatsAppDispatchInput): Promise<WhatsAppDispatchResult> {
    const payloadEnriquecido = enrichWhatsAppPayload(input.template, input.payload);

    const registro = await prisma.mensagemWhatsApp.create({
      data: {
        template: input.template,
        telefone: input.telefone ?? null,
        festaId: input.festaId ?? null,
        payload: payloadEnriquecido,
        status: StatusMensagemWhatsApp.PENDENTE,
      },
    });

    if (!env.WHATSAPP_IA_WEBHOOK_URL) {
      console.info(
        "[whatsapp] mensagem registrada (sem webhook configurado):",
        registro.id,
        input.template
      );
      return {
        id: registro.id,
        status: StatusMensagemWhatsApp.PENDENTE,
        forwarded: false,
      };
    }

    try {
      const response = await fetch(env.WHATSAPP_IA_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: registro.id,
          template: input.template,
          telefone: input.telefone ?? null,
          festaId: input.festaId ?? null,
          payload: payloadEnriquecido,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        await prisma.mensagemWhatsApp.update({
          where: { id: registro.id },
          data: {
            status: StatusMensagemWhatsApp.FALHA,
            erro: `Webhook HTTP ${response.status}: ${text.slice(0, 500)}`,
          },
        });
        return {
          id: registro.id,
          status: StatusMensagemWhatsApp.FALHA,
          forwarded: false,
        };
      }

      const body = (await response.json().catch(() => ({}))) as {
        providerId?: string;
      };

      await prisma.mensagemWhatsApp.update({
        where: { id: registro.id },
        data: {
          status: StatusMensagemWhatsApp.ENVIADA,
          enviadoEm: new Date(),
          providerId: body.providerId ?? null,
        },
      });

      return {
        id: registro.id,
        status: StatusMensagemWhatsApp.ENVIADA,
        forwarded: true,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao encaminhar webhook";
      await prisma.mensagemWhatsApp.update({
        where: { id: registro.id },
        data: {
          status: StatusMensagemWhatsApp.FALHA,
          erro: message.slice(0, 500),
        },
      });
      return {
        id: registro.id,
        status: StatusMensagemWhatsApp.FALHA,
        forwarded: false,
      };
    }
  }
}

export const whatsappAdapter = new WhatsAppAdapter();

/** Fire-and-forget: falhas de dispatch não devem afetar o fluxo principal. */
export function dispatchWhatsAppSafe(input: WhatsAppDispatchInput): void {
  void whatsappAdapter.dispatch(input).catch((error) => {
    console.error(
      "[whatsapp] falha no dispatch automático:",
      input.template,
      error instanceof Error ? error.message : error
    );
  });
}
