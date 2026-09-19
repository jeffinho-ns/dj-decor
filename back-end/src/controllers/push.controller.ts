import type { NextFunction, Response } from "express";
import { ZodError } from "zod";

import type { AuthenticatedRequest } from "../middlewares/auth";
import { pushService } from "../services/push.service";

export class PushController {
  /** Chave pública VAPID — o navegador precisa dela para se inscrever. */
  async chavePublica(_req: AuthenticatedRequest, res: Response) {
    res.json({
      habilitado: pushService.isEnabled(),
      chavePublica: pushService.getPublicKey(),
    });
  }

  async inscrever(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const input = pushService.parseInscricao(req.body);
      const inscricao = await pushService.inscrever(req.user.id, input);
      res.status(201).json(inscricao);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Inscrição inválida",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      next(error);
    }
  }

  async cancelar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const endpoint = String(req.body?.endpoint ?? "");
      if (!endpoint) {
        res.status(400).json({ message: "endpoint é obrigatório" });
        return;
      }

      await pushService.cancelar(req.user.id, endpoint);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async listar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const inscricoes = await pushService.listarDoUsuario(req.user.id);
      res.json(inscricoes);
    } catch (error) {
      next(error);
    }
  }

  /** Dispara uma notificação de teste para os aparelhos do próprio usuário. */
  async teste(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const resultado = await pushService.enviarParaUsuarios([req.user.id], {
        titulo: "Teste do app DJ festas",
        corpo: `Funcionou, ${req.user.nome}! O push chegou no seu celular.`,
        url: "/teste-app",
        tag: "teste-app",
        urgente: true,
      });

      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

export const pushController = new PushController();
