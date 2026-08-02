import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ContatosOperacao } from "@/components/configuracoes/contatos-operacao";
import { DevicePrefsSettings } from "@/components/configuracoes/device-prefs-settings";
import { GuiaRapido } from "@/components/configuracoes/guia-rapido";
import { NegocioSettings } from "@/components/configuracoes/negocio-settings";
import { OfflineStatusPanel } from "@/components/configuracoes/offline-status-panel";
import { SobreApp } from "@/components/configuracoes/sobre-app";
import { ThemeSettings } from "@/components/configuracoes/theme-settings";
import { getConfiguracoes } from "@/lib/api";
import { requireSession } from "@/lib/session";

export default async function ConfiguracoesPage() {
  const { user, token } = await requireSession();
  const canEditNegocio = user.role === "ADMIN" || user.role === "GERENTE";
  const mostraOffline =
    user.role === "MONTADOR" ||
    user.role === "GERENTE" ||
    user.role === "ADMIN";

  let nomeEmpresa: string | null = null;
  try {
    const cfg = await getConfiguracoes(token);
    nomeEmpresa = cfg.nomeEmpresa;
  } catch {
    nomeEmpresa = null;
  }

  return (
    <DashboardShell
      user={user}
      title="Configurações"
      description="Aparência, preferências, contatos e guia do seu cargo."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <ThemeSettings />
        <DevicePrefsSettings role={user.role} />
        <ContatosOperacao token={token} canEdit={canEditNegocio} />
        <GuiaRapido role={user.role} />
        {mostraOffline ? <OfflineStatusPanel token={token} /> : null}
        {canEditNegocio ? <NegocioSettings token={token} /> : null}
        <SobreApp nomeEmpresa={nomeEmpresa} />
      </div>
    </DashboardShell>
  );
}
