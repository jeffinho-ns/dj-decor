"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, PartyPopper } from "lucide-react";

import { listFestasFinanceiroMes } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { FestasFinanceiroMes as FestasMesData } from "@/types/financeiro";

const STATUS_LABEL: Record<string, string> = {
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
};

function formatPct(pct: number | null | undefined): string {
  if (pct == null) return "";
  return `${pct % 1 === 0 ? pct : pct.toFixed(1)}%`;
}

interface FestasFinanceiroMesProps {
  token: string;
  mes: string;
}

export function FestasFinanceiroMes({ token, mes }: FestasFinanceiroMesProps) {
  const [data, setData] = useState<FestasMesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setData(null);
    listFestasFinanceiroMes(token, mes)
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Não foi possível carregar as festas"
        )
      );
  }, [token, mes]);

  return (
    <section className="space-y-3 rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg">
            <PartyPopper className="size-4 text-balloon-lilac" />
            Festas
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pipeline fechado do mês — valor, equipe e split
          </p>
        </div>
      </div>

      {data ? (
        <div className="rounded-xl neo-inset px-3 py-2 text-sm">
          <span className="text-muted-foreground">{data.label} · </span>
          <span className="font-medium tabular-nums">
            {formatCurrency(data.totalValor)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            · {data.quantidade} festa(s)
          </span>
        </div>
      ) : null}

      {!data && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Carregando festas…
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data && data.itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma festa fechada neste mês.
        </p>
      ) : null}

      {data && data.itens.length > 0 ? (
        <ul className="space-y-3">
          {data.itens.map((festa) => {
            const splitParts: string[] = [];
            if (festa.split?.vendedor) {
              const pct = formatPct(festa.split.vendedor.percentual);
              splitParts.push(
                `Vend. ${pct ? `${pct} ` : ""}${formatCurrency(festa.split.vendedor.valor)}`
              );
            }
            if (festa.split?.suellemFora) {
              const pct = formatPct(festa.split.suellemFora.percentual);
              splitParts.push(
                `Suellem fora ${pct ? `${pct} ` : ""}${formatCurrency(festa.split.suellemFora.valor)}`
              );
            }
            if (festa.split?.debora) {
              splitParts.push(
                `Debora ${formatCurrency(festa.split.debora.valor)}`
              );
            }
            if (festa.split && festa.split.diarias.total > 0) {
              splitParts.push(
                `Diárias ${formatCurrency(festa.split.diarias.total)}`
              );
            }

            return (
              <li key={festa.id} className="rounded-2xl neo-inset p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/vendas?festa=${festa.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {festa.tema}
                      </Link>
                      {festa.foraParacambi ? (
                        <span className="rounded-md bg-balloon-sun/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-balloon-sun">
                          Fora Paracambi
                        </span>
                      ) : null}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {STATUS_LABEL[festa.status] ?? festa.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(festa.dataEvento).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {festa.clienteNome}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums text-sm font-semibold">
                    {formatCurrency(festa.valor)}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Link
                    href={`/financeiro/colaboradores/${festa.vendedor.id}`}
                    className="hover:text-foreground hover:underline"
                  >
                    Vend. {festa.vendedor.nome}
                  </Link>
                  {festa.montador ? (
                    <span>Mont. {festa.montador.nome}</span>
                  ) : (
                    <span className="opacity-60">Mont. —</span>
                  )}
                  {festa.desmontador ? (
                    <span>Desm. {festa.desmontador.nome}</span>
                  ) : (
                    <span className="opacity-60">Desm. —</span>
                  )}
                </div>

                {splitParts.length > 0 ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {splitParts.join(" · ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
