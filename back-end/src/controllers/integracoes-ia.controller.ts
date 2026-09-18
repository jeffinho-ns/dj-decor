import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  IntegracaoIaValidationError,
  integracoesIaService,
} from "../services/integracoes-ia.service";
import { FestaValidationError } from "../services/festas.service";

export class IntegracoesIaController {
  async catalogo(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await integracoesIaService.listCatalogo();
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async agenda(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await integracoesIaService.checarAgenda(req.query);
      res.status(200).json(data);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async criarOrcamento(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await integracoesIaService.criarOrcamento(req.body);
      res.status(201).json(data);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async festasPorTelefone(req: Request, res: Response, next: NextFunction) {
    try {
      const telefone = String(req.query.telefone ?? "");
      const data = await integracoesIaService.buscarFestasPorTelefone(telefone);
      res.status(200).json(data);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  private handleError(error: unknown, res: Response, next: NextFunction) {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Payload inválido",
        issues: error.flatten(),
      });
      return;
    }
    if (
      error instanceof IntegracaoIaValidationError ||
      error instanceof FestaValidationError
    ) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
}

export const integracoesIaController = new IntegracoesIaController();
