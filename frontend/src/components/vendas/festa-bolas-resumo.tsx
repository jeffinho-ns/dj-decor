"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Balloon, ExternalLink } from "lucide-react";

import { getMidiaAuthUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { PedidoBolasResumoFesta } from "@/types/bolas";

interface FestaBolasResumoProps {
  pedido: PedidoBolasResumoFesta;
  token?: string | null;
  /** Tema da festa (fallback se o pedido não tiver tema). */
  temaFesta?: string;
}

export function FestaBolasResumo({
  pedido,
  token,
  temaFesta,
}: FestaBolasResumoProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const midias = pedido.midias ?? [];

  useEffect(() => {
    if (!token || midias.length === 0) return;
    let cancelled = false;
    const objectUrls: string[] = [];
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        midias.map(async (m) => {
          try {
            const res = await fetch(getMidiaAuthUrl(m.id), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            next[m.id] = url;
          } catch {
            // ignore
          }
        })
      );
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [midias, token]);

  const tema = pedido.tema || temaFesta;

  return (
    <div className="space-y-3 rounded-2xl neo-inset p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-balloon-lilac">
            <Balloon className="size-3.5" />
            Bolas ornamentadas
          </p>
          {tema ? (
            <p className="mt-1 text-sm font-medium text-foreground">{tema}</p>
          ) : null}
          {pedido.cores ? (
            <p className="text-xs text-muted-foreground">Cores: {pedido.cores}</p>
          ) : null}
          {pedido.bolista?.nome ? (
            <p className="text-xs text-muted-foreground">
              Profissional: {pedido.bolista.nome}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(Number(pedido.valorCliente))}
          </p>
          <p className="text-[10px] text-muted-foreground">
            tabela {formatCurrency(Number(pedido.valorTabela))}
          </p>
        </div>
      </div>

      {pedido.itens && pedido.itens.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {pedido.itens.map((item) => (
            <li key={item.id}>
              {item.quantidade > 1 ? `${item.quantidade}× ` : ""}
              {item.nome}
            </li>
          ))}
        </ul>
      ) : null}

      {midias.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {midias.map((m) => (
            <div
              key={m.id}
              className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted/40"
            >
              {urls[m.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[m.id]}
                  alt="Referência de bolas"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                  …
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sem fotos de referência.</p>
      )}

      <Link
        href={`/bolas/${pedido.id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-balloon-lilac hover:underline"
      >
        Abrir pedido de bolas
        <ExternalLink className="size-3" />
      </Link>
    </div>
  );
}
