"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Trash2, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateFestaChecklist, updateRomaneioItem } from "@/lib/api";
import {
  clearOfflineQueue,
  flushOfflineQueue,
  getOfflineQueue,
  getOfflineQueueSize,
  OFFLINE_QUEUE_CHANGED,
  type OfflineQueueExecutor,
} from "@/lib/offline-queue";

interface OfflineStatusPanelProps {
  token: string;
}

function buildExecutor(token: string): OfflineQueueExecutor {
  return {
    romaneioToggle: (osId, itemId, payload) =>
      updateRomaneioItem(osId, itemId, payload, token).then(() => undefined),
    festaChecklist: (festaId, itensExtrasConcluidos) =>
      updateFestaChecklist(festaId, itensExtrasConcluidos, token).then(
        () => undefined
      ),
    generic: async () => {
      throw new Error("Ação genérica offline sem handler registrado");
    },
  };
}

export function OfflineStatusPanel({ token }: OfflineStatusPanelProps) {
  const [pending, setPending] = useState(0);
  const [labels, setLabels] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    setPending(getOfflineQueueSize());
    setLabels(
      getOfflineQueue().map((e) => {
        if (e.type === "romaneio_toggle") return "Item de romaneio";
        if (e.type === "festa_checklist") return "Checklist de festa";
        return e.label ?? e.actionKey;
      })
    );
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(OFFLINE_QUEUE_CHANGED, onChange);
    return () => window.removeEventListener(OFFLINE_QUEUE_CHANGED, onChange);
  }, [refresh]);

  return (
    <section className="rounded-2xl p-5 sm:p-6 neo-sm">
      <div className="flex items-center gap-2">
        <WifiOff className="size-5 text-balloon-sun" />
        <h2 className="font-display text-xl text-foreground">
          Fila offline
        </h2>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Ações salvas sem internet (montagem / checklist) aguardando envio.
      </p>

      <p className="mt-4 text-sm text-foreground">
        {pending === 0
          ? "Nenhuma ação pendente."
          : pending === 1
            ? "1 ação pendente."
            : `${pending} ações pendentes.`}
      </p>

      {labels.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {labels.slice(0, 5).map((label, i) => (
            <li key={`${label}-${i}`}>· {label}</li>
          ))}
          {labels.length > 5 ? (
            <li>· +{labels.length - 5} outras</li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending === 0 || isPending}
          onClick={() => {
            setMsg(null);
            startTransition(async () => {
              const result = await flushOfflineQueue(buildExecutor(token));
              refresh();
              setMsg(
                result.flushed > 0
                  ? `${result.flushed} enviada(s). ${result.remaining} restante(s).`
                  : result.remaining > 0
                    ? "Não foi possível enviar agora. Tente com internet estável."
                    : "Fila vazia."
              );
            });
          }}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Sincronizar agora"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending === 0 || isPending}
          onClick={() => {
            clearOfflineQueue();
            refresh();
            setMsg("Fila limpa neste dispositivo.");
          }}
        >
          <Trash2 data-icon="inline-start" />
          Limpar fila
        </Button>
      </div>
      {msg ? <p className="mt-2 text-xs text-balloon-mint">{msg}</p> : null}
    </section>
  );
}
