"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Loader2, Paperclip, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confirmarPagamento,
  createPagamento,
  uploadMidia,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Pagamento, TipoPagamento } from "@/types/festa";

const tipoLabel: Record<TipoPagamento, string> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

const TIPOS: TipoPagamento[] = ["PIX", "DINHEIRO", "CARTAO", "OUTRO"];

const selectClassName =
  "flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:px-2.5 md:text-sm";

interface PagamentoFormProps {
  festaId: string;
  token: string;
  pagamentos: Pagamento[];
  valorSugerido?: number;
  onPagamentosChange: (pagamentos: Pagamento[]) => void;
}

export function PagamentoForm({
  festaId,
  token,
  pagamentos,
  valorSugerido,
  onPagamentosChange,
}: PagamentoFormProps) {
  const [valor, setValor] = useState(
    valorSugerido != null ? String(valorSugerido) : ""
  );
  const [tipo, setTipo] = useState<TipoPagamento>("PIX");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function registrarPagamento() {
    setError(null);
    const amount = Number(valor.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor válido");
      return;
    }

    setPending(true);
    try {
      const pagamento = await createPagamento(festaId, { valor: amount, tipo }, token);
      let atualizado = pagamento;

      if (file) {
        const midia = await uploadMidia(
          { file, tipo: "COMPROVANTE_PIX", festaId },
          token
        );
        atualizado = await confirmarPagamento(
          pagamento.id,
          { comprovanteMidiaId: midia.id },
          token
        );
      }

      onPagamentosChange([atualizado, ...pagamentos]);
      setValor("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível registrar o pagamento"
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
        err instanceof Error ? err.message : "Não foi possível confirmar o pagamento"
      );
    } finally {
      setConfirmandoId(null);
    }
  }

  const totalConfirmado = pagamentos
    .filter((p) => p.status === "CONFIRMADO")
    .reduce((acc, p) => acc + Number(p.valor), 0);

  return (
    <div className="space-y-4" onClick={(event) => event.stopPropagation()}>
      {pagamentos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pagamentos registrados · {formatCurrency(totalConfirmado)}{" "}
            confirmado
          </p>
          <ul className="space-y-2">
            {pagamentos.map((pagamento) => (
              <li
                key={pagamento.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
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
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-champagne">
                        <Paperclip className="size-3" /> comprovante
                      </span>
                    ) : null}
                  </p>
                </div>
                {pagamento.status === "CONFIRMADO" ? (
                  <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-md bg-emerald-500/14 px-2 py-1 text-xs font-medium text-emerald-300 sm:self-auto">
                    <CheckCircle2 className="size-3.5" /> Confirmado
                  </span>
                ) : pagamento.status === "ESTORNADO" ? (
                  <span className="inline-flex shrink-0 self-start rounded-md bg-destructive/14 px-2 py-1 text-xs font-medium text-destructive sm:self-auto">
                    Estornado
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10 w-full sm:w-auto"
                    disabled={confirmandoId === pagamento.id}
                    onClick={() => confirmarSemComprovante(pagamento.id)}
                  >
                    {confirmandoId === pagamento.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Confirmar"
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-dashed border-border/70 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
          Registrar pagamento PIX
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`valor-${festaId}`} className="text-xs">
              Valor (R$)
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
              onChange={(event) => setTipo(event.target.value as TipoPagamento)}
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
            Comprovante (opcional)
          </Label>
          <label
            htmlFor={`comprovante-${festaId}`}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm text-muted-foreground transition-colors hover:border-ring md:h-9 md:px-2.5 md:text-xs",
              file && "border-champagne/50 text-champagne"
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
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="text-xs text-muted-foreground">
              Ao registrar, o pagamento já será confirmado com este comprovante.
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={pending}
          onClick={registrarPagamento}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Registrar pagamento"
          )}
        </Button>
      </div>
    </div>
  );
}
