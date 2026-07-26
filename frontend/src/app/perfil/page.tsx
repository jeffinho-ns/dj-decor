import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PerfilForm } from "@/components/perfil/perfil-form";
import { requireSession } from "@/lib/session";

export default async function PerfilPage() {
  const { token, user } = await requireSession();

  return (
    <DashboardShell
      user={user}
      title="Meu Perfil"
      description="Atualize seu e-mail e sua senha de acesso."
    >
      <PerfilForm token={token} user={user} />
    </DashboardShell>
  );
}
