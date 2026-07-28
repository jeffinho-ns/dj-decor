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

function AprovacaoActions({
  festaId,
  isBusy,
  apiUnavailable,
  onAction,
  layout = "inline",
}: {
  festaId: string;
  isBusy: boolean;
  apiUnavailable: boolean;
  onAction: (festaId: string, action: "aprovar" | "recusar") => void;
  layout?: "inline" | "stacked";
}) {
  const stacked = layout === "stacked";

  return (
    <div
      className={
        stacked
          ? "flex flex-col gap-2"
          : "flex justify-end gap-2"
      }
    >
      <Button
        type="button"
        size={stacked ? "default" : "sm"}
        variant="outline"
        className={stacked ? "w-full" : undefined}
        disabled={isBusy || apiUnavailable}
        onClick={() => onAction(festaId, "recusar")}
      >
        <X className="mr-1 size-3.5" />
        Recusar
      </Button>
      <Button
        type="button"
        size={stacked ? "default" : "sm"}
        className={stacked ? "w-full" : undefined}
        disabled={isBusy || apiUnavailable}
        onClick={() => onAction(festaId, "aprovar")}
      >
        <Check className="mr-1 size-3.5" />
        Aprovar
      </Button>
    </div>
  );
}

function AprovacaoCard({
  festa,
  isBusy,
  apiUnavailable,
  onAction,
}: {
  festa: FestaDescontoPendente;
  isBusy: boolean;
  apiUnavailable: boolean;
  onAction: (festaId: string, action: "aprovar" | "recusar") => void;
}) {
  const valorOriginal = festa.valorOriginal ?? festa.valor;

  return (
    <article className="rounded-2xl p-4 neo-sm">
      <div>
        <p className="font-medium text-foreground">{festa.tema}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{festa.endereco}</p>
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Cliente</dt>
          <dd className="text-right font-medium text-foreground">
            {festa.cliente.nome}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Vendedor</dt>
          <dd className="text-right text-foreground">{festa.vendedor.nome}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Solicitante</dt>
          <dd className="text-right text-foreground">
            {festa.descontoSolicitadoPor?.nome ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Valor original</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatCurrency(valorOriginal)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Desconto</dt>
          <dd className="text-right font-medium tabular-nums text-balloon-pink">
            {formatPercent(festa.descontoPercentual)}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <AprovacaoActions
          festaId={festa.id}
          isBusy={isBusy}
          apiUnavailable={apiUnavailable}
          onAction={onAction}
          layout="stacked"
        />
      </div>
    </article>
  );
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

  const emptyMessage =
    apiUnavailable
      ? "Aguardando conexão com a API…"
      : "Nenhum desconto pendente de aprovação.";

  return (
    <div className="min-w-0 space-y-4">
      {apiUnavailable ? (
        <div className="rounded-2xl border border-balloon-sun/35 bg-balloon-sun/10 px-4 py-3 text-sm text-foreground neo-sm">
          <p className="font-medium text-balloon-sun">API de descontos indisponível</p>
          <p className="mt-1 opacity-90">
            A interface está pronta; quando o backend responder, as aprovações
            aparecerão aqui automaticamente.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          {error}
        </div>
      ) : null}

      <div className="md:hidden">
        {pendentes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {pendentes.map((festa) => (
              <AprovacaoCard
                key={festa.id}
                festa={festa}
                isBusy={pending && actionId === festa.id}
                apiUnavailable={apiUnavailable}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block">
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
                  {emptyMessage}
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
                    <TableCell className="font-medium text-balloon-pink">
                      {formatPercent(festa.descontoPercentual)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AprovacaoActions
                        festaId={festa.id}
                        isBusy={isBusy}
                        apiUnavailable={apiUnavailable}
                        onAction={handleAction}
                      />
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
