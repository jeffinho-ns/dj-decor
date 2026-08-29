"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { marcarRepasseBolas } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { BolasFinanceiroResumo } from "@/types/bolas";
import type { Role } from "@/types/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BolasFinanceiroPainelProps {
  resumo: BolasFinanceiroResumo;
  token: string;
  role: Role;
}

export function BolasFinanceiroPainel({
  resumo,
  token,
  role,
}: BolasFinanceiroPainelProps) {
  const router = useRouter();
  const isGestao = role === "ADMIN" || role === "GERENTE";
  const [busyId, setBusyId] = useState<string | null>(null);

  async function pagar(id: string) {
    setBusyId(id);
    try {
      await marcarRepasseBolas(id, { pago: true }, token);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">A receber</p>
          <p className="mt-1 font-display text-xl tabular-nums text-champagne">
            {formatCurrency(resumo.aReceber.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {resumo.aReceber.quantidade} serviço(s)
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Já repassado</p>
          <p className="mt-1 font-display text-xl tabular-nums">
            {formatCurrency(resumo.pagos.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {resumo.pagos.quantidade} serviço(s)
          </p>
        </div>
        {isGestao ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs text-muted-foreground">Taxa empresa (10%)</p>
            <p className="mt-1 font-display text-xl tabular-nums">
              {formatCurrency(resumo.taxaEmpresaTotal)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs text-muted-foreground">Seu total bruto</p>
            <p className="mt-1 font-display text-xl tabular-nums">
              {formatCurrency(resumo.aReceber.total + resumo.pagos.total)}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/40 p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-champagne/80">
          Pendentes de repasse
        </p>
        <ul className="mt-3 space-y-2">
          {resumo.aReceber.itens.length === 0 ? (
            <li className="text-sm text-muted-foreground">Nada pendente.</li>
          ) : (
            resumo.aReceber.itens.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <div>
                  <Link
                    href={`/bolas/${item.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {item.clienteNome} — {item.tema}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(item.dataEvento), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}{" "}
                    · {formatCurrency(item.valorTabela)}
                    {" · pag. cliente "}
                    {item.statusPagamentoCliente}
                  </p>
                </div>
                {isGestao ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => pagar(item.id)}
                  >
                    Marcar pago
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
