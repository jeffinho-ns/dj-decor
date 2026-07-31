"use client";

import { useEffect, useState, useTransition } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import {
  getMidiaAuthUrl,
  listMidiasFesta,
  uploadMidia,
} from "@/lib/api";
import type { Midia } from "@/types/midia";

interface FestaGaleriaEditorProps {
  festaId: string;
  token: string;
}

export function FestaGaleriaEditor({ festaId, token }: FestaGaleriaEditorProps) {
  const [items, setItems] = useState<Midia[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listMidiasFesta(festaId, token, [
      "REFERENCIA_FESTA",
      "CLIENTE_REFERENCIA",
      "MONTAGEM_FINAL",
    ])
      .then(async (list) => {
        if (cancelled) return;
        setItems(list);
        const next: Record<string, string> = {};
        await Promise.all(
          list.map(async (m) => {
            const res = await fetch(getMidiaAuthUrl(m.id), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const blob = await res.blob();
            next[m.id] = URL.createObjectURL(blob);
          })
        );
        if (!cancelled) setUrls(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Falha ao carregar imagens"
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [festaId, token]);

  function onUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const midia = await uploadMidia(
          { file, tipo: "REFERENCIA_FESTA", festaId },
          token
        );
        const res = await fetch(getMidiaAuthUrl(midia.id), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setItems((prev) => [midia, ...prev]);
        setUrls((prev) => ({ ...prev, [midia.id]: url }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha no upload");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-balloon-sky">
          Imagens da decoração
        </p>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl neo-inset px-2.5 py-1.5 text-xs font-medium">
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ImagePlus className="size-3" />
          )}
          Adicionar
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={pending}
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </label>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl neo-inset px-3 py-2 text-xs text-muted-foreground">
          Nenhuma imagem ainda. Adicione referências para o contrato e o portal.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="aspect-square overflow-hidden rounded-xl neo-inset"
            >
              {urls[item.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[item.id]}
                  alt={item.tipo}
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
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
