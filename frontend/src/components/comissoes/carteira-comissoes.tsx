"use client";

import { useState } from "react";
import { Clock, CheckCircle2, Trophy } from "lucide-react";

import { ComissaoRankingWidget } from "@/components/vendas/comissao-ranking-widget";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ComissaoExtrato } from "@/types/financeiro";
import type { ComissaoRanking } from "@/types/financeiro";

type FiltroStatus = "todas" | "pendente" | "paga";

interface CarteiraComissoesProps {
  comissoes: ComissaoExtrato[];
  ranking: ComissaoRanking | null;
  vendedorId: string;
}

function formatData(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CarteiraComissoes({
  comissoes,
  ranking,
  vendedorId,
}: CarteiraComissoesProps) {
  const [filtro, setFiltro] = useState<FiltroStatus>("todas");

  const pendentes = comissoes.filter((c) => c.status === "PENDENTE");
  const pagas = comissoes.filter((c) => c.status === "PAGA");
  const totalPendente = pendentes.reduce((acc, c) => acc + c.valor, 0);
  const totalPago = pagas.reduce((acc, c) => acc + c.valor, 0);
  const totalGeral = totalPendente + totalPago;

  const lista =
    filtro === "pendente"
      ? pendentes
      : filtro === "paga"
        ? pagas
        : comissoes;

  return (
    <div className="space-y-6">
      {ranking ? (
        <ComissaoRankingWidget ranking={ranking} vendedorId={vendedorId} />
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl neo-sm p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total acumulado
          </p>
          <p className="mt-1 font-display text-xl text-foreground">
            {formatCurrency(totalGeral)}
          </p>
        </div>
        <div className="rounded-2xl neo-sm p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3.5" />
            Pendente
          </p>
          <p className="mt-1 font-display text-xl text-balloon-sun">
            {formatCurrency(totalPendente)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pendentes.length} lançamento{pendentes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-2xl neo-sm p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="size-3.5" />
            Pago
          </p>
          <p className="mt-1 font-display text-xl text-balloon-mint">
            {formatCurrency(totalPago)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pagas.length} lançamento{pagas.length !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      <section className="rounded-2xl neo-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Extrato
            </p>
            <h2 className="mt-1 font-display text-lg text-foreground">
              Suas comissões
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
          <div className="mt-6 rounded-2xl neo-inset px-4 py-10 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-2xl neo-sun">
              <Trophy className="size-4" />
            </span>
            <p className="mt-3 text-sm text-muted-foreground">
              {filtro === "pendente"
                ? "Nenhuma comissão pendente no momento."
                : filtro === "paga"
                  ? "Nenhuma comissão paga registrada ainda."
                  : "Você ainda não tem comissões registradas."}
            </p>
          </div>
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
                    {item.status === "PAGA" && item.pagoEm
                      ? ` · pago em ${formatData(item.pagoEm)}`
                      : ""}
                    {item.status === "PENDENTE" &&
                    item.liberadoParaPagamento === false
                      ? " · aguarda mês do evento"
                      : ""}
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
