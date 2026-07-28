"use client";

import { useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, LayoutGrid, List, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PagamentoForm } from "@/components/vendas/pagamento-form";
import { FestasTable } from "@/components/vendas/festas-table";
import {
  listPagamentos,
  updateFestaStatus,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Festa, Pagamento, StatusFesta } from "@/types/festa";

const KANBAN_COLUMNS: StatusFesta[] = [
  "ORCAMENTO",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "FECHADO",
  "EM_MONTAGEM",
  "CONCLUIDO",
  "CANCELADO",
];

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pag.",
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

/** Espelha as transições do back-end (festas.service STATUS_TRANSITIONS). */
const STATUS_TRANSITIONS: Record<StatusFesta, StatusFesta[]> = {
  ORCAMENTO: ["AGUARDANDO_PAGAMENTO", "CANCELADO"],
  AGUARDANDO_PAGAMENTO: ["PAGO", "ORCAMENTO", "CANCELADO"],
  PAGO: ["FECHADO", "CANCELADO"],
  FECHADO: ["EM_MONTAGEM", "CANCELADO"],
  EM_MONTAGEM: ["CONCLUIDO", "CANCELADO"],
  CONCLUIDO: [],
  CANCELADO: [],
};

const columnAccent: Record<StatusFesta, string> = {
  ORCAMENTO: "border-t-champagne",
  AGUARDANDO_PAGAMENTO: "border-t-amber-400",
  PAGO: "border-t-emerald-400",
  FECHADO: "border-t-status-closed",
  EM_MONTAGEM: "border-t-sky-400",
  CONCLUIDO: "border-t-status-done",
  CANCELADO: "border-t-destructive",
};

interface KanbanBoardProps {
  festas: Festa[];
  token: string;
}

export function KanbanBoard({ festas: initialFestas, token }: KanbanBoardProps) {
  const [festas, setFestas] = useState(initialFestas);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pagamentosByFesta, setPagamentosByFesta] = useState<
    Record<string, Pagamento[]>
  >({});
  const [loadingPagamentos, setLoadingPagamentos] = useState<string | null>(
    null
  );
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      KANBAN_COLUMNS.map((s) => [s, [] as Festa[]])
    ) as Record<StatusFesta, Festa[]>;
    for (const festa of festas) {
      (map[festa.status] ?? map.ORCAMENTO).push(festa);
    }
    return map;
  }, [festas]);

  async function moverStatus(festaId: string, status: StatusFesta) {
    setError(null);
    setMovingId(festaId);
    try {
      const atualizada = await updateFestaStatus(festaId, status, token);
      setFestas((prev) =>
        prev.map((f) => (f.id === atualizada.id ? atualizada : f))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao atualizar status"
      );
    } finally {
      setMovingId(null);
    }
  }

  async function toggleExpand(festa: Festa) {
    if (expandedId === festa.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(festa.id);
    if (pagamentosByFesta[festa.id]) return;

    setLoadingPagamentos(festa.id);
    try {
      const list = await listPagamentos(festa.id, token);
      setPagamentosByFesta((prev) => ({ ...prev, [festa.id]: list }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar pagamentos"
      );
      setPagamentosByFesta((prev) => ({ ...prev, [festa.id]: [] }));
    } finally {
      setLoadingPagamentos(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Funil por status — clique no card para pagamentos PIX.
        </p>
        <div className="flex gap-1 rounded-lg border border-border/60 p-0.5">
          <Button
            type="button"
            size="xs"
            variant={view === "kanban" ? "secondary" : "ghost"}
            onClick={() => setView("kanban")}
            className="gap-1"
          >
            <LayoutGrid className="size-3.5" />
            Kanban
          </Button>
          <Button
            type="button"
            size="xs"
            variant={view === "table" ? "secondary" : "ghost"}
            onClick={() => setView("table")}
            className="gap-1"
          >
            <List className="size-3.5" />
            Tabela
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {view === "table" ? (
        <FestasTable festas={festas} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {KANBAN_COLUMNS.map((status) => {
            const items = byStatus[status];
            return (
              <section
                key={status}
                className={cn(
                  "flex w-[min(100%,17.5rem)] shrink-0 flex-col rounded-xl border border-border/50 border-t-2 bg-card/30",
                  columnAccent[status]
                )}
              >
                <header className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <h3 className="text-xs font-medium tracking-wide text-foreground">
                    {statusLabel[status]}
                  </h3>
                  <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </header>

                <div className="flex max-h-[min(70vh,36rem)] flex-col gap-2 overflow-y-auto px-2 pb-3">
                  {items.length === 0 ? (
                    <p className="px-1 py-4 text-center text-[11px] text-muted-foreground/70">
                      Vazio
                    </p>
                  ) : (
                    items.map((festa) => {
                      const next = STATUS_TRANSITIONS[festa.status];
                      const expanded = expandedId === festa.id;
                      const busy = movingId === festa.id;

                      return (
                        <article
                          key={festa.id}
                          className={cn(
                            "rounded-lg border border-border/60 bg-background/40 p-2.5 shadow-sm transition-colors",
                            expanded && "border-champagne/40"
                          )}
                        >
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              startTransition(() => {
                                void toggleExpand(festa);
                              });
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-sm font-medium leading-snug text-foreground">
                                {festa.cliente.nome}
                              </p>
                              <ChevronDown
                                className={cn(
                                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                                  expanded && "rotate-180"
                                )}
                              />
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {festa.tema}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-muted-foreground">
                                {format(
                                  parseISO(festa.dataEvento),
                                  "dd MMM",
                                  { locale: ptBR }
                                )}
                              </span>
                              <span className="font-medium text-champagne">
                                {formatCurrency(festa.valor)}
                              </span>
                            </div>
                          </button>

                          {next.length > 0 ? (
                            <div className="mt-2">
                              <select
                                className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px] outline-none focus-visible:border-ring"
                                disabled={busy}
                                defaultValue=""
                                onChange={(event) => {
                                  const value = event.target
                                    .value as StatusFesta;
                                  if (!value) return;
                                  void moverStatus(festa.id, value);
                                  event.target.value = "";
                                }}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <option value="" disabled>
                                  {busy ? "Movendo…" : "Mover para…"}
                                </option>
                                {next.map((s) => (
                                  <option
                                    key={s}
                                    value={s}
                                    className="bg-background"
                                  >
                                    {statusLabel[s]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}

                          {expanded ? (
                            <div className="mt-3 border-t border-border/50 pt-3">
                              {loadingPagamentos === festa.id ? (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Loader2 className="size-3 animate-spin" />
                                  Carregando pagamentos…
                                </p>
                              ) : (
                                <PagamentoForm
                                  festaId={festa.id}
                                  token={token}
                                  pagamentos={pagamentosByFesta[festa.id] ?? []}
                                  valorSugerido={Number(festa.valor)}
                                  onPagamentosChange={(list) => {
                                    setPagamentosByFesta((prev) => ({
                                      ...prev,
                                      [festa.id]: list,
                                    }));
                                    // Se confirmou e festa estava aguardando, backend sobe para PAGO
                                    void listPagamentos(festa.id, token).then(
                                      () => {
                                        // refresh festa list status lightly
                                        setFestas((prev) =>
                                          prev.map((f) =>
                                            f.id === festa.id &&
                                            f.status === "AGUARDANDO_PAGAMENTO"
                                              ? { ...f, status: "PAGO" }
                                              : f
                                          )
                                        );
                                      }
                                    );
                                  }}
                                />
                              )}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
