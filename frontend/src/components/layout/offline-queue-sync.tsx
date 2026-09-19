"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

import {
  checkinOs,
  concluirMontagemLocal,
  concluirRetorno,
  concluirRomaneio,
  finalizarOs,
  updateFestaChecklist,
  updateRomaneioItem,
} from "@/lib/api";
import {
  flushOfflineQueue,
  getOfflineQueueSize,
  OFFLINE_QUEUE_CHANGED,
  type OfflineQueueExecutor,
  type OsOfflineAction,
} from "@/lib/offline-queue";
import { cn } from "@/lib/utils";

interface OfflineQueueSyncProps {
  token: string;
  className?: string;
}

function buildExecutor(token: string): OfflineQueueExecutor {
  return {
    romaneioToggle: (osId, itemId, payload) =>
      updateRomaneioItem(osId, itemId, payload, token).then(() => undefined),
    festaChecklist: (festaId, itensExtrasConcluidos) =>
      updateFestaChecklist(festaId, itensExtrasConcluidos, token).then(
        () => undefined
      ),
    osAction: async (osId, action: OsOfflineAction, payload) => {
      switch (action) {
        case "concluir_romaneio":
          await concluirRomaneio(osId, token);
          break;
        case "checkin": {
          const lat = Number(payload?.lat);
          const lng = Number(payload?.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error("Check-in offline sem coordenadas");
          }
          await checkinOs(osId, { lat, lng }, token);
          break;
        }
        case "concluir_montagem":
          await concluirMontagemLocal(osId, token);
          break;
        case "concluir_retorno":
          await concluirRetorno(osId, token);
          break;
        case "finalizar":
          await finalizarOs(osId, token);
          break;
        default:
          throw new Error(`Ação offline desconhecida: ${action}`);
      }
    },
    generic: async () => {
      throw new Error("Ação genérica offline sem handler registrado");
    },
  };
}

export function OfflineQueueSync({ token, className }: OfflineQueueSyncProps) {
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const refreshCount = useCallback(() => {
    setPending(getOfflineQueueSize());
  }, []);

  const flush = useCallback(async () => {
    if (!navigator.onLine || getOfflineQueueSize() === 0) return;
    setFlushing(true);
    try {
      await flushOfflineQueue(buildExecutor(token));
    } finally {
      setFlushing(false);
      refreshCount();
    }
  }, [token, refreshCount]);

  useEffect(() => {
    refreshCount();
    void flush();

    const onOnline = () => {
      setOnline(true);
      void flush();
    };
    const onOffline = () => setOnline(false);
    const onQueueChanged = () => refreshCount();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(OFFLINE_QUEUE_CHANGED, onQueueChanged);

    const timer = window.setInterval(() => {
      if (navigator.onLine) void flush();
    }, 15000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED, onQueueChanged);
    };
  }, [flush, refreshCount]);

  if (pending === 0 && online) return null;

  const label =
    pending === 0
      ? "Sem conexão — alterações serão salvas offline"
      : pending === 1
        ? "1 ação pendente offline"
        : `${pending} ações pendentes offline`;

  return (
    <div
      className={cn(
        "neo-sun flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium",
        className
      )}
      role="status"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {flushing ? "Reenviando ações…" : label}
      </span>
      {pending > 0 && online ? (
        <button
          type="button"
          disabled={flushing}
          onClick={() => void flush()}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] neo-inset hover:text-foreground"
        >
          <RefreshCw className={cn("size-3", flushing && "animate-spin")} />
          Reenviar
        </button>
      ) : null}
    </div>
  );
}
