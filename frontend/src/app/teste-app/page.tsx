import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TesteAppPainel } from "@/components/pwa/teste-app-painel";
import { requireSession } from "@/lib/session";

export const metadata = {
  title: "Teste do app | DJ festas",
};

export default async function TesteAppPage() {
  const { token, user } = await requireSession();

  return (
    <DashboardShell
      user={user}
      title="Teste do app"
      description="Instalação, notificação no celular, câmera e galeria — tudo verificado neste aparelho."
    >
      <div className="mx-auto max-w-lg">
        <TesteAppPainel token={token} nomeUsuario={user.nome} />
      </div>
    </DashboardShell>
  );
}
