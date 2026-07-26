import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    nome: string;
    email: string;
    role: Role;
  };
}

/**
 * Middleware mock de autenticação para o perfil Vendedor.
 * Em produção, substituir por JWT/session real.
 * Aceita header: Authorization: Bearer mock-vendedor
 * ou X-User-Role: VENDEDOR
 */
export function authVendedor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const roleHeader = req.headers["x-user-role"];
  const userIdHeader = req.headers["x-user-id"];

  const isMockBearer =
    typeof authHeader === "string" &&
    authHeader.toLowerCase() === "bearer mock-vendedor";

  const isVendedorRole =
    typeof roleHeader === "string" &&
    roleHeader.toUpperCase() === Role.VENDEDOR;

  if (!isMockBearer && !isVendedorRole) {
    res.status(401).json({
      error: "Não autorizado",
      message:
        "Acesso restrito a vendedores. Envie Authorization: Bearer mock-vendedor ou X-User-Role: VENDEDOR",
    });
    return;
  }

  req.user = {
    id:
      typeof userIdHeader === "string" && userIdHeader.length > 0
        ? userIdHeader
        : "mock-vendedor-id",
    nome: "Vendedor Mock",
    email: "vendedor@djdecor.com",
    role: Role.VENDEDOR,
  };

  next();
}
