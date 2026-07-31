import { FollowUpFila } from "@/components/vendas/follow-up-fila";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const { token, user } = await requireSession();
  if (user.role === "MONTADOR") redirect("/montagem");

  return (
    <DashboardShell
      user={user}
      title="Follow-up"
      description="Orçamentos parados e pedidos em risco — contate o cliente."
    >
      <FollowUpFila token={token} />
    </DashboardShell>
  );
}
