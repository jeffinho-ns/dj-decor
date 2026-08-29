import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BolasComprasPainel } from "@/components/bolas/bolas-compras-painel";
import { listBolasCompras } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BolasComprasPage() {
  const { token, user } = await requireSession();
  const lista = await listBolasCompras(token, 14);

  return (
    <DashboardShell
      user={user}
      title="Compras"
      description="O que comprar nos próximos 14 dias — checklist no celular."
    >
      <BolasComprasPainel lista={lista} token={token} />
    </DashboardShell>
  );
}
