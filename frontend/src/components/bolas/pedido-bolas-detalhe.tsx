"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPedidoBolasCompra,
  getMidiaAuthUrl,
  marcarRepasseBolas,
  removePedidoBolasCompra,
  setPedidoBolasCompraComprado,
  updatePedidoBolas,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PedidoBolas } from "@/types/bolas";
import type { Role } from "@/types/auth";

interface PedidoBolasDetalheProps {
  pedido: PedidoBolas;
  token: string;
  role: Role;
}

export function PedidoBolasDetalhe({
  pedido: initial,
  token,
  role,
}: PedidoBolasDetalheProps) {
  const router = useRouter();
  const [pedido, setPedido] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [novaCompra, setNovaCompra] = useState("");
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const isGestao = role === "ADMIN" || role === "GERENTE";

  useEffect(() => {
    setPedido(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const midias = initial.midias ?? [];
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        midias.map(async (m) => {
          const res = await fetch(getMidiaAuthUrl(m.id), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          next[m.id] = url;
        })
      );
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [initial.midias, token]);

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updatePedidoBolas(pedido.id, payload, token);
      setPedido(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar");
    } finally {
      setBusy(false);
    }
  }

  async function repasse() {
    setBusy(true);
    setError(null);
    try {
      const updated = await marcarRepasseBolas(pedido.id, { pago: true }, token);
      setPedido(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no repasse");
    } finally {
      setBusy(false);
    }
  }

  async function addCompra() {
    const descricao = novaCompra.trim();
    if (!descricao) return;
    setBusy(true);
    try {
      const compra = await addPedidoBolasCompra(
        pedido.id,
        { descricao },
        token
      );
      setPedido((p) => ({
        ...p,
        compras: [...(p.compras ?? []), compra],
      }));
      setNovaCompra("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCompra(id: string, comprado: boolean) {
    try {
      const updated = await setPedidoBolasCompraComprado(id, comprado, token);
      setPedido((p) => ({
        ...p,
        compras: (p.compras ?? []).map((c) => (c.id === id ? updated : c)),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao marcar");
    }
  }

  async function removeCompra(id: string) {
    try {
      await removePedidoBolasCompra(id, token);
      setPedido((p) => ({
        ...p,
        compras: (p.compras ?? []).filter((c) => c.id !== id),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  const midias = pedido.midias ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-28">
      <div className="rounded-2xl border border-border/70 bg-card/40 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {pedido.festaId ? "Festa DJ Decor" : "Serviço externo"}
        </p>
        <h2 className="mt-1 font-display text-2xl text-foreground">
          {pedido.clienteNome}
        </h2>
        <p className="text-champagne">{pedido.tema}</p>
        <a
          href={`tel:${pedido.clienteTelefone}`}
          className="mt-2 inline-block min-h-11 text-sm text-foreground underline-offset-2 hover:underline"
        >
          {pedido.clienteTelefone}
        </a>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Data</dt>
            <dd className="font-medium">
              {format(parseISO(pedido.dataEvento), "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Montagem</dt>
            <dd className="font-medium">
              {format(parseISO(pedido.horarioMontagem), "HH:mm")}
            </dd>
          </div>
          {pedido.horarioDesmontagem ? (
            <div>
              <dt className="text-muted-foreground">Desmontagem</dt>
              <dd className="font-medium">
                {format(parseISO(pedido.horarioDesmontagem), "dd/MM HH:mm", {
                  locale: ptBR,
                })}
              </dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Endereço</dt>
            <dd className="font-medium">{pedido.endereco}</dd>
            <a
              className="mt-1 inline-flex min-h-11 items-center text-sm text-champagne hover:underline"
              href={`https://waze.com/ul?q=${encodeURIComponent(pedido.endereco)}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir no Waze
            </a>
          </div>
          {pedido.cores ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Cores / estilo</dt>
              <dd className="font-medium">{pedido.cores}</dd>
            </div>
          ) : null}
          {pedido.observacoes ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Observações</dt>
              <dd className="font-medium whitespace-pre-wrap">
                {pedido.observacoes}
              </dd>
            </div>
          ) : null}
        </dl>

        {midias.length > 0 ? (
          <div className="mt-5 border-t border-border/50 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
              Fotos de referência
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {midias.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                  onClick={() => setFullscreen(m.id)}
                >
                  {urls[m.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urls[m.id]}
                      alt={m.filename ?? "Referência"}
                      className="size-full object-cover"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 border-t border-border/50 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
            Itens
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {pedido.itens.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span>
                  {item.quantidade}× {item.nome}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(
                    Number(item.valorTabelaUnit) * item.quantidade
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            Seu total:{" "}
            <span className="font-medium tabular-nums">
              {formatCurrency(pedido.valorTabela)}
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/40 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
          Preciso comprar
        </p>
        <ul className="mt-3 space-y-2">
          {(pedido.compras ?? []).map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5"
            >
              <input
                type="checkbox"
                className="size-5 accent-champagne"
                checked={c.comprado}
                onChange={(e) => toggleCompra(c.id, e.target.checked)}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  c.comprado && "text-muted-foreground line-through"
                )}
              >
                {c.descricao}
                {c.quantidade ? ` (${c.quantidade})` : ""}
              </span>
              <button
                type="button"
                className="min-h-11 min-w-11 text-muted-foreground"
                onClick={() => removeCompra(c.id)}
                aria-label="Remover"
              >
                <X className="mx-auto size-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Input
            value={novaCompra}
            onChange={(e) => setNovaCompra(e.target.value)}
            placeholder="Ex.: 50 balões rosa chrome"
            className="min-h-11"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addCompra();
              }
            }}
          />
          <Button
            type="button"
            className="min-h-11 shrink-0"
            disabled={busy}
            onClick={() => void addCompra()}
          >
            Add
          </Button>
        </div>
      </div>

      {isGestao && pedido.statusRepasse === "PENDENTE" ? (
        <Button
          variant="outline"
          className="min-h-11 w-full"
          disabled={busy}
          onClick={() => void repasse()}
        >
          Marcar repasse pago
        </Button>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-[calc(var(--mobile-nav-h,4rem)+env(safe-area-inset-bottom,0px))] z-30 border-t border-border/60 bg-background/95 p-3 backdrop-blur md:static md:bottom-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row">
          {!pedido.montagemConcluida ? (
            <Button
              className="min-h-12 w-full text-base"
              disabled={busy}
              onClick={() =>
                void patch({ montagemConcluida: true, status: "MONTADO" })
              }
            >
              Montagem feita
            </Button>
          ) : !pedido.desmontagemConcluida ? (
            <Button
              className="min-h-12 w-full text-base"
              disabled={busy}
              onClick={() =>
                void patch({
                  desmontagemConcluida: true,
                  status: "CONCLUIDO",
                })
              }
            >
              Desmontagem feita
            </Button>
          ) : (
            <p className="w-full rounded-xl border border-status-done/30 bg-status-done/10 px-3 py-3 text-center text-sm text-status-done">
              Serviço concluído
            </p>
          )}
        </div>
      </div>

      {fullscreen && urls[fullscreen] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullscreen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[fullscreen]}
            alt="Referência"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
