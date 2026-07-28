import { cn } from "@/lib/utils";
import type { StatusDesconto } from "@/types/desconto";

const statusStyles: Record<
  Exclude<StatusDesconto, "NENHUM">,
  string
> = {
  PENDENTE: "bg-balloon-sun/12 text-balloon-sun shadow-[var(--shadow-neo-sm)]",
  APROVADO: "bg-balloon-mint/12 text-balloon-mint shadow-[var(--shadow-neo-sm)]",
  RECUSADO: "bg-destructive/12 text-destructive shadow-[var(--shadow-neo-sm)]",
};

const statusLabel: Record<Exclude<StatusDesconto, "NENHUM">, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
};

interface DescontoBadgeProps {
  status?: StatusDesconto | null;
  percentual?: string | number | null;
  className?: string;
}

export function DescontoBadge({
  status,
  percentual,
  className,
}: DescontoBadgeProps) {
  if (
    !status ||
    status === "NENHUM" ||
    !(status in statusStyles)
  ) {
    return null;
  }

  const pct =
    percentual != null && percentual !== ""
      ? `${Number(percentual).toFixed(0)}%`
      : null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        statusStyles[status],
        className
      )}
      title={
        pct
          ? `Desconto ${statusLabel[status].toLowerCase()} (${pct})`
          : `Desconto ${statusLabel[status].toLowerCase()}`
      }
    >
      <span className="opacity-80">Desc.</span>
      <span>
        {statusLabel[status]}
        {pct ? ` ${pct}` : ""}
      </span>
    </span>
  );
}
