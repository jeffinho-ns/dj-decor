import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ThemeSettings } from "@/components/configuracoes/theme-settings";
import { NegocioSettings } from "@/components/configuracoes/negocio-settings";
import { requireSession } from "@/lib/session";

export default async function ConfiguracoesPage() {
  const { user, token } = await requireSession();
  const canEditNegocio = user.role === "ADMIN" || user.role === "GERENTE";

  return (
    <DashboardShell
      user={user}
      title="Configurações"
      description="Aparência, comissões, contrato e catálogo."
    >
      <div className="space-y-8">
        <ThemeSettings />
        {canEditNegocio ? <NegocioSettings token={token} /> : null}
      </div>
    </DashboardShell>
  );
}
