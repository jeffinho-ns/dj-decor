import type { NextFunction, Response } from "express";
import { TipoMidia } from "@prisma/client";
import { ZodError } from "zod";
import { FirebaseNotConfiguredError } from "../integrations/firebase-storage";
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
import { montagemGaleriaService } from "../services/montagem-galeria.service";

async function assertPodeEditarOs(
  req: AuthenticatedRequest,
  osId: string
): Promise<void> {
  if (!req.user) {
    throw new OsValidationError("Não autorizado");
  }
  const os = await osService.getById(osId);
  montagemGaleriaService.assertPodeEditar(os, req.user);
}

export class OsController {
  async listToday(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await osService.listToday();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listTodayRota(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await osService.listTodayRota();
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

  async listGaleria(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const itens = await montagemGaleriaService.listByOs(
        req.params.id as string
      );
      res.status(200).json({ itens });
    } catch (error) {
      if (error instanceof OsNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async uploadGaleria(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }
      const item = await montagemGaleriaService.upload(
        req.params.id as string,
        req.file as Express.Multer.File | undefined,
        req.user
      );
      const os = await osService.getById(req.params.id as string);
      res.status(201).json({ item, os });
    } catch (error) {
      if (
        error instanceof OsNotFoundError ||
        error instanceof OsValidationError ||
        error instanceof MidiaValidationError ||
        error instanceof FirebaseNotConfiguredError
      ) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async deleteGaleriaItem(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }
      await montagemGaleriaService.remove(
        req.params.id as string,
        req.params.midiaId as string,
        req.user
      );
      const os = await osService.getById(req.params.id as string);
      res.status(200).json({ ok: true, os });
    } catch (error) {
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

  async signedGaleriaUrl(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await montagemGaleriaService.signedUrl(
        req.params.id as string,
        req.params.midiaId as string
      );
      res.status(200).json(result);
    } catch (error) {
      if (
        error instanceof OsNotFoundError ||
        error instanceof MidiaValidationError ||
        error instanceof FirebaseNotConfiguredError
      ) {
        res.status(400).json({ message: error.message });
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
      await assertPodeEditarOs(req, req.params.id as string);
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
      await assertPodeEditarOs(req, req.params.id as string);
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
      if (
        error instanceof OsNotFoundError ||
        error instanceof OsItemNotFoundError ||
        error instanceof OsValidationError
      ) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async uploadItemFoto(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }
      await assertPodeEditarOs(req, req.params.id as string);

      let midiaId: string;
      if (req.file) {
        const file = midiasService.validateFile(req.file);
        const os = await osService.getById(req.params.id as string);
        const midia = await midiasService.create(
          file,
          { tipo: TipoMidia.ITEM, festaId: os.festaId },
          req.user.id
        );
        midiaId = midia.id;
      } else {
        const parsed = osService.parseFotoFinal(req.body);
        midiaId = parsed.midiaId;
      }

      const item = await osService.uploadItemFoto(
        req.params.id as string,
        req.params.itemId as string,
        midiaId
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
      if (
        error instanceof OsNotFoundError ||
        error instanceof OsItemNotFoundError ||
        error instanceof OsValidationError ||
        error instanceof MidiaValidationError
      ) {
        res.status(400).json({ message: error.message });
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
      await assertPodeEditarOs(req, req.params.id as string);
      const os = await osService.concluirRomaneio(req.params.id as string);
      res.status(200).json(os);
    } catch (error) {
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

  async seedRomaneio(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await assertPodeEditarOs(req, req.params.id as string);
      const os = await osService.seedRomaneioCompleto(req.params.id as string);
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

  async assignMontador(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const os = await osService.assignMontador(
        req.params.id as string,
        req.body
      );
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
      if (error instanceof OsValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async checkin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await assertPodeEditarOs(req, req.params.id as string);
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

  async concluirMontagemLocal(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await assertPodeEditarOs(req, req.params.id as string);
      const os = await osService.concluirMontagemLocal(req.params.id as string);
      res.status(200).json(os);
    } catch (error) {
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

  async finalizar(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await assertPodeEditarOs(req, req.params.id as string);
      const os = await osService.finalizar(req.params.id as string);
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

  async fotoFinal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }
      await assertPodeEditarOs(req, req.params.id as string);

      let midiaId: string;

      if (req.file) {
        try {
          await montagemGaleriaService.upload(
            req.params.id as string,
            req.file,
            req.user
          );
          const os = await osService.getById(req.params.id as string);
          res.status(200).json(os);
          return;
        } catch (error) {
          if (!(error instanceof FirebaseNotConfiguredError)) {
            throw error;
          }
        }

        const file = midiasService.validateFile(req.file);
        const osAtual = await osService.getById(req.params.id as string);
        const midia = await midiasService.create(
          file,
          { tipo: TipoMidia.MONTAGEM_FINAL, festaId: osAtual.festaId },
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
        error instanceof MidiaValidationError ||
        error instanceof FirebaseNotConfiguredError
      ) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const osController = new OsController();
