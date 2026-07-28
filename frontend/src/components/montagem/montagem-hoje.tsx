"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  Package,
  Route,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { listOsRotaHoje } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MontagemListaItem } from "@/lib/montagem-os";
import type { RotaDiaItem, StatusOS } from "@/types/os";

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
  token: string;
}

export function MontagemHoje({ itens, token }: MontagemHojeProps) {
  const hoje = new Date();
  const [rotaAberta, setRotaAberta] = useState(false);
  const [rota, setRota] = useState<RotaDiaItem[] | null>(null);
  const [rotaErro, setRotaErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function carregarRota() {
    setRotaErro(null);
    startTransition(async () => {
      try {
        const ordenada = await listOsRotaHoje(token);
        setRota(ordenada);
        setRotaAberta(true);
      } catch (err) {
        setRotaErro(
          err instanceof Error ? err.message : "Erro ao calcular rota"
        );
      }
    });
  }

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
        <div className="flex shrink-0 flex-col items-end gap-2">
          {itens.length > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={carregarRota}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Route data-icon="inline-start" />
                  Ver ordem sugerida
                </>
              )}
            </Button>
          ) : null}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-champagne transition-colors hover:text-champagne/80"
          >
            <CalendarDays className="size-4" />
            Ver mês
          </Link>
        </div>
      </div>

      {rotaErro ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {rotaErro}
        </div>
      ) : null}

      {rotaAberta && rota ? (
        <RotaSugeridaPanel rota={rota} onClose={() => setRotaAberta(false)} />
      ) : null}

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

function RotaSugeridaPanel({
  rota,
  onClose,
}: {
  rota: RotaDiaItem[];
  onClose: () => void;
}) {
  const criterio =
    rota.some((r) => r.criterio === "proximidade") ? "proximidade" : "horário";

  return (
    <div className="rounded-2xl border border-champagne/30 bg-card/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-foreground">
            Ordem sugerida
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ordenado por {criterio}
            {criterio === "proximidade"
              ? " (vizinho mais próximo com check-in)"
              : " de montagem"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>
      <ol className="mt-4 space-y-2">
        {rota.map((parada) => (
          <li key={parada.osId}>
            <Link
              href={`/montagem/${parada.osId}`}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/30 p-3 transition-colors hover:border-champagne/30"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-champagne/15 text-xs font-semibold text-champagne">
                {parada.ordem}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {parada.clienteNome}
                </p>
                <p className="truncate text-xs text-champagne">{parada.tema}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3" />
                  {safeTime(parada.horarioMontagem)}
                  <span className="mx-1">·</span>
                  <MapPin className="size-3 shrink-0" />
                  <span className="line-clamp-1">{parada.endereco}</span>
                </p>
              </div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
