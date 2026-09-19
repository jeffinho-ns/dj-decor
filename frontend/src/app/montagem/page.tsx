import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OfflineQueueSync } from "@/components/layout/offline-queue-sync";
import { MontagemHoje } from "@/components/montagem/montagem-hoje";
import { MontagemOperacaoPainel } from "@/components/montagem/montagem-operacao-painel";
import { listFestas, listOsHoje, listOsMine, listOsOperacao } from "@/lib/api";
import { festasDoDia } from "@/lib/montagem";
import {
  normalizarListaMontagem,
  normalizarListaMontagemFromOs,
  type MontagemListaItem,
} from "@/lib/montagem-os";
import { requireSession } from "@/lib/session";
import type { OperacaoPainelItem } from "@/types/os";

export const dynamic = "force-dynamic";

export default async function MontagemPage() {
  const { token, user } = await requireSession();

  let itens: MontagemListaItem[] = [];
  let operacao: OperacaoPainelItem[] = [];
  let loadError: string | null = null;
  const isMontador = user.role === "MONTADOR";

  try {
    const [listaResult, operacaoResult] = await Promise.all([
      isMontador ? listOsMine(token) : listOsHoje(token),
      listOsOperacao(token).catch(() => [] as OperacaoPainelItem[]),
    ]);
    operacao = operacaoResult;
    if (isMontador) {
      itens = normalizarListaMontagemFromOs(
        listaResult as Awaited<ReturnType<typeof listOsMine>>
      );
    } else {
      itens = normalizarListaMontagem(
        listaResult as Awaited<ReturnType<typeof listOsHoje>>
      );
    }
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
        pegueEMonte: Boolean(festa.pegueEMonte),
        prontoRetirada: false,
        retiradoClienteEm: null,
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
      description={
        isMontador
          ? "Suas montagens dos próximos dias — toque para iniciar o fluxo."
          : "Ordens de serviço do dia — toque para iniciar o fluxo."
      }
    >
      <OfflineQueueSync token={token} className="mb-4" />
      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          <p className="font-medium">Não foi possível carregar os dados</p>
          <p className="mt-1 opacity-90">{loadError}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-lg space-y-5">
          <MontagemOperacaoPainel token={token} inicial={operacao} />
          <MontagemHoje
            itens={itens}
            token={token}
            modo={isMontador ? "proximas" : "hoje"}
          />
        </div>
      )}
    </DashboardShell>
  );
}
