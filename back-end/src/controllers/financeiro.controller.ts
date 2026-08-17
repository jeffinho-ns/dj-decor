import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { financeiroService } from "../services/financeiro.service";

export class FinanceiroController {
  async resumo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const resumo = await financeiroService.getResumo(req.query);
      res.status(200).json(resumo);
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

  async previsao(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const previsao = await financeiroService.getPrevisao(req.query);
      res.status(200).json(previsao);
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

  async equipeDiarias(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await financeiroService.listEquipeDiarias(req.query);
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

  async pagarEquipeDiarias(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await financeiroService.pagarEquipeDiarias(req.body);
      res.status(200).json(result);
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

  async frequenciaEquipe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await financeiroService.atualizarFrequenciaEquipe(
        req.body
      );
      res.status(200).json(result);
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

export const financeiroController = new FinanceiroController();
