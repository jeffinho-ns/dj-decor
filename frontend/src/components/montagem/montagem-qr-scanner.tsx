"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Keyboard,
  Loader2,
  ScanLine,
  Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TipoMovimentacao } from "@/types/os";

interface MontagemQrScannerProps {
  osId: string;
  tipo: TipoMovimentacao;
  onScan: (codigoQr: string) => Promise<void>;
  disabled?: boolean;
  initialModo?: "camera" | "manual";
}

/**
 * Scanner QR com `html5-qrcode` (câmera) + fallback manual/captura de imagem.
 * Biblioteca escolhida: html5-qrcode — leve, sem dependência nativa, funciona
 * em browsers mobile via getUserMedia.
 */
export function MontagemQrScanner({
  osId,
  tipo,
  onScan,
  disabled = false,
  initialModo = "camera",
}: MontagemQrScannerProps) {
  const readerId = `montagem-qr-${osId}-${tipo}`;
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [modo, setModo] = useState<"camera" | "manual">(initialModo);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [codigoManual, setCodigoManual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ultimoScan, setUltimoScan] = useState<string | null>(null);

  const pararCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // scanner já parado
      }
      scannerRef.current = null;
    }
    setCameraAtiva(false);
  }, []);

  const processarCodigo = useCallback(
    async (codigo: string) => {
      const trimmed = codigo.trim();
      if (!trimmed || disabled || enviando) return;

      setErro(null);
      setEnviando(true);
      try {
        await onScan(trimmed);
        setUltimoScan(trimmed);
        setCodigoManual("");
      } catch (err) {
        setErro(
          err instanceof Error ? err.message : "Falha ao registrar QR"
        );
      } finally {
        setEnviando(false);
      }
    },
    [disabled, enviando, onScan]
  );

  const iniciarCamera = useCallback(async () => {
    if (disabled || typeof window === "undefined") return;

    setErro(null);
    await pararCamera();

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void processarCodigo(decoded);
        },
        () => {
          // frame sem QR — ignorar
        }
      );
      setCameraAtiva(true);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível acessar a câmera. Use o modo manual."
      );
      setModo("manual");
    }
  }, [disabled, pararCamera, processarCodigo, readerId]);

  useEffect(() => {
    if (modo === "camera" && !disabled) {
      void iniciarCamera();
    } else {
      void pararCamera();
    }
    return () => {
      void pararCamera();
    };
  }, [modo, disabled, iniciarCamera, pararCamera]);

  async function scanArquivo(file: File) {
    setErro(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(readerId, { verbose: false });
      const result = await scanner.scanFile(file, false);
      await processarCodigo(result);
      await scanner.clear();
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "QR não detectado na imagem"
      );
    }
  }

  const tipoLabel =
    tipo === "SAIDA_GALPAO" ? "Saída do galpão" : "Retorno ao galpão";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{tipoLabel}</p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={modo === "camera" ? "default" : "outline"}
            onClick={() => setModo("camera")}
            disabled={disabled}
          >
            <Camera data-icon="inline-start" />
            Câmera
          </Button>
          <Button
            type="button"
            size="sm"
            variant={modo === "manual" ? "default" : "outline"}
            onClick={() => setModo("manual")}
            disabled={disabled}
          >
            <Keyboard data-icon="inline-start" />
            Manual
          </Button>
        </div>
      </div>

      {modo === "camera" ? (
        <div className="space-y-3">
          <div
            id={readerId}
            className={cn(
              "overflow-hidden rounded-xl border border-border/70 bg-black/40",
              !cameraAtiva && "flex min-h-[200px] items-center justify-center"
            )}
          >
            {!cameraAtiva && !erro ? (
              <Loader2 className="size-6 animate-spin text-champagne" />
            ) : null}
          </div>
          {cameraAtiva ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => void pararCamera()}
            >
              <Square data-icon="inline-start" />
              Parar câmera
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => void iniciarCamera()}
              disabled={disabled}
            >
              <ScanLine data-icon="inline-start" />
              Iniciar câmera
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor={`qr-manual-${osId}-${tipo}`}>Código QR</Label>
            <Input
              id={`qr-manual-${osId}-${tipo}`}
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value)}
              placeholder="Ex: DJ-MESA-001"
              className="mt-1.5"
              disabled={disabled || enviando}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void processarCodigo(codigoManual);
                }
              }}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={disabled || enviando || !codigoManual.trim()}
            onClick={() => void processarCodigo(codigoManual)}
          >
            {enviando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <ScanLine data-icon="inline-start" />
                Registrar scan
              </>
            )}
          </Button>
          <div>
            <Label htmlFor={`qr-file-${osId}-${tipo}`}>
              Ou foto do QR (fallback)
            </Label>
            <Input
              id={`qr-file-${osId}-${tipo}`}
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1.5"
              disabled={disabled || enviando}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void scanArquivo(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}

      {ultimoScan ? (
        <p className="text-xs text-status-done">
          Último scan: <span className="font-medium">{ultimoScan}</span>
        </p>
      ) : null}

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
    </div>
  );
}
