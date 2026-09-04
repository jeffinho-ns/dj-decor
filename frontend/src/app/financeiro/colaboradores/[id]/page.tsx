import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ColaboradorFinanceiroDetalheView } from "@/components/financeiro/colaborador-financeiro-detalhe";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Colaborador | Financeiro | DJ festas",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ColaboradorFinanceiroPage({ params }: PageProps) {
  const { token, user } = await requireSession();

  if (user.role !== "ADMIN" && user.role !== "GERENTE") {
    redirect(user.role === "MONTADOR" ? "/montagem" : "/dashboard");
  }

  const { id } = await params;

  return (
    <DashboardShell
      user={user}
      title="Recebimentos"
      description="Comissões, desmontagens, divisão e festas deste colaborador."
    >
      <ColaboradorFinanceiroDetalheView token={token} colaboradorId={id} />
    </DashboardShell>
  );
}
