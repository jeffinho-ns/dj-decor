import { cn } from "@/lib/utils";
import type { NivelRisco, RiscoOrcamento } from "@/types/festa";

const nivelStyles: Record<NivelRisco, string> = {
  BAIXO: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  MEDIO: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  ALTO: "border-destructive/40 bg-destructive/10 text-destructive",
};

const nivelLabel: Record<NivelRisco, string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
};

interface RiscoBadgeProps {
  risco?: RiscoOrcamento | null;
  className?: string;
}

export function RiscoBadge({ risco, className }: RiscoBadgeProps) {
  if (!risco || risco.score === 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        nivelStyles[risco.nivel],
        className
      )}
      title={
        risco.fatores.length > 0
          ? risco.fatores.join(" · ")
          : `Risco ${nivelLabel[risco.nivel]}`
      }
    >
      <span className="opacity-80">Risco</span>
      <span>{nivelLabel[risco.nivel]}</span>
    </span>
  );
}
