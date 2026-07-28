"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Hammer,
  LayoutGrid,
  Package,
  PartyPopper,
  PlusCircle,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { isNavActive } from "@/components/layout/sidebar";
import type { User } from "@/types/auth";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
};

const DEFAULT_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Vendas", icon: PartyPopper },
  { href: "/vendas/nova", label: "Nova Venda", shortLabel: "Nova", icon: PlusCircle },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

const GESTAO_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Vendas", icon: PartyPopper },
  { href: "/vendas/nova", label: "Nova Venda", shortLabel: "Nova", icon: PlusCircle },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/aprovacoes", label: "Aprovações", icon: CheckCircle2 },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/vendas", label: "Vendas", icon: PartyPopper },
  { href: "/vendas/nova", label: "Nova Venda", shortLabel: "Nova", icon: PlusCircle },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/aprovacoes", label: "Aprovações", icon: CheckCircle2 },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

const MONTADOR_ITEMS: NavItem[] = [
  { href: "/montagem", label: "Montagem", icon: Hammer },
  { href: "/dashboard", label: "Agenda", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

const PRIMARY_HREFS = new Set(["/dashboard", "/vendas", "/vendas/nova", "/montagem"]);

function getItemsForRole(user: User): NavItem[] {
  const isAdmin = user.role === "ADMIN";
  const isGestao = isAdmin || user.role === "GERENTE";

  if (user.role === "MONTADOR") return MONTADOR_ITEMS;
  if (isAdmin) return ADMIN_ITEMS;
  if (isGestao) return GESTAO_ITEMS;
  return DEFAULT_ITEMS;
}

function splitNavItems(items: NavItem[]) {
  const primary = items.filter((item) => PRIMARY_HREFS.has(item.href));
  const overflow = items.filter((item) => !PRIMARY_HREFS.has(item.href));
  return { primary, overflow };
}

interface MobileNavProps {
  user: User;
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = getItemsForRole(user);
  const { primary, overflow } = splitNavItems(items);
  const hasOverflow = overflow.length > 0;
  const overflowActive = overflow.some((item) => isNavActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-3 bottom-3 z-40 rounded-3xl neo md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            const label = item.shortLabel ?? item.label;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-semibold transition-all",
                  "min-h-[var(--touch-min,44px)]",
                  active
                    ? "text-balloon-pink"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    active && "neo-pink text-white"
                  )}
                >
                  <Icon className={cn("size-5 shrink-0", active && "stroke-[2.25]")} />
                </span>
                <span className="max-w-full truncate leading-none">{label}</span>
              </Link>
            );
          })}

          {hasOverflow ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-semibold transition-all",
                "min-h-[var(--touch-min,44px)]",
                overflowActive || moreOpen
                  ? "text-balloon-sky"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  (overflowActive || moreOpen) && "neo-sky text-white"
                )}
              >
                <LayoutGrid
                  className={cn(
                    "size-5 shrink-0",
                    (overflowActive || moreOpen) && "stroke-[2.25]"
                  )}
                />
              </span>
              <span className="leading-none">Mais</span>
            </button>
          ) : null}
        </div>
      </nav>

      {hasOverflow && moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-[#2a3142]/35 backdrop-blur-[2px]"
            onClick={() => setMoreOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            className="absolute inset-x-3 bottom-3 rounded-3xl neo"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-display text-base text-foreground">Mais opções</p>
                <div className="mt-1 flex gap-1">
                  <span className="balloon-dot bg-balloon-pink" />
                  <span className="balloon-dot bg-balloon-sky" />
                  <span className="balloon-dot bg-balloon-sun" />
                  <span className="balloon-dot bg-balloon-mint" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar"
                className="flex size-11 items-center justify-center rounded-2xl neo-sm text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <ul className="max-h-[min(50dvh,320px)] space-y-1 overflow-y-auto px-2 pb-3">
              {overflow.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex min-h-[var(--touch-min,44px)] items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "neo-pink text-white"
                          : "neo-inset text-foreground/85"
                      )}
                    >
                      <Icon className="size-5 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
