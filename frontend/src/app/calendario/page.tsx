import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { CalendarioAgenda } from "@/components/calendario/calendario-agenda";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { listFestas } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Festa } from "@/types/festa";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const { token, user } = await requireSession();

  let festas: Festa[] = [];
  let loadError: string | null = null;

  try {
    festas = await listFestas(token);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar as festas";
  }

  return (
    <DashboardShell
      user={user}
      title="Calendário"
      description="Veja quantas festas há em cada dia, horários de montagem e início."
      actions={
        <Link
          href="/vendas/nova"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "gap-1.5"
          )}
        >
          <PlusCircle className="size-4" />
          Nova Venda
        </Link>
      }
    >
      {loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Não foi possível carregar o calendário</p>
          <p className="mt-1 opacity-90">{loadError}</p>
        </div>
      ) : (
        <CalendarioAgenda festas={festas} />
      )}
    </DashboardShell>
  );
}
