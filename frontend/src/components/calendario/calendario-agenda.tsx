"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  format,
  parseISO,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Package,
  Phone,
  UserRound,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dayMeta,
  formatMonthTitle,
  getMonthGridDays,
  groupFestasByDay,
  monthSummary,
  toDayKey,
} from "@/lib/calendario";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Festa, StatusFesta } from "@/types/festa";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  FECHADO: "Fechado",
  CONCLUIDO: "Concluído",
};

const statusDot: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-champagne",
  FECHADO: "bg-status-closed",
  CONCLUIDO: "bg-status-done",
};

const statusBadge: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-champagne/12 text-champagne",
  FECHADO: "bg-status-closed/14 text-status-closed",
  CONCLUIDO: "bg-status-done/14 text-status-done",
};

interface CalendarioAgendaProps {
  festas: Festa[];
}

export function CalendarioAgenda({ festas }: CalendarioAgendaProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const byDay = useMemo(() => groupFestasByDay(festas), [festas]);
  const days = useMemo(() => getMonthGridDays(currentMonth), [currentMonth]);
  const summary = useMemo(
    () => monthSummary(festas, currentMonth),
    [festas, currentMonth]
  );

  const selectedKey = toDayKey(selectedDay);
  const selectedFestas = byDay.get(selectedKey) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
      <section className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Agenda operacional
            </p>
            <h2 className="mt-1 font-display text-2xl capitalize text-foreground">
              {formatMonthTitle(currentMonth)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentMonth((month) => subMonths(month, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                setSelectedDay(today);
              }}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentMonth((month) => addMonths(month, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium tabular-nums text-foreground">
              {summary.total}
            </span>{" "}
            festas
          </p>
          <p>
            <span className="font-medium tabular-nums text-status-closed">
              {summary.fechadas}
            </span>{" "}
            fechadas
          </p>
          <p>
            <span className="font-medium tabular-nums text-champagne">
              {summary.orcamentos}
            </span>{" "}
            orçamentos
          </p>
          <p>
            <span className="font-medium tabular-nums text-status-done">
              {summary.concluidas}
            </span>{" "}
            concluídas
          </p>
          <p>
            <span className="font-medium tabular-nums text-foreground">
              {formatCurrency(summary.valorFechado)}
            </span>{" "}
            valor fechado
          </p>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const meta = dayMeta(day, currentMonth, selectedDay);
            const dayFestas = byDay.get(meta.key) ?? [];
            const count = dayFestas.length;

            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                  if (!meta.inMonth) {
                    setCurrentMonth(day);
                  }
                }}
                className={cn(
                  "relative flex min-h-[4.5rem] flex-col items-start rounded-xl border p-2 text-left transition-colors",
                  meta.inMonth
                    ? "border-border/50 bg-background/20 hover:border-champagne/40"
                    : "border-transparent bg-transparent text-muted-foreground/40",
                  meta.isSelected && "border-champagne/60 bg-champagne/10",
                  meta.isToday && !meta.isSelected && "ring-1 ring-champagne/35"
                )}
              >
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    meta.isSelected
                      ? "font-semibold text-champagne"
                      : "text-foreground/90"
                  )}
                >
                  {format(day, "d")}
                </span>
                {count > 0 ? (
                  <div className="mt-auto flex w-full items-center justify-between gap-1">
                    <div className="flex gap-0.5">
                      {dayFestas.slice(0, 3).map((festa) => (
                        <span
                          key={festa.id}
                          className={cn(
                            "size-1.5 rounded-full",
                            statusDot[festa.status]
                          )}
                        />
                      ))}
                    </div>
                    <span className="rounded-md bg-champagne/15 px-1.5 py-0.5 text-[10px] font-medium text-champagne">
                      {count}
                    </span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Dia selecionado
        </p>
        <h3 className="mt-1 font-display text-xl capitalize text-foreground">
          {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedFestas.length === 0
            ? "Nenhuma festa neste dia."
            : `${selectedFestas.length} festa${selectedFestas.length > 1 ? "s" : ""} — ordenadas pela montagem.`}
        </p>

        <div className="mt-5 space-y-3">
          {selectedFestas.map((festa) => {
            const isFechado = festa.status === "FECHADO";

            return (
              <article
                key={festa.id}
                className={cn(
                  "rounded-xl border bg-background/25 p-3.5",
                  isFechado
                    ? "border-status-closed/45 bg-status-closed/[0.06]"
                    : "border-border/60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {festa.cliente.nome}
                    </p>
                    <p className="text-sm text-champagne">{festa.tema}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                      statusBadge[festa.status],
                      isFechado && "ring-1 ring-status-closed/35"
                    )}
                  >
                    {statusLabel[festa.status]}
                  </span>
                </div>

                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock3 className="size-3.5 shrink-0 text-champagne/80" />
                    Montagem{" "}
                    <span className="font-medium text-foreground">
                      {format(parseISO(festa.horarioMontagem), "HH:mm")}
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    Festa{" "}
                    <span className="font-medium text-foreground">
                      {format(parseISO(festa.dataEvento), "HH:mm")}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-champagne/80" />
                    <span className="font-medium text-foreground">
                      {festa.cliente.telefone || "—"}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <UserRound className="size-3.5 shrink-0 text-champagne/80" />
                    Vendedor{" "}
                    <span className="font-medium text-foreground">
                      {festa.vendedor?.nome ?? "—"}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Wallet className="size-3.5 shrink-0 text-champagne/80" />
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        isFechado ? "text-status-closed" : "text-foreground"
                      )}
                    >
                      {formatCurrency(festa.valor)}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Package className="size-3.5 shrink-0 text-champagne/80" />
                    Tamanho{" "}
                    <span className="font-medium text-foreground">
                      {festa.tamanhoDecoracao}
                    </span>
                    {festa.itensExtras?.length ? (
                      <span className="truncate">
                        · {festa.itensExtras.join(", ")}
                      </span>
                    ) : null}
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-champagne/80" />
                    <span>{festa.endereco}</span>
                  </li>
                </ul>
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
