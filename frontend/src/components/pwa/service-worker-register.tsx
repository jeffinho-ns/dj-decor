"use client";

import { useEffect } from "react";

import { registrarServiceWorker } from "@/lib/pwa";

/**
 * Registra o service worker uma vez por carregamento.
 * Sem ele não existe push nem abertura offline.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // Em dev o Next troca os chunks o tempo todo; cache atrapalha mais que ajuda.
      void navigator.serviceWorker
        ?.getRegistrations()
        .then((registros) => registros.forEach((r) => void r.unregister()))
        .catch(() => undefined);
      return;
    }

    void registrarServiceWorker();
  }, []);

  return null;
}
