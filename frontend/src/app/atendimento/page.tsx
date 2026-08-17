import { AtendimentoInbox } from "@/components/atendimento/atendimento-inbox";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AtendimentoPage() {
  const { token, user } = await requireSession();
  if (user.role === "MONTADOR") redirect("/montagem");

  return (
    <DashboardShell
      user={user}
      title="Atendimento"
      description="Inbox WhatsApp/Instagram + vendedor virtual. Assuma, atribua e feche orçamentos."
    >
      <AtendimentoInbox token={token} viewerId={user.id} />
    </DashboardShell>
  );
}
