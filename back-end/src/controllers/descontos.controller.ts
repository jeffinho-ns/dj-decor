import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  DescontoJaPendenteError,
  DescontoNaoPendenteError,
  DescontoSemValorOriginalError,
  descontosService,
} from "../services/descontos.service";
import { FestaNotFoundError } from "../services/festas.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return null;
}

export class DescontosController {
  async listPendentes(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const festas = await descontosService.listPendentes();
      res.status(200).json(festas);
    } catch (error) {
      next(error);
    }
  }

  async solicitar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const festaId = getParamId(req.params.id);
      if (!festaId) {
        res.status(400).json({ error: "ID da festa é obrigatório" });
        return;
      }

      const solicitanteId = req.user?.id;
      if (!solicitanteId) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const festa = await descontosService.solicitar(
        festaId,
        solicitanteId,
        req.body
      );
      res.status(200).json(festa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async aprovar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const festaId = getParamId(req.params.id);
      if (!festaId) {
        res.status(400).json({ error: "ID da festa é obrigatório" });
        return;
      }

      const aprovadorId = req.user?.id;
      if (!aprovadorId) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const festa = await descontosService.aprovar(festaId, aprovadorId);
      res.status(200).json(festa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async recusar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const festaId = getParamId(req.params.id);
      if (!festaId) {
        res.status(400).json({ error: "ID da festa é obrigatório" });
        return;
      }

      const aprovadorId = req.user?.id;
      if (!aprovadorId) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const festa = await descontosService.recusar(festaId, aprovadorId);
      res.status(200).json(festa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  private handleError(error: unknown, res: Response, next: NextFunction) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Dados inválidos",
        details: error.flatten().fieldErrors,
      });
      return;
    }

    if (error instanceof FestaNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (
      error instanceof DescontoJaPendenteError ||
      error instanceof DescontoNaoPendenteError
    ) {
      res.status(409).json({ error: error.message });
      return;
    }

    if (error instanceof DescontoSemValorOriginalError) {
      res.status(422).json({ error: error.message });
      return;
    }

    next(error);
  }
}

export const descontosController = new DescontosController();
