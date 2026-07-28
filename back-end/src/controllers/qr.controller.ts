import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  qrService,
  QrUnidadeNotFoundError,
  QrValidationError,
} from "../services/qr.service";

export class QrController {
  async scan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const input = qrService.parseScan(req.body);
      const result = await qrService.scan(input, req.user.id);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof QrUnidadeNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof QrValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const qrController = new QrController();
