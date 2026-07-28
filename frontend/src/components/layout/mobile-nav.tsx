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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/92 backdrop-blur-md md:hidden"
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
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] transition-colors",
                  "min-h-[var(--touch-min,44px)]",
                  active
                    ? "font-medium text-champagne"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <Icon className={cn("size-5 shrink-0", active && "stroke-[2.25]")} />
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
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] transition-colors",
                "min-h-[var(--touch-min,44px)]",
                overflowActive || moreOpen
                  ? "font-medium text-champagne"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <LayoutGrid
                className={cn(
                  "size-5 shrink-0",
                  (overflowActive || moreOpen) && "stroke-[2.25]"
                )}
              />
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
            className="absolute inset-0 bg-black/55"
            onClick={() => setMoreOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border/70 bg-popover shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <p className="font-display text-base text-foreground">Mais opções</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar"
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <ul className="max-h-[min(50dvh,320px)] overflow-y-auto px-2 py-2">
              {overflow.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex min-h-[var(--touch-min,44px)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-accent font-medium text-champagne"
                          : "text-foreground/85 active:bg-muted"
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
