import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UsuariosPainel } from "@/components/usuarios/usuarios-painel";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const { token, user } = await requireSession();

  if (user.role !== "ADMIN" && user.role !== "GERENTE") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell
      user={user}
      title="Usuários"
      description="Gerencie acessos da equipe DJ Decor."
    >
      <UsuariosPainel token={token} canEdit={user.role === "ADMIN"} />
    </DashboardShell>
  );
}
