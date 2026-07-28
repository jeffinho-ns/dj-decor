"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Package,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { MontagemListaItem } from "@/lib/montagem-os";
import type { StatusOS } from "@/types/os";

const STATUS_OS_LABEL: Record<StatusOS, string> = {
  ABERTA: "Aberta",
  ROMANEIO: "Romaneio",
  EM_TRANSITO: "Em trânsito",
  CHECKIN: "No local",
  FINALIZADA: "Finalizada",
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
  itens: MontagemListaItem[];
}

export function MontagemHoje({ itens }: MontagemHojeProps) {
  const hoje = new Date();

  return (
    <div className="mx-auto max-w-lg space-y-5 px-0 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {format(hoje, "EEEE", { locale: ptBR })}
          </p>
          <h2 className="mt-1 font-display text-2xl text-foreground sm:text-3xl">
            Montagem de hoje
          </h2>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {format(hoje, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm text-champagne transition-colors hover:text-champagne/80"
        >
          <CalendarDays className="size-4" />
          Ver mês
        </Link>
      </div>

      {itens.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/40 p-6 text-center sm:p-8">
          <p className="font-display text-lg text-foreground">
            Nenhuma montagem agendada para hoje
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Aproveite para revisar o material e conferir o calendário do mês.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <MontagemCard key={item.festaId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MontagemCard({ item }: { item: MontagemListaItem }) {
  const statusOs = item.statusOs as StatusOS | null;
  const progressoRomaneio =
    item.totalItens > 0
      ? item.totalItens - item.itensPendentes
      : 0;

  const conteudo = (
    <article
      className={cn(
        "rounded-2xl border border-border/70 bg-card/40 p-4 transition-colors sm:p-5",
        item.osId && "hover:border-champagne/30 hover:bg-card/60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{item.clienteNome}</p>
          <p className="truncate text-sm text-champagne">{item.tema}</p>
        </div>
        {statusOs ? (
          <span className="shrink-0 rounded-md bg-champagne/12 px-2.5 py-1 text-[11px] font-medium text-champagne">
            {STATUS_OS_LABEL[statusOs]}
          </span>
        ) : (
          <span className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Sem OS
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4 shrink-0 text-champagne/80" />
          <span>
            Montagem{" "}
            <span className="font-medium text-foreground">
              {safeTime(item.horarioMontagem)}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-champagne/80" />
          <span className="line-clamp-2">{item.endereco}</span>
        </div>
        {item.totalItens > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="size-4 shrink-0 text-champagne/80" />
            <span>
              Romaneio{" "}
              <span className="font-medium text-foreground">
                {progressoRomaneio}/{item.totalItens}
              </span>
              {item.romaneioConcluido ? (
                <span className="ml-1.5 text-status-done">· concluído</span>
              ) : null}
            </span>
          </div>
        ) : null}
      </div>

      {item.osId ? (
        <div className="mt-4 flex items-center justify-end gap-1 text-sm text-champagne">
          Abrir fluxo
          <ChevronRight className="size-4" />
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          OS ainda não gerada para esta festa.
        </p>
      )}
    </article>
  );

  if (item.osId) {
    return (
      <Link href={`/montagem/${item.osId}`} className="block">
        {conteudo}
      </Link>
    );
  }

  return conteudo;
}
