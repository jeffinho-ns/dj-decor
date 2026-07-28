import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { KanbanBoard } from "@/components/vendas/kanban-board";
import { listFestas } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Festa } from "@/types/festa";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const { token, user } = await requireSession();

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }

  let festas: Festa[] = [];
  let error: string | null = null;
  try {
    festas = await listFestas(token);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Falha ao carregar vendas da API";
  }

  return (
    <DashboardShell
      user={user}
      title="Vendas"
      description="Funil Kanban por status — registre PIX e avance o pedido."
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
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

      <KanbanBoard festas={festas} token={token} />
    </DashboardShell>
  );
}
