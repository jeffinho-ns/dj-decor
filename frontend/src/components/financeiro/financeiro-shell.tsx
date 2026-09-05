"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ColaboradoresFinanceiroLista } from "@/components/financeiro/colaboradores-financeiro-lista";
import { FilaAPagar } from "@/components/financeiro/fila-a-pagar";
import { FinanceiroPainel } from "@/components/financeiro/financeiro-painel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComissaoRanking, FinanceiroResumo, PrevisaoCaixa } from "@/types/financeiro";

export type FinanceiroAba = "pagar" | "colaboradores" | "caixa" | "festas";

const ABAS: { id: FinanceiroAba; label: string }[] = [
  { id: "pagar", label: "Hoje / Pagar" },
  { id: "colaboradores", label: "Colaboradores" },
  { id: "caixa", label: "Caixa" },
  { id: "festas", label: "Festas" },
];

interface FinanceiroShellProps {
  token: string;
  mes: string;
  aba: FinanceiroAba;
  resumo: FinanceiroResumo;
  previsao?: PrevisaoCaixa | null;
  comissaoRanking?: ComissaoRanking | null;
}

function shiftMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function labelMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function FinanceiroShell({
  token,
  mes,
  aba,
  resumo,
  previsao,
  comissaoRanking,
}: FinanceiroShellProps) {
  const router = useRouter();

  function navigate(next: { mes?: string; aba?: FinanceiroAba }) {
    const params = new URLSearchParams();
    params.set("mes", next.mes ?? mes);
    params.set("aba", next.aba ?? aba);
    router.replace(`/financeiro?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-2xl neo-sm px-2 py-2 sm:px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
          onClick={() => navigate({ mes: shiftMes(mes, -1) })}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="font-display text-lg capitalize text-foreground sm:text-xl">
            {labelMes(mes)}
          </p>
          <p className="text-[11px] text-muted-foreground">{mes}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
          onClick={() => navigate({ mes: shiftMes(mes, 1) })}
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Seções financeiras"
        className="flex gap-1 overflow-x-auto rounded-2xl neo-inset p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ABAS.map((item) => {
          const active = aba === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => navigate({ aba: item.id })}
              className={cn(
                "min-h-10 shrink-0 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all",
                active
                  ? "neo-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {aba === "pagar" ? <FilaAPagar token={token} mes={mes} /> : null}

        {aba === "colaboradores" ? (
          <ColaboradoresFinanceiroLista token={token} />
        ) : null}

        {aba === "caixa" ? (
          <FinanceiroPainel
            resumo={resumo}
            previsao={previsao}
            comissaoRanking={comissaoRanking}
          />
        ) : null}

        {aba === "festas" ? (
          <section className="rounded-2xl neo-sm p-4 sm:p-6">
            <h2 className="font-display text-lg text-foreground">Festas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Em breve: festas do mês com split
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
