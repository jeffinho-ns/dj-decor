import type { Role } from "@/types/auth";

export const TOKEN_COOKIE = "dj_token";
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Grava o token no cookie `dj_token` (client-side). O cookie é lido pelo
 * middleware para proteger rotas e pelos Server Components via next/headers.
 */
export function setClientToken(token: string): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; secure"
      : "";
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(
    token
  )}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; samesite=lax${secure}`;
}

export function clearClientToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function getClientToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "SuperAdmin",
  GERENTE: "Gerente",
  VENDEDOR: "Vendedor",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}
