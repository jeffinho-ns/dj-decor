import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

/**
 * Autenticação server-to-server do backend de IA.
 * Aceita: Authorization: Bearer <IA_SERVICE_TOKEN>
 *      ou: X-IA-Token: <IA_SERVICE_TOKEN>
 *
 * Sem token configurado no CRM, responde 503 (integração desligada).
 */
export function authIaService(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expected = env.IA_SERVICE_TOKEN;
  if (!expected) {
    res.status(503).json({
      message:
        "Integração IA desligada: configure IA_SERVICE_TOKEN no backend do CRM",
    });
    return;
  }

  const headerAuth = req.headers.authorization;
  const bearer =
    headerAuth && headerAuth.toLowerCase().startsWith("bearer ")
      ? headerAuth.slice(headerAuth.indexOf(" ") + 1).trim()
      : null;
  const headerToken = String(req.headers["x-ia-token"] ?? "").trim();
  const token = bearer || headerToken;

  if (!token || token !== expected) {
    res.status(401).json({ message: "Token de integração IA inválido" });
    return;
  }

  next();
}
