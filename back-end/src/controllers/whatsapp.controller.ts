import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  FestaNotFoundForWhatsAppError,
  whatsappService,
} from "../services/whatsapp.service";

export class WhatsAppController {
  async listMensagens(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const festaId = req.query.festaId;
      if (typeof festaId !== "string" || festaId.length === 0) {
        res.status(400).json({ error: "Query festaId é obrigatório" });
        return;
      }

      const mensagens = await whatsappService.listByFesta(festaId);
      res.status(200).json(mensagens);
    } catch (error) {
      if (error instanceof FestaNotFoundForWhatsAppError) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}

export const whatsappController = new WhatsAppController();
