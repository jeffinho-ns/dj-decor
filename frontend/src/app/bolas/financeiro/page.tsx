import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BolasFinanceiroPainel } from "@/components/bolas/bolas-financeiro-painel";
import { getBolasFinanceiro } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BolasFinanceiroPage() {
  const { token, user } = await requireSession();
  const resumo = await getBolasFinanceiro(token);

  return (
    <DashboardShell
      user={user}
      title="Financeiro bolas"
      description="Repasses ao prestador e taxa da empresa — separado da decoração."
    >
      <BolasFinanceiroPainel
        resumo={resumo}
        token={token}
        role={user.role}
      />
    </DashboardShell>
  );
}
