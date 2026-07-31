"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFesta } from "@/lib/api";
import {
  calcularValorCatalogo,
  catalogoAddonsDisponiveis,
  precoItemCatalogo,
} from "@/lib/festa-itens";
import { formatCurrency } from "@/lib/format";
import { nomeDoKit } from "@/lib/catalogo-kits";
import { cn } from "@/lib/utils";
import type { Festa } from "@/types/festa";

interface FestaItensEditorProps {
  festa: Festa;
  token: string;
  onUpdated: (festa: Festa) => void;
  compact?: boolean;
}

export function FestaItensEditor({
  festa,
  token,
  onUpdated,
  compact = false,
}: FestaItensEditorProps) {
  const [itens, setItens] = useState<string[]>(() => [
    ...(festa.itensExtras ?? []),
  ]);
  const [valorManual, setValorManual] = useState(String(Number(festa.valor)));
  const [manualExtra, setManualExtra] = useState("");
  const [addonId, setAddonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const itensKey = (festa.itensExtras ?? []).join("\0");

  useEffect(() => {
    setItens([...(festa.itensExtras ?? [])]);
    setValorManual(String(Number(festa.valor)));
  }, [festa.id, festa.valor, itensKey, festa.itensExtras]);

  const valorSugerido = useMemo(
    () =>
      calcularValorCatalogo({
        kitCatalogo: festa.kitCatalogo,
        pegueEMonte: festa.pegueEMonte,
        itensExtras: itens,
      }),
    [festa.kitCatalogo, festa.pegueEMonte, itens]
  );

  const addons = catalogoAddonsDisponiveis();
  const addonsDisponiveis = addons.filter(
    (addon) =>
      !itens.some((item) => item.toLowerCase() === addon.nome.toLowerCase())
  );

  function syncFromFesta(next: Festa) {
    setItens([...(next.itensExtras ?? [])]);
    setValorManual(String(Number(next.valor)));
  }

  function addAddon() {
    const addon = addons.find((a) => a.id === addonId);
    if (!addon) return;
    setItens((prev) => [...prev, addon.nome]);
    setAddonId("");
    setSuccess(null);
  }

  function addManual() {
    const value = manualExtra.trim();
    if (!value) return;
    if (itens.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setManualExtra("");
      return;
    }
    setItens((prev) => [...prev, value]);
    setManualExtra("");
    setSuccess(null);
  }

  function removeItem(nome: string) {
    setItens((prev) => prev.filter((item) => item !== nome));
    setSuccess(null);
  }

  function salvar(opts: { usarValorCatalogo: boolean }) {
    setError(null);
    setSuccess(null);
    const valor = opts.usarValorCatalogo
      ? valorSugerido
      : Number(String(valorManual).replace(",", "."));

    if (!Number.isFinite(valor) || valor <= 0) {
      setError("Informe um valor válido maior que zero.");
      return;
    }

    startTransition(async () => {
      try {
        const updated = await updateFesta(
          festa.id,
          { itensExtras: itens, valor },
          token
        );
        syncFromFesta(updated);
        onUpdated(updated);
        setSuccess(
          opts.usarValorCatalogo
            ? "Itens salvos com valor do catálogo. Contrato regenerado."
            : "Itens e valor confirmados. Contrato regenerado."
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao salvar alterações"
        );
      }
    });
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-balloon-mint">
          Itens do pedido
        </p>
        {festa.kitCatalogo ? (
          <p className="text-[11px] text-muted-foreground">
            Kit: {nomeDoKit(festa.kitCatalogo)}
            {festa.pegueEMonte ? " · pegue e monte" : ""}
          </p>
        ) : null}
      </div>

      <ul className="space-y-1.5">
        {itens.length === 0 ? (
          <li className="rounded-xl neo-inset px-3 py-2 text-xs text-muted-foreground">
            Nenhum item listado.
          </li>
        ) : (
          itens.map((item) => {
            const preco = precoItemCatalogo(item);
            return (
              <li
                key={item}
                className="flex items-center justify-between gap-2 rounded-xl neo-inset px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {item}
                  {preco != null ? (
                    <span className="ml-2 text-xs tabular-nums text-balloon-sun">
                      {formatCurrency(preco)}
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  disabled={pending}
                  onClick={() => removeItem(item)}
                  aria-label={`Remover ${item}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })
        )}
      </ul>

      <div className="grid grid-cols-1 gap-2">
        <select
          className="flex h-10 w-full rounded-xl neo-inset px-3 text-sm outline-none"
          value={addonId}
          disabled={pending}
          onChange={(e) => setAddonId(e.target.value)}
        >
          <option value="">Adicionar do catálogo…</option>
          {addonsDisponiveis.map((addon) => (
            <option key={addon.id} value={addon.id}>
              {addon.nome} — {formatCurrency(addon.valor)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !addonId}
          onClick={addAddon}
          className="w-full gap-1"
        >
          <Plus className="size-3.5" />
          Add-on
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Input
          value={manualExtra}
          disabled={pending}
          placeholder="Item manual…"
          onChange={(e) => setManualExtra(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addManual();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !manualExtra.trim()}
          onClick={addManual}
          className="w-full"
        >
          Manual
        </Button>
      </div>

      <div className="space-y-2 rounded-xl neo-sm p-3">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Valor sugerido (catálogo)
            </p>
            <p className="font-display text-lg tabular-nums text-balloon-sun">
              {formatCurrency(valorSugerido)}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`valor-manual-${festa.id}`} className="text-xs">
              Valor confirmado
            </Label>
            <Input
              id={`valor-manual-${festa.id}`}
              className="h-9 w-full tabular-nums"
              value={valorManual}
              disabled={pending}
              onChange={(e) => setValorManual(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            className="h-auto min-h-9 w-full whitespace-normal px-3 py-2 text-left leading-snug"
            disabled={pending}
            onClick={() => salvar({ usarValorCatalogo: true })}
          >
            {pending ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : null}
            {compact ? "Salvar (catálogo)" : "Salvar com valor do catálogo"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-auto min-h-9 w-full whitespace-normal px-3 py-2 text-left leading-snug"
            disabled={pending}
            onClick={() => salvar({ usarValorCatalogo: false })}
          >
            {compact ? "Confirmar valor" : "Confirmar valor manual"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Os dois caminhos são independentes. Qualquer salvamento regenera o
          contrato PDF.
        </p>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {success ? <p className="text-xs text-balloon-mint">{success}</p> : null}
    </div>
  );
}
