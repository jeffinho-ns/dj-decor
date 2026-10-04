import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MontagemOperacaoPainel } from "@/components/montagem/montagem-operacao-painel";
import { listOsOperacao } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { OperacaoPainelItem } from "@/types/os";

export const dynamic = "force-dynamic";

export default async function DesmontagemPage() {
  const { token, user } = await requireSession();

  let operacao: OperacaoPainelItem[] = [];
  let loadError: string | null = null;

  try {
    operacao = await listOsOperacao(token);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar a desmontagem";
  }

  const podeTrocarEquipe =
    user.role === "ADMIN" ||
    user.role === "GERENTE" ||
    user.role === "VENDEDOR";

  return (
    <DashboardShell
      user={user}
      title="Desmontagem"
      description="Festas com montagem no local já registrada. Abra a ordem para marcar o retorno ao depósito."
    >
      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          <p className="font-medium">Não foi possível carregar a fila</p>
          <p className="mt-1 opacity-90">{loadError}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-lg">
          <MontagemOperacaoPainel
            token={token}
            inicial={operacao.filter((item) => item.fase === "desmontar")}
            podeTrocarEquipe={podeTrocarEquipe}
            somenteDesmontagem
          />
        </div>
      )}
    </DashboardShell>
  );
}
