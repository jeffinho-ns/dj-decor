"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Hammer,
  PartyPopper,
  Truck,
  Wallet,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getColaboradorFinanceiro } from "@/lib/api";
import { roleLabel } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/auth";
import type {
  ColaboradorFinanceiroDetalhe,
  ComissaoExtrato,
  PeriodoRecebimento,
} from "@/types/financeiro";

const PERIODOS: Array<{ id: PeriodoRecebimento; label: string }> = [
  { id: "semana", label: "Semana" },
  { id: "quinzena", label: "15 dias" },
  { id: "mes", label: "Mês" },
  { id: "tudo", label: "Tudo" },
];

type BlocoTipoId =
  | "comissao_venda"
  | "diaria_montagem"
  | "diaria_desmontagem"
  | "comissao_fora";

interface BlocoTipoConfig {
  id: BlocoTipoId;
  titulo: string;
  tipos: string[];
  icon: typeof Wallet;
  accent: string;
}

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

function sumBy(
  items: ComissaoExtrato[],
  pred: (item: ComissaoExtrato) => boolean
): number {
  return Number(
    items.reduce((acc, item) => (pred(item) ? acc + item.valor : acc), 0).toFixed(2)
  );
}

function buildBlocos(ehDona?: boolean): BlocoTipoConfig[] {
  return [
    {
      id: "comissao_venda",
      titulo: "Comissão venda",
      tipos: ["COMISSAO_VENDEDOR"],
      icon: Wallet,
      accent: "text-balloon-sky",
    },
    {
      id: "diaria_montagem",
      titulo: "Diária montagem",
      tipos: ["DIARIA_MONTAGEM"],
      icon: Hammer,
      accent: "text-balloon-lilac",
    },
    {
      id: "diaria_desmontagem",
      titulo: "Diária desmontagem",
      tipos: ["DIARIA_DESMONTAGEM"],
      icon: Wrench,
      accent: "text-balloon-pink",
    },
    {
      id: "comissao_fora",
      titulo: ehDona ? "Comissão fora / Debora" : "Comissão fora / outros",
      tipos: ehDona
        ? ["COMISSAO_SOCIA", "COMISSAO_DONA"]
        : ["COMISSAO_SOCIA"],
      icon: Truck,
      accent: "text-balloon-sun",
    },
  ];
}

function StatusBadge({ item }: { item: ComissaoExtrato }) {
  if (item.status === "PAGA") {
    return (
      <span className="rounded-full bg-balloon-mint/20 px-2 py-0.5 text-[11px] font-semibold uppercase text-balloon-mint">
        Pago
      </span>
    );
  }
  if (item.liberadoParaPagamento) {
    return (
      <span className="rounded-full bg-balloon-sun/20 px-2 py-0.5 text-[11px] font-semibold uppercase text-balloon-sun">
        Liberado
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
      Pendente
    </span>
  );
}

function TipoBloco({
  config,
  lancamentos,
}: {
  config: BlocoTipoConfig;
  lancamentos: ComissaoExtrato[];
}) {
  const items = lancamentos.filter((l) =>
    config.tipos.includes(String(l.tipo ?? ""))
  );
  const total = sumBy(items, () => true);
  const pago = sumBy(items, (i) => i.status === "PAGA");
  const liberado = sumBy(
    items,
    (i) => i.status !== "PAGA" && i.liberadoParaPagamento === true
  );
  const pendente = sumBy(
    items,
    (i) => i.status !== "PAGA" && i.liberadoParaPagamento !== true
  );
  const Icon = config.icon;

  return (
    <section className="rounded-2xl neo-sm p-4">
      <h2 className="flex items-center gap-2 font-display text-lg">
        <Icon className={cn("size-4", config.accent)} />
        {config.titulo}
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl neo-inset p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Total
          </p>
          <p className="mt-0.5 font-display text-base tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="rounded-xl neo-inset p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Pendente
          </p>
          <p className="mt-0.5 font-display text-base tabular-nums text-muted-foreground">
            {formatCurrency(pendente)}
          </p>
        </div>
        <div className="rounded-xl neo-inset p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Liberado
          </p>
          <p className="mt-0.5 font-display text-base tabular-nums text-balloon-sun">
            {formatCurrency(liberado)}
          </p>
        </div>
        <div className="rounded-xl neo-inset p-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Pago
          </p>
          <p className="mt-0.5 font-display text-base tabular-nums text-balloon-mint">
            {formatCurrency(pago)}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum lançamento neste período.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl neo-inset px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.festa.tema}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.tipoLabel ?? "Repasse"} · {item.festa.cliente.nome}
                  {item.festa.dataEvento
                    ? ` · ${formatData(item.festa.dataEvento)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge item={item} />
                <span className="font-display tabular-nums text-sm">
                  {formatCurrency(item.valor)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
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

  const blocos = useMemo(
    () => buildBlocos(data?.colaborador.ehDona),
    [data?.colaborador.ehDona]
  );

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
  const lancamentos = data?.lancamentos ?? [];

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
        <p className="mt-2 text-xs text-muted-foreground">
          Valores no mês do evento; liberado após o dia da festa.
        </p>
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
              Pendente
            </p>
            <p className="mt-1 font-display text-lg tabular-nums text-muted-foreground">
              {formatCurrency(
                Math.max(
                  0,
                  (data?.totalPendente ?? 0) - (data?.totalLiberado ?? 0)
                )
              )}
            </p>
            <p className="text-[11px] text-balloon-sun">
              Liberado: {formatCurrency(data?.totalLiberado ?? 0)}
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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <div className="space-y-4">
        {blocos.map((bloco) => (
          <TipoBloco
            key={bloco.id}
            config={bloco}
            lancamentos={lancamentos}
          />
        ))}
      </div>

      <section className="rounded-2xl neo-sm p-3 sm:p-4">
        <h2 className="flex items-center gap-2 font-display text-base">
          <PartyPopper className="size-3.5 text-balloon-pink" />
          Festas vendidas
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Últimas festas em que esta pessoa figura como vendedora.
        </p>
        {!data || data.festasVendidas.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma festa vendida registrada.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border/30">
            {data.festasVendidas.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.tema}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
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
