import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { QrAlertasStrip } from "@/components/dashboard/qr-alertas-strip";
import { CalendarioAgenda } from "@/components/calendario/calendario-agenda";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OfflineQueueSync } from "@/components/layout/offline-queue-sync";
import { buttonVariants } from "@/components/ui/button";
import { listAlertasQr, listFestas } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Festa } from "@/types/festa";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { token, user } = await requireSession();

  let festas: Festa[] = [];
  let loadError: string | null = null;
  let alertasQrCount = 0;

  const canSeeQrAlertas =
    user.role === "ADMIN" || user.role === "GERENTE";

  try {
    const results = await Promise.all([
      listFestas(token),
      canSeeQrAlertas
        ? listAlertasQr(token).catch(() => [] as Awaited<ReturnType<typeof listAlertasQr>>)
        : Promise.resolve([]),
    ]);
    festas = results[0];
    alertasQrCount = results[1].length;
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar as festas";
  }

  return (
    <DashboardShell
      user={user}
      title="Agenda"
      description="Festas do mês, status e horários de montagem."
      actions={
        user.role === "MONTADOR" ? undefined : (
          <Link
            href="/vendas/nova"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "hidden gap-1.5 sm:inline-flex"
            )}
          >
            <PlusCircle className="size-4" />
            Nova Venda
          </Link>
        )
      }
    >
      <OfflineQueueSync token={token} className="mb-4" />
      {loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Não foi possível carregar a agenda</p>
          <p className="mt-1 opacity-90">{loadError}</p>
        </div>
      ) : (
        <>
          {canSeeQrAlertas ? (
            <QrAlertasStrip count={alertasQrCount} />
          ) : null}
          <CalendarioAgenda festas={festas} />
        </>
      )}
    </DashboardShell>
  );
}
