import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PedidoBolasDetalhe } from "@/components/bolas/pedido-bolas-detalhe";
import { getPedidoBolas } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PedidoBolasPage({ params }: PageProps) {
  const { id } = await params;
  const { token, user } = await requireSession();

  let pedido;
  try {
    pedido = await getPedidoBolas(id, token);
  } catch {
    notFound();
  }

  return (
    <DashboardShell
      user={user}
      title="Detalhe do serviço"
      description={pedido.clienteNome}
    >
      <PedidoBolasDetalhe pedido={pedido} token={token} role={user.role} />
    </DashboardShell>
  );
}
