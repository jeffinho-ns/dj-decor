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
import { cn } from "@/lib/utils";
import type { Festa, StatusFesta } from "@/types/festa";

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  FECHADO: "Fechado",
  CONCLUIDO: "Concluído",
};

const statusClass: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-champagne/12 text-champagne",
  FECHADO: "bg-status-closed/14 text-status-closed",
  CONCLUIDO: "bg-status-done/14 text-status-done",
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
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/40">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Cliente</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Tema</TableHead>
            <TableHead>Data do evento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {festas.map((festa) => (
            <TableRow key={festa.id} className="border-border/60 hover:bg-champagne/[0.03]">
              <TableCell className="font-medium text-foreground">
                {festa.cliente.nome}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {festa.cliente.telefone}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {festa.tema}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(festa.dataEvento), "dd/MM/yyyy", {
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
