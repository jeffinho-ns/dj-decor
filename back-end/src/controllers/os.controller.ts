import type { NextFunction, Response } from "express";
import { TipoMidia } from "@prisma/client";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  osService,
  OsItemNotFoundError,
  OsNotFoundError,
  OsValidationError,
} from "../services/os.service";
import {
  midiasService,
  MidiaValidationError,
} from "../services/midias.service";

export class OsController {
  async listToday(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await osService.listToday();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listMine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }
      const result = await osService.listMine(req.user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const os = await osService.getById(req.params.id as string);
      res.status(200).json(os);
    } catch (error) {
      if (error instanceof OsNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async addRomaneioItem(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const item = await osService.addRomaneioItem(
        req.params.id as string,
        req.body
      );
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (
        error instanceof OsNotFoundError ||
        error instanceof OsValidationError
      ) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async updateRomaneioItem(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const item = await osService.updateRomaneioItem(
        req.params.id as string,
        req.params.itemId as string,
        req.body
      );
      res.status(200).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof OsItemNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async concluirRomaneio(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const os = await osService.concluirRomaneio(req.params.id as string);
      res.status(200).json(os);
    } catch (error) {
      if (error instanceof OsNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof OsValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async seedRomaneio(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const os = await osService.seedRomaneioFromReservas(
        req.params.id as string
      );
      res.status(200).json(os);
    } catch (error) {
      if (error instanceof OsNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async checkin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const os = await osService.checkin(req.params.id as string, req.body);
      res.status(200).json(os);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof OsNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async fotoFinal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      let midiaId: string;

      if (req.file) {
        const file = midiasService.validateFile(req.file);
        const os = await osService.getById(req.params.id as string);
        const midia = await midiasService.create(
          file,
          { tipo: TipoMidia.MONTAGEM_FINAL, festaId: os.festaId },
          req.user.id
        );
        midiaId = midia.id;
      } else {
        const parsed = osService.parseFotoFinal(req.body);
        midiaId = parsed.midiaId;
      }

      const os = await osService.fotoFinal(req.params.id as string, midiaId);
      res.status(200).json(os);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (
        error instanceof OsNotFoundError ||
        error instanceof OsValidationError ||
        error instanceof MidiaValidationError
      ) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const osController = new OsController();
