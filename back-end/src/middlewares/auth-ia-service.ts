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
  const expected = normalizeToken(env.IA_SERVICE_TOKEN);
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
      ? headerAuth.slice(headerAuth.indexOf(" ") + 1)
      : null;
  const headerToken = String(req.headers["x-ia-token"] ?? "");
  const token = normalizeToken(bearer || headerToken);

  if (!token || token !== expected) {
    let diffAt: number | null = null;
    const max = Math.max(token.length, expected.length);
    for (let i = 0; i < max; i++) {
      if (token[i] !== expected[i]) {
        diffAt = i;
        break;
      }
    }
    const around = (value: string, at: number | null) => {
      if (at == null || !value) return null;
      const start = Math.max(0, at - 4);
      const end = Math.min(value.length, at + 5);
      return {
        slice: value.slice(start, end),
        charAt: value[at] ?? null,
        code: value[at] != null ? value.charCodeAt(at) : null,
      };
    };
    res.status(401).json({
      message: "Token de integração IA inválido",
      hint: {
        receivedLen: token?.length ?? 0,
        expectedLen: expected.length,
        receivedHead: token ? token.slice(0, 4) : null,
        expectedHead: expected.slice(0, 4),
        receivedTail: token ? token.slice(-4) : null,
        expectedTail: expected.slice(-4),
        diffAt,
        receivedAround: around(token, diffAt),
        expectedAround: around(expected, diffAt),
      },
    });
    return;
  }

  next();
}

function normalizeToken(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}
