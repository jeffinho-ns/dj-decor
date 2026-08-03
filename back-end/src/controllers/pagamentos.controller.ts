import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  FestaNotFoundForPagamentoError,
  MidiaNotFoundForPagamentoError,
  PagamentoJaConfirmadoError,
  PagamentoNotFoundError,
  pagamentosService,
} from "../services/pagamentos.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return null;
}

export class PagamentosController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const festaId = getParamId(req.params.id);
      if (!festaId) {
        res.status(400).json({ error: "ID da festa é obrigatório" });
        return;
      }
      const pagamento = await pagamentosService.create(festaId, req.body);
      res.status(201).json(pagamento);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async listByFesta(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const festaId = getParamId(req.params.id);
      if (!festaId) {
        res.status(400).json({ error: "ID da festa é obrigatório" });
        return;
      }
      const pagamentos = await pagamentosService.listByFesta(festaId);
      res.status(200).json(pagamentos);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async confirmar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID do pagamento é obrigatório" });
        return;
      }
      const pagamento = await pagamentosService.confirmar(id, req.body);
      res.status(200).json(pagamento);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async anexarComprovante(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID do pagamento é obrigatório" });
        return;
      }
      const pagamento = await pagamentosService.anexarComprovante(id, req.body);
      res.status(200).json(pagamento);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async gerarPix(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID do pagamento é obrigatório" });
        return;
      }
      const pagamento = await pagamentosService.gerarPix(id);
      res.status(200).json(pagamento);
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

    if (
      error instanceof FestaNotFoundForPagamentoError ||
      error instanceof PagamentoNotFoundError ||
      error instanceof MidiaNotFoundForPagamentoError
    ) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof PagamentoJaConfirmadoError) {
      res.status(409).json({ error: error.message });
      return;
    }

    next(error);
  }
}

export const pagamentosController = new PagamentosController();
