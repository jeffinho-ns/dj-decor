import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  CodigoQrInUseError,
  ProdutoNotFoundError,
  produtosService,
} from "../services/produtos.service";

export class ProdutosController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ativosOnly = req.query.ativos === "true";
      const produtos = await produtosService.list(ativosOnly);
      res.status(200).json(produtos);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const produto = await produtosService.getById(req.params.id as string);
      res.status(200).json(produto);
    } catch (error) {
      if (error instanceof ProdutoNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = produtosService.parseCreate(req.body);
      const produto = await produtosService.create(data);
      res.status(201).json(produto);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = produtosService.parseUpdate(req.body);
      const produto = await produtosService.update(req.params.id as string, data);
      res.status(200).json(produto);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof ProdutoNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async addUnidade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = produtosService.parseUnidade(req.body);
      const unidade = await produtosService.addUnidade(
        req.params.id as string,
        data
      );
      res.status(201).json(unidade);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof ProdutoNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof CodigoQrInUseError) {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const produtosController = new ProdutosController();
