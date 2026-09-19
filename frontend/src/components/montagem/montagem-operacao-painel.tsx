"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronRight,
  Loader2,
  Package,
  Radio,
  Truck,
} from "lucide-react";

import { listOsOperacao } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FaseOperacao, OperacaoPainelItem } from "@/types/os";

const FASE_STYLE: Record<
  FaseOperacao,
  { badge: string; dot: string }
> = {
  separar: {
    badge: "bg-balloon-pink/12 text-balloon-pink",
    dot: "bg-balloon-pink",
  },
  a_caminho: {
    badge: "bg-balloon-sun/12 text-balloon-sun",
    dot: "bg-balloon-sun",
  },
  pronto_retirada: {
    badge: "bg-balloon-sky/12 text-balloon-sky",
    dot: "bg-balloon-sky",
  },
  no_local: {
    badge: "bg-balloon-mint/12 text-balloon-mint",
    dot: "bg-balloon-mint",
  },
  montada: {
    badge: "bg-balloon-lilac/12 text-balloon-lilac",
    dot: "bg-balloon-lilac",
  },
  na_rua: {
    badge: "bg-balloon-sun/18 text-balloon-sun",
    dot: "bg-balloon-sun",
  },
  desmontar: {
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

const FILTROS: { id: "todas" | FaseOperacao; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "separar", label: "Separar" },
  { id: "pronto_retirada", label: "Retirada" },
  { id: "na_rua", label: "Na rua" },
  { id: "a_caminho", label: "A caminho" },
  { id: "desmontar", label: "Desmontar" },
];

function safeTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "HH:mm");
  } catch {
    return "—";
  }
}

function safeDay(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return format(parseISO(value), "EEE d/MM", { locale: ptBR });
  } catch {
    return "";
  }
}

interface MontagemOperacaoPainelProps {
  token: string;
  /** Snapshot inicial do SSR (opcional). */
  inicial?: OperacaoPainelItem[];
}

export function MontagemOperacaoPainel({
  token,
  inicial = [],
}: MontagemOperacaoPainelProps) {
  const [itens, setItens] = useState<OperacaoPainelItem[]>(inicial);
  const [filtro, setFiltro] = useState<"todas" | FaseOperacao>("todas");
  const [loading, setLoading] = useState(inicial.length === 0);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await listOsOperacao(token);
      setItens(data);
      setAtualizadoEm(new Date());
      setErro(null);
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Falha ao atualizar operação"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void carregar();
    const timer = window.setInterval(() => void carregar(), 5000);
    const onFocus = () => void carregar();
    window.addEventListener("focus", onFocus);
    const onVis = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [carregar]);

  const contagens = useMemo(() => {
    const map: Partial<Record<FaseOperacao, number>> = {};
    for (const item of itens) {
      map[item.fase] = (map[item.fase] ?? 0) + 1;
    }
    return map;
  }, [itens]);

  const filtrados = useMemo(() => {
    if (filtro === "todas") return itens;
    return itens.filter((i) => i.fase === filtro);
  }, [itens, filtro]);

  const naRua = contagens.na_rua ?? 0;
  const separar = contagens.separar ?? 0;
  const pronto = contagens.pronto_retirada ?? 0;

  return (
    <section className="rounded-2xl p-4 sm:p-5 neo-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-balloon-pink" />
            <h3 className="font-display text-lg text-foreground">
              Operação ao vivo
            </h3>
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-balloon-mint opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-balloon-mint" />
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Separação, Pegue e Monte na rua e desmontagem — atualiza a cada 5s
            {atualizadoEm
              ? ` · ${format(atualizadoEm, "HH:mm:ss")}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-medium">
          <span className="rounded-lg bg-balloon-pink/12 px-2 py-1 text-balloon-pink">
            {separar} separar
          </span>
          <span className="rounded-lg bg-balloon-sky/12 px-2 py-1 text-balloon-sky">
            {pronto} retirada
          </span>
          <span className="rounded-lg bg-balloon-sun/12 px-2 py-1 text-balloon-sun">
            {naRua} na rua
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {FILTROS.map((f) => {
          const count =
            f.id === "todas" ? itens.length : (contagens[f.id] ?? 0);
          const active = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "neo-inset text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {erro ? (
        <p className="mt-3 text-xs text-destructive">{erro}</p>
      ) : null}

      {loading && itens.length === 0 ? (
        <div className="mt-4 flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando operação…
        </div>
      ) : filtrados.length === 0 ? (
        <p className="mt-4 py-4 text-center text-sm text-muted-foreground">
          Nada nesta fila no momento.
        </p>
      ) : (
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {filtrados.map((item) => (
            <OperacaoLinha key={item.festaId} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OperacaoLinha({ item }: { item: OperacaoPainelItem }) {
  const style = FASE_STYLE[item.fase];
  const progresso =
    item.totalItens > 0 ? item.totalItens - item.itensPendentes : 0;

  const body = (
    <div className="flex items-start gap-3 rounded-xl p-3 neo-inset transition-all hover:ring-2 hover:ring-balloon-sky/20">
      <span
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", style.dot)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {item.clienteNome}
          </p>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              style.badge
            )}
          >
            {item.faseLabel}
          </span>
          {item.pegueEMonte ? (
            <span className="rounded-md bg-balloon-lilac/12 px-1.5 py-0.5 text-[10px] font-medium text-balloon-lilac">
              Pegue e Monte
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.tema}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="capitalize">
            {safeDay(item.horarioMontagem)} · {safeTime(item.horarioMontagem)}
          </span>
          {item.totalItens > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Package className="size-3" />
              {progresso}/{item.totalItens}
            </span>
          ) : null}
          {item.fase === "na_rua" && item.retiradoClienteEm ? (
            <span className="inline-flex items-center gap-1 text-balloon-sun">
              <Truck className="size-3" />
              Retirou {safeTime(item.retiradoClienteEm)}
            </span>
          ) : null}
          {item.fase === "pronto_retirada" && item.prontoRetiradaEm ? (
            <span>Pronto desde {safeTime(item.prontoRetiradaEm)}</span>
          ) : null}
          {item.desmontadorNome && item.fase === "desmontar" ? (
            <span>Desmont.: {item.desmontadorNome}</span>
          ) : null}
          {item.montadorNome && item.fase !== "desmontar" ? (
            <span>{item.montadorNome}</span>
          ) : null}
        </div>
      </div>
      {item.osId ? (
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </div>
  );

  if (item.osId) {
    return (
      <li>
        <Link href={`/montagem/${item.osId}`} className="block">
          {body}
        </Link>
      </li>
    );
  }

  return <li>{body}</li>;
}
