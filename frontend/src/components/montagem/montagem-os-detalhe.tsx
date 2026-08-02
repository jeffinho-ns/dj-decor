"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Circle,
  Hammer,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  PackageCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  checkinOs,
  concluirMontagemLocal,
  concluirRomaneio,
  finalizarOs,
  seedRomaneio,
  updateRomaneioItem,
  uploadFotoFinalOs,
  uploadItemFotoRomaneio,
} from "@/lib/api";
import { OfflineQueueSync } from "@/components/layout/offline-queue-sync";
import { enqueueRomaneioToggle } from "@/lib/offline-queue";
import { cn } from "@/lib/utils";
import type { OrdemServico, StatusOS } from "@/types/os";

const STATUS_OS_LABEL: Record<StatusOS, string> = {
  ABERTA: "Aberta",
  ROMANEIO: "Romaneio",
  EM_TRANSITO: "Em trânsito",
  CHECKIN: "No local",
  FINALIZADA: "Finalizada",
};

type Etapa = "romaneio" | "checkin" | "montagem" | "foto" | "saida";

const ETAPAS: Etapa[] = ["romaneio", "checkin", "montagem", "foto", "saida"];

const ETAPA_ACCENT: Record<
  Etapa,
  { ring: string; icon: string; badge: string; progress: string }
> = {
  romaneio: {
    ring: "ring-balloon-pink/35",
    icon: "text-balloon-pink",
    badge: "bg-balloon-pink/12 text-balloon-pink",
    progress: "bg-balloon-pink",
  },
  checkin: {
    ring: "ring-balloon-sky/35",
    icon: "text-balloon-sky",
    badge: "bg-balloon-sky/12 text-balloon-sky",
    progress: "bg-balloon-sky",
  },
  montagem: {
    ring: "ring-balloon-sun/35",
    icon: "text-balloon-sun",
    badge: "bg-balloon-sun/12 text-balloon-sun",
    progress: "bg-balloon-sun",
  },
  foto: {
    ring: "ring-balloon-mint/35",
    icon: "text-balloon-mint",
    badge: "bg-balloon-mint/12 text-balloon-mint",
    progress: "bg-balloon-mint",
  },
  saida: {
    ring: "ring-balloon-lilac/35",
    icon: "text-balloon-lilac",
    badge: "bg-balloon-lilac/12 text-balloon-lilac",
    progress: "bg-balloon-lilac",
  },
};

function safeTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "HH:mm");
  } catch {
    return "—";
  }
}

interface MontagemOsDetalheProps {
  osInicial: OrdemServico;
  token: string;
}

function sectionClass(etapa: Etapa, etapaAtiva: Etapa, dimmed?: boolean) {
  return cn(
    "rounded-2xl p-4 sm:p-5 neo-sm",
    etapa === etapaAtiva && `ring-2 ${ETAPA_ACCENT[etapa].ring}`,
    dimmed && "opacity-50"
  );
}

export function MontagemOsDetalhe({
  osInicial,
  token,
}: MontagemOsDetalheProps) {
  const [os, setOs] = useState(osInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const itemFotoInputRef = useRef<HTMLInputElement>(null);
  const [itemFotoAlvo, setItemFotoAlvo] = useState<string | null>(null);

  const festa = os.festa;
  const itens = os.itensRomaneio;

  const romaneioOk = os.romaneioConcluido;
  const checkinOk = Boolean(os.checkinAt);
  const montagemOk = os.montagemLocalConcluida;
  const fotoOk = Boolean(os.fotoFinalMidiaId);
  const saidaOk = os.status === "FINALIZADA";

  const etapaAtiva: Etapa = useMemo(() => {
    if (!romaneioOk) return "romaneio";
    if (!checkinOk) return "checkin";
    if (!montagemOk) return "montagem";
    if (!fotoOk) return "foto";
    if (!saidaOk) return "saida";
    return "saida";
  }, [romaneioOk, checkinOk, montagemOk, fotoOk, saidaOk]);

  const todosItensSeparados =
    itens.length > 0 &&
    itens.every((i) => i.carregado && i.conferido) &&
    itens.every(
      (i) =>
        !i.unidade?.produto?.requerQr || Boolean(i.fotoMidiaId)
    );

  const todosItensMontados =
    itens.length > 0 &&
    itens.every((i) => i.montado) &&
    itens.every(
      (i) =>
        !i.unidade?.produto?.requerQr || Boolean(i.fotoMidiaId)
    );

  const itensFaltaEstoque = festa.itensFaltaEstoque ?? [];

  function itemAltoValor(item: (typeof itens)[0]): boolean {
    return item.unidade?.produto?.requerQr === true;
  }

  async function toggleItem(
    itemId: string,
    campo: "carregado" | "conferido" | "montado",
    valor: boolean
  ) {
    setErro(null);
    const anterior = os.itensRomaneio;
    setOs((prev) => ({
      ...prev,
      itensRomaneio: prev.itensRomaneio.map((item) =>
        item.id === itemId ? { ...item, [campo]: valor } : item
      ),
    }));

    try {
      const atualizado = await updateRomaneioItem(
        os.id,
        itemId,
        { [campo]: valor },
        token
      );
      setOs((prev) => ({
        ...prev,
        itensRomaneio: prev.itensRomaneio.map((item) =>
          item.id === itemId ? { ...item, ...atualizado } : item
        ),
      }));
    } catch (err) {
      enqueueRomaneioToggle(os.id, itemId, { [campo]: valor });
      setOs((prev) => ({ ...prev, itensRomaneio: anterior }));
      setErro(
        err instanceof Error
          ? `${err.message} — alteração salva offline para reenvio.`
          : "Erro ao atualizar item — salvo offline"
      );
    }
  }

  function itemFotoHandler(itemId: string, file: File) {
    setErro(null);
    startTransition(async () => {
      try {
        const atualizado = await uploadItemFotoRomaneio(
          os.id,
          itemId,
          file,
          token
        );
        setOs((prev) => ({
          ...prev,
          itensRomaneio: prev.itensRomaneio.map((item) =>
            item.id === itemId ? { ...item, ...atualizado } : item
          ),
        }));
      } catch (err) {
        setErro(
          err instanceof Error ? err.message : "Upload da foto do item falhou"
        );
      }
    });
  }

  function concluirRomaneioHandler() {
    setErro(null);
    startTransition(async () => {
      try {
        const atualizada = await concluirRomaneio(os.id, token);
        setOs(atualizada);
      } catch (err) {
        setErro(
          err instanceof Error ? err.message : "Não foi possível concluir"
        );
      }
    });
  }

  function seedRomaneioHandler() {
    setErro(null);
    startTransition(async () => {
      try {
        const atualizada = await seedRomaneio(os.id, token);
        setOs(atualizada);
        if ((atualizada.itensRomaneio ?? []).length === 0) {
          setErro(
            "O pedido não tem itens de material para separar. Peça ao gerente para revisar o kit ou os extras."
          );
        }
      } catch (err) {
        setErro(
          err instanceof Error
            ? err.message
            : "Não foi possível gerar a lista do pedido"
        );
      }
    });
  }

  function concluirMontagemHandler() {
    setErro(null);
    startTransition(async () => {
      try {
        const atualizada = await concluirMontagemLocal(os.id, token);
        setOs(atualizada);
      } catch (err) {
        setErro(
          err instanceof Error
            ? err.message
            : "Não foi possível concluir a montagem"
        );
      }
    });
  }

  function checkinHandler() {
    setErro(null);
    setGeoStatus("Obtendo localização…");

    if (!navigator.geolocation) {
      setGeoStatus(null);
      setErro("Geolocalização não disponível neste dispositivo.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus(null);
        startTransition(async () => {
          try {
            const atualizada = await checkinOs(
              os.id,
              { lat: pos.coords.latitude, lng: pos.coords.longitude },
              token
            );
            setOs(atualizada);
          } catch (err) {
            setErro(
              err instanceof Error ? err.message : "Check-in falhou"
            );
          }
        });
      },
      (geoErr) => {
        setGeoStatus(null);
        setErro(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? "Permita o acesso à localização para fazer check-in."
            : "Não foi possível obter a localização."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function fotoHandler(file: File) {
    setErro(null);
    setFotoPreview(URL.createObjectURL(file));
    startTransition(async () => {
      try {
        const atualizada = await uploadFotoFinalOs(os.id, file, token);
        setOs(atualizada);
      } catch (err) {
        setFotoPreview(null);
        setErro(
          err instanceof Error ? err.message : "Upload da foto falhou"
        );
      }
    });
  }

  function finalizarHandler() {
    setErro(null);
    startTransition(async () => {
      try {
        const atualizada = await finalizarOs(os.id, token);
        setOs(atualizada);
      } catch (err) {
        setErro(
          err instanceof Error
            ? err.message
            : "Não foi possível registrar a saída"
        );
      }
    });
  }

  return (
    <div className="relative mx-auto max-w-lg space-y-5 pb-28 sm:space-y-6 md:pb-8">
      <OfflineQueueSync token={token} />
      <Link
        href="/montagem"
        className="inline-flex items-center gap-1.5 text-sm text-balloon-sky transition-colors hover:text-balloon-sky/80"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <header className="rounded-2xl p-4 sm:p-5 neo-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">
              {festa.cliente?.nome ?? "—"}
            </p>
            <p className="text-sm text-balloon-pink">{festa.tema || "—"}</p>
          </div>
          <span className="shrink-0 rounded-lg bg-balloon-sky/12 px-2.5 py-1 text-[11px] font-medium text-balloon-sky">
            {STATUS_OS_LABEL[os.status]}
          </span>
        </div>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Montagem{" "}
            <span className="font-medium text-foreground">
              {safeTime(festa.horarioMontagem)}
            </span>
            <span className="mx-1.5 opacity-50">·</span>
            Festa{" "}
            <span className="font-medium text-foreground">
              {safeTime(festa.dataEvento)}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-balloon-mint/80" />
            {festa.endereco || "—"}
          </p>
        </div>
      </header>

      {itensFaltaEstoque.length > 0 ? (
        <div
          className="flex gap-3 rounded-2xl border border-balloon-sun/40 bg-balloon-sun/10 p-4 text-sm neo-sm"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-balloon-sun" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              Comprar ou substituir antes de separar
            </p>
            <p className="mt-1 text-muted-foreground">
              {itensFaltaEstoque.join(" · ")}
            </p>
          </div>
        </div>
      ) : null}

      <ol className="flex gap-1" aria-label="Progresso da montagem">
        {ETAPAS.map((etapa) => {
          const done =
            (etapa === "romaneio" && romaneioOk) ||
            (etapa === "checkin" && checkinOk) ||
            (etapa === "montagem" && montagemOk) ||
            (etapa === "foto" && fotoOk) ||
            (etapa === "saida" && saidaOk);
          const active = etapa === etapaAtiva;
          return (
            <li
              key={etapa}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                done
                  ? "bg-balloon-mint"
                  : active
                    ? ETAPA_ACCENT[etapa].progress
                    : "bg-[var(--neo-dark)]/40"
              )}
              aria-hidden
            />
          );
        })}
      </ol>

      <section className={sectionClass("romaneio", etapaAtiva)}>
        <div className="flex items-center gap-2">
          {romaneioOk ? (
            <CheckCircle2 className="size-5 text-balloon-mint" />
          ) : (
            <PackageCheck className={cn("size-5", ETAPA_ACCENT.romaneio.icon)} />
          )}
          <h3 className="font-display text-lg text-foreground">
            1. Separar no estoque
          </h3>
        </div>

        {itens.length === 0 ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Nenhum item na lista. Gere a partir do pedido ou peça ajuda ao
              gerente.
            </p>
            {!romaneioOk ? (
              <Button
                type="button"
                className="w-full"
                disabled={pending}
                onClick={seedRomaneioHandler}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Gerar lista do pedido"
                )}
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {itens.map((item) => (
              <li
                key={item.id}
                className="rounded-xl p-3 neo-inset"
              >
                <p className="text-sm font-medium text-foreground">
                  {item.descricao ??
                    item.unidade?.produto?.nome ??
                    "Item sem descrição"}
                  {itemAltoValor(item) ? (
                    <span className="ml-2 rounded-lg bg-balloon-sun/12 px-1.5 py-0.5 text-[10px] font-medium uppercase text-balloon-sun">
                      Alto valor
                    </span>
                  ) : null}
                </p>
                {item.unidade?.codigoQr ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    QR: {item.unidade.codigoQr}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <ToggleChip
                    label="Carregado"
                    checked={item.carregado}
                    disabled={romaneioOk || pending}
                    onChange={(v) => void toggleItem(item.id, "carregado", v)}
                  />
                  <ToggleChip
                    label="Conferido"
                    checked={item.conferido}
                    disabled={romaneioOk || pending}
                    onChange={(v) => void toggleItem(item.id, "conferido", v)}
                  />
                </div>
                {itemAltoValor(item) && !romaneioOk ? (
                  <div className="mt-2">
                    {item.fotoMidiaId ? (
                      <p className="text-xs text-balloon-mint">
                        Foto registrada
                      </p>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setItemFotoAlvo(item.id);
                          itemFotoInputRef.current?.click();
                        }}
                      >
                        <Camera className="size-3.5" />
                        Foto obrigatória
                      </Button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!romaneioOk && itens.length > 0 ? (
          <Button
            type="button"
            className="mt-4 hidden w-full md:inline-flex"
            disabled={!todosItensSeparados || pending}
            onClick={concluirRomaneioHandler}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Tudo separado — pronto para levar"
            )}
          </Button>
        ) : romaneioOk ? (
          <p className="mt-3 text-xs text-balloon-mint">
            Separação concluída — pronto para levar
          </p>
        ) : null}
      </section>

      <input
        ref={itemFotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && itemFotoAlvo) itemFotoHandler(itemFotoAlvo, file);
          e.target.value = "";
          setItemFotoAlvo(null);
        }}
      />

      <section className={sectionClass("checkin", etapaAtiva, !romaneioOk)}>
        <div className="flex items-center gap-2">
          {checkinOk ? (
            <CheckCircle2 className="size-5 text-balloon-mint" />
          ) : (
            <Navigation className={cn("size-5", ETAPA_ACCENT.checkin.icon)} />
          )}
          <h3 className="font-display text-lg text-foreground">
            2. Check-in no local
          </h3>
        </div>

        {checkinOk ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Check-in registrado às{" "}
            <span className="text-foreground">
              {os.checkinAt ? safeTime(os.checkinAt) : "—"}
            </span>
            {os.checkinLat != null && os.checkinLng != null ? (
              <span className="block text-xs">
                {os.checkinLat.toFixed(5)}, {os.checkinLng.toFixed(5)}
              </span>
            ) : null}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirme sua chegada ao endereço da festa com geolocalização.
            </p>
            <Button
              type="button"
              className="mt-4 hidden w-full md:inline-flex"
              disabled={!romaneioOk || pending}
              onClick={checkinHandler}
            >
              {pending || geoStatus ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Navigation data-icon="inline-start" />
                  Fazer check-in
                </>
              )}
            </Button>
            {geoStatus ? (
              <p className="mt-2 text-xs text-muted-foreground">{geoStatus}</p>
            ) : null}
          </>
        )}
      </section>

      <section className={sectionClass("montagem", etapaAtiva, !checkinOk)}>
        <div className="flex items-center gap-2">
          {montagemOk ? (
            <CheckCircle2 className="size-5 text-balloon-mint" />
          ) : (
            <Hammer className={cn("size-5", ETAPA_ACCENT.montagem.icon)} />
          )}
          <h3 className="font-display text-lg text-foreground">
            3. Montagem no local
          </h3>
        </div>

        {!checkinOk ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Faça o check-in no endereço antes de marcar os itens montados.
          </p>
        ) : montagemOk ? (
          <p className="mt-3 text-sm text-balloon-mint">
            Montagem no local concluída.
          </p>
        ) : itens.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum item na lista para montar.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Marque cada peça conforme for montada no salão.
            </p>
            <ul className="mt-4 space-y-3">
              {itens.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl p-3 neo-inset"
                >
                  <p className="text-sm font-medium text-foreground">
                    {item.descricao ??
                      item.unidade?.produto?.nome ??
                      "Item sem descrição"}
                    {itemAltoValor(item) ? (
                      <span className="ml-2 rounded-lg bg-balloon-sun/12 px-1.5 py-0.5 text-[10px] font-medium uppercase text-balloon-sun">
                        Foto crítica
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-2">
                    <ToggleChip
                      label="Montado"
                      checked={item.montado}
                      disabled={!checkinOk || montagemOk || pending}
                      onChange={(v) => void toggleItem(item.id, "montado", v)}
                    />
                  </div>
                  {itemAltoValor(item) && checkinOk && !montagemOk ? (
                    <div className="mt-2">
                      {item.fotoMidiaId ? (
                        <p className="text-xs text-balloon-mint">
                          Foto registrada
                        </p>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-9"
                          disabled={pending}
                          onClick={() => {
                            setItemFotoAlvo(item.id);
                            itemFotoInputRef.current?.click();
                          }}
                        >
                          <Camera className="size-3.5" />
                          Foto obrigatória
                        </Button>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-4 hidden w-full md:inline-flex"
              disabled={!todosItensMontados || pending}
              onClick={concluirMontagemHandler}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Tudo montado OK"
              )}
            </Button>
          </>
        )}
      </section>

      <section className={sectionClass("foto", etapaAtiva, !montagemOk)}>
        <div className="flex items-center gap-2">
          {fotoOk ? (
            <CheckCircle2 className="size-5 text-balloon-mint" />
          ) : (
            <Camera className={cn("size-5", ETAPA_ACCENT.foto.icon)} />
          )}
          <h3 className="font-display text-lg text-foreground">
            4. Foto da montagem
          </h3>
        </div>

        {fotoOk ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-balloon-mint">Foto registrada.</p>
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoPreview}
                alt="Preview montagem"
                className="max-h-48 w-full rounded-xl object-cover"
              />
            ) : null}
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Registre a decoração pronta no salão (máx. 2 MB).
            </p>
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoPreview}
                alt="Preview montagem"
                className="mt-3 max-h-48 w-full rounded-xl object-cover"
              />
            ) : null}
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={!montagemOk || pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) fotoHandler(file);
                e.target.value = "";
              }}
            />
            <label className="mt-4 hidden cursor-pointer md:flex">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={!montagemOk || pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) fotoHandler(file);
                  e.target.value = "";
                }}
              />
              <span
                className={cn(
                  "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors neo-inset",
                  montagemOk && !pending
                    ? "cursor-pointer hover:text-balloon-mint"
                    : "cursor-not-allowed opacity-50"
                )}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="size-4" />
                    Tirar / escolher foto
                  </>
                )}
              </span>
            </label>
          </>
        )}
      </section>

      <section className={sectionClass("saida", etapaAtiva, !fotoOk)}>
        <div className="flex items-center gap-2">
          {saidaOk ? (
            <CheckCircle2 className="size-5 text-balloon-mint" />
          ) : (
            <LogOut className={cn("size-5", ETAPA_ACCENT.saida.icon)} />
          )}
          <h3 className="font-display text-lg text-foreground">
            5. Registrar saída
          </h3>
        </div>

        {saidaOk ? (
          <p className="mt-3 text-sm text-balloon-mint">
            Montagem finalizada. Bom trabalho!
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirme a saída do local para encerrar esta montagem.
            </p>
            <Button
              type="button"
              className="mt-4 hidden w-full md:inline-flex"
              disabled={!fotoOk || pending}
              onClick={finalizarHandler}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <LogOut data-icon="inline-start" />
                  Finalizar montagem
                </>
              )}
            </Button>
          </>
        )}
      </section>

      {erro ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          {erro}
        </div>
      ) : null}

      <MontagemStickyAction
        etapaAtiva={etapaAtiva}
        romaneioOk={romaneioOk}
        checkinOk={checkinOk}
        montagemOk={montagemOk}
        fotoOk={fotoOk}
        saidaOk={saidaOk}
        itensLength={itens.length}
        todosItensSeparados={todosItensSeparados}
        todosItensMontados={todosItensMontados}
        pending={pending}
        geoStatus={geoStatus}
        onConcluirRomaneio={concluirRomaneioHandler}
        onCheckin={checkinHandler}
        onConcluirMontagem={concluirMontagemHandler}
        onFotoClick={() => fotoInputRef.current?.click()}
        onFinalizar={finalizarHandler}
      />
    </div>
  );
}

function MontagemStickyAction({
  etapaAtiva,
  romaneioOk,
  checkinOk,
  montagemOk,
  fotoOk,
  saidaOk,
  itensLength,
  todosItensSeparados,
  todosItensMontados,
  pending,
  geoStatus,
  onConcluirRomaneio,
  onCheckin,
  onConcluirMontagem,
  onFotoClick,
  onFinalizar,
}: {
  etapaAtiva: Etapa;
  romaneioOk: boolean;
  checkinOk: boolean;
  montagemOk: boolean;
  fotoOk: boolean;
  saidaOk: boolean;
  itensLength: number;
  todosItensSeparados: boolean;
  todosItensMontados: boolean;
  pending: boolean;
  geoStatus: string | null;
  onConcluirRomaneio: () => void;
  onCheckin: () => void;
  onConcluirMontagem: () => void;
  onFotoClick: () => void;
  onFinalizar: () => void;
}) {
  let action: React.ReactNode = null;

  if (etapaAtiva === "romaneio" && !romaneioOk && itensLength > 0) {
    action = (
      <Button
        type="button"
        className="w-full min-h-11"
        disabled={!todosItensSeparados || pending}
        onClick={onConcluirRomaneio}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Tudo separado — pronto para levar"
        )}
      </Button>
    );
  } else if (etapaAtiva === "checkin" && !checkinOk) {
    action = (
      <Button
        type="button"
        className="w-full min-h-11"
        disabled={!romaneioOk || pending}
        onClick={onCheckin}
      >
        {pending || geoStatus ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Navigation data-icon="inline-start" />
            Fazer check-in
          </>
        )}
      </Button>
    );
  } else if (etapaAtiva === "montagem" && !montagemOk && itensLength > 0) {
    action = (
      <Button
        type="button"
        className="w-full min-h-11"
        disabled={!checkinOk || !todosItensMontados || pending}
        onClick={onConcluirMontagem}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Tudo montado OK"
        )}
      </Button>
    );
  } else if (etapaAtiva === "foto" && !fotoOk) {
    action = (
      <Button
        type="button"
        className="w-full min-h-11"
        disabled={!montagemOk || pending}
        onClick={onFotoClick}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Camera data-icon="inline-start" />
            Tirar / escolher foto
          </>
        )}
      </Button>
    );
  } else if (etapaAtiva === "saida" && !saidaOk) {
    action = (
      <Button
        type="button"
        className="w-full min-h-11"
        disabled={!fotoOk || pending}
        onClick={onFinalizar}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <LogOut data-icon="inline-start" />
            Finalizar montagem
          </>
        )}
      </Button>
    );
  }

  if (!action) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="rounded-2xl p-3 neo-sm">{action}</div>
    </div>
  );
}

function ToggleChip({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors neo-inset min-h-9",
        checked
          ? "text-balloon-mint ring-1 ring-balloon-mint/30"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {checked ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <Circle className="size-3.5 opacity-50" />
      )}
      {label}
    </button>
  );
}
