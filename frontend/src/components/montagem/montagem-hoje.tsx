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
import type { RotaDiaItem } from "@/types/os";

const BADGE_MONTAGEM = {
  separar: {
    label: "Separar",
    badge: "bg-balloon-pink/12 text-balloon-pink",
  },
  aCaminho: {
    label: "A caminho",
    badge: "bg-balloon-sun/12 text-balloon-sun",
  },
  noLocal: {
    label: "No local",
    badge: "bg-balloon-sky/12 text-balloon-sky",
  },
  concluida: {
    label: "Concluída",
    badge: "bg-balloon-mint/12 text-balloon-mint",
  },
} as const;

function badgeMontagem(item: MontagemListaItem) {
  if (item.statusOs === "FINALIZADA" || item.montagemLocalConcluida) {
    return BADGE_MONTAGEM.concluida;
  }
  if (item.checkinAt) {
    return BADGE_MONTAGEM.noLocal;
  }
  if (item.romaneioConcluido) {
    return BADGE_MONTAGEM.aCaminho;
  }
  return BADGE_MONTAGEM.separar;
}

const CARD_ACCENTS = [
  { tema: "text-balloon-pink", badge: "bg-balloon-pink/12 text-balloon-pink", icon: "text-balloon-pink/80", hover: "hover:ring-balloon-pink/25" },
  { tema: "text-balloon-sky", badge: "bg-balloon-sky/12 text-balloon-sky", icon: "text-balloon-sky/80", hover: "hover:ring-balloon-sky/25" },
  { tema: "text-balloon-sun", badge: "bg-balloon-sun/12 text-balloon-sun", icon: "text-balloon-sun/80", hover: "hover:ring-balloon-sun/25" },
  { tema: "text-balloon-mint", badge: "bg-balloon-mint/12 text-balloon-mint", icon: "text-balloon-mint/80", hover: "hover:ring-balloon-mint/25" },
  { tema: "text-balloon-lilac", badge: "bg-balloon-lilac/12 text-balloon-lilac", icon: "text-balloon-lilac/80", hover: "hover:ring-balloon-lilac/25" },
];

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
          <div className="flex items-center gap-1.5">
            <span className="balloon-dot bg-balloon-pink" />
            <span className="balloon-dot bg-balloon-sky" />
            <span className="balloon-dot bg-balloon-sun" />
          </div>
          <p className="mt-2 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {format(hoje, "EEEE", { locale: ptBR })}
          </p>
          <h2 className="mt-1 font-display text-2xl text-foreground sm:text-3xl">
            Montagem de hoje
          </h2>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
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
            className="inline-flex items-center gap-1.5 text-sm text-balloon-sky transition-colors hover:text-balloon-sky/80"
          >
            <CalendarDays className="size-4" />
            Ver mês
          </Link>
        </div>
      </div>

      {rotaErro ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          {rotaErro}
        </div>
      ) : null}

      {rotaAberta && rota ? (
        <RotaSugeridaPanel rota={rota} onClose={() => setRotaAberta(false)} />
      ) : null}

      {itens.length === 0 ? (
        <div className="rounded-2xl p-6 text-center sm:p-8 neo-sm">
          <p className="font-display text-lg text-foreground">
            Nenhuma montagem agendada para hoje
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Aproveite para revisar o material e conferir o calendário do mês.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item, index) => (
            <MontagemCard key={item.festaId} item={item} accentIndex={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function MontagemCard({
  item,
  accentIndex,
}: {
  item: MontagemListaItem;
  accentIndex: number;
}) {
  const badge = badgeMontagem(item);
  const accent = CARD_ACCENTS[accentIndex % CARD_ACCENTS.length];
  const progressoRomaneio =
    item.totalItens > 0
      ? item.totalItens - item.itensPendentes
      : 0;

  const conteudo = (
    <article
      className={cn(
        "rounded-2xl p-4 transition-all sm:p-5 neo-sm",
        item.osId && cn("hover:ring-2", accent.hover)
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{item.clienteNome}</p>
          <p className={cn("truncate text-sm", accent.tema)}>{item.tema}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium",
            item.osId ? badge.badge : "bg-muted text-muted-foreground"
          )}
        >
          {item.osId ? badge.label : "Sem OS"}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className={cn("size-4 shrink-0", accent.icon)} />
          <span>
            Montagem{" "}
            <span className="font-medium text-foreground">
              {safeTime(item.horarioMontagem)}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className={cn("mt-0.5 size-4 shrink-0", accent.icon)} />
          <span className="line-clamp-2">{item.endereco}</span>
        </div>
        {item.totalItens > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className={cn("size-4 shrink-0", accent.icon)} />
            <span>
              Romaneio{" "}
              <span className="font-medium text-foreground">
                {progressoRomaneio}/{item.totalItens}
              </span>
              {item.romaneioConcluido ? (
                <span className="ml-1.5 text-balloon-mint">· concluído</span>
              ) : null}
            </span>
          </div>
        ) : null}
      </div>

      {item.osId ? (
        <div className={cn("mt-4 flex items-center justify-end gap-1 text-sm", accent.tema)}>
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
    <div className="rounded-2xl p-4 ring-2 ring-balloon-sky/30 sm:p-5 neo-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg text-foreground">
            <span className="balloon-dot bg-balloon-sky" />
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
          className="rounded-xl p-1.5 text-muted-foreground neo-inset hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>
      <ol className="mt-4 space-y-2">
        {rota.map((parada, index) => {
          const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
          return (
            <li key={parada.osId}>
              <Link
                href={`/montagem/${parada.osId}`}
                className="flex items-start gap-3 rounded-xl p-3 transition-all neo-inset hover:ring-2 hover:ring-balloon-sky/25"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    accent.badge
                  )}
                >
                  {parada.ordem}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {parada.clienteNome}
                  </p>
                  <p className={cn("truncate text-xs", accent.tema)}>{parada.tema}</p>
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
          );
        })}
      </ol>
    </div>
  );
}
