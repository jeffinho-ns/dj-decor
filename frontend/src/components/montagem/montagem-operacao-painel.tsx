"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  Radio,
  Truck,
  Users,
} from "lucide-react";

import { assignMontadorOs, listMontadores, listOsOperacao } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Montador } from "@/types/equipe";
import type { FaseOperacao, OperacaoPainelItem } from "@/types/os";

const FASE_STYLE: Record<FaseOperacao, { badge: string; dot: string }> = {
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

const FILTROS: { id: "todas" | "alertas" | FaseOperacao; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "alertas", label: "Alertas" },
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
  inicial?: OperacaoPainelItem[];
  podeTrocarEquipe?: boolean;
}

export function MontagemOperacaoPainel({
  token,
  inicial = [],
  podeTrocarEquipe = false,
}: MontagemOperacaoPainelProps) {
  const [itens, setItens] = useState<OperacaoPainelItem[]>(inicial);
  const [filtro, setFiltro] = useState<"todas" | "alertas" | FaseOperacao>(
    "todas"
  );
  const [loading, setLoading] = useState(inicial.length === 0);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pessoas, setPessoas] = useState<Montador[]>([]);

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

  useEffect(() => {
    if (!podeTrocarEquipe) return;
    let cancelled = false;
    void listMontadores(token)
      .then((lista) => {
        if (!cancelled) setPessoas(lista);
      })
      .catch(() => {
        if (!cancelled) setPessoas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [podeTrocarEquipe, token]);

  const contagens = useMemo(() => {
    const map: Partial<Record<FaseOperacao, number>> = {};
    for (const item of itens) {
      map[item.fase] = (map[item.fase] ?? 0) + 1;
    }
    return map;
  }, [itens]);

  const alertasCount = useMemo(
    () =>
      itens.filter((i) => i.atrasado || i.slaSeparacaoEstourado).length,
    [itens]
  );

  const filtrados = useMemo(() => {
    if (filtro === "todas") return itens;
    if (filtro === "alertas") {
      return itens.filter((i) => i.atrasado || i.slaSeparacaoEstourado);
    }
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
            Separação, Pegue e Monte, retorno e desmontagem — a cada 5s
            {atualizadoEm
              ? ` · ${format(atualizadoEm, "HH:mm:ss")}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-medium">
          {alertasCount > 0 ? (
            <span className="rounded-lg bg-destructive/12 px-2 py-1 text-destructive">
              {alertasCount} alerta{alertasCount > 1 ? "s" : ""}
            </span>
          ) : null}
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
            f.id === "todas"
              ? itens.length
              : f.id === "alertas"
                ? alertasCount
                : (contagens[f.id] ?? 0);
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
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {filtrados.map((item) => (
            <OperacaoLinha
              key={item.festaId}
              item={item}
              token={token}
              pessoas={pessoas}
              podeTrocarEquipe={podeTrocarEquipe}
              onRefresh={() => void carregar()}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function OperacaoLinha({
  item,
  token,
  pessoas,
  podeTrocarEquipe,
  onRefresh,
}: {
  item: OperacaoPainelItem;
  token: string;
  pessoas: Montador[];
  podeTrocarEquipe: boolean;
  onRefresh: () => void;
}) {
  const style = FASE_STYLE[item.fase];
  const progresso =
    item.totalItens > 0 ? item.totalItens - item.itensPendentes : 0;
  const [pending, startTransition] = useTransition();
  const [erroEquipe, setErroEquipe] = useState<string | null>(null);

  function trocar(
    campo: "montadorId" | "desmontadorId",
    value: string | null
  ) {
    if (!item.osId) return;
    setErroEquipe(null);
    startTransition(async () => {
      try {
        await assignMontadorOs(item.osId!, { [campo]: value }, token);
        onRefresh();
      } catch (err) {
        setErroEquipe(
          err instanceof Error ? err.message : "Falha ao trocar equipe"
        );
      }
    });
  }

  const body = (
    <div
      className={cn(
        "rounded-xl p-3 neo-inset transition-all",
        (item.atrasado || item.slaSeparacaoEstourado) &&
          "ring-1 ring-destructive/40"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", style.dot)}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          {item.osId ? (
            <Link href={`/montagem/${item.osId}`} className="block">
              <OperacaoLinhaCabecalho item={item} style={style} progresso={progresso} />
            </Link>
          ) : (
            <OperacaoLinhaCabecalho item={item} style={style} progresso={progresso} />
          )}

          {podeTrocarEquipe && item.osId && pessoas.length > 0 ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Users className="size-3 shrink-0" />
                <select
                  className="h-8 min-w-0 flex-1 rounded-lg border-0 bg-[var(--neo-bg)] px-2 text-[11px] shadow-[var(--shadow-neo-inset)]"
                  value={item.montadorId ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    trocar("montadorId", e.target.value || null)
                  }
                >
                  <option value="">Montador…</option>
                  {pessoas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Users className="size-3 shrink-0" />
                <select
                  className="h-8 min-w-0 flex-1 rounded-lg border-0 bg-[var(--neo-bg)] px-2 text-[11px] shadow-[var(--shadow-neo-inset)]"
                  value={item.desmontadorId ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    trocar("desmontadorId", e.target.value || null)
                  }
                >
                  <option value="">Desmontador…</option>
                  {pessoas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
              {erroEquipe ? (
                <p className="text-[10px] text-destructive sm:col-span-2">
                  {erroEquipe}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        {item.osId ? (
          <Link
            href={`/montagem/${item.osId}`}
            className="mt-1 shrink-0 text-muted-foreground"
            aria-label="Abrir OS"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );

  return <li>{body}</li>;
}

function OperacaoLinhaCabecalho({
  item,
  style,
  progresso,
}: {
  item: OperacaoPainelItem;
  style: { badge: string; dot: string };
  progresso: number;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{item.clienteNome}</p>
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
        {item.slaSeparacaoEstourado ? (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/12 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
            <Clock className="size-3" />
            SLA separação
          </span>
        ) : null}
        {item.atrasado ? (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/12 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
            <AlertTriangle className="size-3" />
            Atrasado
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.tema}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="capitalize">
          {safeDay(item.horarioMontagem)} · {safeTime(item.horarioMontagem)}
        </span>
        {item.totalItens > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Package className="size-3" />
            {item.fase === "desmontar"
              ? `${(item.totalItens ?? 0) - (item.itensRetornoPendentes ?? 0)}/${item.totalItens} retorno`
              : `${progresso}/${item.totalItens}`}
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
    </>
  );
}
