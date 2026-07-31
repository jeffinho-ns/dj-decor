import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  UsersConflictError,
  UsersNotFoundError,
  usersService,
} from "../services/users.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export class UsersController {
  async list(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await usersService.list();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await usersService.create(req.body);
      res.status(201).json(user);
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
      const user = await usersService.update(id, req.body);
      res.status(200).json(user);
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
    if (error instanceof UsersConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof UsersNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export const usersController = new UsersController();
