"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDiaEquipe, getMeuDia, pagarDiaComissoes } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DiaComissaoItem, DiaComissoes } from "@/types/financeiro";

interface ComissoesDoDiaProps {
  token: string;
  /** Visão da equipe (financeiro). Sem isso, mostra só o usuário logado. */
  equipe?: boolean;
  /** Dona, super admin e gerente confirmam o pagamento. */
  podeMarcar?: boolean;
}

export function ComissoesDoDia({
  token,
  equipe = false,
  podeMarcar = false,
}: ComissoesDoDiaProps) {
  const [data, setData] = useState<DiaComissoes | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function carregar() {
    const pedido = equipe ? getDiaEquipe(token) : getMeuDia(token);
    return pedido.then((dia) => {
      setData(dia);
      setSelected(new Set());
    });
  }

  useEffect(() => {
    setError(null);
    carregar().catch((err) =>
      setError(err instanceof Error ? err.message : "Falha ao carregar o dia")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega com token/equipe
  }, [token, equipe]);

  const pendentes = data?.itens.filter((item) => item.status === "PENDENTE") ?? [];

  function pagar() {
    if (!podeMarcar || selected.size === 0) return;
    setError(null);
    setMsg(null);
    startTransition(async () => {
      try {
        const result = await pagarDiaComissoes([...selected], token);
        await carregar();
        setMsg(
          result.count > 0
            ? `${result.count} lançamento(s) marcado(s) como pago(s).`
            : "Nada novo para marcar."
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao marcar como pago");
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {equipe ? "Equipe" : "Seu dia"}
          </p>
          <h2 className="mt-1 font-display text-lg capitalize text-foreground">
            {data?.label ?? "Hoje"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Comissões do dia e a diária de desmontagem. O que já foi pago fica
            confirmado aqui.
            {podeMarcar
              ? " Só a dona, o super admin e a gerente marcam como pago."
              : ""}
          </p>
        </div>
        {podeMarcar ? (
          <Button
            type="button"
            size="sm"
            disabled={pending || selected.size === 0}
            onClick={pagar}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Marcar como pagas
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl neo-inset p-3">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3" /> A receber hoje
          </p>
          <p className="mt-1 font-display text-lg tabular-nums text-balloon-sun">
            {formatCurrency(data?.totalPendente ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl neo-inset p-3">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="size-3" /> Já pago
          </p>
          <p className="mt-1 font-display text-lg tabular-nums text-balloon-mint">
            {formatCurrency(data?.totalPago ?? 0)}
          </p>
        </div>
      </div>

      {!data && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Carregando o dia…
        </p>
      ) : data && data.itens.length === 0 ? (
        <p className="rounded-2xl neo-inset px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma comissão nem diária de desmontagem hoje.
        </p>
      ) : (
        <ul className="space-y-2">
          {data?.itens.map((item) => (
            <DiaLinha
              key={`${item.beneficiarioId}-${item.tipo}-${item.festaId}-${item.id}`}
              item={item}
              equipe={equipe}
              podeMarcar={podeMarcar && item.status === "PENDENTE"}
              checked={selected.has(item.id)}
              onToggle={(checked) => {
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(item.id);
                  else next.delete(item.id);
                  return next;
                });
              }}
            />
          ))}
        </ul>
      )}

      {podeMarcar && pendentes.length > 0 && selected.size === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Marque os pendentes que já foram pagos para confirmar.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {msg ? <p className="text-xs text-balloon-mint">{msg}</p> : null}
    </section>
  );
}

function DiaLinha({
  item,
  equipe,
  podeMarcar,
  checked,
  onToggle,
}: {
  item: DiaComissaoItem;
  equipe: boolean;
  podeMarcar: boolean;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const paga = item.status === "PAGA";
  return (
    <li className="flex items-start gap-3 rounded-2xl neo-inset px-3 py-3">
      {podeMarcar ? (
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={`Marcar ${item.tipoLabel} como paga`}
        />
      ) : paga ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-balloon-mint" />
      ) : (
        <Clock className="mt-0.5 size-4 shrink-0 text-balloon-sun" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {item.tipoLabel}
          {equipe ? ` · ${item.beneficiarioNome}` : ""}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.festaTema}
          {item.clienteNome ? ` · ${item.clienteNome}` : ""}
          {item.prevista ? " · prevista para hoje" : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-display tabular-nums">{formatCurrency(item.valor)}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            paga
              ? "bg-balloon-mint/20 text-balloon-mint"
              : "bg-balloon-sun/20 text-balloon-sun"
          )}
        >
          {paga ? "Paga" : "A receber"}
        </span>
      </div>
    </li>
  );
}
