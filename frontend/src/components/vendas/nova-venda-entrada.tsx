"use client";

import { useState } from "react";
import { Balloon, PartyPopper } from "lucide-react";

import { NovaVendaForm } from "@/components/vendas/nova-venda-form";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/auth";
import type { CatalogoBola } from "@/types/bolas";

export type NovaVendaModo = "decoracao" | "bolas";

interface NovaVendaEntradaProps {
  token: string;
  initialClienteId?: string | null;
  viewerRole: Role;
  enderecoEmpresaInicial?: string | null;
  catalogoBolas: CatalogoBola[];
  markupBolasPercentual: number;
}

export function NovaVendaEntrada({
  token,
  initialClienteId,
  viewerRole,
  enderecoEmpresaInicial,
  catalogoBolas,
  markupBolasPercentual,
}: NovaVendaEntradaProps) {
  const [modo, setModo] = useState<NovaVendaModo | null>(null);

  if (!modo) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">
          O que você está vendendo neste atendimento?
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setModo("decoracao")}
            className={cn(
              "flex min-h-[7rem] flex-col items-start gap-2 rounded-2xl neo-sm p-5 text-left transition-all hover:brightness-[1.02]"
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-xl neo-pink">
              <PartyPopper className="size-5" />
            </span>
            <span className="font-display text-xl text-foreground">
              Decoração
            </span>
            <span className="text-sm text-muted-foreground">
              Kit, tema e opcionalmente bolas junto.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setModo("bolas")}
            className={cn(
              "flex min-h-[7rem] flex-col items-start gap-2 rounded-2xl neo-sm p-5 text-left transition-all hover:brightness-[1.02]"
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-xl neo-sky">
              <Balloon className="size-5" />
            </span>
            <span className="font-display text-xl text-foreground">
              Só bolas
            </span>
            <span className="text-sm text-muted-foreground">
              Venda apenas de bolas ornamentadas (sem decoração).
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
        onClick={() => setModo(null)}
      >
        ← Trocar tipo de venda
      </button>
      <NovaVendaForm
        token={token}
        initialClienteId={initialClienteId}
        viewerRole={viewerRole}
        enderecoEmpresaInicial={enderecoEmpresaInicial}
        catalogoBolas={catalogoBolas}
        markupBolasPercentual={markupBolasPercentual}
        modo={modo}
      />
    </div>
  );
}
