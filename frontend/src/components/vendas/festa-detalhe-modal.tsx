"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock3,
  MapPin,
  Package,
  Phone,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CompraEstoqueBadge } from "@/components/vendas/compra-estoque-badge";
import { DescontoBadge } from "@/components/vendas/desconto-badge";
import { FestaItensEditor } from "@/components/vendas/festa-itens-editor";
import { FestaGaleriaEditor } from "@/components/vendas/festa-galeria-editor";
import { RiscoBadge } from "@/components/vendas/risco-badge";
import { formatCurrency } from "@/lib/format";
import { nomeDoKit } from "@/lib/catalogo-kits";
import { cn } from "@/lib/utils";
import type { Festa, StatusFesta } from "@/types/festa";

const statusLabel: Record<StatusFesta, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  FECHADO: "Fechado",
  EM_MONTAGEM: "Em montagem",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const statusBadge: Record<StatusFesta, string> = {
  ORCAMENTO: "bg-balloon-sun/12 text-balloon-sun",
  AGUARDANDO_PAGAMENTO: "bg-balloon-sky/12 text-balloon-sky",
  PAGO: "bg-balloon-mint/12 text-balloon-mint",
  FECHADO: "bg-balloon-lilac/12 text-balloon-lilac",
  EM_MONTAGEM: "bg-balloon-pink/12 text-balloon-pink",
  CONCLUIDO: "bg-balloon-mint/12 text-balloon-mint",
  CANCELADO: "bg-destructive/14 text-destructive",
};

interface FestaDetalheModalProps {
  festa: Festa | null;
  open: boolean;
  onClose: () => void;
  token?: string | null;
  canEdit?: boolean;
  onUpdated?: (festa: Festa) => void;
}

export function FestaDetalheModal({
  festa,
  open,
  onClose,
  token,
  canEdit = false,
  onUpdated,
}: FestaDetalheModalProps) {
  const [current, setCurrent] = useState<Festa | null>(festa);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrent(festa);
  }, [festa]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !current || !mounted) return null;

  function handleUpdated(updated: Festa) {
    setCurrent(updated);
    onUpdated?.(updated);
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#2a3142]/55 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`festa-modal-${current.id}`}
        className={cn(
          "relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl neo md:rounded-3xl",
          "mb-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom,0px)+0.75rem)]",
          "max-h-[min(88dvh,calc(100dvh-var(--mobile-nav-h)-env(safe-area-inset-bottom,0px)-1.75rem))]",
          "md:mb-0 md:max-h-[min(92dvh,720px)]"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/40 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[11px] font-medium",
                  statusBadge[current.status]
                )}
              >
                {statusLabel[current.status]}
              </span>
              <DescontoBadge
                status={current.descontoStatus}
                percentual={current.descontoPercentual}
              />
              <CompraEstoqueBadge
                alerta={current.alertaCompraEstoque}
                itensFalta={current.itensFaltaEstoque}
              />
              <RiscoBadge risco={current.risco} />
            </div>
            <h2
              id={`festa-modal-${current.id}`}
              className="font-display text-xl text-foreground"
            >
              {current.cliente.nome}
            </h2>
            <p className="text-sm text-balloon-pink">{current.tema}</p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Fechar detalhes"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-8 sm:px-5 sm:pb-5">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-balloon-sky" />
              <span className="min-w-0">
                Montagem{" "}
                <span className="font-medium text-foreground">
                  {format(parseISO(current.horarioMontagem), "dd/MM HH:mm", {
                    locale: ptBR,
                  })}
                </span>
                <span className="text-muted-foreground/60"> · </span>
                Festa{" "}
                <span className="font-medium text-foreground">
                  {format(parseISO(current.dataEvento), "dd/MM HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-balloon-mint" />
              <span className="font-medium text-foreground">
                {current.cliente.telefone || "—"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <UserRound className="size-4 shrink-0 text-balloon-lilac" />
              Vendedor{" "}
              <span className="font-medium text-foreground">
                {current.vendedor?.nome ?? "—"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Wallet className="size-4 shrink-0 text-balloon-sun" />
              <span className="font-medium tabular-nums text-balloon-sun">
                {formatCurrency(current.valor)}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Package className="mt-0.5 size-4 shrink-0 text-balloon-pink" />
              <span className="min-w-0 break-words">
                Tamanho{" "}
                <span className="font-medium text-foreground">
                  {current.tamanhoDecoracao}
                </span>
                {current.kitCatalogo || current.pegueEMonte ? (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    · {nomeDoKit(current.kitCatalogo) ?? "Personalizado"}
                    {current.pegueEMonte ? " · Pegue e monte" : ""}
                  </span>
                ) : null}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-balloon-sky" />
              <span className="min-w-0 break-words">{current.endereco}</span>
            </li>
          </ul>

          {current.itensFaltaEstoque && current.itensFaltaEstoque.length > 0 ? (
            <div className="rounded-xl border border-balloon-sun/30 bg-balloon-sun/10 px-3 py-2 text-xs text-foreground">
              <p className="font-semibold text-balloon-sun">
                Comprar com antecedência
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {current.itensFaltaEstoque.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {current.observacoes ? (
            <p className="rounded-xl neo-inset px-3 py-2 text-xs text-muted-foreground">
              Obs.: {current.observacoes}
            </p>
          ) : null}

          {canEdit && token ? (
            <>
              <FestaItensEditor
                festa={current}
                token={token}
                onUpdated={handleUpdated}
              />
              <FestaGaleriaEditor festaId={current.id} token={token} />
            </>
          ) : (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Itens
              </p>
              {current.itensExtras?.length ? (
                <ul className="space-y-1.5">
                  {current.itensExtras.map((item) => (
                    <li
                      key={item}
                      className="rounded-xl neo-inset px-3 py-2 text-sm"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem itens listados.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
