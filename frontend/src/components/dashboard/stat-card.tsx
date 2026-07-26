import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Accent = "champagne" | "blue" | "sage" | "neutral";

const ACCENT_CLASS: Record<Accent, string> = {
  champagne: "bg-champagne/12 text-champagne",
  blue: "bg-status-closed/12 text-status-closed",
  sage: "bg-status-done/12 text-status-done",
  neutral: "bg-foreground/8 text-foreground/70",
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: Accent;
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
    <div className="rounded-xl border border-border/70 bg-card/60 p-5 transition-colors hover:border-champagne/25">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
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
