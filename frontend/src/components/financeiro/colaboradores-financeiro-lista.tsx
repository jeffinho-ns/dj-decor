"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Users } from "lucide-react";

import { listColaboradoresFinanceiro } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { roleLabel } from "@/lib/auth";
import type { Role } from "@/types/auth";
import type { ColaboradorFinanceiroResumo } from "@/types/financeiro";

interface ColaboradoresFinanceiroListaProps {
  token: string;
}

export function ColaboradoresFinanceiroLista({
  token,
}: ColaboradoresFinanceiroListaProps) {
  const [itens, setItens] = useState<ColaboradorFinanceiroResumo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listColaboradoresFinanceiro(token)
      .then(setItens)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Falha ao carregar colaboradores"
        )
      );
  }, [token]);

  return (
    <section className="space-y-3 rounded-2xl neo-sm p-4">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg">
          <Users className="size-4 text-balloon-lilac" />
          Colaboradores
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Venda, montagem, desmontagem e comissão fora — no mês do evento.
          Liberado após o dia da festa.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!error && itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {itens.map((c) => (
            <li key={c.id}>
              <Link
                href={`/financeiro/colaboradores/${c.id}`}
                className="flex flex-col gap-2 py-3 transition-opacity hover:opacity-90 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(c.role as Role, c.nome)}
                    {c.ehSocia ? " · sócia" : ""}
                    {c.ehDona ? " · dona" : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Venda {formatCurrency(c.totalComissaoVenda)}
                    {" · "}
                    Mont. {formatCurrency(c.totalDiariaMontagem)}
                    {" · "}
                    Desm. {formatCurrency(c.totalDiariaDesmontagem)}
                    {c.totalComissaoFora > 0
                      ? ` · Fora ${formatCurrency(c.totalComissaoFora)}`
                      : ""}
                    {c.totalDivisao > 0
                      ? ` · Debora ${formatCurrency(c.totalDivisao)}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      A receber liberado
                    </p>
                    <p className="tabular-nums text-sm font-semibold text-balloon-sun">
                      {formatCurrency(c.totalLiberado)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Pendente {formatCurrency(c.totalPendente)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
