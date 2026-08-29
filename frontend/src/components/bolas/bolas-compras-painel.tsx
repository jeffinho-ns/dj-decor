"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPedidoBolasCompra,
  setPedidoBolasCompraComprado,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BolasComprasPedido } from "@/types/bolas";

interface BolasComprasPainelProps {
  lista: BolasComprasPedido[];
  token: string;
}

export function BolasComprasPainel({
  lista: initial,
  token,
}: BolasComprasPainelProps) {
  const router = useRouter();
  const [lista, setLista] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function addItem(pedidoId: string) {
    const descricao = (drafts[pedidoId] ?? "").trim();
    if (!descricao) return;
    setBusy(pedidoId);
    try {
      const compra = await addPedidoBolasCompra(
        pedidoId,
        { descricao },
        token
      );
      setLista((prev) =>
        prev.map((p) =>
          p.id === pedidoId
            ? {
                ...p,
                compras: [...p.compras, compra],
                pendentes: p.pendentes + 1,
              }
            : p
        )
      );
      setDrafts((d) => ({ ...d, [pedidoId]: "" }));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggle(pedidoId: string, compraId: string, comprado: boolean) {
    const updated = await setPedidoBolasCompraComprado(
      compraId,
      comprado,
      token
    );
    setLista((prev) =>
      prev.map((p) => {
        if (p.id !== pedidoId) return p;
        const compras = p.compras.map((c) =>
          c.id === compraId ? updated : c
        );
        return {
          ...p,
          compras,
          pendentes: compras.filter((c) => !c.comprado).length,
        };
      })
    );
  }

  if (lista.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        Nenhum serviço nos próximos 14 dias.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Risque no mercado. Toque no serviço para ver detalhes e fotos.
      </p>
      {lista.map((pedido) => (
        <article
          key={pedido.id}
          className="rounded-2xl border border-border/60 bg-card/40 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/bolas/${pedido.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {pedido.clienteNome}
              </Link>
              <p className="text-sm text-champagne">{pedido.tema}</p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(pedido.dataEvento), "EEE dd/MM", {
                  locale: ptBR,
                })}
                {pedido.cores ? ` · ${pedido.cores}` : ""}
              </p>
              {pedido.itens.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Kit: {pedido.itens.join(", ")}
                </p>
              ) : null}
            </div>
            {pedido.pendentes > 0 ? (
              <span className="shrink-0 rounded-md bg-champagne/15 px-2 py-1 text-[11px] text-champagne">
                {pedido.pendentes} pend.
              </span>
            ) : null}
          </div>

          <ul className="mt-3 space-y-2">
            {pedido.compras.map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-champagne"
                  checked={c.comprado}
                  onChange={(e) =>
                    void toggle(pedido.id, c.id, e.target.checked)
                  }
                />
                <span
                  className={cn(
                    c.comprado && "text-muted-foreground line-through"
                  )}
                >
                  {c.descricao}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex gap-2">
            <Input
              className="min-h-11"
              placeholder="Ex.: 50 rosa chrome"
              value={drafts[pedido.id] ?? ""}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [pedido.id]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addItem(pedido.id);
                }
              }}
            />
            <Button
              type="button"
              className="min-h-11 shrink-0"
              disabled={busy === pedido.id}
              onClick={() => void addItem(pedido.id)}
            >
              Add
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
