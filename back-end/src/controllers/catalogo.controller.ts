import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { catalogoService } from "../services/catalogo.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export class CatalogoController {
  /** Público autenticado — kits/addons ativos para orçamento. */
  async listPublico(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = await catalogoService.listPublico();
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  async listKitsAdmin(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const kits = await catalogoService.listKits(false);
      res.status(200).json(kits);
    } catch (error) {
      next(error);
    }
  }

  async listAddonsAdmin(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const addons = await catalogoService.listAddons(false);
      res.status(200).json(addons);
    } catch (error) {
      next(error);
    }
  }

  async upsertKit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const kit = await catalogoService.upsertKit(req.body);
      res.status(200).json(kit);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async upsertAddon(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const addon = await catalogoService.upsertAddon(req.body);
      res.status(200).json(addon);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async setKitAtivo(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const ativo = Boolean(req.body?.ativo);
      const kit = await catalogoService.setKitAtivo(id, ativo);
      res.status(200).json(kit);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async setAddonAtivo(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const ativo = Boolean(req.body?.ativo);
      const addon = await catalogoService.setAddonAtivo(id, ativo);
      res.status(200).json(addon);
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
    next(error);
  }
}

export const catalogoController = new CatalogoController();
