"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  MapPin,
  Package,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Festa, StatusFesta } from "@/types/festa";

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  FECHADO: "Fechado",
  CONCLUIDO: "Concluído",
};

const statusBadge: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-champagne/12 text-champagne",
  FECHADO: "bg-status-closed/14 text-status-closed",
  CONCLUIDO: "bg-status-done/14 text-status-done",
};

function safeTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "HH:mm");
  } catch {
    return "—";
  }
}

interface MontagemHojeProps {
  festas: Festa[];
}

export function MontagemHoje({ festas }: MontagemHojeProps) {
  const hoje = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {format(hoje, "EEEE", { locale: ptBR })}
          </p>
          <h2 className="mt-1 font-display text-3xl text-foreground">
            Montagem de hoje
          </h2>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {format(hoje, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Link
          href="/calendario"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm text-champagne transition-colors hover:text-champagne/80"
        >
          <CalendarDays className="size-4" />
          Ver mês
        </Link>
      </div>

      {festas.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/40 p-8 text-center">
          <p className="font-display text-lg text-foreground">
            Nenhuma montagem agendada para hoje
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Aproveite para revisar o material e conferir o calendário do mês.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {festas.map((festa) => (
            <MontagemCard key={festa.id} festa={festa} />
          ))}
        </div>
      )}
    </div>
  );
}

function MontagemCard({ festa }: { festa: Festa }) {
  const itens = festa.itensExtras ?? [];
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  function toggle(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return (
    <article className="rounded-2xl border border-border/70 bg-card/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {festa.cliente?.nome ?? "—"}
          </p>
          <p className="text-sm text-champagne">{festa.tema || "—"}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium",
            statusBadge[festa.status]
          )}
        >
          {statusLabel[festa.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4 shrink-0 text-champagne/80" />
          <span>
            Montagem{" "}
            <span className="font-medium text-foreground">
              {safeTime(festa.horarioMontagem)}
            </span>
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            Festa{" "}
            <span className="font-medium text-foreground">
              {safeTime(festa.dataEvento)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="size-4 shrink-0 text-champagne/80" />
          <span>
            Tamanho{" "}
            <span className="font-medium text-foreground">
              {festa.tamanhoDecoracao || "—"}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground sm:col-span-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-champagne/80" />
          <span>{festa.endereco || "—"}</span>
        </div>
      </div>

      {itens.length > 0 ? (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Checklist de itens extras
          </p>
          <ul className="mt-2 space-y-1">
            {itens.map((item, index) => {
              const isChecked = Boolean(checked[index]);
              return (
                <li key={`${item}-${index}`}>
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/5"
                  >
                    {isChecked ? (
                      <CheckCircle2 className="size-4 shrink-0 text-status-done" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        isChecked
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      )}
                    >
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
