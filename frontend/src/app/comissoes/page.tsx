import { redirect } from "next/navigation";

import { CarteiraComissoes } from "@/components/comissoes/carteira-comissoes";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getComissaoRanking, listMinhasComissoes } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { ComissaoExtrato, ComissaoRanking } from "@/types/financeiro";

export const dynamic = "force-dynamic";

export default async function ComissoesPage() {
  const { token, user } = await requireSession();

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }

  let comissoes: ComissaoExtrato[] = [];
  let ranking: ComissaoRanking | null = null;
  let error: string | null = null;

  try {
    [comissoes, ranking] = await Promise.all([
      listMinhasComissoes(token),
      getComissaoRanking(token, "semana").catch(() => null),
    ]);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Falha ao carregar comissões da API";
  }

  return (
    <DashboardShell
      user={user}
      title="Comissões"
      description="Extrato, totais e progresso da sua meta semanal."
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Não foi possível carregar as comissões</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : (
        <CarteiraComissoes
          comissoes={comissoes}
          ranking={ranking}
          vendedorId={user.id}
        />
      )}
    </DashboardShell>
  );
}
