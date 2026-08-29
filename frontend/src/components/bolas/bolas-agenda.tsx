"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Balloon, MapPin, Clock3 } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PedidoBolas, StatusPedidoBolas } from "@/types/bolas";

const statusLabel: Record<StatusPedidoBolas, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADO: "Confirmado",
  EM_MONTAGEM: "Em montagem",
  MONTADO: "Montado",
  DESMONTADO: "Desmontado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

interface BolasAgendaProps {
  pedidos: PedidoBolas[];
  loadError?: string | null;
}

export function BolasAgenda({ pedidos, loadError }: BolasAgendaProps) {
  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <Balloon className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Nenhum serviço de bolas na agenda
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Festas com bolas ou serviços externos aparecem aqui.
        </p>
        <Link
          href="/bolas/novo"
          className="mt-4 inline-flex text-sm text-champagne hover:underline"
        >
          Cadastrar serviço externo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pedidos.map((pedido) => (
        <Link
          key={pedido.id}
          href={`/bolas/${pedido.id}`}
          className="block rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-champagne/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{pedido.clienteNome}</p>
              <p className="text-sm text-champagne">{pedido.tema}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pedido.festaId ? "Festa DJ Decor" : "Serviço externo"}
                {pedido.itens?.length
                  ? ` · ${pedido.itens.map((i) => i.nome).join(", ")}`
                  : ""}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md bg-champagne/12 px-2 py-0.5 text-[11px] font-medium text-champagne"
              )}
            >
              {statusLabel[pedido.status]}
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Clock3 className="size-3.5 text-champagne/80" />
              {format(parseISO(pedido.dataEvento), "dd/MM/yyyy", { locale: ptBR })}
              {" · montagem "}
              {format(parseISO(pedido.horarioMontagem), "HH:mm")}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-3.5 text-champagne/80" />
              <span className="truncate">{pedido.endereco}</span>
            </li>
            <li className="tabular-nums text-foreground">
              Seu valor: {formatCurrency(pedido.valorTabela)}
              <span className="text-muted-foreground">
                {" "}
                · cliente {formatCurrency(pedido.valorCliente)}
              </span>
            </li>
          </ul>
        </Link>
      ))}
    </div>
  );
}
