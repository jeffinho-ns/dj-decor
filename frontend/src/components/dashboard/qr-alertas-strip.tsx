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
        "mb-4 flex min-h-11 items-center gap-3 rounded-2xl border border-balloon-sun/35 bg-balloon-sun/10 px-4 py-3 text-sm transition-all neo-sm hover:bg-balloon-sun/15",
        className
      )}
    >
      <AlertTriangle className="size-4 shrink-0 text-balloon-sun" />
      <span className="min-w-0 flex-1 text-foreground">
        {count === 1
          ? "1 peça com saída QR sem retorno registrado"
          : `${count} peças com saída QR sem retorno registrado`}
      </span>
      <span className="shrink-0 text-xs font-medium text-balloon-pink">
        Ver estoque →
      </span>
    </Link>
  );
}
