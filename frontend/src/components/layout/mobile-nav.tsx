"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { User } from "@/types/auth";

const DEFAULT_ITEMS = [
  { href: "/dashboard", label: "Agenda" },
  { href: "/vendas", label: "Vendas" },
  { href: "/vendas/nova", label: "Nova Venda" },
  { href: "/perfil", label: "Perfil" },
] as const;

const GESTAO_ITEMS = [
  { href: "/dashboard", label: "Agenda" },
  { href: "/vendas", label: "Vendas" },
  { href: "/vendas/nova", label: "Nova Venda" },
  { href: "/estoque", label: "Estoque" },
  { href: "/equipe", label: "Equipe" },
  { href: "/aprovacoes", label: "Aprovações" },
  { href: "/perfil", label: "Perfil" },
] as const;

const ADMIN_ITEMS = [
  { href: "/dashboard", label: "Agenda" },
  { href: "/vendas", label: "Vendas" },
  { href: "/vendas/nova", label: "Nova Venda" },
  { href: "/estoque", label: "Estoque" },
  { href: "/equipe", label: "Equipe" },
  { href: "/aprovacoes", label: "Aprovações" },
  { href: "/financeiro", label: "Financeiro" },
  { href: "/perfil", label: "Perfil" },
] as const;

const MONTADOR_ITEMS = [
  { href: "/montagem", label: "Montagem" },
  { href: "/dashboard", label: "Agenda" },
  { href: "/perfil", label: "Perfil" },
] as const;

interface MobileNavProps {
  user: User;
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";
  const isGestao = isAdmin || user.role === "GERENTE";
  const items =
    user.role === "MONTADOR"
      ? MONTADOR_ITEMS
      : isAdmin
        ? ADMIN_ITEMS
        : isGestao
          ? GESTAO_ITEMS
          : DEFAULT_ITEMS;

  return (
    <nav className="mt-3 flex gap-4 overflow-x-auto border-t border-border/60 pt-3 md:hidden">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard" ||
              pathname.startsWith("/dashboard/") ||
              pathname === "/calendario" ||
              pathname.startsWith("/calendario/")
            : item.href === "/montagem"
              ? pathname === "/montagem" || pathname.startsWith("/montagem/")
              : item.href === "/estoque"
                ? pathname === "/estoque" || pathname.startsWith("/estoque/")
              : item.href === "/financeiro"
                ? pathname === "/financeiro" ||
                  pathname.startsWith("/financeiro/")
                : item.href === "/equipe"
                  ? pathname === "/equipe" || pathname.startsWith("/equipe/")
                  : item.href === "/aprovacoes"
                    ? pathname === "/aprovacoes" ||
                      pathname.startsWith("/aprovacoes/")
                    : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 text-sm transition-colors",
              active
                ? "font-medium text-champagne"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
