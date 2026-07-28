"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { aprovarDesconto, recusarDesconto } from "@/lib/api";
import { getClientToken } from "@/lib/auth";
import type { FestaDescontoPendente } from "@/types/desconto";

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `${n}%`;
}

interface AprovacoesPainelProps {
  initialPendentes: FestaDescontoPendente[];
  apiUnavailable?: boolean;
}

export function AprovacoesPainel({
  initialPendentes,
  apiUnavailable = false,
}: AprovacoesPainelProps) {
  const [pendentes, setPendentes] = useState(initialPendentes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  function handleAction(festaId: string, action: "aprovar" | "recusar") {
    setError(null);
    setActionId(festaId);
    startTransition(async () => {
      try {
        const token = getClientToken();
        if (!token) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        if (action === "aprovar") {
          await aprovarDesconto(festaId, token);
        } else {
          await recusarDesconto(festaId, token);
        }
        setPendentes((prev) => prev.filter((p) => p.id !== festaId));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Falha ao processar desconto"
        );
      } finally {
        setActionId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {apiUnavailable ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">API de descontos indisponível</p>
          <p className="mt-1 opacity-90">
            A interface está pronta; quando o backend responder, as aprovações
            aparecerão aqui automaticamente.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Festa</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Valor original</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendentes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  {apiUnavailable
                    ? "Aguardando conexão com a API…"
                    : "Nenhum desconto pendente de aprovação."}
                </TableCell>
              </TableRow>
            ) : (
              pendentes.map((festa) => {
                const valorOriginal = festa.valorOriginal ?? festa.valor;
                const isBusy = pending && actionId === festa.id;
                return (
                  <TableRow key={festa.id}>
                    <TableCell>
                      <div className="font-medium">{festa.tema}</div>
                      <div className="text-xs text-muted-foreground">
                        {festa.endereco}
                      </div>
                    </TableCell>
                    <TableCell>{festa.cliente.nome}</TableCell>
                    <TableCell>{festa.vendedor.nome}</TableCell>
                    <TableCell>
                      {festa.descontoSolicitadoPor?.nome ?? "—"}
                    </TableCell>
                    <TableCell>{formatCurrency(valorOriginal)}</TableCell>
                    <TableCell>{formatPercent(festa.descontoPercentual)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isBusy || apiUnavailable}
                          onClick={() => handleAction(festa.id, "recusar")}
                        >
                          <X className="mr-1 size-3.5" />
                          Recusar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isBusy || apiUnavailable}
                          onClick={() => handleAction(festa.id, "aprovar")}
                        >
                          <Check className="mr-1 size-3.5" />
                          Aprovar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
