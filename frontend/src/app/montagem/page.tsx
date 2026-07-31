import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OfflineQueueSync } from "@/components/layout/offline-queue-sync";
import { MontagemHoje } from "@/components/montagem/montagem-hoje";
import { listFestas, listOsHoje } from "@/lib/api";
import { festasDoDia } from "@/lib/montagem";
import { normalizarListaMontagem, type MontagemListaItem } from "@/lib/montagem-os";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MontagemPage() {
  const { token, user } = await requireSession();

  let itens: MontagemListaItem[] = [];
  let loadError: string | null = null;

  try {
    const festasOs = await listOsHoje(token);
    itens = normalizarListaMontagem(festasOs);
  } catch {
    try {
      const festas = await listFestas(token);
      const hoje = festasDoDia(festas);
      itens = hoje.map((festa) => ({
        osId: null,
        festaId: festa.id,
        clienteNome: festa.cliente?.nome ?? "—",
        tema: festa.tema || "—",
        endereco: festa.endereco || "—",
        horarioMontagem: festa.horarioMontagem,
        dataEvento: festa.dataEvento,
        statusOs: null,
        romaneioConcluido: false,
        montagemLocalConcluida: false,
        checkinAt: null,
        itensPendentes: 0,
        totalItens: 0,
      }));
    } catch (error) {
      loadError =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as montagens";
    }
  }

  return (
    <DashboardShell
      user={user}
      title="Montagem"
      description="Ordens de serviço do dia — toque para iniciar o fluxo."
    >
      <OfflineQueueSync token={token} className="mb-4" />
      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          <p className="font-medium">Não foi possível carregar os dados</p>
          <p className="mt-1 opacity-90">{loadError}</p>
        </div>
      ) : (
        <MontagemHoje itens={itens} token={token} />
      )}
    </DashboardShell>
  );
}
