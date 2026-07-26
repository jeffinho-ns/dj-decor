import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { env } from "../config/env";
import { authService } from "../services/auth.service";

export interface AuthUser {
  id: string;
  nome: string;
  email: string | null;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const MOCK_VENDEDOR_USER: AuthUser = {
  id: "mock-vendedor-id",
  nome: "Vendedor Mock",
  email: "vendedor@djdecor.com",
  role: Role.VENDEDOR,
};

/**
 * Middleware de autenticação real via JWT.
 * Aceita header: Authorization: Bearer <jwt>
 *
 * Compatibilidade: em desenvolvimento, também aceita
 * Authorization: Bearer mock-vendedor (mock legado).
 */
export function auth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ message: "Não autorizado" });
    return;
  }

  const token = authHeader.slice(authHeader.indexOf(" ") + 1).trim();

  if (env.NODE_ENV === "development" && token === "mock-vendedor") {
    req.user = MOCK_VENDEDOR_USER;
    next();
    return;
  }

  try {
    const payload = authService.verifyToken(token);
    req.user = {
      id: payload.sub,
      nome: payload.nome,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
}

/**
 * Middleware factory que restringe o acesso a determinados papéis.
 * Deve ser usado sempre após o middleware `auth`.
 */
export function requireRoles(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Não autorizado" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Acesso negado" });
      return;
    }

    next();
  };
}
