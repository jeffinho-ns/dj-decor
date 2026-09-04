"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getColaboradorFinanceiro } from "@/lib/api";
import { roleLabel } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/auth";
import type {
  ColaboradorFinanceiroDetalhe,
  PeriodoRecebimento,
} from "@/types/financeiro";

const PERIODOS: Array<{ id: PeriodoRecebimento; label: string }> = [
  { id: "semana", label: "Semana" },
  { id: "quinzena", label: "15 dias" },
  { id: "mes", label: "Mês" },
  { id: "tudo", label: "Tudo" },
];

function formatData(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ColaboradorFinanceiroDetalheViewProps {
  token: string;
  colaboradorId: string;
}

export function ColaboradorFinanceiroDetalheView({
  token,
  colaboradorId,
}: ColaboradorFinanceiroDetalheViewProps) {
  const [periodo, setPeriodo] = useState<PeriodoRecebimento>("mes");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ColaboradorFinanceiroDetalhe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setError(null);
    startTransition(() => {
      void getColaboradorFinanceiro(token, colaboradorId, {
        periodo,
        offset: periodo === "tudo" ? 0 : offset,
      })
        .then(setData)
        .catch((err) =>
          setError(
            err instanceof Error ? err.message : "Falha ao carregar colaborador"
          )
        );
    });
  }, [token, colaboradorId, periodo, offset]);

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/financeiro"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar ao financeiro
        </Link>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const c = data?.colaborador;

  return (
    <div className="space-y-6">
      <Link
        href="/financeiro"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar ao financeiro
      </Link>

      <header className="rounded-2xl neo-sm p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Colaborador
        </p>
        <h1 className="mt-1 font-display text-2xl text-foreground">
          {c?.nome ?? "…"}
        </h1>
        {c ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {roleLabel(c.role as Role, c.nome)}
            {c.ehSocia ? " · sócia" : ""}
            {c.ehDona ? " · dona" : ""}
            {c.telefone ? ` · ${c.telefone}` : ""}
            {c.email ? ` · ${c.email}` : ""}
          </p>
        ) : null}
      </header>

      <section className="space-y-3 rounded-2xl neo-sm p-4">
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
                "rounded-xl px-3 py-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30",
                periodo === p.id
                  ? "neo-inset text-foreground"
                  : "neo-sm text-muted-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodo !== "tudo" ? (
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
              {data?.label ?? (pending ? "Carregando…" : "—")}
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
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {data?.label ?? "Todo o histórico"}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl neo-inset p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p className="mt-1 font-display text-lg tabular-nums">
              {formatCurrency(data?.total ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl neo-inset p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              A receber (liberado)
            </p>
            <p className="mt-1 font-display text-lg tabular-nums text-balloon-sun">
              {formatCurrency(data?.totalLiberado ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Pendente total: {formatCurrency(data?.totalPendente ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl neo-inset p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Já pago
            </p>
            <p className="mt-1 font-display text-lg tabular-nums text-balloon-mint">
              {formatCurrency(data?.totalPago ?? 0)}
            </p>
          </div>
        </div>

        {data && data.porTipo.length > 0 ? (
          <ul className="space-y-1.5 border-t border-border/30 pt-3">
            {data.porTipo.map((t) => (
              <li
                key={t.tipo}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-muted-foreground">{t.label}</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(t.total)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="rounded-2xl neo-sm p-4">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <Wallet className="size-4 text-balloon-sky" />
          Lançamentos
        </h2>
        {!data || data.lancamentos.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum lançamento neste período.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.lancamentos.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl neo-inset px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.festa.tema}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.tipoLabel ?? "Repasse"} · {item.festa.cliente.nome} ·{" "}
                    {formatData(item.criadoEm)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                      item.status === "PAGA"
                        ? "bg-balloon-mint/20 text-balloon-mint"
                        : "bg-balloon-sun/20 text-balloon-sun"
                    )}
                  >
                    {item.status === "PAGA" ? "Paga" : "Pendente"}
                  </span>
                  <span className="font-display tabular-nums">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl neo-sm p-4">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <PartyPopper className="size-4 text-balloon-pink" />
          Festas vendidas
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Últimas festas em que esta pessoa figura como vendedora.
        </p>
        {!data || data.festasVendidas.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma festa vendida registrada.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.festasVendidas.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl neo-inset px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.tema}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {f.clienteNome} · {formatData(f.dataEvento)} · {f.status}
                  </p>
                </div>
                <span className="font-display tabular-nums text-sm">
                  {formatCurrency(f.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
