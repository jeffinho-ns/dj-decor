import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center justify-between rounded-xl border border-border/70 bg-card/40 px-4 py-3.5 transition-colors hover:border-champagne/30 hover:bg-card/70"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/8 text-foreground/70">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {link.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {link.description}
                </span>
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-champagne" />
          </Link>
        );
      })}
    </div>
  );
}
