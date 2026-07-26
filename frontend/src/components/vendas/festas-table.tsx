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
import type { Festa, StatusFesta } from "@/types/festa";
import { cn } from "@/lib/utils";

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  FECHADO: "Fechado",
  CONCLUIDO: "Concluído",
};

const statusClass: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-amber-100 text-amber-800",
  FECHADO: "bg-sky-100 text-sky-800",
  CONCLUIDO: "bg-emerald-100 text-emerald-800",
};

function formatCurrency(value: string | number): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}

interface FestasTableProps {
  festas: Festa[];
}

export function FestasTable({ festas }: FestasTableProps) {
  if (festas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-6 py-16 text-center">
        <p className="text-sm font-medium">Nenhuma venda encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre a primeira festa em Nova Venda.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
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
            <TableRow key={festa.id}>
              <TableCell className="font-medium">{festa.cliente.nome}</TableCell>
              <TableCell>{festa.cliente.telefone}</TableCell>
              <TableCell>{festa.tema}</TableCell>
              <TableCell>
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
              <TableCell className="text-right tabular-nums">
                {formatCurrency(festa.valor)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
