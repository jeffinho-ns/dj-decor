"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getEquipeDiarias,
  pagarEquipeDiarias,
  setFrequenciaPagamentoEquipe,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  EquipeDiariasPeriodo,
  FrequenciaPagamentoEquipe,
} from "@/types/financeiro";

const FREQUENCIAS: Array<{
  id: FrequenciaPagamentoEquipe;
  label: string;
  hint: string;
}> = [
  { id: "SEMANAL", label: "Semana", hint: "segunda a domingo" },
  { id: "QUINZENAL", label: "15 dias", hint: "1–15 e 16–fim do mês" },
  { id: "MENSAL", label: "Mês", hint: "mês civil" },
];

function formatDia(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

interface EquipeDiariasPagarProps {
  token: string;
}

export function EquipeDiariasPagar({ token }: EquipeDiariasPagarProps) {
  const [data, setData] = useState<EquipeDiariasPeriodo | null>(null);
  const [offset, setOffset] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  function load(nextOffset = offset) {
    return getEquipeDiarias(token, nextOffset).then(setData);
  }

  useEffect(() => {
    setError(null);
    load(offset).catch((err) =>
      setError(err instanceof Error ? err.message : "Falha ao carregar diárias")
    );
  }, [token, offset]);

  function mudarFrequencia(frequencia: FrequenciaPagamentoEquipe) {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      try {
        const next = await setFrequenciaPagamentoEquipe(token, frequencia);
        setOffset(0);
        setData(next);
        setMsg("Frequência de pagamento atualizada. Pode mudar de novo quando quiser.");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao salvar frequência"
        );
      }
    });
  }

  function pagar(pessoaId?: string) {
    setError(null);
    setMsg(null);
    setPayingId(pessoaId ?? "todas");
    startTransition(async () => {
      try {
        const next = await pagarEquipeDiarias(token, { pessoaId, offset });
        setData(next);
        setMsg(
          pessoaId
            ? "Diárias desta pessoa marcadas como pagas neste período."
            : "Diárias do período marcadas como pagas."
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao pagar");
      } finally {
        setPayingId(null);
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Pagamento da equipe</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Montadores e desmontadores — 1 diária por pessoa, tipo e dia.
            Quem monta e desmonta no mesmo dia recebe as duas.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending || !data || data.totalPendente <= 0}
          onClick={() => pagar()}
        >
          {pending && payingId === "todas" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          Pagar o período ({formatCurrency(data?.totalPendente ?? 0)})
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FREQUENCIAS.map((f) => {
          const active = data?.frequencia === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={pending}
              onClick={() => mudarFrequencia(f.id)}
              className={cn(
                "rounded-xl px-3 py-2 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-balloon-sky/30",
                active ? "neo-inset text-foreground" : "neo-sm text-muted-foreground"
              )}
            >
              <span className="block font-medium">{f.label}</span>
              <span className="text-[11px]">{f.hint}</span>
            </button>
          );
        })}
      </div>

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
        <p className="min-w-0 text-center text-sm font-medium">
          {data?.label ?? "Carregando…"}
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

      {data ? (
        <p className="text-xs text-muted-foreground">
          A pagar {formatCurrency(data.totalPendente)} · já pago{" "}
          {formatCurrency(data.totalPago)} neste período
        </p>
      ) : null}

      {!data && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Carregando diárias…
        </p>
      ) : data && data.pessoas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma montagem ou desmontagem neste período. A equipe precisa
          estar escolhida na venda (festas pagas ou fechadas).
        </p>
      ) : (
        <ul className="space-y-3">
          {data?.pessoas.map((pessoa) => (
            <li key={pessoa.id} className="rounded-2xl neo-inset p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{pessoa.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {pessoa.diasPendentes} dia(s) a pagar · {pessoa.diasPagos}{" "}
                    pago(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="tabular-nums text-sm font-medium">
                    {formatCurrency(pessoa.totalPendente)}
                  </p>
                  <Button
                    type="button"
                    size="xs"
                    disabled={pending || pessoa.totalPendente <= 0}
                    onClick={() => pagar(pessoa.id)}
                  >
                    {pending && payingId === pessoa.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    Pagar
                  </Button>
                </div>
              </div>
              <ul className="mt-2 space-y-1.5">
                {pessoa.dias.map((dia) => (
                  <li
                    key={`${dia.ymd}-${dia.tipo}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs"
                  >
                    <span className="text-foreground">
                      {formatDia(dia.ymd)} · {dia.tipoLabel} ·{" "}
                      {dia.carroProprio ? "carro próprio" : "carro da empresa"}
                      <span className="text-muted-foreground">
                        {" "}
                        — {dia.festas.map((f) => f.tema).join(", ")}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        dia.status === "PAGA"
                          ? "text-balloon-mint"
                          : "text-foreground"
                      )}
                    >
                      {formatCurrency(dia.valor)}
                      {dia.status === "PAGA" ? " · pago" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {msg ? <p className="text-xs text-balloon-mint">{msg}</p> : null}
    </section>
  );
}
