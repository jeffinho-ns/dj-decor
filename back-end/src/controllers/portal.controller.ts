import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  portalService,
  PortalFestaNotFoundError,
} from "../services/portal.service";
import {
  MidiaValidationError,
  MAX_MIDIA_BYTES,
} from "../services/midias.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MIDIA_BYTES },
});

export const portalUpload = upload.single("file");

export class PortalController {
  async resolveLegacy(req: Request, res: Response, next: NextFunction) {
    try {
      const festaId = req.params.festaId as string;
      const link = await portalService.resolveLegacyFestaId(festaId);
      res.status(200).json(link);
    } catch (error) {
      if (error instanceof PortalFestaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      const status = await portalService.getFestaStatusByToken(token);
      res.status(200).json(status);
    } catch (error) {
      if (error instanceof PortalFestaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async getMidia(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      const midiaId = req.params.midiaId as string;
      const midia = await portalService.getMidiaForToken(token, midiaId);
      res.setHeader("Content-Type", midia.mimeType);
      res.setHeader("Content-Length", String(midia.tamanho));
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).send(Buffer.from(midia.data));
    } catch (error) {
      if (error instanceof PortalFestaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async uploadMidia(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      const midia = await portalService.uploadClienteMidia(
        token,
        req.file as Express.Multer.File
      );
      res.status(201).json(midia);
    } catch (error) {
      if (error instanceof PortalFestaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof MidiaValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async assinar(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      const status = await portalService.assinar(
        token,
        req.file as Express.Multer.File
      );
      res.status(200).json(status);
    } catch (error) {
      if (error instanceof PortalFestaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof MidiaValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async avaliar(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      const nota = Number(req.body?.nota);
      const comentario =
        typeof req.body?.comentario === "string" ? req.body.comentario : null;
      const status = await portalService.avaliar(token, nota, comentario);
      res.status(200).json(status);
    } catch (error) {
      if (error instanceof PortalFestaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof MidiaValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const portalController = new PortalController();
