import { redirect } from "next/navigation";

import { CarteiraComissoes } from "@/components/comissoes/carteira-comissoes";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ComissaoRankingSection } from "@/components/vendas/comissao-ranking-widget";
import { getComissaoRanking, listMinhasComissoes } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { ComissaoExtrato, ComissaoRanking } from "@/types/financeiro";

export const dynamic = "force-dynamic";

export default async function ComissoesPage() {
  const { token, user } = await requireSession();

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }

  const podeVerRanking = user.role === "GERENTE" || user.role === "ADMIN";

  let comissoes: ComissaoExtrato[] = [];
  let ranking: ComissaoRanking | null = null;
  let error: string | null = null;

  try {
    comissoes = await listMinhasComissoes(token);
    if (podeVerRanking) {
      ranking = await getComissaoRanking(token, "semana").catch(() => null);
    }
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Falha ao carregar comissões da API";
  }

  return (
    <DashboardShell
      user={user}
      title="Comissões"
      description={
        podeVerRanking
          ? "Seu extrato por período e ranking da equipe."
          : "Só você vê quanto tem a receber — por semana, 15 dias ou mês."
      }
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Não foi possível carregar as comissões</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : (
        <CarteiraComissoes
          token={token}
          comissoes={comissoes}
          showRankingSlot={
            ranking ? (
              <section className="rounded-2xl neo-sm p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Ranking da equipe
                </p>
                <h2 className="mt-1 font-display text-lg">Comissões da semana</h2>
                <div className="mt-4">
                  <ComissaoRankingSection ranking={ranking} />
                </div>
              </section>
            ) : null
          }
        />
      )}
    </DashboardShell>
  );
}
