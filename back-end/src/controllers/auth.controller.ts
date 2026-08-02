import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import {
  authService,
  EmailInUseError,
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  UserNotFoundError,
} from "../services/auth.service";

const loginSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  senha: z.string().min(1, "Senha é obrigatória"),
});

const updateProfileSchema = z
  .object({
    email: z
      .union([z.string().trim().email("E-mail inválido"), z.literal(""), z.null()])
      .optional(),
    telefone: z
      .union([z.string().trim().max(30), z.literal(""), z.null()])
      .optional(),
    senhaAtual: z.string().min(1, "Senha atual é obrigatória").optional(),
    novaSenha: z
      .string()
      .min(6, "Nova senha deve ter no mínimo 6 caracteres")
      .optional(),
  })
  .refine((data) => !(data.novaSenha && !data.senhaAtual), {
    message: "Informe a senha atual para definir uma nova senha",
    path: ["senhaAtual"],
  })
  .refine((data) => !(data.senhaAtual && !data.novaSenha), {
    message: "Informe a nova senha",
    path: ["novaSenha"],
  });

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { nome, senha } = loginSchema.parse(req.body);
      const { token, user } = await authService.login(nome, senha);
      res.status(200).json({ token, user });
    } catch (error) {
      if (error instanceof ZodError || error instanceof InvalidCredentialsError) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
      }
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }
      const user = await authService.getUserById(req.user.id);
      if (!user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Não autorizado" });
        return;
      }

      const data = updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile(req.user.id, data);
      res.status(200).json({ user });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: "Dados inválidos",
          details: error.flatten().fieldErrors,
        });
        return;
      }
      if (error instanceof InvalidCurrentPasswordError) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof EmailInUseError) {
        res.status(409).json({ message: error.message });
        return;
      }
      if (error instanceof UserNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async logout(_req: Request, res: Response) {
    res.status(200).json({ ok: true });
  }
}

export const authController = new AuthController();
