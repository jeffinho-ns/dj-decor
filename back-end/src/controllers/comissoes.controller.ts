import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { comissoesService } from "../services/comissoes.service";

export class ComissoesController {
  async ranking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await comissoesService.getRanking(req.query);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Parâmetros inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      next(error);
    }
  }
}

export const comissoesController = new ComissoesController();
