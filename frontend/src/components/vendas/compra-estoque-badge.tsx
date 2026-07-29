import { ShoppingBag } from "lucide-react";

import { cn } from "@/lib/utils";

interface CompraEstoqueBadgeProps {
  alerta?: boolean | null;
  itensFalta?: string[] | null;
  className?: string;
}

export function CompraEstoqueBadge({
  alerta,
  itensFalta,
  className,
}: CompraEstoqueBadgeProps) {
  if (!alerta) return null;

  const titulo =
    itensFalta && itensFalta.length > 0
      ? `Comprar com antecedência:\n${itensFalta.join("\n")}`
      : "Itens sem estoque — comprar com antecedência";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full chip-sun px-2 py-0.5 text-[10px] font-semibold leading-none shadow-[var(--shadow-neo-sm)]",
        className
      )}
      title={titulo}
    >
      <ShoppingBag className="size-3" />
      Comprar
    </span>
  );
}
