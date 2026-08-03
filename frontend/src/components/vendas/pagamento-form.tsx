"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Paperclip,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  anexarComprovantePagamento,
  confirmarPagamento,
  createPagamento,
  gerarPixQr,
  getMidiaAuthUrl,
  uploadMidia,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/auth";
import type { Pagamento, TipoPagamento } from "@/types/festa";

const tipoLabel: Record<TipoPagamento, string> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

const TIPOS: TipoPagamento[] = ["PIX", "DINHEIRO", "CARTAO", "OUTRO"];

const selectClassName =
  "flex h-11 w-full rounded-xl neo-inset px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-balloon-mint/30 md:h-9 md:px-2.5 md:text-sm";

interface PagamentoFormProps {
  festaId: string;
  token: string;
  pagamentos: Pagamento[];
  /** Valor total da festa (contrato). */
  valorFesta: number;
  /** ADMIN / GERENTE (sócia) podem abrir o comprovante. */
  viewerRole?: Role;
  onPagamentosChange: (pagamentos: Pagamento[]) => void;
}

export function PagamentoForm({
  festaId,
  token,
  pagamentos,
  valorFesta,
  viewerRole,
  onPagamentosChange,
}: PagamentoFormProps) {
  const canViewComprovante =
    viewerRole === "ADMIN" || viewerRole === "GERENTE";

  const totalConfirmado = pagamentos
    .filter((p) => p.status === "CONFIRMADO")
    .reduce((acc, p) => acc + Number(p.valor), 0);
  const totalPendente = pagamentos
    .filter((p) => p.status === "PENDENTE")
    .reduce((acc, p) => acc + Number(p.valor), 0);
  const falta = Math.max(0, Number(valorFesta) - totalConfirmado);
  const quitado = falta <= 0.009;

  const [valor, setValor] = useState(falta > 0 ? String(falta.toFixed(2)) : "");
  const [tipo, setTipo] = useState<TipoPagamento>("PIX");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [anexandoId, setAnexandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const attachTargetIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (falta > 0) {
      setValor(String(Number(falta.toFixed(2))));
    }
  }, [falta]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function fecharPreview() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewIsPdf(false);
  }

  async function abrirComprovante(midiaId: string) {
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch(getMidiaAuthUrl(midiaId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Não foi possível abrir o comprovante");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const isPdf =
        blob.type === "application/pdf" ||
        blob.type === "application/octet-stream";
      setPreviewIsPdf(isPdf);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao abrir comprovante"
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function registrarPagamento() {
    setError(null);
    const amount = Number(valor.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor válido");
      return;
    }

    setPending(true);
    try {
      const pagamento = await createPagamento(
        festaId,
        { valor: amount, tipo },
        token
      );
      let atualizado = pagamento;

      if (file) {
        try {
          const midia = await uploadMidia(
            { file, tipo: "COMPROVANTE_PIX", festaId },
            token
          );
          atualizado = await confirmarPagamento(
            pagamento.id,
            { comprovanteMidiaId: midia.id },
            token
          );
        } catch (uploadErr) {
          onPagamentosChange([pagamento, ...pagamentos]);
          throw new Error(
            uploadErr instanceof Error
              ? `Pagamento criado, mas o comprovante falhou: ${uploadErr.message}. Use “Anexar comprovante” no lançamento.`
              : "Pagamento criado, mas o comprovante falhou. Use “Anexar comprovante” no lançamento."
          );
        }
      }

      onPagamentosChange([atualizado, ...pagamentos]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível registrar o pagamento"
      );
    } finally {
      setPending(false);
    }
  }

  async function confirmarSemComprovante(pagamentoId: string) {
    setError(null);
    setConfirmandoId(pagamentoId);
    try {
      const atualizado = await confirmarPagamento(pagamentoId, {}, token);
      onPagamentosChange(
        pagamentos.map((p) => (p.id === atualizado.id ? atualizado : p))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível confirmar o pagamento"
      );
    } finally {
      setConfirmandoId(null);
    }
  }

  function iniciarAnexo(pagamentoId: string) {
    attachTargetIdRef.current = pagamentoId;
    attachInputRef.current?.click();
  }

  async function anexarNoPagamento(selected: File | null) {
    const pagamentoId = attachTargetIdRef.current;
    attachTargetIdRef.current = null;
    if (!pagamentoId || !selected) return;

    setError(null);
    setAnexandoId(pagamentoId);
    try {
      const midia = await uploadMidia(
        { file: selected, tipo: "COMPROVANTE_PIX", festaId },
        token
      );
      const atualizado = await anexarComprovantePagamento(
        pagamentoId,
        midia.id,
        token
      );
      onPagamentosChange(
        pagamentos.map((p) => (p.id === atualizado.id ? atualizado : p))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível anexar o comprovante"
      );
    } finally {
      setAnexandoId(null);
      if (attachInputRef.current) attachInputRef.current.value = "";
    }
  }

  const saldoRows = [
    {
      label: "Total",
      value: formatCurrency(valorFesta),
      className: "text-foreground",
    },
    {
      label: "Pago",
      value: formatCurrency(totalConfirmado),
      className: "text-balloon-mint",
    },
    {
      label: "Falta",
      value: quitado ? "Quitado" : formatCurrency(falta),
      className: quitado ? "text-balloon-mint" : "text-balloon-sun",
    },
  ] as const;

  return (
    <div className="space-y-4" onClick={(event) => event.stopPropagation()}>
      <div className="space-y-2 rounded-2xl neo-sm p-3">
        {saldoRows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3"
          >
            <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {row.label}
            </p>
            <p
              className={cn(
                "min-w-0 text-right text-sm font-semibold tabular-nums",
                row.className
              )}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
      {totalPendente > 0 ? (
        <p className="text-xs text-muted-foreground">
          + {formatCurrency(totalPendente)} em pagamento(s) pendente(s) de
          confirmação.
        </p>
      ) : null}

      <input
        ref={attachInputRef}
        type="file"
        accept="image/*,application/pdf,.heic,.heif"
        className="hidden"
        onChange={(event) =>
          void anexarNoPagamento(event.target.files?.[0] ?? null)
        }
      />

      {pagamentos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Lançamentos
          </p>
          <ul className="space-y-2">
            {pagamentos.map((pagamento) => (
              <li
                key={pagamento.id}
                className="flex flex-col gap-2 rounded-2xl neo-sm px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {formatCurrency(pagamento.valor)}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {tipoLabel[pagamento.tipo]}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(pagamento.criadoEm), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                    {pagamento.comprovanteMidiaId ? (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-balloon-sun">
                        <Paperclip className="size-3" /> comprovante
                      </span>
                    ) : null}
                  </p>
                  {pagamento.pixCopiaCola ? (
                    <p className="mt-1 break-all rounded-lg bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
                      PIX: {pagamento.pixCopiaCola.slice(0, 48)}…
                    </p>
                  ) : null}
                </div>
                <div className="flex w-full flex-col gap-2">
                  {pagamento.status === "CONFIRMADO" ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-balloon-mint/12 px-2.5 py-1 text-xs font-semibold text-balloon-mint shadow-[var(--shadow-neo-sm)]">
                      <CheckCircle2 className="size-3.5" /> Confirmado
                    </span>
                  ) : pagamento.status === "ESTORNADO" ? (
                    <span className="inline-flex w-fit rounded-full bg-destructive/12 px-2.5 py-1 text-xs font-semibold text-destructive shadow-[var(--shadow-neo-sm)]">
                      Estornado
                    </span>
                  ) : (
                    <div className="flex w-full flex-col gap-2">
                      {!pagamento.pixCopiaCola && pagamento.tipo === "PIX" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          disabled={confirmandoId === pagamento.id}
                          onClick={() => {
                            setConfirmandoId(pagamento.id);
                            void gerarPixQr(pagamento.id, token)
                              .then((atualizado) => {
                                onPagamentosChange(
                                  pagamentos.map((p) =>
                                    p.id === atualizado.id ? atualizado : p
                                  )
                                );
                              })
                              .catch((err) =>
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "Falha ao gerar PIX"
                                )
                              )
                              .finally(() => setConfirmandoId(null));
                          }}
                        >
                          Gerar QR PIX
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10 w-full"
                        disabled={confirmandoId === pagamento.id}
                        onClick={() => confirmarSemComprovante(pagamento.id)}
                      >
                        {confirmandoId === pagamento.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Confirmar"
                        )}
                      </Button>
                    </div>
                  )}

                  {pagamento.comprovanteMidiaId && canViewComprovante ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-10 w-full"
                      disabled={previewLoading}
                      onClick={() =>
                        void abrirComprovante(pagamento.comprovanteMidiaId!)
                      }
                    >
                      {previewLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                      Ver comprovante
                    </Button>
                  ) : null}

                  {!pagamento.comprovanteMidiaId &&
                  pagamento.status !== "ESTORNADO" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10 w-full"
                      disabled={anexandoId === pagamento.id}
                      onClick={() => iniciarAnexo(pagamento.id)}
                    >
                      {anexandoId === pagamento.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      Anexar comprovante
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!quitado ? (
        <div className="space-y-3 rounded-2xl neo-inset p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-balloon-mint">
            Registrar pagamento / entrada
          </p>
          <p className="text-xs text-muted-foreground">
            Pode lançar só a entrada agora e o restante depois — o saldo
            atualiza sozinho.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`valor-${festaId}`} className="text-xs">
                Valor deste lançamento (R$)
              </Label>
              <Input
                id={`valor-${festaId}`}
                type="number"
                step="0.01"
                min="0"
                className="h-11 text-base md:h-9 md:text-sm"
                placeholder="500.00"
                value={valor}
                onChange={(event) => setValor(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`tipo-${festaId}`} className="text-xs">
                Tipo
              </Label>
              <select
                id={`tipo-${festaId}`}
                className={selectClassName}
                value={tipo}
                onChange={(event) =>
                  setTipo(event.target.value as TipoPagamento)
                }
              >
                {TIPOS.map((item) => (
                  <option key={item} value={item} className="bg-background">
                    {tipoLabel[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`comprovante-${festaId}`} className="text-xs">
              Comprovante (foto ou PDF)
            </Label>
            <label
              htmlFor={`comprovante-${festaId}`}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl neo-inset px-3 text-sm text-muted-foreground transition-all hover:brightness-[1.02] md:h-9 md:px-2.5 md:text-xs",
                file && "text-balloon-sun ring-1 ring-balloon-sun/30"
              )}
            >
              <Upload className="size-4 shrink-0" />
              <span className="truncate">
                {file ? file.name : "Anexar comprovante de PIX"}
              </span>
            </label>
            <input
              ref={fileInputRef}
              id={`comprovante-${festaId}`}
              type="file"
              accept="image/*,application/pdf,.heic,.heif"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-xs text-muted-foreground">
                Ao registrar com comprovante, o lançamento já fica confirmado.
              </p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={pending}
            onClick={() => void registrarPagamento()}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Registrar pagamento"
            )}
          </Button>
        </div>
      ) : (
        <p className="rounded-2xl bg-balloon-mint/10 px-3 py-2 text-sm text-balloon-mint">
          Festa quitada — valor total coberto pelos pagamentos confirmados.
        </p>
      )}

      {error && quitado ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {mounted && previewUrl
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="Fechar comprovante"
                className="absolute inset-0 bg-[#2a3142]/50 backdrop-blur-[2px]"
                onClick={fecharPreview}
              />
              <div className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-2xl neo-sm">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-sm font-medium text-foreground">
                    Comprovante
                  </p>
                  <button
                    type="button"
                    className="flex size-10 items-center justify-center rounded-xl neo-inset"
                    onClick={fecharPreview}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {previewIsPdf ? (
                  <iframe
                    title="Comprovante de pagamento"
                    src={previewUrl}
                    className="h-[80dvh] w-full bg-background"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Comprovante de pagamento"
                    className="max-h-[80dvh] w-full object-contain bg-background"
                  />
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
