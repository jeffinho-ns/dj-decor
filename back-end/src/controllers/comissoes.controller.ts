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

  async minhas(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const vendedorId = req.user?.id;
      if (!vendedorId) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }
      const list = await comissoesService.listByVendedor(vendedorId);
      res.status(200).json(list);
    } catch (error) {
      next(error);
    }
  }

  async pendentes(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const list = await comissoesService.listPendentes();
      res.status(200).json(list);
    } catch (error) {
      next(error);
    }
  }

  async marcarPagas(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const result = await comissoesService.marcarPagas(
        ids.filter((id: unknown) => typeof id === "string")
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const comissoesController = new ComissoesController();
