"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Hammer,
  PartyPopper,
  PlusCircle,
  Sparkles,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/auth";
import type { User } from "@/types/auth";

const DEFAULT_NAV = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Vendas", icon: PartyPopper },
  { href: "/vendas/nova", label: "Nova Venda", icon: PlusCircle },
  { href: "/perfil", label: "Perfil", icon: UserRound },
] as const;

const MONTADOR_NAV = [
  { href: "/montagem", label: "Montagem", icon: Hammer },
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: UserRound },
] as const;

interface SidebarProps {
  user: User;
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname === "/calendario" ||
      pathname.startsWith("/calendario/")
    );
  }
  if (href === "/montagem") {
    return pathname === "/montagem" || pathname.startsWith("/montagem/");
  }
  if (href === "/vendas") {
    return (
      pathname.startsWith("/vendas") && !pathname.startsWith("/vendas/nova")
    );
  }
  return pathname === href;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";
  const isMontador = user.role === "MONTADOR";
  const navItems = isMontador ? MONTADOR_NAV : DEFAULT_NAV;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-6">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <div>
          <p className="font-display text-base leading-none tracking-tight">
            DJ Decor
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isAdmin ? "Gestão" : `Painel do ${roleLabel(user.role)}`}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {isAdmin ? "Gestão" : "Menu"}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-champagne/15 text-[11px] font-medium text-champagne">
            {user.nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{user.nome}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {roleLabel(user.role)}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
