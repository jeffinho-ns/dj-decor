import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { me } from "@/lib/api";
import { TOKEN_COOKIE } from "@/lib/auth";
import type { User } from "@/types/auth";

export interface Session {
  token: string;
  user: User;
}

/**
 * Helper server-side: garante que existe um token válido, buscando o
 * usuário via GET /api/auth/me. Redireciona para /login quando ausente
 * ou inválido.
 */
export async function requireSession(): Promise<Session> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!raw) {
    redirect("/login");
  }

  const token = decodeURIComponent(raw);

  try {
    const { user } = await me(token);
    return { token, user };
  } catch {
    redirect("/login");
  }
}
