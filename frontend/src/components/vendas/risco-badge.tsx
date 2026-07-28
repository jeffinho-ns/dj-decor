import { cn } from "@/lib/utils";
import type { NivelRisco, RiscoOrcamento } from "@/types/festa";

const nivelStyles: Record<NivelRisco, string> = {
  BAIXO: "bg-balloon-mint/12 text-balloon-mint shadow-[var(--shadow-neo-sm)]",
  MEDIO: "bg-balloon-sun/12 text-balloon-sun shadow-[var(--shadow-neo-sm)]",
  ALTO: "bg-balloon-pink/12 text-balloon-pink shadow-[var(--shadow-neo-sm)]",
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
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
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
