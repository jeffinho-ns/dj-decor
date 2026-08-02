import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PlusCircle } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { ComissaoRankingWidget } from "@/components/vendas/comissao-ranking-widget";
import { KanbanBoard } from "@/components/vendas/kanban-board";
import { VendasEscopoToggle } from "@/components/vendas/vendas-escopo-toggle";
import { getComissaoRanking, listFestas } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Festa } from "@/types/festa";
import type { ComissaoRanking } from "@/types/financeiro";

export const dynamic = "force-dynamic";

interface VendasPageProps {
  searchParams: Promise<{ minhas?: string }>;
}

function resolveMinhas(
  role: string,
  minhasParam: string | undefined
): boolean {
  if (minhasParam === "1") return true;
  if (minhasParam === "0") return false;
  return role === "VENDEDOR";
}

export default async function VendasPage({ searchParams }: VendasPageProps) {
  const { token, user } = await requireSession();

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }

  const params = await searchParams;
  const minhas = resolveMinhas(user.role, params.minhas);

  let festas: Festa[] = [];
  let comissaoRanking: ComissaoRanking | null = null;
  let error: string | null = null;
  try {
    festas = await listFestas(token, { minhas });
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Falha ao carregar vendas da API";
  }

  if (
    !error &&
    (user.role === "VENDEDOR" ||
      user.role === "GERENTE" ||
      user.role === "ADMIN")
  ) {
    try {
      comissaoRanking = await getComissaoRanking(token, "semana");
    } catch {
      comissaoRanking = null;
    }
  }

  return (
    <DashboardShell
      user={user}
      title="Vendas"
      description={
        minhas
          ? "Suas vendas no funil Kanban — registre PIX e avance o pedido."
          : "Funil Kanban por status — registre PIX e avance o pedido."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <VendasEscopoToggle minhas={minhas} />
          </Suspense>
          <Link
            href="/vendas/nova"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "gap-1.5"
            )}
          >
            <PlusCircle className="size-4" />
            <span className="hidden sm:inline">Nova Venda</span>
            <span className="sm:hidden">Nova</span>
          </Link>
        </div>
      }
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Não foi possível carregar as vendas</p>
          <p className="mt-1 opacity-90">{error}</p>
          <p className="mt-2 text-xs opacity-80">
            Confirme se a API está rodando e se{" "}
            <code className="rounded bg-destructive/15 px-1">
              NEXT_PUBLIC_API_URL
            </code>{" "}
            está correta.
          </p>
        </div>
      ) : null}

      {comissaoRanking ? (
        <div className="mb-6">
          <ComissaoRankingWidget
            ranking={comissaoRanking}
            vendedorId={user.id}
          />
        </div>
      ) : null}

      <KanbanBoard festas={festas} token={token} />
    </DashboardShell>
  );
}
