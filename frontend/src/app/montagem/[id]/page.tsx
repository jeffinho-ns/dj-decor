import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MontagemOsDetalhe } from "@/components/montagem/montagem-os-detalhe";
import { getOs } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

interface MontagemDetalhePageProps {
  params: Promise<{ id: string }>;
}

export default async function MontagemDetalhePage({
  params,
}: MontagemDetalhePageProps) {
  const { id } = await params;
  const { token, user } = await requireSession();

  try {
    const os = await getOs(id, token);

    return (
      <DashboardShell
        user={user}
        title="Montagem"
        description="Separar, check-in, montagem, foto e QR."
      >
        <MontagemOsDetalhe osInicial={os} token={token} />
      </DashboardShell>
    );
  } catch {
    notFound();
  }
}
