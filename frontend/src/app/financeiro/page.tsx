import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FinanceiroPainel } from "@/components/financeiro/financeiro-painel";
import { ComissoesPagar } from "@/components/financeiro/comissoes-pagar";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getComissaoRanking,
  getFinanceiroPrevisao,
  getFinanceiroResumo,
} from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { ComissaoRanking, FinanceiroResumo, PrevisaoCaixa } from "@/types/financeiro";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financeiro | DJ festas",
};

export default async function FinanceiroPage() {
  const { token, user } = await requireSession();

  if (user.role !== "ADMIN" && user.role !== "GERENTE") {
    redirect(user.role === "MONTADOR" ? "/montagem" : "/dashboard");
  }

  let resumo: FinanceiroResumo | null = null;
  let previsao: PrevisaoCaixa | null = null;
  let comissaoRanking: ComissaoRanking | null = null;
  let error: string | null = null;

  try {
    const results = await Promise.all([
      getFinanceiroResumo(token),
      getFinanceiroPrevisao(token, 30),
    ]);
    resumo = results[0];
    previsao = results[1];
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Falha ao carregar resumo financeiro da API";
  }

  if (!error) {
    try {
      comissaoRanking = await getComissaoRanking(token, "semana");
    } catch {
      comissaoRanking = null;
    }
  }

  return (
    <DashboardShell
      user={user}
      title="Financeiro"
      description="Fluxo de caixa, rentabilidade por tema e comissões da equipe."
    >
      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          <p className="font-medium">Não foi possível carregar o financeiro</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : resumo ? (
        <div className="space-y-6">
          <FinanceiroPainel
            resumo={resumo}
            previsao={previsao}
            comissaoRanking={comissaoRanking}
          />
          <ComissoesPagar token={token} />
        </div>
      ) : null}
    </DashboardShell>
  );
}
