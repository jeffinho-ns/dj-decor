"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { nomeDoKit } from "@/lib/catalogo-kits";
import { cn } from "@/lib/utils";
import type { Festa, StatusFesta, TamanhoDecoracao } from "@/types/festa";

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusClass: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-champagne/12 text-champagne",
  AGUARDANDO_PAGAMENTO: "bg-amber-500/14 text-amber-300",
  PAGO: "bg-emerald-500/14 text-emerald-300",
  FECHADO: "bg-status-closed/14 text-status-closed",
  EM_MONTAGEM: "bg-sky-500/14 text-sky-300",
  CONCLUIDO: "bg-status-done/14 text-status-done",
  CANCELADO: "bg-destructive/14 text-destructive",
};

const tamanhoLabel: Record<TamanhoDecoracao, string> = {
  P: "P",
  M: "M",
  G: "G",
  GG: "GG",
};

interface FestasTableProps {
  festas: Festa[];
}

export function FestasTable({ festas }: FestasTableProps) {
  if (festas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">
          Nenhuma venda encontrada
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre a primeira festa em Nova Venda.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/40">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Cliente</TableHead>
            <TableHead>Decoração</TableHead>
            <TableHead>Tam.</TableHead>
            <TableHead>Data / festa</TableHead>
            <TableHead>Montagem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {festas.map((festa) => (
            <TableRow
              key={festa.id}
              className="border-border/60 hover:bg-champagne/[0.03]"
            >
              <TableCell>
                <p className="font-medium text-foreground">
                  {festa.cliente.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {festa.cliente.telefone}
                </p>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <p>{festa.tema}</p>
                {festa.kitCatalogo || festa.pegueEMonte ? (
                  <p className="mt-0.5 text-xs text-champagne/90">
                    {nomeDoKit(festa.kitCatalogo) ?? "Kit personalizado"}
                    {festa.pegueEMonte ? " · Pegue e monte" : ""}
                  </p>
                ) : null}
                {festa.itensExtras?.length ? (
                  <p className="mt-0.5 text-xs text-muted-foreground/80">
                    + {festa.itensExtras.join(", ")}
                  </p>
                ) : null}
                {festa.observacoes ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/70">
                    Obs.: {festa.observacoes}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tamanhoLabel[festa.tamanhoDecoracao] ?? festa.tamanhoDecoracao}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(festa.dataEvento), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(festa.horarioMontagem), "HH:mm", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                    statusClass[festa.status]
                  )}
                >
                  {statusLabel[festa.status]}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-foreground">
                {formatCurrency(festa.valor)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
