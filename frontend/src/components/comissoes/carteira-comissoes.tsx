"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMeusTotais } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ComissaoExtrato, MeusTotaisPeriodo } from "@/types/financeiro";

type Periodo = "semana" | "quinzena" | "mes";

const PERIODOS: Array<{ id: Periodo; label: string; hint: string }> = [
  { id: "semana", label: "Semana", hint: "segunda a domingo" },
  { id: "quinzena", label: "15 dias", hint: "1–15 e 16–fim" },
  { id: "mes", label: "Mês", hint: "mês civil" },
];

function formatData(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface CarteiraComissoesProps {
  token: string;
  /** Extrato completo (fallback / histórico). */
  comissoes: ComissaoExtrato[];
  /** Só gestão vê ranking; vendedor fica só no próprio. */
  showRankingSlot?: React.ReactNode;
}

export function CarteiraComissoes({
  token,
  comissoes,
  showRankingSlot,
}: CarteiraComissoesProps) {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [offset, setOffset] = useState(0);
  const [totais, setTotais] = useState<MeusTotaisPeriodo | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "pendente" | "paga">("todas");

  useEffect(() => {
    setError(null);
    startTransition(() => {
      void getMeusTotais(token, { periodo, offset })
        .then(setTotais)
        .catch((err) =>
          setError(
            err instanceof Error ? err.message : "Falha ao carregar totais"
          )
        );
    });
  }, [token, periodo, offset]);

  const lancamentos = totais?.lancamentos ?? [];
  const lista =
    filtro === "pendente"
      ? lancamentos.filter((c) => c.status === "PENDENTE")
      : filtro === "paga"
        ? lancamentos.filter((c) => c.status === "PAGA")
        : lancamentos;

  // Fallback histórico se API de totais falhar
  const fallbackPend = comissoes.filter((c) => c.status === "PENDENTE");
  const fallbackPago = comissoes.filter((c) => c.status === "PAGA");

  return (
    <div className="space-y-6">
      {showRankingSlot}

      <section className="space-y-3 rounded-2xl neo-sm p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Seu recebimento
          </p>
          <h2 className="mt-1 font-display text-lg text-foreground">
            Só você vê estes valores
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={pending}
              onClick={() => {
                setPeriodo(p.id);
                setOffset(0);
              }}
              className={cn(
                "rounded-xl px-3 py-2 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30",
                periodo === p.id
                  ? "neo-inset text-foreground"
                  : "neo-sm text-muted-foreground"
              )}
            >
              <span className="block font-medium">{p.label}</span>
              <span className="text-[11px]">{p.hint}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl neo-inset px-2 py-1.5">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() => setOffset((n) => n - 1)}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <p className="min-w-0 text-center text-sm font-medium capitalize">
            {totais?.label ?? (pending ? "Carregando…" : "—")}
          </p>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() => setOffset((n) => n + 1)}
          >
            Próximo
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl neo-inset p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Total do período
            </p>
            <p className="mt-1 font-display text-lg tabular-nums">
              {formatCurrency(totais?.total ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl neo-inset p-3">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Clock className="size-3" /> A receber
            </p>
            <p className="mt-1 font-display text-lg tabular-nums text-balloon-sun">
              {formatCurrency(totais?.totalPendente ?? fallbackPend.reduce((a, c) => a + c.valor, 0))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Liberado agora:{" "}
              {formatCurrency(totais?.totalLiberado ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl neo-inset p-3">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="size-3" /> Já pago
            </p>
            <p className="mt-1 font-display text-lg tabular-nums text-balloon-mint">
              {formatCurrency(totais?.totalPago ?? fallbackPago.reduce((a, c) => a + c.valor, 0))}
            </p>
          </div>
        </div>

        {totais && totais.porTipo.length > 0 ? (
          <ul className="space-y-1.5">
            {totais.porTipo.map((t) => (
              <li
                key={t.tipo}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-muted-foreground">{t.label}</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(t.total)}
                  {t.pendente > 0 ? (
                    <span className="ml-1.5 text-xs text-balloon-sun">
                      ({formatCurrency(t.pendente)} pend.)
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="rounded-2xl neo-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Extrato do período
            </p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-lg text-foreground">
              <Wallet className="size-4 text-balloon-sky" />
              Lançamentos
            </h2>
          </div>
          <div className="flex gap-1 rounded-2xl neo-inset p-0.5">
            {(
              [
                { key: "todas", label: "Todas" },
                { key: "pendente", label: "Pendentes" },
                { key: "paga", label: "Pagas" },
              ] as const
            ).map((item) => (
              <Button
                key={item.key}
                type="button"
                size="xs"
                variant={filtro === item.key ? "secondary" : "ghost"}
                onClick={() => setFiltro(item.key)}
                className="min-h-10 px-3 md:min-h-6 md:px-2"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {lista.length === 0 ? (
          <p className="mt-6 rounded-2xl neo-inset px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento neste período.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {lista.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl neo-inset px-3 py-3 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {item.festa.tema}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.tipoLabel ?? "Comissão"}
                    {" · "}
                    {item.festa.cliente.nome}
                    {" · "}
                    {formatData(item.criadoEm)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                      item.status === "PAGA"
                        ? "bg-balloon-mint/20 text-balloon-mint"
                        : item.liberadoParaPagamento === false
                          ? "bg-muted text-muted-foreground"
                          : "bg-balloon-sun/20 text-balloon-sun"
                    )}
                  >
                    {item.status === "PAGA"
                      ? "Paga"
                      : item.liberadoParaPagamento === false
                        ? "Aguardando"
                        : "Pendente"}
                  </span>
                  <span className="font-display tabular-nums text-foreground">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
