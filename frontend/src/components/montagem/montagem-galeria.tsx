"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Download, Loader2, Trash2, Upload, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deleteMontagemGaleriaItem,
  getMontagemGaleriaSignedUrl,
  listMontagemGaleria,
  uploadMontagemGaleria,
} from "@/lib/api";
import { getMidiaAuthUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { OrdemServico } from "@/types/os";
import type { MontagemGaleriaItem } from "@/types/os";

const MAX_FOTOS = 6;
const MAX_VIDEOS = 2;

interface MontagemGaleriaProps {
  os: OrdemServico;
  token: string;
  canEdit: boolean;
  onOsUpdate: (os: OrdemServico) => void;
  onError: (message: string | null) => void;
}

function isVideo(item: MontagemGaleriaItem): boolean {
  return (
    item.tipo === "MONTAGEM_VIDEO" || item.mimeType.startsWith("video/")
  );
}

export function MontagemGaleria({
  os,
  token,
  canEdit,
  onOsUpdate,
  onError,
}: MontagemGaleriaProps) {
  const [itens, setItens] = useState<MontagemGaleriaItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const fotos = itens.filter((i) => !isVideo(i)).length;
  const videos = itens.filter((i) => isVideo(i)).length;
  const podeAddFoto = fotos < MAX_FOTOS;
  const podeAddVideo = videos < MAX_VIDEOS;

  const loadUrls = useCallback(
    async (list: MontagemGaleriaItem[]) => {
      const next: Record<string, string> = {};
      await Promise.all(
        list.map(async (item) => {
          try {
            if (item.storagePath) {
              const signed = await getMontagemGaleriaSignedUrl(
                os.id,
                item.id,
                token
              );
              if (signed.url) next[item.id] = signed.url;
            } else {
              const res = await fetch(getMidiaAuthUrl(item.id), {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const blob = await res.blob();
                next[item.id] = URL.createObjectURL(blob);
              }
            }
          } catch {
            /* ignore preview fail */
          }
        })
      );
      setUrls(next);
    },
    [os.id, token]
  );

  const reload = useCallback(() => {
    setLoading(true);
    listMontagemGaleria(os.id, token)
      .then(async (list) => {
        setItens(list);
        await loadUrls(list);
      })
      .catch((err) =>
        onError(
          err instanceof Error ? err.message : "Não foi possível carregar a galeria"
        )
      )
      .finally(() => setLoading(false));
  }, [os.id, token, loadUrls, onError]);

  useEffect(() => {
    reload();
  }, [reload]);

  function uploadFiles(files: FileList | null) {
    if (!files?.length || !canEdit) return;
    onError(null);
    const queue = Array.from(files);
    startTransition(async () => {
      try {
        let lastOs = os;
        for (const file of queue) {
          const isVid = file.type.startsWith("video/");
          if (isVid && videos >= MAX_VIDEOS) {
            onError(`Limite de ${MAX_VIDEOS} vídeos`);
            break;
          }
          if (!isVid && fotos >= MAX_FOTOS) {
            onError(`Limite de ${MAX_FOTOS} fotos`);
            break;
          }
          const res = await uploadMontagemGaleria(os.id, file, token);
          lastOs = res.os;
        }
        onOsUpdate(lastOs);
        reload();
      } catch (err) {
        onError(
          err instanceof Error ? err.message : "Falha no upload da galeria"
        );
      }
    });
  }

  function removeItem(id: string) {
    if (!canEdit) return;
    onError(null);
    startTransition(async () => {
      try {
        const res = await deleteMontagemGaleriaItem(os.id, id, token);
        onOsUpdate(res.os);
        reload();
      } catch (err) {
        onError(
          err instanceof Error ? err.message : "Não foi possível remover"
        );
      }
    });
  }

  async function downloadItem(item: MontagemGaleriaItem) {
    try {
      let href: string | undefined = urls[item.id];
      if (!href && item.storagePath) {
        const signed = await getMontagemGaleriaSignedUrl(os.id, item.id, token);
        href = signed.url ?? undefined;
      }
      if (!href) {
        href = getMidiaAuthUrl(item.id);
      }
      const a = document.createElement("a");
      a.href = href;
      a.download = item.filename || item.id;
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Não foi possível baixar"
      );
    }
  }

  async function downloadAll() {
    for (const item of itens) {
      await downloadItem(item);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">
        Até {MAX_FOTOS} fotos e {MAX_VIDEOS} vídeos para Instagram (Firebase).{" "}
        <span className="tabular-nums">
          {fotos}/{MAX_FOTOS} fotos · {videos}/{MAX_VIDEOS} vídeos
        </span>
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-xl neo-inset px-3 py-4 text-center text-sm text-muted-foreground">
          Nenhuma foto ou vídeo ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {itens.map((item) => {
            const src = urls[item.id];
            const video = isVideo(item);
            return (
              <li
                key={item.id}
                className="relative overflow-hidden rounded-xl neo-inset"
              >
                {src ? (
                  video ? (
                    <video
                      src={src}
                      className="aspect-square w-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={item.filename ?? "Montagem"}
                      className="aspect-square w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted/30">
                    {video ? (
                      <Video className="size-8 text-muted-foreground" />
                    ) : (
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/45 p-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 flex-1 text-xs"
                    onClick={() => void downloadItem(item)}
                  >
                    <Download className="size-3.5" />
                    Baixar
                  </Button>
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 px-2"
                      disabled={pending}
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {itens.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void downloadAll()}
          >
            <Download className="size-3.5" />
            Baixar tudo
          </Button>
        ) : null}

        {canEdit ? (
          <>
            {/* Sem capture= — no mobile abre o seletor (Galeria / Câmera / Arquivos). */}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
              multiple
              className="sr-only"
              disabled={pending || (!podeAddFoto && !podeAddVideo)}
              onChange={(e) => {
                uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={pending || (!podeAddFoto && !podeAddVideo)}
              className={cn(!os.montagemLocalConcluida && "opacity-60")}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Adicionar foto / vídeo
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
