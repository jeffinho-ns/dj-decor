"use client";

import { Trophy } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ComissaoRanking } from "@/types/financeiro";

interface ComissaoRankingWidgetProps {
  ranking: ComissaoRanking;
  vendedorId: string;
  className?: string;
}

export function ComissaoRankingWidget({
  ranking,
  vendedorId,
  className,
}: ComissaoRankingWidgetProps) {
  const me = ranking.ranking.find((r) => r.vendedorId === vendedorId);
  const progresso = me?.progressoMeta ?? 0;
  const total = me?.totalComissao ?? 0;
  const posicao = me?.posicao;
  const maxTotal = Math.max(...ranking.ranking.map((r) => r.totalComissao), 1);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ranking de comissões
          </p>
          <p className="mt-1 font-display text-lg text-foreground">
            {formatCurrency(total)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              / {formatCurrency(ranking.meta)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ranking.periodo === "semana" ? "Esta semana" : "Este mês"}
            {posicao != null ? ` · você está em #${posicao}` : ""}
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne/12 text-champagne">
          <Trophy className="size-4" />
        </span>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-foreground/8">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            me?.atingiuMeta ? "bg-status-done" : "bg-champagne/80"
          )}
          style={{ width: `${Math.min(100, progresso)}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {me?.atingiuMeta
          ? "Sua meta foi atingida — parabéns!"
          : `${progresso.toFixed(0)}% da sua meta`}
      </p>

      {ranking.ranking.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-border/50 pt-4">
          {ranking.ranking.map((row) => {
            const isMe = row.vendedorId === vendedorId;
            const widthPct = (row.totalComissao / maxTotal) * 100;
            return (
              <li
                key={row.vendedorId}
                className={cn(
                  "rounded-lg px-2 py-1.5",
                  isMe && "bg-champagne/8"
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={cn(
                      "min-w-0 truncate",
                      isMe ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    #{row.posicao ?? "—"} {row.vendedorNome}
                    {isMe ? " (você)" : ""}
                    {row.atingiuMeta ? " ✓" : ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground">
                    {formatCurrency(row.totalComissao)}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-foreground/8">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      row.atingiuMeta ? "bg-status-done" : "bg-champagne/60"
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 border-t border-border/50 pt-4 text-xs text-muted-foreground">
          Nenhuma comissão confirmada no período.
        </p>
      )}
    </div>
  );
}

interface ComissaoRankingSectionProps {
  ranking: ComissaoRanking;
}

export function ComissaoRankingSection({ ranking }: ComissaoRankingSectionProps) {
  const maxTotal = Math.max(...ranking.ranking.map((r) => r.totalComissao), 1);

  if (ranking.ranking.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhuma comissão confirmada no período.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Meta do período: {formatCurrency(ranking.meta)}
      </p>
      <ul className="space-y-2">
        {ranking.ranking.map((row) => {
          const widthPct = (row.totalComissao / maxTotal) * 100;
          return (
            <li
              key={row.vendedorId}
              className="rounded-lg border border-border/60 bg-card/40 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    #{row.posicao ?? "—"}
                    {row.atingiuMeta ? " · meta ✓" : ""}
                  </p>
                  <p className="font-medium text-foreground">
                    {row.vendedorNome}
                  </p>
                </div>
                <p className="shrink-0 font-display text-base tabular-nums text-foreground">
                  {formatCurrency(row.totalComissao)}
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-foreground/8">
                <div
                  className={cn(
                    "h-full rounded-full",
                    row.atingiuMeta ? "bg-status-done" : "bg-champagne/80"
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
