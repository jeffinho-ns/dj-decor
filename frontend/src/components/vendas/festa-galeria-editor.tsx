"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Loader2, X, ZoomIn } from "lucide-react";

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
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
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
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            next[m.id] = url;
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
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [festaId, token]);

  useEffect(() => {
    if (!previewId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewId]);

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

  const previewUrl = previewId ? urls[previewId] : null;

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
            <button
              key={item.id}
              type="button"
              onClick={() => urls[item.id] && setPreviewId(item.id)}
              className="group relative aspect-square overflow-hidden rounded-xl neo-inset"
              aria-label="Ampliar imagem"
            >
              {urls[item.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[item.id]}
                  alt={item.tipo}
                  className="size-full object-cover transition-transform group-active:scale-[0.98]"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                  …
                </div>
              )}
              {urls[item.id] ? (
                <span className="absolute bottom-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-[#2a3142]/55 text-white backdrop-blur-sm">
                  <ZoomIn className="size-3.5" />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {mounted && previewUrl
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-[#1a1f2c]/85 backdrop-blur-sm"
                aria-label="Fechar imagem"
                onClick={() => setPreviewId(null)}
              />
              <div className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col items-center">
                <button
                  type="button"
                  onClick={() => setPreviewId(null)}
                  className="mb-3 flex size-11 items-center justify-center self-end rounded-2xl neo-sm text-foreground"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Imagem ampliada"
                  className="max-h-[min(80dvh,720px)] w-full rounded-2xl object-contain neo"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
