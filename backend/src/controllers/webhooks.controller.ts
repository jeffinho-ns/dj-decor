import type { Request, Response } from "express";

/**
 * Webhook preparado para receber payloads do serviço de IA (WhatsApp).
 * Por enquanto apenas confirma o recebimento com 200.
 */
export class WebhooksController {
  atendimentoIa(req: Request, res: Response): void {
    // Payload reservado para integração futura com IA / WhatsApp
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

    res.status(200).json({
      ok: true,
      message: "Webhook atendimento-ia recebido com sucesso",
      receivedAt: new Date().toISOString(),
    });
  }
}

export const webhooksController = new WebhooksController();
