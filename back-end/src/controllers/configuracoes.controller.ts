import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { configuracoesService } from "../services/configuracoes.service";

export class ConfiguracoesController {
  async get(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const config = await configuracoesService.get();
      res.status(200).json(config);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const config = await configuracoesService.update(req.body);
      res.status(200).json(config);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      next(error);
    }
  }
}

export const configuracoesController = new ConfiguracoesController();
