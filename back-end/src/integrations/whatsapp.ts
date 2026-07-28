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

/**
 * Templates disparados automaticamente pelo backend:
 *
 * - `pagamento_confirmado` — após confirmar pagamento (payload: tema, data, valor)
 * - `upsell_extras` — após pagamento confirmado; oferta de itens extras (payload: tema, data, itensExtras[])
 * - `equipe_a_caminho` — após concluir romaneio / OS EM_TRANSITO (payload: tema, data, endereco)
 * - `montagem_finalizada` — após foto final / OS FINALIZADA (payload: tema, data)
 * - `pos_venda_avaliacao` — após festa CONCLUIDO / foto final; pedido de avaliação (payload: tema, data)
 *
 * Adapter para o projeto paralelo de IA / WhatsApp.
 * Registra a mensagem no banco e, se WHATSAPP_IA_WEBHOOK_URL estiver
 * configurada, encaminha o payload para esse serviço.
 */
export class WhatsAppAdapter {
  async dispatch(input: WhatsAppDispatchInput): Promise<WhatsAppDispatchResult> {
    const registro = await prisma.mensagemWhatsApp.create({
      data: {
        template: input.template,
        telefone: input.telefone ?? null,
        festaId: input.festaId ?? null,
        payload: input.payload ?? undefined,
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
          payload: input.payload ?? null,
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
