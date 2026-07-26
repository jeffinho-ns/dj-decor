import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { FestasTable } from "@/components/vendas/festas-table";
import { buttonVariants } from "@/components/ui/button";
import { listFestas } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Festa } from "@/types/festa";

export const dynamic = "force-dynamic";

async function loadFestas(): Promise<{ festas: Festa[]; error: string | null }> {
  try {
    const festas = await listFestas();
    return { festas, error: null };
  } catch (error) {
    return {
      festas: [],
      error:
        error instanceof Error
          ? error.message
          : "Falha ao carregar vendas da API",
    };
  }
}

export default async function VendasPage() {
  const { festas, error } = await loadFestas();

  return (
    <DashboardShell
      title="Vendas"
      description="Acompanhe os orçamentos e festas fechadas."
      actions={
        <Link
          href="/vendas/nova"
          className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
        >
          <PlusCircle className="size-4" />
          Nova Venda
        </Link>
      }
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Não foi possível carregar as vendas</p>
          <p className="mt-1 opacity-90">{error}</p>
          <p className="mt-2 text-xs opacity-80">
            Confirme se a API está rodando e se{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_API_URL</code>{" "}
            está correta.
          </p>
        </div>
      ) : null}

      <FestasTable festas={festas} />
    </DashboardShell>
  );
}
