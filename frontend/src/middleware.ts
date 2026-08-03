import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { TOKEN_COOKIE } from "@/lib/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/vendas",
  "/clientes",
  "/calendario",
  "/montagem",
  "/perfil",
  "/configuracoes",
  "/estoque",
  "/financeiro",
  "/equipe",
  "/aprovacoes",
  "/follow-ups",
  "/lixeira",
  "/comissoes",
];
const VENDEDOR_ONLY_PREFIXES = ["/vendas", "/clientes", "/comissoes"];
const MONTADOR_BLOCKED_PREFIXES = ["/follow-ups"];
const GESTAO_ONLY_PREFIXES = ["/estoque", "/equipe", "/aprovacoes"];
const GESTAO_FINANCEIRO_PREFIXES = ["/financeiro"];
const ADMIN_ONLY_PREFIXES: string[] = [];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isVendedorArea(pathname: string): boolean {
  return VENDEDOR_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isMontadorBlocked(pathname: string): boolean {
  return MONTADOR_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isGestaoArea(pathname: string): boolean {
  return GESTAO_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isGestaoFinanceiro(pathname: string): boolean {
  return GESTAO_FINANCEIRO_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAdminArea(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Lê o claim `role` do JWT sem verificar assinatura (só para roteamento). */
function roleFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { role?: string };
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

function homeForRole(role: string | null): string {
  return role === "MONTADOR" ? "/montagem" : "/dashboard";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get(TOKEN_COOKIE)?.value;
  const token = raw ? decodeURIComponent(raw) : undefined;
  const role = token ? roleFromToken(token) : null;

  if (isProtected(pathname) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (token && role === "MONTADOR" && isVendedorArea(pathname)) {
    return NextResponse.redirect(new URL("/montagem", request.url));
  }

  if (token && role === "MONTADOR" && isMontadorBlocked(pathname)) {
    return NextResponse.redirect(new URL("/montagem", request.url));
  }

  if (
    token &&
    isGestaoArea(pathname) &&
    role !== "ADMIN" &&
    role !== "GERENTE"
  ) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (
    token &&
    isGestaoFinanceiro(pathname) &&
    role !== "ADMIN" &&
    role !== "GERENTE"
  ) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  if (token && isAdminArea(pathname) && role !== "ADMIN") {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/vendas",
    "/vendas/:path*",
    "/clientes",
    "/clientes/:path*",
    "/calendario",
    "/calendario/:path*",
    "/montagem",
    "/montagem/:path*",
    "/perfil",
    "/perfil/:path*",
    "/configuracoes",
    "/configuracoes/:path*",
    "/estoque",
    "/estoque/:path*",
    "/financeiro",
    "/financeiro/:path*",
    "/equipe",
    "/equipe/:path*",
    "/aprovacoes",
    "/aprovacoes/:path*",
    "/follow-ups",
    "/follow-ups/:path*",
    "/lixeira",
    "/lixeira/:path*",
    "/comissoes",
    "/comissoes/:path*",
    "/login",
  ],
};
