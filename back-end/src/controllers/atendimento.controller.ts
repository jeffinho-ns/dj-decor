import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  ConversaNotFoundError,
  atendimentoService,
} from "../services/atendimento.service";
import { atendimentoAgentService } from "../services/atendimento-agent.service";
import { CanalAtendimento } from "@prisma/client";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return null;
}

export class AtendimentoController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const items = await atendimentoService.list(req.query, {
        id: req.user.id,
        role: req.user.role,
      });
      res.status(200).json(items);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async metricas(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await atendimentoService.metricas();
      res.status(200).json({
        ...data,
        agentEnabled: atendimentoAgentService.isEnabled(),
        agentProvider: atendimentoAgentService.providerName(),
      });
    } catch (error) {
      next(error);
    }
  }

  async vendedores(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const items = await atendimentoService.listVendedores();
      res.status(200).json(items);
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
      const conversa = await atendimentoService.getById(id);
      res.status(200).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async createManual(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const conversa = await atendimentoService.createManual(
        req.body,
        req.user.id
      );
      res.status(201).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async reply(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const conversa = await atendimentoService.sendHumanReply(
        id,
        req.body,
        req.user.id
      );
      res.status(200).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async takeover(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const conversa = await atendimentoService.takeover(id, req.user.id);
      res.status(200).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async devolverIa(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const conversa = await atendimentoService.devolverIa(id, req.user.id);
      // Dispara IA para responder com contexto atual
      void atendimentoAgentService.handleInbound(id).catch((err) => {
        console.error("[atendimento] agent após devolver IA:", err);
      });
      res.status(200).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async assign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const conversa = await atendimentoService.assign(
        id,
        req.body,
        req.user.id
      );
      res.status(200).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async fechar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const conversa = await atendimentoService.fechar(id, req.user.id);
      res.status(200).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async vincularFesta(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = getParamId(req.params.id);
      const festaId =
        typeof req.body?.festaId === "string" ? req.body.festaId : null;
      if (!id || !festaId) {
        res.status(400).json({ error: "ID e festaId são obrigatórios" });
        return;
      }
      const conversa = await atendimentoService.vincularFesta(id, festaId);
      res.status(200).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  async updateNotas(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }
      const id = getParamId(req.params.id);
      if (!id) {
        res.status(400).json({ error: "ID é obrigatório" });
        return;
      }
      const conversa = await atendimentoService.updateNotasInternas(
        id,
        req.body,
        req.user.id
      );
      res.status(200).json(conversa);
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  /** Simula inbound (dev/teste) sem Meta. */
  async simularInbound(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const canal =
        req.body?.canal === "INSTAGRAM"
          ? CanalAtendimento.INSTAGRAM
          : req.body?.canal === "MANUAL"
            ? CanalAtendimento.MANUAL
            : CanalAtendimento.WHATSAPP;
      const externalThreadId = String(
        req.body?.externalThreadId || req.body?.telefone || ""
      ).replace(/\D/g, "");
      const texto = String(req.body?.texto ?? "");
      if (!externalThreadId || !texto) {
        res.status(400).json({
          error: "externalThreadId/telefone e texto são obrigatórios",
        });
        return;
      }

      const result = await atendimentoService.ingestInbound({
        canal,
        externalThreadId,
        contatoExterno: String(req.body?.telefone ?? externalThreadId),
        contatoNome: req.body?.nome ? String(req.body.nome) : null,
        texto,
        providerMessageId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      let agentResult = null;
      if (result.shouldRunAgent) {
        agentResult = await atendimentoAgentService.handleInbound(
          result.conversa.id
        );
      } else if (result.handoffRecorrente && result.sugerido) {
        const textoHandoff =
          `Oi! Vi que você já fez festa com a gente 🎈 ` +
          `Vou te passar para ${result.sugerido.vendedorNome}.`;
        await atendimentoService.appendOutbound({
          conversaId: result.conversa.id,
          texto: textoHandoff,
          autorTipo: "AI",
          sendToProvider: true,
        });
      }

      res.status(200).json({
        conversa: await atendimentoService.getById(result.conversa.id),
        agent: agentResult,
      });
    } catch (error) {
      this.handleError(error, res, next);
    }
  }

  private handleError(error: unknown, res: Response, next: NextFunction) {
    if (error instanceof ConversaNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Dados inválidos", details: error.flatten() });
      return;
    }
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export const atendimentoController = new AtendimentoController();
