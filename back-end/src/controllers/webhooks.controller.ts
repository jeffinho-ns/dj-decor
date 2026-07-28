import type { NextFunction, Request, Response } from "express";
import { whatsappAdapter } from "../integrations/whatsapp";

/**
 * Webhook preparado para receber payloads do serviço de IA (WhatsApp).
 * Também permite registrar um disparo outbound via adapter quando o body
 * contém `template` (útil para testes do projeto paralelo).
 */
export class WebhooksController {
  async atendimentoIa(req: Request, res: Response, next: NextFunction) {
    try {
      console.info("[webhook:atendimento-ia] payload recebido:", {
        headers: {
          contentType: req.headers["content-type"],
          userAgent: req.headers["user-agent"],
        },
        bodyKeys:
          req.body && typeof req.body === "object"
            ? Object.keys(req.body as Record<string, unknown>)
            : [],
      });

      const body = (req.body ?? {}) as {
        template?: string;
        telefone?: string;
        festaId?: string;
        payload?: Record<string, unknown>;
        dispatch?: boolean;
      };

      let dispatchResult = null;
      if (body.dispatch && typeof body.template === "string") {
        dispatchResult = await whatsappAdapter.dispatch({
          template: body.template,
          telefone: body.telefone,
          festaId: body.festaId,
          payload: body.payload
            ? (JSON.parse(JSON.stringify(body.payload)) as object)
            : undefined,
        });
      }

      res.status(200).json({
        ok: true,
        message: "Webhook atendimento-ia recebido com sucesso",
        receivedAt: new Date().toISOString(),
        dispatch: dispatchResult,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const webhooksController = new WebhooksController();
