"use client";

import { useCallback, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { updateFestaChecklist, updateRomaneioItem } from "@/lib/api";
import {
  flushOfflineQueue,
  getOfflineQueueSize,
  OFFLINE_QUEUE_CHANGED,
  type OfflineQueueExecutor,
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
    generic: async () => {
      throw new Error("Ação genérica offline sem handler registrado");
    },
  };
}

export function OfflineQueueSync({ token, className }: OfflineQueueSyncProps) {
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);

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

    const onOnline = () => void flush();
    const onQueueChanged = () => refreshCount();

    window.addEventListener("online", onOnline);
    window.addEventListener(OFFLINE_QUEUE_CHANGED, onQueueChanged);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED, onQueueChanged);
    };
  }, [flush, refreshCount]);

  if (pending === 0) return null;

  const label =
    pending === 1
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
      <span>{flushing ? "Reenviando ações…" : label}</span>
    </div>
  );
}
