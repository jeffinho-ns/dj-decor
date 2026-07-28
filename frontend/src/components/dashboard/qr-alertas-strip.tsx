import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

interface QrAlertasStripProps {
  count: number;
  className?: string;
}

export function QrAlertasStrip({ count, className }: QrAlertasStripProps) {
  if (count <= 0) return null;

  return (
    <Link
      href="/estoque"
      className={cn(
        "mb-4 flex min-h-11 items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm transition-colors hover:bg-amber-400/15",
        className
      )}
    >
      <AlertTriangle className="size-4 shrink-0 text-amber-300" />
      <span className="min-w-0 flex-1 text-foreground">
        {count === 1
          ? "1 peça com saída QR sem retorno registrado"
          : `${count} peças com saída QR sem retorno registrado`}
      </span>
      <span className="shrink-0 text-xs font-medium text-champagne">
        Ver estoque →
      </span>
    </Link>
  );
}
