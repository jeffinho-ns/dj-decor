import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  FestaNotFoundError,
  festasService,
} from "../services/festas.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return null;
}

export class FestasController {
  async list(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const festas = await festasService.list();
      res.status(200).json(festas);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const festa = await festasService.getById(id);
      res.status(200).json(festa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const vendedorId = req.user?.id ?? "mock-vendedor-id";
      const festa = await festasService.create(req.body, vendedorId);
      res.status(201).json(festa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const festa = await festasService.update(id, req.body);
      res.status(200).json(festa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      await festasService.remove(id);
      res.status(204).send();
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

    next(error);
  }
}

export const festasController = new FestasController();
