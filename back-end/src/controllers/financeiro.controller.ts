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

  async listAPagar(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await financeiroService.listAPagar(req.query);
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

  async listCalendarioDiarias(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await financeiroService.listCalendarioDiarias(req.query);
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

  async listColaboradores(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const list = await financeiroService.listColaboradores();
      res.status(200).json(list);
    } catch (error) {
      next(error);
    }
  }

  async getColaborador(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id =
        typeof req.params.id === "string"
          ? req.params.id
          : Array.isArray(req.params.id)
            ? req.params.id[0]
            : null;
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const detalhe = await financeiroService.getColaboradorDetalhe(
        id,
        req.query
      );
      res.status(200).json(detalhe);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Parâmetros inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (
        error instanceof Error &&
        error.message.startsWith("Colaborador não encontrado")
      ) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async listFestasMes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await financeiroService.listFestasMes(req.query);
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

  async resumoDebora(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await financeiroService.resumoDeboraMes(req.query);
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

  async alertasFora(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await financeiroService.alertasForaParacambi(req.query);
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

export const financeiroController = new FinanceiroController();
