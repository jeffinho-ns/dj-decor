import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { authService, InvalidCredentialsError } from "../services/auth.service";

const loginSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
  senha: z.string().min(1, "Senha é obrigatória"),
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

  async me(req: AuthenticatedRequest, res: Response) {
    res.status(200).json({ user: req.user });
  }

  async logout(_req: Request, res: Response) {
    res.status(200).json({ ok: true });
  }
}

export const authController = new AuthController();
