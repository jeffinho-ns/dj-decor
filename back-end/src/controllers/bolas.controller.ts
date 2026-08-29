import type { NextFunction, Response } from "express";
import { Role } from "@prisma/client";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  bolasService,
  PedidoBolasNotFoundError,
} from "../services/bolas.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export class BolasController {
  async listCatalogo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const admin =
        req.user?.role === Role.ADMIN ||
        req.user?.role === Role.GERENTE ||
        req.user?.role === Role.BOLISTA;
      const itens = await bolasService.listCatalogo(!admin || req.query.all !== "1");
      res.status(200).json(itens);
    } catch (error) {
      next(error);
    }
  }

  async upsertCatalogo(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const item = await bolasService.upsertCatalogo(req.body, req.user.id);
      res.status(200).json(item);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async setCatalogoAtivo(
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
      const item = await bolasService.setCatalogoAtivo(
        id,
        Boolean(req.body?.ativo)
      );
      res.status(200).json(item);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async listPedidos(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const from = req.query.from
        ? new Date(String(req.query.from))
        : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;
      const bolistaId =
        req.user?.role === Role.BOLISTA
          ? req.user.id
          : typeof req.query.bolistaId === "string"
            ? req.query.bolistaId
            : undefined;

      const pedidos = await bolasService.listPedidos({ bolistaId, from, to });
      res.status(200).json(pedidos);
    } catch (error) {
      next(error);
    }
  }

  async getPedido(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const pedido = await bolasService.getPedido(id);
      if (
        req.user?.role === Role.BOLISTA &&
        pedido.bolistaId !== req.user.id
      ) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }
      res.status(200).json(pedido);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async createPedido(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const pedido = await bolasService.createPedido(req.body, {
        id: req.user.id,
        role: req.user.role,
      });
      res.status(201).json(pedido);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async updatePedido(
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
      if (req.user?.role === Role.BOLISTA) {
        const existing = await bolasService.getPedido(id);
        if (existing.bolistaId !== req.user.id) {
          res.status(403).json({ error: "Acesso negado" });
          return;
        }
      }
      const pedido = await bolasService.updatePedido(id, req.body);
      res.status(200).json(pedido);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async marcarRepasse(
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
      const pedido = await bolasService.marcarRepasse(
        id,
        req.body?.pago !== false,
        req.body?.obs ?? null
      );
      res.status(200).json(pedido);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async financeiro(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bolistaId =
        req.user?.role === Role.BOLISTA ? req.user.id : undefined;
      const resumo = await bolasService.financeiroResumo(bolistaId);
      res.status(200).json(resumo);
    } catch (error) {
      next(error);
    }
  }

  async markup(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const markupPercentual = await bolasService.getMarkupPercentual();
      res.status(200).json({ markupPercentual });
    } catch (error) {
      next(error);
    }
  }

  async listaCompras(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const bolistaId =
        req.user?.role === Role.BOLISTA ? req.user.id : undefined;
      const dias = Number(req.query.dias) || 14;
      const lista = await bolasService.listaComprasSemana(bolistaId, dias);
      res.status(200).json(lista);
    } catch (error) {
      next(error);
    }
  }

  async addCompra(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      if (req.user?.role === Role.BOLISTA) {
        const pedido = await bolasService.getPedido(id);
        if (pedido.bolistaId !== req.user.id) {
          res.status(403).json({ error: "Acesso negado" });
          return;
        }
      }
      const compra = await bolasService.addCompra(id, req.body);
      res.status(201).json(compra);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async setCompraComprado(
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
      const compra = await bolasService.setCompraComprado(
        id,
        Boolean(req.body?.comprado)
      );
      res.status(200).json(compra);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async removeCompra(
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
      await bolasService.removeCompra(id);
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
    if (error instanceof PedidoBolasNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export const bolasController = new BolasController();
