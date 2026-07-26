"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vendas", label: "Vendas" },
  { href: "/vendas/nova", label: "Nova Venda" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex gap-4 overflow-x-auto border-t border-border/60 pt-3 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
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
