import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NovaVendaForm } from "@/components/vendas/nova-venda-form";
import { requireSession } from "@/lib/session";

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { token, user } = await requireSession();
  const params = await searchParams;

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }

  return (
    <DashboardShell
      user={user}
      title="Nova Venda"
      description="Registre um novo orçamento de decoração."
    >
      <NovaVendaForm
        token={token}
        initialClienteId={params.clienteId ?? null}
      />
    </DashboardShell>
  );
}
