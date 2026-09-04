import type { NextFunction, Response } from "express";
import { Role } from "@prisma/client";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  FestaNotFoundError,
  FestaValidationError,
  festasService,
  InvalidStatusTransitionError,
} from "../services/festas.service";
import {
  PortalFestaNotFoundError,
  portalService,
} from "../services/portal.service";
import { followUpService } from "../services/follow-up.service";
import { conflitosService } from "../services/conflitos.service";
import {
  RiscoFestaNotFoundError,
  riscoService,
} from "../services/risco.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return null;
}

/** VENDEDOR só acessa festas em que é o vendedor. Gestão vê tudo. */
async function assertAcessoFesta(
  req: AuthenticatedRequest,
  festaId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (req.user?.role !== Role.VENDEDOR) {
    return { ok: true };
  }
  const festa = await festasService.getById(festaId);
  if (festa.vendedorId !== req.user.id) {
    return { ok: false, status: 403, error: "Acesso negado a esta festa" };
  }
  return { ok: true };
}

export class FestasController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const raw = req.query.lixeira;
      const lixeira =
        raw === "1" ||
        raw === "true" ||
        (Array.isArray(raw) && (raw[0] === "1" || raw[0] === "true"));
      const rawMinhas = req.query.minhas;
      const pediuMinhas =
        rawMinhas === "1" ||
        rawMinhas === "true" ||
        (Array.isArray(rawMinhas) &&
          (rawMinhas[0] === "1" || rawMinhas[0] === "true"));
      // VENDEDOR só vê as próprias festas (não pode abrir o funil dos outros).
      const forcarMinhas = req.user?.role === Role.VENDEDOR;
      const minhas = forcarMinhas || pediuMinhas;
      const festas = await festasService.list({
        lixeira,
        vendedorId: minhas ? req.user?.id : undefined,
      });
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
      const acesso = await assertAcessoFesta(req, id);
      if (!acesso.ok) {
        res.status(acesso.status).json({ error: acesso.error });
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
      // Vendedor não pode atribuir a venda a outra pessoa.
      const body =
        req.user?.role === Role.VENDEDOR
          ? { ...req.body, vendedorId: req.user.id }
          : req.body;
      const vendedorId = req.user?.id ?? "mock-vendedor-id";
      const festa = await festasService.create(body, vendedorId);
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
      const acesso = await assertAcessoFesta(req, id);
      if (!acesso.ok) {
        res.status(acesso.status).json({ error: acesso.error });
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

  async updateChecklist(
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
      const acesso = await assertAcessoFesta(req, id);
      if (!acesso.ok) {
        res.status(acesso.status).json({ error: acesso.error });
        return;
      }
      const festa = await festasService.updateChecklist(
        id,
        req.body?.itensExtrasConcluidos
      );
      res.status(200).json(festa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async updateStatus(
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
      const acesso = await assertAcessoFesta(req, id);
      if (!acesso.ok) {
        res.status(acesso.status).json({ error: acesso.error });
        return;
      }
      const festa = await festasService.updateStatus(id, req.body);
      res.status(200).json(festa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async risco(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const acesso = await assertAcessoFesta(req, id);
      if (!acesso.ok) {
        res.status(acesso.status).json({ error: acesso.error });
        return;
      }
      const risco = await riscoService.getByFestaId(id);
      res.status(200).json(risco);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async portalLink(
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
      await portalService.ensurePortalToken(id);
      res.status(200).json(await portalService.buildPortalLink(id));
    } catch (error) {
      if (error instanceof PortalFestaNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async listFollowUps(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const rawMinhas = req.query.minhas;
      const pediuMinhas =
        rawMinhas === "1" ||
        rawMinhas === "true" ||
        (Array.isArray(rawMinhas) &&
          (rawMinhas[0] === "1" || rawMinhas[0] === "true"));
      const minhas = req.user?.role === Role.VENDEDOR || pediuMinhas;
      const rawHoje = req.query.hoje;
      const hoje =
        rawHoje === "1" ||
        rawHoje === "true" ||
        (Array.isArray(rawHoje) &&
          (rawHoje[0] === "1" || rawHoje[0] === "true"));

      const fila = await followUpService.listFila({
        vendedorId: minhas ? req.user?.id : undefined,
        hoje,
      });
      res.status(200).json(fila);
    } catch (error) {
      next(error);
    }
  }

  async registrarFollowUp(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = getParamId(req.params.id);
      if (!id || !req.user) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const row = await followUpService.registrar(id, req.user.id, req.body);
      res.status(201).json(row);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async conflitos(
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
      const result = await conflitosService.paraFesta(id);
      res.status(200).json(result);
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

    if (error instanceof RiscoFestaNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof InvalidStatusTransitionError) {
      res.status(409).json({ error: error.message });
      return;
    }

    if (error instanceof FestaValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
}

export const festasController = new FestasController();
