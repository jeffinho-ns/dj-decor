import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FestiveColor = "pink" | "sky" | "sun" | "mint" | "lilac" | "neutral";

/** Aliases legados — mapeados para cores festivas */
type LegacyAccent = "champagne" | "blue" | "sage";

const ACCENT_CLASS: Record<FestiveColor | LegacyAccent, string> = {
  pink: "chip-pink",
  sky: "chip-sky",
  sun: "chip-sun",
  mint: "chip-mint",
  lilac: "chip-lilac",
  neutral: "bg-foreground/8 text-foreground/70",
  champagne: "chip-sun",
  blue: "chip-sky",
  sage: "chip-mint",
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: FestiveColor | LegacyAccent;
  hint?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
  hint,
}: StatCardProps) {
  return (
    <div className="neo-sm rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="section-label text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-[inset_2px_2px_4px_rgba(42,49,66,0.06),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]",
            ACCENT_CLASS[accent]
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl text-foreground">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
