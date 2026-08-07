import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LixeiraPainel } from "@/components/vendas/lixeira-painel";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lixeira | DJ festas",
};

export default async function LixeiraPage() {
  const { token, user } = await requireSession();

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }

  return (
    <DashboardShell
      user={user}
      title="Lixeira"
      description="Festas canceladas — restaure para vendas ou exclua definitivamente."
    >
      <LixeiraPainel
        token={token}
        canDelete={
          user.role === "ADMIN" ||
          user.role === "GERENTE" ||
          user.role === "VENDEDOR"
        }
      />
    </DashboardShell>
  );
}
