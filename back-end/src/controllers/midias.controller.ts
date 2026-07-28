import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  MidiaNotFoundError,
  MidiaValidationError,
  midiasService,
} from "../services/midias.service";

export class MidiasController {
  async upload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const file = midiasService.validateFile(
        req.file as Express.Multer.File | undefined
      );
      const meta = midiasService.parseMeta(req.body);
      const midia = await midiasService.create(file, meta, req.user.id);
      res.status(201).json(midia);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof MidiaValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const midia = await midiasService.getById(req.params.id as string);
      res.setHeader("Content-Type", midia.mimeType);
      res.setHeader("Content-Length", String(midia.tamanho));
      if (midia.filename) {
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(midia.filename)}"`
        );
      }
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.status(200).send(Buffer.from(midia.data));
    } catch (error) {
      if (error instanceof MidiaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const midiasController = new MidiasController();
