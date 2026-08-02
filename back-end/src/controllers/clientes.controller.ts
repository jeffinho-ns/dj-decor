import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  ClienteNotFoundError,
  clientesService,
} from "../services/clientes.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return null;
}

function queryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export class ClientesController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = queryString(req.query.q);
      const clientes = await clientesService.list(q);
      res.status(200).json(clientes);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorTelefone(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const telefone = queryString(req.query.telefone);
      if (!telefone?.trim()) {
        res.status(400).json({ error: "Parâmetro telefone é obrigatório" });
        return;
      }
      const cliente = await clientesService.findByTelefone(telefone);
      if (!cliente) {
        res.status(404).json({ error: "Cliente não encontrado" });
        return;
      }
      res.status(200).json(cliente);
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
      const cliente = await clientesService.getById(id);
      res.status(200).json(cliente);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const cliente = await clientesService.create(req.body);
      res.status(201).json(cliente);
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
      const cliente = await clientesService.update(id, req.body);
      res.status(200).json(cliente);
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
    if (error instanceof ClienteNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export const clientesController = new ClientesController();
