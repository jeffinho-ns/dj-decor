import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PerfilAtalhos } from "@/components/perfil/perfil-atalhos";
import { PerfilForm } from "@/components/perfil/perfil-form";
import { requireSession } from "@/lib/session";

export default async function PerfilPage() {
  const { token, user } = await requireSession();

  return (
    <DashboardShell
      user={user}
      title="Meu Perfil"
      description="Identidade, contato, atalhos do cargo e senha."
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <PerfilAtalhos role={user.role} />
        <PerfilForm token={token} user={user} />
      </div>
    </DashboardShell>
  );
}
