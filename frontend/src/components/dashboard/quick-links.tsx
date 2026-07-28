import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ICON_TONES = [
  "chip-pink",
  "chip-sky",
  "chip-sun",
  "chip-mint",
  "chip-lilac",
] as const;

const CHEVRON_TONES = [
  "group-hover:text-balloon-pink",
  "group-hover:text-balloon-sky",
  "group-hover:text-balloon-sun",
  "group-hover:text-balloon-mint",
  "group-hover:text-balloon-lilac",
] as const;

export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((link, index) => {
        const Icon = link.icon;
        const tone = ICON_TONES[index % ICON_TONES.length];
        const chevron = CHEVRON_TONES[index % CHEVRON_TONES.length];
        return (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center justify-between rounded-2xl neo-sm px-4 py-3.5 transition-transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  tone
                )}
              >
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {link.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {link.description}
                </span>
              </span>
            </span>
            <ChevronRight
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5",
                chevron
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}
