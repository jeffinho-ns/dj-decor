import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ThemeSettings } from "@/components/configuracoes/theme-settings";
import { requireSession } from "@/lib/session";

export default async function ConfiguracoesPage() {
  const { user } = await requireSession();

  return (
    <DashboardShell
      user={user}
      title="Configurações"
      description="Personalize a aparência do DJ Decor."
    >
      <ThemeSettings />
    </DashboardShell>
  );
}
