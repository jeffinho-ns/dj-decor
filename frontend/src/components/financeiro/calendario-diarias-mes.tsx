"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { getCalendarioDiarias } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  CalendarioDiariaDia,
  CalendarioDiariasMes,
} from "@/types/financeiro";

interface CalendarioDiariasMesProps {
  token: string;
  mes: string;
}

function labelDia(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

function statusLabel(status: string): string {
  if (status === "PAGA") return "Paga";
  if (status === "PREVISTA") return "Prevista";
  return "Pendente";
}

function buildGrid(mes: string, diasMap: Map<string, CalendarioDiariaDia>) {
  const [y, m] = mes.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
  const daysInMonth = new Date(Date.UTC(y, m, 0, 12, 0, 0)).getUTCDate();
  // Monday-first: Mon=0 … Sun=6
  const startPad = (first.getUTCDay() + 6) % 7;
  const cells: Array<{ ymd: string | null; dia: CalendarioDiariaDia | null }> =
    [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ ymd: null, dia: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${mes}-${String(d).padStart(2, "0")}`;
    cells.push({ ymd, dia: diasMap.get(ymd) ?? null });
  }
  return cells;
}

export function CalendarioDiariasMesView({
  token,
  mes,
}: CalendarioDiariasMesProps) {
  const [data, setData] = useState<CalendarioDiariasMes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setExpanded(null);
    setData(null);
    getCalendarioDiarias(token, mes)
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar a agenda"
        )
      );
  }, [token, mes]);

  const diasMap = useMemo(() => {
    const map = new Map<string, CalendarioDiariaDia>();
    for (const d of data?.dias ?? []) map.set(d.ymd, d);
    return map;
  }, [data]);

  const cells = useMemo(
    () => (data ? buildGrid(mes, diasMap) : []),
    [data, mes, diasMap]
  );

  const expandedDia = expanded ? diasMap.get(expanded) ?? null : null;

  return (
    <section className="space-y-3 rounded-2xl neo-sm p-4">
      <div>
        <h2 className="font-display text-lg">Agenda diárias</h2>
        <p className="text-xs text-muted-foreground">
          Montagem e desmontagem escalonadas no mês — toque no dia para ver
          quem e quanto.
        </p>
      </div>

      {data ? (
        <p className="rounded-xl neo-inset px-3 py-2 text-sm">
          <span className="text-muted-foreground">{data.label} · </span>
          <span className="font-medium tabular-nums">
            {formatCurrency(data.total)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            · {data.dias.length} dia(s) com diária
          </span>
        </p>
      ) : null}

      {!data && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Carregando agenda…
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data && data.dias.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma diária escalonada neste mês.
        </p>
      ) : null}

      {data && cells.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell.ymd) {
                return <div key={`pad-${idx}`} className="min-h-14 sm:min-h-16" />;
              }
              const has = !!cell.dia;
              const active = expanded === cell.ymd;
              const dayNum = Number(cell.ymd.slice(8));
              return (
                <button
                  key={cell.ymd}
                  type="button"
                  disabled={!has}
                  onClick={() =>
                    setExpanded((prev) =>
                      prev === cell.ymd ? null : cell.ymd
                    )
                  }
                  className={cn(
                    "flex min-h-14 flex-col items-stretch rounded-xl px-1 py-1.5 text-left transition-all sm:min-h-16 sm:px-1.5",
                    has
                      ? active
                        ? "neo-sm text-foreground"
                        : "neo-inset hover:neo-sm text-foreground"
                      : "text-muted-foreground/50"
                  )}
                >
                  <span className="text-xs font-medium tabular-nums">
                    {dayNum}
                  </span>
                  {cell.dia ? (
                    <>
                      <span className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
                        {cell.dia.pessoas.length} pess.
                      </span>
                      <span className="truncate text-[10px] font-medium tabular-nums sm:text-xs">
                        {formatCurrency(cell.dia.total)}
                      </span>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {expandedDia ? (
        <div className="rounded-2xl neo-inset p-3">
          <button
            type="button"
            className="mb-2 flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setExpanded(null)}
          >
            <div>
              <p className="font-medium capitalize">
                {labelDia(expandedDia.ymd)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatCurrency(expandedDia.total)} ·{" "}
                {expandedDia.pessoas.length} lançamento(s)
              </p>
            </div>
            <ChevronDown className="size-4 rotate-180 text-muted-foreground" />
          </button>
          <ul className="space-y-2">
            {expandedDia.pessoas.map((p) => (
              <li
                key={`${p.pessoaId}-${p.tipo}-${p.festaId}`}
                className="flex items-start justify-between gap-2 rounded-xl px-1 py-1"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.pessoaNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.tipoLabel} · {p.festaTema}
                    <span className="text-muted-foreground/80">
                      {" "}
                      · {statusLabel(p.status)}
                    </span>
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-sm font-medium">
                  {formatCurrency(p.valor)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
