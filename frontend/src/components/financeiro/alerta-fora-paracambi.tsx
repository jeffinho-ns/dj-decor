"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listAlertasForaParacambi, updateFesta } from "@/lib/api";
import type { AlertasForaParacambi } from "@/types/financeiro";

interface AlertaForaParacambiProps {
  token: string;
  mes: string;
}

function formatDataEvento(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export function AlertaForaParacambi({ token, mes }: AlertaForaParacambiProps) {
  const [data, setData] = useState<AlertasForaParacambi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reload() {
    return listAlertasForaParacambi(token, mes).then(setData);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reload()
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar os alertas"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on token/mes
  }, [token, mes]);

  function marcarFora(festaId: string) {
    setMarkingId(festaId);
    setError(null);
    startTransition(() => {
      void updateFesta(festaId, { foraParacambi: true }, token)
        .then(() => reload())
        .catch((err) =>
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível marcar fora de Paracambi"
          )
        )
        .finally(() => setMarkingId(null));
    });
  }

  const itens = data?.itens ?? [];
  const vazio = !loading && !error && itens.length === 0;

  return (
    <section className="rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-foreground">
            Fora de Paracambi?
          </h2>
          <p className="text-xs text-muted-foreground">
            Endereço sem &quot;Paracambi&quot; e checkbox ainda desmarcado
            {data?.label ? ` · ${data.label}` : ""}
          </p>
        </div>
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : itens.length > 0 ? (
          <span className="rounded-lg neo-inset px-2 py-1 text-xs font-medium tabular-nums text-foreground">
            {itens.length}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : null}

      {vazio ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma festa suspeita neste mês.
        </p>
      ) : null}

      {itens.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {itens.map((item) => {
            const busy = pending && markingId === item.id;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-xl neo-inset px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.tema}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {item.clienteNome}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDataEvento(item.dataEvento)} · {item.endereco}
                  </p>
                  <Link
                    href={`/vendas?festa=${item.id}`}
                    className="mt-1 inline-block text-xs text-foreground underline-offset-2 hover:underline"
                  >
                    Abrir festa
                  </Link>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  disabled={busy}
                  onClick={() => marcarFora(item.id)}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Marcar fora
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
