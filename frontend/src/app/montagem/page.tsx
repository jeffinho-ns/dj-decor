import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MontagemHoje } from "@/components/montagem/montagem-hoje";
import { listFestas } from "@/lib/api";
import { festasDoDia } from "@/lib/montagem";
import { requireSession } from "@/lib/session";
import type { Festa } from "@/types/festa";

export const dynamic = "force-dynamic";

export default async function MontagemPage() {
  const { token, user } = await requireSession();

  let festas: Festa[] = [];
  let loadError: string | null = null;

  try {
    festas = await listFestas(token);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar as montagens";
  }

  const festasHoje = festasDoDia(festas);

  return (
    <DashboardShell
      user={user}
      title="Montagem"
      description="Confira as festas do dia e o checklist de montagem."
    >
      {loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Não foi possível carregar os dados</p>
          <p className="mt-1 opacity-90">{loadError}</p>
        </div>
      ) : (
        <MontagemHoje festas={festasHoje} />
      )}
    </DashboardShell>
  );
}
