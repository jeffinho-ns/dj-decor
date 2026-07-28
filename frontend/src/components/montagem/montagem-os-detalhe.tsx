"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Circle,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
} from "lucide-react";

import { MontagemQrScanner } from "@/components/montagem/montagem-qr-scanner";
import { Button } from "@/components/ui/button";
import {
  checkinOs,
  concluirRomaneio,
  scanQr,
  updateRomaneioItem,
  uploadFotoFinalOs,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { OrdemServico, StatusOS } from "@/types/os";

const STATUS_OS_LABEL: Record<StatusOS, string> = {
  ABERTA: "Aberta",
  ROMANEIO: "Romaneio",
  EM_TRANSITO: "Em trânsito",
  CHECKIN: "No local",
  FINALIZADA: "Finalizada",
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

type Etapa = "romaneio" | "checkin" | "foto" | "qr";

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

  const festa = os.festa;
  const itens = os.itensRomaneio;

  const romaneioOk = os.romaneioConcluido;
  const checkinOk = Boolean(os.checkinAt);
  const fotoOk = os.status === "FINALIZADA";

  const etapaAtiva: Etapa = useMemo(() => {
    if (!romaneioOk) return "romaneio";
    if (!checkinOk) return "checkin";
    if (!fotoOk) return "foto";
    return "qr";
  }, [romaneioOk, checkinOk, fotoOk]);

  const todosItensOk =
    itens.length > 0 && itens.every((i) => i.carregado && i.conferido);

  async function toggleItem(
    itemId: string,
    campo: "carregado" | "conferido",
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
      setOs((prev) => ({ ...prev, itensRomaneio: anterior }));
      setErro(
        err instanceof Error ? err.message : "Erro ao atualizar item"
      );
    }
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

  const qrScanHandler = useCallback(
    async (codigoQr: string, tipo: "SAIDA_GALPAO" | "ENTRADA_RETORNO") => {
      setErro(null);
      const coords = await new Promise<{ lat?: number; lng?: number }>(
        (resolve) => {
          if (!navigator.geolocation) {
            resolve({});
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }),
            () => resolve({}),
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }
      );

      await scanQr(
        {
          codigoQr,
          tipo,
          osId: os.id,
          ...coords,
        },
        token
      );
    },
    [os.id, token]
  );

  return (
    <div className="relative mx-auto max-w-lg space-y-5 pb-28 sm:space-y-6 md:pb-8">
      <Link
        href="/montagem"
        className="inline-flex items-center gap-1.5 text-sm text-champagne transition-colors hover:text-champagne/80"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <header className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">
              {festa.cliente?.nome ?? "—"}
            </p>
            <p className="text-sm text-champagne">{festa.tema || "—"}</p>
          </div>
          <span className="shrink-0 rounded-md bg-champagne/12 px-2.5 py-1 text-[11px] font-medium text-champagne">
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
            <MapPin className="mt-0.5 size-4 shrink-0 text-champagne/80" />
            {festa.endereco || "—"}
          </p>
        </div>
      </header>

      <ol className="flex gap-1" aria-label="Progresso da montagem">
        {(["romaneio", "checkin", "foto", "qr"] as Etapa[]).map((etapa) => {
          const done =
            (etapa === "romaneio" && romaneioOk) ||
            (etapa === "checkin" && checkinOk) ||
            (etapa === "foto" && fotoOk) ||
            (etapa === "qr" && fotoOk);
          const active = etapa === etapaAtiva;
          return (
            <li
              key={etapa}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                done
                  ? "bg-status-done"
                  : active
                    ? "bg-champagne"
                    : "bg-border/60"
              )}
              aria-hidden
            />
          );
        })}
      </ol>

      <section
        className={cn(
          "rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5",
          etapaAtiva === "romaneio" && "ring-1 ring-champagne/30"
        )}
      >
        <div className="flex items-center gap-2">
          {romaneioOk ? (
            <CheckCircle2 className="size-5 text-status-done" />
          ) : (
            <PackageCheck className="size-5 text-champagne" />
          )}
          <h3 className="font-display text-lg text-foreground">
            1. Romaneio
          </h3>
        </div>

        {itens.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum item no romaneio. Solicite ao gerente o preenchimento.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {itens.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border/50 bg-background/30 p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {item.descricao ??
                    item.unidade?.produto?.nome ??
                    "Item sem descrição"}
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
              </li>
            ))}
          </ul>
        )}

        {!romaneioOk && itens.length > 0 ? (
          <Button
            type="button"
            className="mt-4 hidden w-full md:inline-flex"
            disabled={!todosItensOk || pending}
            onClick={concluirRomaneioHandler}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Concluir romaneio"
            )}
          </Button>
        ) : romaneioOk ? (
          <p className="mt-3 text-xs text-status-done">
            Romaneio concluído{" "}
            {format(new Date(), "HH:mm", { locale: ptBR })}
          </p>
        ) : null}
      </section>

      <section
        className={cn(
          "rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5",
          etapaAtiva === "checkin" && "ring-1 ring-champagne/30",
          !romaneioOk && "opacity-50"
        )}
      >
        <div className="flex items-center gap-2">
          {checkinOk ? (
            <CheckCircle2 className="size-5 text-status-done" />
          ) : (
            <Navigation className="size-5 text-champagne" />
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

      <section
        className={cn(
          "rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5",
          etapaAtiva === "foto" && "ring-1 ring-champagne/30",
          !checkinOk && "opacity-50"
        )}
      >
        <div className="flex items-center gap-2">
          {fotoOk ? (
            <CheckCircle2 className="size-5 text-status-done" />
          ) : (
            <Camera className="size-5 text-champagne" />
          )}
          <h3 className="font-display text-lg text-foreground">
            3. Foto da montagem
          </h3>
        </div>

        {fotoOk ? (
          <p className="mt-3 text-sm text-status-done">
            Montagem finalizada e foto enviada.
          </p>
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
              disabled={!checkinOk || pending}
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
                disabled={!checkinOk || pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) fotoHandler(file);
                  e.target.value = "";
                }}
              />
              <span
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium transition-colors",
                  checkinOk && !pending
                    ? "cursor-pointer hover:bg-muted"
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

      <section
        className={cn(
          "rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5",
          etapaAtiva === "qr" && "ring-1 ring-champagne/30",
          !romaneioOk && "opacity-50"
        )}
      >
        <div className="flex items-center gap-2">
          <Circle className="size-5 text-champagne" />
          <h3 className="font-display text-lg text-foreground">
            4. Scan QR
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Registre saída do galpão e retorno das peças. Scanner via{" "}
          <span className="text-champagne">html5-qrcode</span>.
        </p>

        <div className="mt-4 space-y-5 sm:space-y-6">
          <MontagemQrScanner
            osId={os.id}
            tipo="SAIDA_GALPAO"
            disabled={!romaneioOk}
            onScan={(codigo) => qrScanHandler(codigo, "SAIDA_GALPAO")}
          />
          <div className="border-t border-border/60 pt-4">
            <MontagemQrScanner
              osId={os.id}
              tipo="ENTRADA_RETORNO"
              initialModo="manual"
              disabled={!romaneioOk}
              onScan={(codigo) => qrScanHandler(codigo, "ENTRADA_RETORNO")}
            />
          </div>
        </div>
      </section>

      {erro ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      ) : null}

      <MontagemStickyAction
        etapaAtiva={etapaAtiva}
        romaneioOk={romaneioOk}
        checkinOk={checkinOk}
        fotoOk={fotoOk}
        itensLength={itens.length}
        todosItensOk={todosItensOk}
        pending={pending}
        geoStatus={geoStatus}
        onConcluirRomaneio={concluirRomaneioHandler}
        onCheckin={checkinHandler}
        onFotoClick={() => fotoInputRef.current?.click()}
      />
    </div>
  );
}

function MontagemStickyAction({
  etapaAtiva,
  romaneioOk,
  checkinOk,
  fotoOk,
  itensLength,
  todosItensOk,
  pending,
  geoStatus,
  onConcluirRomaneio,
  onCheckin,
  onFotoClick,
}: {
  etapaAtiva: Etapa;
  romaneioOk: boolean;
  checkinOk: boolean;
  fotoOk: boolean;
  itensLength: number;
  todosItensOk: boolean;
  pending: boolean;
  geoStatus: string | null;
  onConcluirRomaneio: () => void;
  onCheckin: () => void;
  onFotoClick: () => void;
}) {
  let action: React.ReactNode = null;

  if (etapaAtiva === "romaneio" && !romaneioOk && itensLength > 0) {
    action = (
      <Button
        type="button"
        className="w-full"
        disabled={!todosItensOk || pending}
        onClick={onConcluirRomaneio}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Concluir romaneio"
        )}
      </Button>
    );
  } else if (etapaAtiva === "checkin" && !checkinOk) {
    action = (
      <Button
        type="button"
        className="w-full"
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
  } else if (etapaAtiva === "foto" && !fotoOk) {
    action = (
      <Button
        type="button"
        className="w-full"
        disabled={!checkinOk || pending}
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
  }

  if (!action) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      {action}
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
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        checked
          ? "border-status-done/40 bg-status-done/14 text-status-done"
          : "border-border/60 bg-background/50 text-muted-foreground hover:bg-foreground/5",
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
