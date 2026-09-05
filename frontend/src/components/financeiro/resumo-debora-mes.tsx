"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getResumoDeboraMes } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { ResumoDeboraMes } from "@/types/financeiro";

interface ResumoDeboraMesProps {
  token: string;
  mes: string;
}

export function ResumoDeboraMes({ token, mes }: ResumoDeboraMesProps) {
  const [data, setData] = useState<ResumoDeboraMes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getResumoDeboraMes(token, mes)
      .then((resumo) => {
        if (!cancelled) setData(resumo);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o resumo Debora"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, mes]);

  const nomes =
    data?.beneficiarias.map((b) => b.nome).filter(Boolean).join(", ") ||
    "Debora";

  return (
    <section className="rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-foreground">
            Resumo Debora
          </h2>
          <p className="text-xs text-muted-foreground">
            Repasse COMISSAO_DONA · {nomes}
            {data?.label ? ` · ${data.label}` : ""}
          </p>
        </div>
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric
            label="Pendente"
            value={formatCurrency(data?.pendente ?? 0)}
          />
          <Metric
            label="Liberado"
            value={formatCurrency(data?.liberado ?? 0)}
          />
          <Metric label="Pago" value={formatCurrency(data?.pago ?? 0)} />
          <Metric
            label="Total mês"
            value={formatCurrency(data?.total ?? 0)}
            emphasize
          />
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl neo-inset px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={
          emphasize
            ? "mt-0.5 font-display text-base tabular-nums text-foreground"
            : "mt-0.5 text-sm font-medium tabular-nums text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
