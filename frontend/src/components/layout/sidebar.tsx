"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  PartyPopper,
  PlusCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/vendas",
    label: "Vendas",
    icon: CalendarDays,
  },
  {
    href: "/vendas/nova",
    label: "Nova Venda",
    icon: PlusCircle,
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <PartyPopper className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">DJ Decor</p>
          <p className="text-xs text-muted-foreground">Painel do Vendedor</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/vendas/nova" &&
              pathname.startsWith(item.href) &&
              !pathname.startsWith("/vendas/nova"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/60 px-3 py-2">
          <LayoutDashboard className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Vendedor</p>
            <p className="truncate text-[11px] text-muted-foreground">
              vendedor@djdecor.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
