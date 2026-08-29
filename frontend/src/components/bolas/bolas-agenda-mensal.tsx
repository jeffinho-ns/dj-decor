"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  format,
  isSameMonth,
  parseISO,
  subMonths,
  addDays,
  isBefore,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Balloon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dayMeta,
  formatMonthTitle,
  getMonthGridDays,
  toDayKey,
} from "@/lib/calendario";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PedidoBolas } from "@/types/bolas";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function groupByDay(pedidos: PedidoBolas[]): Map<string, PedidoBolas[]> {
  const map = new Map<string, PedidoBolas[]>();
  for (const p of pedidos) {
    const key = toDayKey(p.dataEvento);
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  for (const [key, list] of map) {
    list.sort(
      (a, b) =>
        new Date(a.horarioMontagem).getTime() -
        new Date(b.horarioMontagem).getTime()
    );
    map.set(key, list);
  }
  return map;
}

interface BolasAgendaMensalProps {
  pedidos: PedidoBolas[];
  loadError?: string | null;
}

export function BolasAgendaMensal({
  pedidos,
  loadError,
}: BolasAgendaMensalProps) {
  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => toDayKey(new Date()));

  const byDay = useMemo(() => groupByDay(pedidos), [pedidos]);
  const grid = useMemo(() => getMonthGridDays(month), [month]);

  const inMonth = useMemo(
    () =>
      pedidos.filter((p) => isSameMonth(parseISO(p.dataEvento), month)),
    [pedidos, month]
  );

  const valorMes = useMemo(
    () => inMonth.reduce((s, p) => s + Number(p.valorTabela), 0),
    [inMonth]
  );

  const proximos7 = useMemo(() => {
    const hoje = startOfDay(new Date());
    const fim = addDays(hoje, 7);
    return pedidos
      .filter((p) => {
        const d = startOfDay(parseISO(p.dataEvento));
        return !isBefore(d, hoje) && !isBefore(fim, d);
      })
      .slice(0, 8);
  }, [pedidos]);

  const selected = byDay.get(selectedKey) ?? [];

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {proximos7.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
            Próximos 7 dias
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {proximos7.map((p) => (
              <Link
                key={p.id}
                href={`/bolas/${p.id}`}
                className="min-w-[11.5rem] shrink-0 rounded-2xl border border-border/60 bg-card/50 p-3 active:scale-[0.98]"
              >
                <p className="text-[11px] text-muted-foreground">
                  {format(parseISO(p.dataEvento), "EEE dd/MM", { locale: ptBR })}
                  {" · "}
                  {format(parseISO(p.horarioMontagem), "HH:mm")}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {p.clienteNome}
                </p>
                <p className="truncate text-xs text-champagne">{p.tema}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border/60 bg-card/40 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="size-11 shrink-0 p-0"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="font-display text-lg capitalize text-foreground">
              {formatMonthTitle(month)}
            </p>
            <p className="text-xs text-muted-foreground">
              {inMonth.length} serviço(s) · {formatCurrency(valorMes)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="size-11 shrink-0 p-0"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const meta = dayMeta(day, month, parseISO(selectedKey));
            const count = byDay.get(meta.key)?.length ?? 0;
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => setSelectedKey(meta.key)}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center rounded-xl text-sm transition-colors",
                  !meta.inMonth && "opacity-35",
                  meta.isSelected
                    ? "bg-champagne/20 text-foreground ring-1 ring-champagne/50"
                    : "hover:bg-muted/40",
                  meta.isToday && !meta.isSelected && "ring-1 ring-border"
                )}
              >
                {format(day, "d")}
                {count > 0 ? (
                  <span className="mt-0.5 size-1.5 rounded-full bg-champagne" />
                ) : (
                  <span className="mt-0.5 size-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
          {format(parseISO(selectedKey), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        {selected.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <Balloon className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum serviço neste dia.
            </p>
          </div>
        ) : (
          selected.map((pedido) => (
            <Link
              key={pedido.id}
              href={`/bolas/${pedido.id}`}
              className="block rounded-2xl border border-border/60 bg-card/40 p-4 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {pedido.clienteNome}
                  </p>
                  <p className="truncate text-sm text-champagne">{pedido.tema}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {format(parseISO(pedido.horarioMontagem), "HH:mm")}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {pedido.festaId ? "Festa DJ Decor" : "Externo"}
                {" · "}
                {formatCurrency(pedido.valorTabela)}
                {pedido.itens?.length
                  ? ` · ${pedido.itens.map((i) => i.nome).join(", ")}`
                  : ""}
              </p>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
