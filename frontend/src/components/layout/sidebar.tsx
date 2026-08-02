"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ContactRound,
  Hammer,
  Package,
  PartyPopper,
  PlusCircle,
  Settings,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  UserCog,
  Wallet,
  Coins,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/auth";
import type { User } from "@/types/auth";

const DEFAULT_NAV = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Vendas", icon: PartyPopper },
  { href: "/vendas/nova", label: "Nova Venda", icon: PlusCircle },
  { href: "/clientes", label: "Clientes", icon: ContactRound },
  { href: "/comissoes", label: "Comissões", icon: Coins },
  { href: "/follow-ups", label: "Follow-up", icon: Sparkles },
  { href: "/lixeira", label: "Lixeira", icon: Trash2 },
  { href: "/perfil", label: "Perfil", icon: UserRound },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const GESTAO_NAV = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Vendas", icon: PartyPopper },
  { href: "/vendas/nova", label: "Nova Venda", icon: PlusCircle },
  { href: "/clientes", label: "Clientes", icon: ContactRound },
  { href: "/comissoes", label: "Comissões", icon: Coins },
  { href: "/follow-ups", label: "Follow-up", icon: Sparkles },
  { href: "/lixeira", label: "Lixeira", icon: Trash2 },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/aprovacoes", label: "Aprovações", icon: CheckCircle2 },
  { href: "/perfil", label: "Perfil", icon: UserRound },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const ADMIN_NAV = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Vendas", icon: PartyPopper },
  { href: "/vendas/nova", label: "Nova Venda", icon: PlusCircle },
  { href: "/clientes", label: "Clientes", icon: ContactRound },
  { href: "/comissoes", label: "Comissões", icon: Coins },
  { href: "/follow-ups", label: "Follow-up", icon: Sparkles },
  { href: "/lixeira", label: "Lixeira", icon: Trash2 },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/usuarios", label: "Usuários", icon: UserCog },
  { href: "/aprovacoes", label: "Aprovações", icon: CheckCircle2 },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/perfil", label: "Perfil", icon: UserRound },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const MONTADOR_NAV = [
  { href: "/montagem", label: "Montagem", icon: Hammer },
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: UserRound },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

interface SidebarProps {
  user: User;
}

export function isNavActive(pathname: string, href: string): boolean {
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
  if (href === "/estoque") {
    return pathname === "/estoque" || pathname.startsWith("/estoque/");
  }
  if (href === "/comissoes") {
    return pathname === "/comissoes" || pathname.startsWith("/comissoes/");
  }
  if (href === "/financeiro") {
    return pathname === "/financeiro" || pathname.startsWith("/financeiro/");
  }
  if (href === "/equipe") {
    return pathname === "/equipe" || pathname.startsWith("/equipe/");
  }
  if (href === "/aprovacoes") {
    return pathname === "/aprovacoes" || pathname.startsWith("/aprovacoes/");
  }
  if (href === "/lixeira") {
    return pathname === "/lixeira" || pathname.startsWith("/lixeira/");
  }
  if (href === "/clientes") {
    return pathname === "/clientes" || pathname.startsWith("/clientes/");
  }
  if (href === "/follow-ups") {
    return pathname === "/follow-ups" || pathname.startsWith("/follow-ups/");
  }
  if (href === "/configuracoes") {
    return (
      pathname === "/configuracoes" || pathname.startsWith("/configuracoes/")
    );
  }
  return pathname === href;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";
  const isGestao = user.role === "ADMIN" || user.role === "GERENTE";
  const isMontador = user.role === "MONTADOR";
  const navItems = isMontador
    ? MONTADOR_NAV
    : isAdmin
      ? ADMIN_NAV
      : isGestao
        ? GESTAO_NAV
        : DEFAULT_NAV;

  return (
    <aside className="m-3 flex h-[calc(100%-1.5rem)] w-64 flex-col rounded-3xl neo text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-11 items-center justify-center rounded-2xl neo-pink">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="font-display text-lg leading-none tracking-tight">
            DJ <span className="text-balloon-pink">Decor</span>
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="balloon-dot bg-balloon-pink" />
            <span className="balloon-dot bg-balloon-sky" />
            <span className="balloon-dot bg-balloon-sun" />
            <span className="ml-1">
              {isAdmin ? "Gestão festiva" : roleLabel(user.role, user.nome)}
            </span>
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
        <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                "flex min-h-11 items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-medium transition-all neo-press",
                active
                  ? "neo-pink text-white"
                  : "text-sidebar-foreground/80 hover:neo-sm"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="flex items-center gap-2.5 rounded-2xl neo-inset px-3 py-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full neo-sun text-sm font-bold">
            {user.nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{user.nome}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {roleLabel(user.role, user.nome)}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
