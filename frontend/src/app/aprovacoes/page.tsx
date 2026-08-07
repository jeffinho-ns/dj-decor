import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AprovacoesPainel } from "@/components/aprovacoes/aprovacoes-painel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listDescontosPendentes } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { FestaDescontoPendente } from "@/types/desconto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aprovações | DJ festas",
};

export default async function AprovacoesPage() {
  const { token, user } = await requireSession();

  if (user.role !== "ADMIN" && user.role !== "GERENTE") {
    redirect(user.role === "MONTADOR" ? "/montagem" : "/dashboard");
  }

  let pendentes: FestaDescontoPendente[] = [];
  let apiUnavailable = false;
  let error: string | null = null;

  try {
    pendentes = await listDescontosPendentes(token);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao carregar descontos";
    if (message.includes("404") || message.includes("500")) {
      apiUnavailable = true;
    } else {
      error = message;
    }
  }

  return (
    <DashboardShell
      user={user}
      title="Aprovações"
      description="Descontos solicitados pelos vendedores aguardando sua decisão."
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          <p className="font-medium">Erro ao carregar aprovações</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : null}

      <AprovacoesPainel
        initialPendentes={pendentes}
        apiUnavailable={apiUnavailable}
      />
    </DashboardShell>
  );
}
