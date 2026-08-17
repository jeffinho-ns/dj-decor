import type { NextFunction, Request, Response } from "express";
import { metaMessaging } from "../integrations/meta-messaging";
import { atendimentoService } from "../services/atendimento.service";
import { atendimentoAgentService } from "../services/atendimento-agent.service";

/**
 * Webhooks Meta Cloud API (WhatsApp + Instagram).
 * GET = verificação; POST = mensagens inbound.
 */
export class MetaWebhooksController {
  verify(req: Request, res: Response) {
    const mode = typeof req.query["hub.mode"] === "string"
      ? req.query["hub.mode"]
      : undefined;
    const token =
      typeof req.query["hub.verify_token"] === "string"
        ? req.query["hub.verify_token"]
        : undefined;
    const challenge =
      typeof req.query["hub.challenge"] === "string"
        ? req.query["hub.challenge"]
        : undefined;

    const result = metaMessaging.verifyWebhookChallenge(mode, token, challenge);
    if (result == null) {
      res.status(403).send("Forbidden");
      return;
    }
    res.status(200).send(result);
  }

  async inbound(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.header("x-hub-signature-256") ?? undefined;
      const raw =
        (req as Request & { rawBody?: Buffer | string }).rawBody ??
        JSON.stringify(req.body ?? {});

      if (!metaMessaging.validateSignature(raw, signature)) {
        res.status(401).json({ error: "Assinatura inválida" });
        return;
      }

      // Responde rápido à Meta; processa em seguida
      res.status(200).json({ ok: true });

      const messages = metaMessaging.parseWebhookPayload(req.body);
      for (const msg of messages) {
        try {
          const result = await atendimentoService.ingestInbound({
            canal: msg.canal,
            externalThreadId: msg.externalThreadId,
            contatoExterno: msg.contatoExterno,
            contatoNome: msg.contatoNome,
            providerMessageId: msg.providerMessageId,
            texto: msg.texto,
            midiaUrl: msg.midiaUrl,
            midiaMimeType: msg.midiaMimeType,
            timestamp: msg.timestamp,
          });

          if (result.shouldRunAgent) {
            await atendimentoAgentService.handleInbound(result.conversa.id);
          } else if (result.handoffRecorrente && result.sugerido) {
            await atendimentoService.appendOutbound({
              conversaId: result.conversa.id,
              texto:
                `Oi! Vi que você já fez festa com a gente 🎈 ` +
                `Vou te passar para ${result.sugerido.vendedorNome}, ` +
                `que já te atendeu antes.`,
              autorTipo: "AI",
              sendToProvider: true,
            });
          }
        } catch (err) {
          console.error("[meta-webhook] falha ao processar mensagem:", err);
        }
      }
    } catch (error) {
      // Se já enviou 200, só loga
      if (!res.headersSent) {
        next(error);
      } else {
        console.error("[meta-webhook]", error);
      }
    }
  }
}

export const metaWebhooksController = new MetaWebhooksController();
