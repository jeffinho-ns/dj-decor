"use client";

import { useEffect, useMemo, useState } from "react";
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
import { FestaDetalheModal } from "@/components/vendas/festa-detalhe-modal";
import {
  dayMeta,
  formatMonthTitle,
  getMonthGridDays,
  groupFestasByDay,
  monthSummary,
  toDayKey,
} from "@/lib/calendario";
import { formatCurrency } from "@/lib/format";
import { nomeDoKit } from "@/lib/catalogo-kits";
import { cn } from "@/lib/utils";
import type { Festa, StatusFesta } from "@/types/festa";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusDot: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-balloon-sun",
  AGUARDANDO_PAGAMENTO: "bg-balloon-sun",
  PAGO: "bg-balloon-mint",
  FECHADO: "bg-balloon-sky",
  EM_MONTAGEM: "bg-balloon-lilac",
  CONCLUIDO: "bg-balloon-mint",
  CANCELADO: "bg-destructive",
};

const statusBadge: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-balloon-sun/12 text-balloon-sun",
  AGUARDANDO_PAGAMENTO: "bg-balloon-sun/12 text-balloon-sun",
  PAGO: "bg-balloon-mint/12 text-balloon-mint",
  FECHADO: "bg-balloon-sky/12 text-balloon-sky",
  EM_MONTAGEM: "bg-balloon-lilac/12 text-balloon-lilac",
  CONCLUIDO: "bg-balloon-mint/12 text-balloon-mint",
  CANCELADO: "bg-destructive/14 text-destructive",
};

const ICON_ACCENTS = [
  "text-balloon-pink/80",
  "text-balloon-sky/80",
  "text-balloon-sun/80",
  "text-balloon-mint/80",
  "text-balloon-lilac/80",
];

interface CalendarioAgendaProps {
  festas: Festa[];
  token?: string | null;
  canEdit?: boolean;
}

export function CalendarioAgenda({
  festas: initialFestas,
  token,
  canEdit = false,
}: CalendarioAgendaProps) {
  const [festas, setFestas] = useState(initialFestas);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [detalheId, setDetalheId] = useState<string | null>(null);

  useEffect(() => {
    setFestas(initialFestas);
  }, [initialFestas]);

  const byDay = useMemo(() => groupFestasByDay(festas), [festas]);
  const days = useMemo(() => getMonthGridDays(currentMonth), [currentMonth]);
  const summary = useMemo(
    () => monthSummary(festas, currentMonth),
    [festas, currentMonth]
  );

  const selectedKey = toDayKey(selectedDay);
  const selectedFestas = byDay.get(selectedKey) ?? [];
  const festaDetalhe = detalheId
    ? (festas.find((f) => f.id === detalheId) ?? null)
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
      <section className="rounded-2xl p-4 sm:p-5 neo-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="balloon-dot bg-balloon-pink" />
              <span className="balloon-dot bg-balloon-sky" />
              <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                Agenda operacional
              </p>
            </div>
            <h2 className="mt-1 font-display text-2xl text-foreground capitalize">
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
            <span className="font-medium tabular-nums text-balloon-sky">
              {summary.fechadas}
            </span>{" "}
            fechadas
          </p>
          <p>
            <span className="font-medium tabular-nums text-balloon-sun">
              {summary.orcamentos}
            </span>{" "}
            orçamentos
          </p>
          <p>
            <span className="font-medium tabular-nums text-balloon-mint">
              {summary.concluidas}
            </span>{" "}
            concluídas
          </p>
          <p>
            <span className="font-medium tabular-nums text-balloon-pink">
              {formatCurrency(summary.valorFechado)}
            </span>{" "}
            valor fechado
          </p>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
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
                  "relative flex min-h-[4.5rem] flex-col items-start rounded-xl p-2 text-left transition-all",
                  meta.inMonth
                    ? "neo-inset hover:ring-2 hover:ring-balloon-sky/25"
                    : "bg-transparent text-muted-foreground/40",
                  meta.isSelected && "ring-2 ring-balloon-pink/50 bg-balloon-pink/8",
                  meta.isToday && !meta.isSelected && "ring-2 ring-balloon-sun/40"
                )}
              >
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    meta.isSelected
                      ? "font-semibold text-balloon-pink"
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
                    <span className="rounded-lg bg-balloon-pink/12 px-1.5 py-0.5 text-[10px] font-medium text-balloon-pink">
                      {count}
                    </span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-2xl p-4 sm:p-5 neo-sm">
        <div className="flex items-center gap-1.5">
          <span className="balloon-dot bg-balloon-lilac" />
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Dia selecionado
          </p>
        </div>
        <h3 className="mt-1 font-display text-xl text-foreground capitalize">
          {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedFestas.length === 0
            ? "Nenhuma festa neste dia."
            : `${selectedFestas.length} festa${selectedFestas.length > 1 ? "s" : ""} — toque para ver detalhes.`}
        </p>

        <div className="mt-5 space-y-3">
          {selectedFestas.map((festa, index) => {
            const isFechado = festa.status === "FECHADO";
            const iconAccent = ICON_ACCENTS[index % ICON_ACCENTS.length];

            return (
              <button
                key={festa.id}
                type="button"
                onClick={() => setDetalheId(festa.id)}
                className={cn(
                  "w-full rounded-xl p-3.5 text-left neo-inset transition-all hover:ring-2 hover:ring-balloon-pink/30",
                  isFechado && "ring-1 ring-balloon-sky/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {festa.cliente.nome}
                    </p>
                    <p className="text-sm text-balloon-pink">{festa.tema}</p>
                    {festa.kitCatalogo || festa.pegueEMonte ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {nomeDoKit(festa.kitCatalogo) ?? "Kit personalizado"}
                        {festa.pegueEMonte ? " · Pegue e monte" : ""}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium",
                      statusBadge[festa.status],
                      isFechado && "ring-1 ring-balloon-sky/35"
                    )}
                  >
                    {statusLabel[festa.status]}
                  </span>
                </div>

                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock3 className={cn("size-3.5 shrink-0", iconAccent)} />
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
                    <Phone className={cn("size-3.5 shrink-0", iconAccent)} />
                    <span className="font-medium text-foreground">
                      {festa.cliente.telefone || "—"}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <UserRound className={cn("size-3.5 shrink-0", iconAccent)} />
                    Vendedor{" "}
                    <span className="font-medium text-foreground">
                      {festa.vendedor?.nome ?? "—"}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Wallet className={cn("size-3.5 shrink-0", iconAccent)} />
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        isFechado ? "text-balloon-sky" : "text-foreground"
                      )}
                    >
                      {formatCurrency(festa.valor)}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Package className={cn("size-3.5 shrink-0", iconAccent)} />
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
                    <MapPin className={cn("mt-0.5 size-3.5 shrink-0", iconAccent)} />
                    <span>{festa.endereco}</span>
                  </li>
                </ul>
              </button>
            );
          })}
        </div>
      </aside>

      <FestaDetalheModal
        festa={festaDetalhe}
        open={Boolean(festaDetalhe)}
        onClose={() => setDetalheId(null)}
        token={token}
        canEdit={canEdit}
        onUpdated={(updated) => {
          setFestas((prev) =>
            prev.map((f) =>
              f.id === updated.id
                ? {
                    ...f,
                    ...updated,
                    risco: updated.risco ?? f.risco,
                    descontoStatus: updated.descontoStatus ?? f.descontoStatus,
                    descontoPercentual:
                      updated.descontoPercentual ?? f.descontoPercentual,
                  }
                : f
            )
          );
        }}
      />
    </div>
  );
}
