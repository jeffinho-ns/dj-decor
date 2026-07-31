import type { NextFunction, Response } from "express";
import { TipoMidia } from "@prisma/client";
import { ZodError } from "zod";
import { pdfAdapter } from "../integrations/pdf";
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

      if (
        meta.festaId &&
        (meta.tipo === TipoMidia.REFERENCIA_FESTA ||
          meta.tipo === TipoMidia.ASSINATURA_CLIENTE)
      ) {
        void pdfAdapter.gerarContratoLocacao(meta.festaId).catch((error) => {
          console.error(
            "[midias] falha ao regenerar contrato após upload",
            error
          );
        });
      }

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

  async listByFesta(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const festaId = req.params.festaId as string;
      const tiposRaw = typeof req.query.tipos === "string" ? req.query.tipos : "";
      const tipos = tiposRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) as TipoMidia[];
      const list = await midiasService.listByFesta(
        festaId,
        tipos.length ? tipos : undefined
      );
      res.status(200).json(list);
    } catch (error) {
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
