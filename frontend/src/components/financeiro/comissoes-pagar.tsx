"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listComissoesPendentes, marcarComissoesPagas } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface ComissaoPendente {
  id: string;
  valor: number | string;
  percentual: number | string | null;
  tipoLabel?: string;
  tipo?: string;
  vendedor?: { nome: string };
  beneficiario?: { nome: string };
  festa: {
    tema: string;
    dataEvento?: string;
    cliente: { nome: string };
  };
}

interface ComissoesPagarProps {
  token: string;
}

export function ComissoesPagar({ token }: ComissoesPagarProps) {
  const [items, setItems] = useState<ComissaoPendente[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function reload() {
    return listComissoesPendentes(token).then((data) =>
      setItems(data as ComissaoPendente[])
    );
  }

  useEffect(() => {
    reload().catch(() => setMsg("Não foi possível carregar comissões"));
  }, [token]);

  const total = items
    .filter((i) => selected.has(i.id))
    .reduce((acc, i) => acc + Number(i.valor), 0);

  return (
    <section className="space-y-3 rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg">Repasses a pagar</h2>
          <p className="text-xs text-muted-foreground">
            Só aparecem itens do mês do evento (ou diárias já elegíveis).
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending || selected.size === 0}
          onClick={() => {
            startTransition(async () => {
              await marcarComissoesPagas([...selected], token);
              setSelected(new Set());
              await reload();
              setMsg("Repasses marcados como pagos.");
            });
          }}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Pagar selecionados ({formatCurrency(total)})
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum repasse liberado no momento.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const nome =
              item.beneficiario?.nome ?? item.vendedor?.nome ?? "Beneficiário";
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl neo-inset px-3 py-2"
              >
                <input
                  type="checkbox"
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
                  <p className="text-sm font-medium">
                    {nome} · {formatCurrency(item.valor)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.tipoLabel ?? item.tipo ?? "Repasse"}
                    {" · "}
                    {item.festa.cliente.nome} — {item.festa.tema}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {msg ? <p className="text-xs text-balloon-mint">{msg}</p> : null}
    </section>
  );
}
