import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BolasAgendaMensal } from "@/components/bolas/bolas-agenda-mensal";
import { listPedidosBolas } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BolasPage() {
  const { token, user } = await requireSession();

  let pedidos: Awaited<ReturnType<typeof listPedidosBolas>> = [];
  let loadError: string | null = null;
  try {
    pedidos = await listPedidosBolas(token);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar a agenda de bolas";
  }

  return (
    <DashboardShell
      user={user}
      title="Agenda de bolas"
      description="Ano todo no celular — toque no dia e abra o serviço."
    >
      <BolasAgendaMensal pedidos={pedidos} loadError={loadError} />
    </DashboardShell>
  );
}
