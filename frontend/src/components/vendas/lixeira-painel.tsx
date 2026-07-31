"use client";

import { useEffect, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteFesta, listFestas, updateFestaStatus } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { nomeDoKit } from "@/lib/catalogo-kits";
import type { Festa } from "@/types/festa";

interface LixeiraPainelProps {
  token: string;
  canDelete?: boolean;
}

export function LixeiraPainel({
  token,
  canDelete = true,
}: LixeiraPainelProps) {
  const [items, setItems] = useState<Festa[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reload() {
    return listFestas(token, { lixeira: true }).then(setItems);
  }

  useEffect(() => {
    reload().catch((err) =>
      setError(err instanceof Error ? err.message : "Falha ao carregar lixeira")
    );
  }, [token]);

  function restaurar(festa: Festa) {
    setError(null);
    setBusyId(festa.id);
    startTransition(async () => {
      try {
        await updateFestaStatus(festa.id, "ORCAMENTO", token);
        setItems((prev) => prev.filter((f) => f.id !== festa.id));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao restaurar festa"
        );
      } finally {
        setBusyId(null);
      }
    });
  }

  function excluirDefinitivo(festa: Festa) {
    const ok = window.confirm(
      `Excluir definitivamente a festa de ${festa.cliente.nome} (${festa.tema})? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;

    setError(null);
    setBusyId(festa.id);
    startTransition(async () => {
      try {
        await deleteFesta(festa.id, token);
        setItems((prev) => prev.filter((f) => f.id !== festa.id));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao excluir festa"
        );
      } finally {
        setBusyId(null);
      }
    });
  }

  if (error && items.length === 0) {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl neo-inset px-4 py-10 text-center text-sm text-muted-foreground">
        Lixeira vazia. Festas canceladas aparecem aqui.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {items.length} festa{items.length === 1 ? "" : "s"} cancelada
        {items.length === 1 ? "" : "s"}. Restaure para voltar às vendas ou
        exclua definitivamente.
      </p>

      {items.map((festa) => {
        const busy = pending && busyId === festa.id;
        return (
          <article
            key={festa.id}
            className="flex flex-col gap-3 rounded-2xl neo-sm p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">
                  {festa.cliente.nome}
                </p>
                <span className="rounded-lg bg-destructive/12 px-2 py-0.5 text-[11px] font-medium text-destructive">
                  Cancelado
                </span>
              </div>
              <p className="text-sm text-balloon-pink">{festa.tema}</p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(festa.dataEvento), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
                {" · "}
                {formatCurrency(festa.valor)}
                {festa.kitCatalogo || festa.pegueEMonte
                  ? ` · ${nomeDoKit(festa.kitCatalogo) ?? "Personalizado"}`
                  : ""}
                {festa.vendedor?.nome ? ` · ${festa.vendedor.nome}` : ""}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {festa.endereco}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full gap-1.5 sm:w-auto"
                disabled={busy}
                onClick={() => restaurar(festa)}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Restaurar
              </Button>
              {canDelete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="w-full gap-1.5 sm:w-auto"
                  disabled={busy}
                  onClick={() => excluirDefinitivo(festa)}
                >
                  <Trash2 className="size-3.5" />
                  Excluir
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
