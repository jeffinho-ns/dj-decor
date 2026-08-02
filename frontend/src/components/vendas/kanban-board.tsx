"use client";

import { useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, LayoutGrid, List, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DescontoBadge } from "@/components/vendas/desconto-badge";
import { CompraEstoqueBadge } from "@/components/vendas/compra-estoque-badge";
import { FestaContratoPanel } from "@/components/vendas/festa-contrato-panel";
import { FestaDetalheModal } from "@/components/vendas/festa-detalhe-modal";
import { FestaItensEditor } from "@/components/vendas/festa-itens-editor";
import { PagamentoForm } from "@/components/vendas/pagamento-form";
import { RiscoBadge } from "@/components/vendas/risco-badge";
import { FestasTable } from "@/components/vendas/festas-table";
import {
  listPagamentos,
  solicitarDesconto,
  updateFestaStatus,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Festa, Pagamento, StatusFesta } from "@/types/festa";
import type { StatusDesconto } from "@/types/desconto";

const KANBAN_COLUMNS: StatusFesta[] = [
  "ORCAMENTO",
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "FECHADO",
  "EM_MONTAGEM",
  "CONCLUIDO",
];

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pag.",
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelar (lixeira)",
};

/** Espelha as transições do back-end (festas.service STATUS_TRANSITIONS). */
const STATUS_TRANSITIONS: Record<StatusFesta, StatusFesta[]> = {
  ORCAMENTO: ["AGUARDANDO_PAGAMENTO", "CANCELADO"],
  AGUARDANDO_PAGAMENTO: ["PAGO", "ORCAMENTO", "CANCELADO"],
  PAGO: ["FECHADO", "CANCELADO"],
  FECHADO: ["EM_MONTAGEM", "CANCELADO"],
  EM_MONTAGEM: ["CONCLUIDO", "CANCELADO"],
  CONCLUIDO: [],
  CANCELADO: ["ORCAMENTO"],
};

const columnAccent: Record<StatusFesta, string> = {
  ORCAMENTO: "border-t-balloon-sun",
  AGUARDANDO_PAGAMENTO: "border-t-balloon-sky",
  PAGO: "border-t-balloon-mint",
  FECHADO: "border-t-balloon-lilac",
  EM_MONTAGEM: "border-t-balloon-pink",
  CONCLUIDO: "border-t-balloon-mint",
  CANCELADO: "border-t-destructive",
};

const pillAccent: Record<StatusFesta, string> = {
  ORCAMENTO: "neo-sun",
  AGUARDANDO_PAGAMENTO: "neo-sky",
  PAGO: "neo-mint",
  FECHADO: "bg-balloon-lilac/12 text-balloon-lilac shadow-[var(--shadow-neo-sm)]",
  EM_MONTAGEM: "neo-pink",
  CONCLUIDO: "neo-mint",
  CANCELADO: "bg-destructive/12 text-destructive shadow-[var(--shadow-neo-sm)]",
};

interface KanbanBoardProps {
  festas: Festa[];
  token: string;
}

interface FestaCardProps {
  festa: Festa;
  expanded: boolean;
  busy: boolean;
  loadingPagamentos: boolean;
  pagamentos: Pagamento[];
  token: string;
  onToggle: () => void;
  onMove: (status: StatusFesta) => void;
  onPagamentosChange: (list: Pagamento[]) => void;
  onFestaUpdate: (festa: Festa) => void;
}

function FestaCard({
  festa,
  expanded,
  busy,
  loadingPagamentos,
  pagamentos,
  token,
  onToggle,
  onMove,
  onPagamentosChange,
  onFestaUpdate,
}: FestaCardProps) {
  const next = STATUS_TRANSITIONS[festa.status];
  const [percentualDesconto, setPercentualDesconto] = useState("10");
  const [solicitandoDesconto, setSolicitandoDesconto] = useState(false);
  const [descontoError, setDescontoError] = useState<string | null>(null);

  const descontoStatus = festa.descontoStatus as StatusDesconto | undefined;
  const podeSolicitarDesconto =
    !descontoStatus ||
    descontoStatus === "NENHUM" ||
    descontoStatus === "RECUSADO";

  return (
    <article
      className={cn(
        "rounded-2xl neo-sm p-3 transition-all md:p-2.5",
        expanded && "neo-inset ring-1 ring-balloon-pink/25"
      )}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium leading-snug text-foreground">
            {festa.cliente.nome}
          </p>
          <div className="flex max-w-[48%] shrink-0 flex-wrap items-center justify-end gap-1">
            <DescontoBadge
              status={festa.descontoStatus}
              percentual={festa.descontoPercentual}
            />
            <CompraEstoqueBadge
              alerta={festa.alertaCompraEstoque}
              itensFalta={festa.itensFaltaEstoque}
            />
            <RiscoBadge risco={festa.risco} />
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform md:size-3.5",
                expanded && "rotate-180"
              )}
            />
          </div>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {festa.tema}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs md:text-[11px]">
          <span className="text-muted-foreground">
            {format(parseISO(festa.dataEvento), "dd MMM", { locale: ptBR })}
          </span>
          <span className="font-medium text-balloon-sun">
            {formatCurrency(festa.valor)}
          </span>
        </div>
      </button>

      {next.length > 0 ? (
        <div className="mt-2.5">
          <select
            className="flex h-11 w-full rounded-xl neo-inset px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30 md:h-7 md:px-2 md:text-[11px]"
            disabled={busy}
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value as StatusFesta;
              if (!value) return;
              onMove(value);
              event.target.value = "";
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <option value="" disabled>
              {busy ? "Movendo…" : "Mover para…"}
            </option>
            {next.map((s) => (
              <option key={s} value={s} className="bg-background">
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {expanded ? (
        <div
          className="mt-3 border-t border-border/50 pt-3"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 border-b border-border/50 pb-3">
            <FestaItensEditor
              festa={festa}
              token={token}
              compact
              onUpdated={onFestaUpdate}
            />
          </div>
          {loadingPagamentos ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Carregando pagamentos…
            </p>
          ) : (
            <>
              <PagamentoForm
                festaId={festa.id}
                token={token}
                pagamentos={pagamentos}
                valorSugerido={Number(festa.valor)}
                onPagamentosChange={onPagamentosChange}
              />
              <div className="mt-4 border-t border-border/50 pt-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Desconto
                </p>
                {podeSolicitarDesconto ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-col gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label
                          htmlFor={`desconto-${festa.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Percentual (1–50%)
                        </Label>
                        <Input
                          id={`desconto-${festa.id}`}
                          type="number"
                          min={1}
                          max={50}
                          step={1}
                          className="h-11 md:h-9"
                          value={percentualDesconto}
                          disabled={solicitandoDesconto}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            setPercentualDesconto(event.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-11 w-full whitespace-normal md:min-h-9"
                        disabled={solicitandoDesconto}
                        onClick={(event) => {
                          event.stopPropagation();
                          const pct = Number(percentualDesconto);
                          if (!Number.isFinite(pct) || pct < 1 || pct > 50) {
                            setDescontoError(
                              "Informe um percentual entre 1 e 50"
                            );
                            return;
                          }
                          setDescontoError(null);
                          setSolicitandoDesconto(true);
                          void solicitarDesconto(
                            festa.id,
                            { percentual: pct },
                            token
                          )
                            .then((updated) => {
                              onFestaUpdate({
                                ...festa,
                                descontoStatus: updated.descontoStatus,
                                descontoPercentual: updated.descontoPercentual,
                              });
                            })
                            .catch((err) => {
                              setDescontoError(
                                err instanceof Error
                                  ? err.message
                                  : "Falha ao solicitar desconto"
                              );
                            })
                            .finally(() => setSolicitandoDesconto(false));
                        }}
                      >
                        {solicitandoDesconto ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Enviando…
                          </>
                        ) : (
                          "Solicitar desconto"
                        )}
                      </Button>
                    </div>
                    {descontoError ? (
                      <p className="text-xs text-destructive">{descontoError}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Enviado para aprovação do gerente.
                      </p>
                    )}
                  </div>
                ) : descontoStatus === "PENDENTE" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Desconto de{" "}
                    {festa.descontoPercentual != null
                      ? `${Number(festa.descontoPercentual).toFixed(0)}%`
                      : "—"}{" "}
                    aguardando aprovação.
                  </p>
                ) : descontoStatus === "APROVADO" ? (
                  <p className="mt-2 text-xs text-balloon-mint">
                    Desconto de{" "}
                    {festa.descontoPercentual != null
                      ? `${Number(festa.descontoPercentual).toFixed(0)}%`
                      : "—"}{" "}
                    aprovado.
                  </p>
                ) : null}
              </div>
              <div className="mt-4 border-t border-border/50 pt-3">
                <FestaContratoPanel
                  festaId={festa.id}
                  token={token}
                  clienteNome={festa.cliente.nome}
                />
              </div>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function KanbanBoard({ festas: initialFestas, token }: KanbanBoardProps) {
  const [festas, setFestas] = useState(initialFestas);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [activeStatus, setActiveStatus] = useState<StatusFesta>("ORCAMENTO");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [pagamentosByFesta, setPagamentosByFesta] = useState<
    Record<string, Pagamento[]>
  >({});
  const [loadingPagamentos, setLoadingPagamentos] = useState<string | null>(
    null
  );
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const festaDetalhe = detalheId
    ? (festas.find((f) => f.id === detalheId) ?? null)
    : null;

  function handleFestaUpdate(updated: Festa) {
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
  }

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
      if (atualizada.status === "CANCELADO") {
        setFestas((prev) => prev.filter((f) => f.id !== atualizada.id));
        if (expandedId === atualizada.id) setExpandedId(null);
        if (detalheId === atualizada.id) setDetalheId(null);
      } else {
        setFestas((prev) =>
          prev.map((f) => (f.id === atualizada.id ? atualizada : f))
        );
      }
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

  function renderFestaCard(festa: Festa) {
    const expanded = expandedId === festa.id;
    const busy = movingId === festa.id;

    return (
      <FestaCard
        key={festa.id}
        festa={festa}
        expanded={expanded}
        busy={busy}
        loadingPagamentos={loadingPagamentos === festa.id}
        pagamentos={pagamentosByFesta[festa.id] ?? []}
        token={token}
        onToggle={() => {
          startTransition(() => {
            void toggleExpand(festa);
          });
        }}
        onMove={(status) => void moverStatus(festa.id, status)}
        onPagamentosChange={(list) => {
          setPagamentosByFesta((prev) => ({
            ...prev,
            [festa.id]: list,
          }));
          void listPagamentos(festa.id, token).then(() => {
            setFestas((prev) =>
              prev.map((f) =>
                f.id === festa.id && f.status === "AGUARDANDO_PAGAMENTO"
                  ? { ...f, status: "PAGO" }
                  : f
              )
            );
          });
        }}
        onFestaUpdate={handleFestaUpdate}
      />
    );
  }

  const activeItems = byStatus[activeStatus];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Funil por status — expanda o card para itens, pagamentos e contrato.
          Na tabela, clique na linha para o modal.
        </p>
        <div className="flex gap-1 rounded-2xl neo-inset p-0.5">
          <Button
            type="button"
            size="xs"
            variant={view === "kanban" ? "secondary" : "ghost"}
            onClick={() => setView("kanban")}
            className="min-h-10 gap-1 px-3 md:min-h-6 md:px-2"
          >
            <LayoutGrid className="size-3.5" />
            Kanban
          </Button>
          <Button
            type="button"
            size="xs"
            variant={view === "table" ? "secondary" : "ghost"}
            onClick={() => setView("table")}
            className="min-h-10 gap-1 px-3 md:min-h-6 md:px-2"
          >
            <List className="size-3.5" />
            Tabela
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {view === "table" ? (
        <FestasTable
          festas={festas}
          onSelectFesta={(festa) => setDetalheId(festa.id)}
        />
      ) : (
        <>
          {/* Mobile: status pills + filtered card list */}
          <div className="space-y-3 md:hidden">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {KANBAN_COLUMNS.map((status) => {
                const count = byStatus[status].length;
                const active = activeStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveStatus(status)}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all",
                      active
                        ? pillAccent[status]
                        : "neo-sm text-muted-foreground"
                    )}
                  >
                    {statusLabel[status]}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                        active ? "bg-background/20" : "bg-muted/60"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {activeItems.length === 0 ? (
                <p className="rounded-2xl neo-inset px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma venda em {statusLabel[activeStatus].toLowerCase()}
                </p>
              ) : (
                activeItems.map(renderFestaCard)
              )}
            </div>
          </div>

          {/* Desktop: horizontal kanban columns */}
          <div className="hidden gap-3 overflow-x-auto pb-2 md:flex">
            {KANBAN_COLUMNS.map((status) => {
              const items = byStatus[status];
              return (
                <section
                  key={status}
                  className={cn(
                    "flex w-[min(100%,17.5rem)] shrink-0 flex-col rounded-2xl neo-sm border-t-4",
                    columnAccent[status]
                  )}
                >
                  <header className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <h3 className="text-xs font-medium tracking-wide text-foreground">
                      {statusLabel[status]}
                    </h3>
                    <span className="rounded-full bg-balloon-sky/12 px-1.5 py-0.5 text-[10px] tabular-nums text-balloon-sky">
                      {items.length}
                    </span>
                  </header>

                  <div className="flex max-h-[min(70vh,36rem)] flex-col gap-2 overflow-y-auto px-2 pb-3">
                    {items.length === 0 ? (
                      <p className="px-1 py-4 text-center text-[11px] text-muted-foreground/70">
                        Vazio
                      </p>
                    ) : (
                      items.map(renderFestaCard)
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      <FestaDetalheModal
        festa={festaDetalhe}
        open={Boolean(festaDetalhe)}
        onClose={() => setDetalheId(null)}
        token={token}
        canEdit
        onUpdated={handleFestaUpdate}
      />
    </div>
  );
}
