import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PrevisaoCaixa } from "@/types/financeiro";

interface PrevisaoCaixaSectionProps {
  previsao: PrevisaoCaixa;
}

const PERIOD_BAR = ["bg-balloon-pink", "bg-balloon-sky", "bg-balloon-sun", "bg-balloon-mint", "bg-balloon-lilac"];

export function PrevisaoCaixaSection({ previsao }: PrevisaoCaixaSectionProps) {
  const maxTotal = Math.max(...previsao.periodos.map((p) => p.total), 1);

  return (
    <div className="min-w-0 rounded-2xl p-4 sm:p-5 neo-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Previsão de caixa — {previsao.dias} dias
          </p>
          <p className="mt-1 font-display text-lg text-foreground">
            {formatCurrency(previsao.totalPrevisto)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Confirmado, pendente e saldo de festas por semana
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-balloon-lilac/12 text-balloon-lilac">
          <CalendarRange className="size-4" />
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {previsao.periodos.map((periodo, index) => {
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
              className="rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 neo-inset"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-foreground">
                  {labelInicio} – {labelFim}
                </p>
                <p className="font-display text-base tabular-nums text-foreground">
                  {formatCurrency(periodo.total)}
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full neo-inset">
                <div
                  className={cn(
                    "h-full rounded-full",
                    PERIOD_BAR[index % PERIOD_BAR.length]
                  )}
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
