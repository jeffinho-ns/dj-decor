"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listAPagar, marcarComissoesPagas } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { APagarFila, APagarItem } from "@/types/financeiro";

function isDiariaTipo(tipo: string): boolean {
  return tipo === "DIARIA_MONTAGEM" || tipo === "DIARIA_DESMONTAGEM";
}

interface GrupoBeneficiario {
  beneficiarioId: string;
  beneficiarioNome: string;
  total: number;
  itens: APagarItem[];
}

interface FilaAPagarProps {
  token: string;
  /** Filtro YYYY-MM (vindo do shell financeiro). */
  mes?: string;
}

export function FilaAPagar({ token, mes }: FilaAPagarProps) {
  const [data, setData] = useState<APagarFila | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function reload() {
    return listAPagar(token, mes || undefined).then((fila) => {
      setData(fila);
      setSelected(new Set());
    });
  }

  useEffect(() => {
    setError(null);
    reload().catch((err) =>
      setError(
        err instanceof Error ? err.message : "Não foi possível carregar a fila"
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on token/mes
  }, [token, mes]);

  const grupos = useMemo((): GrupoBeneficiario[] => {
    if (!data) return [];
    const map = new Map<string, GrupoBeneficiario>();
    for (const item of data.itens) {
      const key = item.beneficiarioId || item.beneficiarioNome;
      const g = map.get(key) ?? {
        beneficiarioId: item.beneficiarioId,
        beneficiarioNome: item.beneficiarioNome,
        total: 0,
        itens: [],
      };
      g.total += item.valor;
      g.itens.push(item);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) =>
      a.beneficiarioNome.localeCompare(b.beneficiarioNome, "pt-BR")
    );
  }, [data]);

  const totalSelecionado = useMemo(() => {
    if (!data) return 0;
    return data.itens
      .filter((i) => selected.has(i.id))
      .reduce((acc, i) => acc + i.valor, 0);
  }, [data, selected]);

  function toggleAll(checked: boolean) {
    if (!data) return;
    setSelected(checked ? new Set(data.itens.map((i) => i.id)) : new Set());
  }

  function pagarSelecionados() {
    if (selected.size === 0) return;
    setError(null);
    setMsg(null);
    startTransition(async () => {
      try {
        const ids = [...selected];
        // Comissões % e diárias já persistidas: mesmo endpoint por id.
        await marcarComissoesPagas(ids, token);
        await reload();
        setMsg(`${ids.length} lançamento(s) marcado(s) como pago(s).`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao pagar");
      }
    });
  }

  const allSelected =
    !!data && data.itens.length > 0 && selected.size === data.itens.length;

  return (
    <section className="space-y-3 rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Fila a pagar</h2>
          <p className="text-xs text-muted-foreground">
            Liberado agora — comissões e diárias de festas que já aconteceram
            {mes ? " neste mês" : ""}.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending || selected.size === 0}
          onClick={pagarSelecionados}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Pagar selecionados ({formatCurrency(totalSelecionado)})
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl neo-inset px-3 py-2 text-sm">
        <p>
          <span className="text-muted-foreground">{data?.label ?? "…"} · </span>
          <span className="font-medium tabular-nums">
            {formatCurrency(data?.total ?? 0)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            · {data?.itens.length ?? 0} lançamento(s)
          </span>
        </p>
        {data && data.itens.length > 0 ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            Selecionar todos
          </label>
        ) : null}
      </div>

      {!data && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Carregando fila…
        </p>
      ) : grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nada liberado para pagar
          {mes ? " neste mês" : " no momento"}.
        </p>
      ) : (
        <ul className="space-y-3">
          {grupos.map((grupo) => (
            <li key={grupo.beneficiarioId} className="rounded-2xl neo-inset p-3">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/financeiro/colaboradores/${grupo.beneficiarioId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {grupo.beneficiarioNome}
                </Link>
                <p className="tabular-nums text-sm font-medium">
                  {formatCurrency(grupo.total)}
                </p>
              </div>
              <ul className="space-y-1.5">
                {grupo.itens.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 rounded-xl px-1 py-1"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(item.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {item.tipoLabel}
                        <span className="text-muted-foreground">
                          {" "}
                          · {item.festaTema}
                        </span>
                        {isDiariaTipo(item.tipo) ? (
                          <span className="text-muted-foreground"> · diária</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.dataEvento).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </p>
                    </div>
                    <p className="tabular-nums text-sm font-medium">
                      {formatCurrency(item.valor)}
                    </p>
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
