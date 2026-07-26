"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { User } from "@/types/auth";

const DEFAULT_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendario", label: "Calendário" },
  { href: "/vendas", label: "Vendas" },
  { href: "/vendas/nova", label: "Nova Venda" },
  { href: "/perfil", label: "Perfil" },
] as const;

const MONTADOR_ITEMS = [
  { href: "/montagem", label: "Montagem" },
  { href: "/calendario", label: "Calendário" },
  { href: "/perfil", label: "Perfil" },
] as const;

interface MobileNavProps {
  user: User;
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname();
  const items = user.role === "MONTADOR" ? MONTADOR_ITEMS : DEFAULT_ITEMS;

  return (
    <nav className="mt-3 flex gap-4 overflow-x-auto border-t border-border/60 pt-3 md:hidden">
      {items.map((item) => {
        const active =
          item.href === "/calendario"
            ? pathname === "/calendario" || pathname.startsWith("/calendario/")
            : item.href === "/montagem"
              ? pathname === "/montagem" || pathname.startsWith("/montagem/")
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
