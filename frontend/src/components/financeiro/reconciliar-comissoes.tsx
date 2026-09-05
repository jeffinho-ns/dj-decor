"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { reconciliarComissoes } from "@/lib/api";

interface ReconciliarComissoesProps {
  token: string;
}

export function ReconciliarComissoes({ token }: ReconciliarComissoesProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    processadas: number;
    geradas: number;
  } | null>(null);

  async function handleClick() {
    const ok = window.confirm(
      "Recalcular comissões e diárias de todas as festas FECHADO+? Isso regenera os splits existentes."
    );
    if (!ok) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await reconciliarComissoes(token);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível recalcular as comissões"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl neo-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg text-foreground">
            Recalcular comissões e diárias
          </h2>
          <p className="text-xs text-muted-foreground">
            Regenera splits das festas FECHADO+ após deploy ou ajuste de regras.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void handleClick()}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {loading ? "Recalculando…" : "Recalcular"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : null}

      {result ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Processadas: {result.processadas} · Geradas: {result.geradas}
        </p>
      ) : null}
    </section>
  );
}
