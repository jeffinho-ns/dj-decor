import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { TOKEN_COOKIE } from "@/lib/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/vendas",
  "/calendario",
  "/montagem",
  "/perfil",
];
const VENDEDOR_ONLY_PREFIXES = ["/dashboard", "/vendas"];

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/vendas",
    "/vendas/:path*",
    "/calendario",
    "/calendario/:path*",
    "/montagem",
    "/montagem/:path*",
    "/perfil",
    "/perfil/:path*",
    "/login",
  ],
};
