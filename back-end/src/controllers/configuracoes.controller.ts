import type { NextFunction, Response } from "express";
import { Role } from "@prisma/client";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { configuracoesService } from "../services/configuracoes.service";

const CAMPOS_FINANCEIROS = new Set([
  "comissaoPercentual",
  "comissaoSociaPercentual",
  "comissaoMetaSemanal",
  "diariaMontador",
  "diariaDesmontador",
]);

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
      const body =
        req.user?.role === Role.ADMIN ||
        !req.body ||
        typeof req.body !== "object"
          ? req.body
          : Object.fromEntries(
              Object.entries(req.body as Record<string, unknown>).filter(
                ([key]) => !CAMPOS_FINANCEIROS.has(key)
              )
            );

      const config = await configuracoesService.update(body);
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
