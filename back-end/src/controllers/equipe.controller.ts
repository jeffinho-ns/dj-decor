import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  equipeService,
  EquipeValidationError,
} from "../services/equipe.service";

export class EquipeController {
  async listMontadores(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const montadores = await equipeService.listMontadores();
      res.status(200).json(montadores);
    } catch (error) {
      next(error);
    }
  }

  async listAgenda(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agenda = await equipeService.listAgenda(req.query);
      res.status(200).json(agenda);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Parâmetros inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof EquipeValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const equipeController = new EquipeController();
