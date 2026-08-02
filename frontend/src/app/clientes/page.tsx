import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ClientesPainel } from "@/components/clientes/clientes-painel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listClientes } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { ClienteListItem } from "@/types/cliente";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes | DJ Decor",
};

export default async function ClientesPage() {
  const { token, user } = await requireSession();

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }

  let clientes: ClienteListItem[] = [];
  let error: string | null = null;
  try {
    clientes = await listClientes(token);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Falha ao carregar clientes da API";
  }

  return (
    <DashboardShell
      user={user}
      title="Clientes"
      description="Carteira de clientes — busque por nome ou telefone e veja o histórico de festas."
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          <p className="font-medium">Não foi possível carregar os clientes</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : null}

      <ClientesPainel token={token} initialClientes={clientes} />
    </DashboardShell>
  );
}
