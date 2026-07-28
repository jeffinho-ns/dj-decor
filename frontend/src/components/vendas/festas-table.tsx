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
  ORCAMENTO: "bg-balloon-sun/12 text-balloon-sun shadow-[var(--shadow-neo-sm)]",
  AGUARDANDO_PAGAMENTO: "bg-balloon-sky/12 text-balloon-sky shadow-[var(--shadow-neo-sm)]",
  PAGO: "bg-balloon-mint/12 text-balloon-mint shadow-[var(--shadow-neo-sm)]",
  FECHADO: "bg-balloon-lilac/12 text-balloon-lilac shadow-[var(--shadow-neo-sm)]",
  EM_MONTAGEM: "bg-balloon-pink/12 text-balloon-pink shadow-[var(--shadow-neo-sm)]",
  CONCLUIDO: "bg-balloon-mint/12 text-balloon-mint shadow-[var(--shadow-neo-sm)]",
  CANCELADO: "bg-destructive/12 text-destructive shadow-[var(--shadow-neo-sm)]",
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

function FestaCardMobile({ festa }: { festa: Festa }) {
  return (
    <article className="rounded-2xl neo-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{festa.cliente.nome}</p>
          <p className="text-xs text-muted-foreground">{festa.cliente.telefone}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            statusClass[festa.status]
          )}
        >
          {statusLabel[festa.status]}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Decoração
          </p>
          <p className="text-foreground">{festa.tema}</p>
          {festa.kitCatalogo || festa.pegueEMonte ? (
            <p className="mt-0.5 text-xs text-balloon-sky">
              {nomeDoKit(festa.kitCatalogo) ?? "Kit personalizado"}
              {festa.pegueEMonte ? " · Pegue e monte" : ""}
            </p>
          ) : null}
          {festa.itensExtras?.length ? (
            <p className="mt-0.5 text-xs text-muted-foreground/80">
              + {festa.itensExtras.join(", ")}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-medium uppercase tracking-wider text-muted-foreground">
              Tamanho
            </p>
            <p className="mt-0.5 text-foreground">
              {tamanhoLabel[festa.tamanhoDecoracao] ?? festa.tamanhoDecoracao}
            </p>
          </div>
          <div>
            <p className="font-medium uppercase tracking-wider text-muted-foreground">
              Valor
            </p>
            <p className="mt-0.5 tabular-nums text-balloon-sun">
              {formatCurrency(festa.valor)}
            </p>
          </div>
          <div>
            <p className="font-medium uppercase tracking-wider text-muted-foreground">
              Data / festa
            </p>
            <p className="mt-0.5 text-foreground">
              {format(new Date(festa.dataEvento), "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
          <div>
            <p className="font-medium uppercase tracking-wider text-muted-foreground">
              Montagem
            </p>
            <p className="mt-0.5 text-foreground">
              {format(new Date(festa.horarioMontagem), "HH:mm", {
                locale: ptBR,
              })}
            </p>
          </div>
        </div>

        {festa.observacoes ? (
          <p className="text-xs text-muted-foreground/80">
            Obs.: {festa.observacoes}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function FestasTable({ festas }: FestasTableProps) {
  if (festas.length === 0) {
    return (
      <div className="rounded-2xl neo-inset px-6 py-16 text-center">
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
    <>
      <div className="space-y-3 md:hidden">
        {festas.map((festa) => (
          <FestaCardMobile key={festa.id} festa={festa} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl neo-sm md:block">
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
                className="hover:bg-balloon-pink/[0.04]"
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
                    <p className="mt-0.5 text-xs text-balloon-sky">
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
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
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
    </>
  );
}
