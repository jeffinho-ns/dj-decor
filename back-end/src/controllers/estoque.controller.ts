import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  estoqueService,
  FestaNotFoundForReservaError,
  OverbookingError,
  ProdutoNotFoundForEstoqueError,
  ReservaNotFoundError,
  UnidadeEmManutencaoError,
  UnidadeNotFoundForReservaError,
} from "../services/estoque.service";

export class EstoqueController {
  async disponibilidade(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query = estoqueService.parseDisponibilidade(req.query);
      const result = await estoqueService.disponibilidade(query);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Parâmetros inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof ProdutoNotFoundForEstoqueError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async reservar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = estoqueService.parseReservar(req.body);
      const reserva = await estoqueService.reservar(data);
      res.status(201).json(reserva);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (
        error instanceof OverbookingError ||
        error instanceof UnidadeEmManutencaoError
      ) {
        res.status(409).json({ message: error.message });
        return;
      }
      if (
        error instanceof UnidadeNotFoundForReservaError ||
        error instanceof FestaNotFoundForReservaError
      ) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async liberar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await estoqueService.liberar(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof ReservaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async listByFesta(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const reservas = await estoqueService.listByFesta(
        req.params.festaId as string
      );
      res.status(200).json(reservas);
    } catch (error) {
      next(error);
    }
  }

  async alertasQr(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const alertas = await estoqueService.alertasQr();
      res.status(200).json(alertas);
    } catch (error) {
      next(error);
    }
  }

  async inventario(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const inventario = await estoqueService.inventarioResumo();
      res.status(200).json(inventario);
    } catch (error) {
      next(error);
    }
  }

  async sincronizarCatalogo(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await estoqueService.sincronizarCatalogo();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const estoqueController = new EstoqueController();