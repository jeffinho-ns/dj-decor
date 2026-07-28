import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PrevisaoCaixa } from "@/types/financeiro";

interface PrevisaoCaixaSectionProps {
  previsao: PrevisaoCaixa;
}

export function PrevisaoCaixaSection({ previsao }: PrevisaoCaixaSectionProps) {
  const maxTotal = Math.max(...previsao.periodos.map((p) => p.total), 1);

  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Previsão de caixa — {previsao.dias} dias
          </p>
          <p className="mt-1 font-display text-lg text-foreground">
            {formatCurrency(previsao.totalPrevisto)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Confirmado, pendente e saldo de festas por semana
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne/12 text-champagne">
          <CalendarRange className="size-4" />
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {previsao.periodos.map((periodo) => {
          const widthPct = (periodo.total / maxTotal) * 100;
          const labelInicio = format(parseISO(periodo.inicio), "dd MMM", {
            locale: ptBR,
          });
          const labelFim = format(parseISO(periodo.fim), "dd MMM", {
            locale: ptBR,
          });

          return (
            <li
              key={periodo.inicio}
              className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 sm:px-4 sm:py-3"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-foreground">
                  {labelInicio} – {labelFim}
                </p>
                <p className="font-display text-base tabular-nums text-foreground">
                  {formatCurrency(periodo.total)}
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-foreground/8">
                <div
                  className={cn("h-full rounded-full bg-champagne/80")}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Confirmado {formatCurrency(periodo.confirmado)}</span>
                <span>Pendente {formatCurrency(periodo.pendente)}</span>
                <span>Saldo festas {formatCurrency(periodo.saldoFesta)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
