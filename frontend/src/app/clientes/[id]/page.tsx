import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ClienteFicha } from "@/components/clientes/cliente-ficha";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getClienteById } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Cliente ${id.slice(0, 8)}… | DJ Decor`,
  };
}

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { token, user } = await requireSession();

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }

  let cliente = null;
  try {
    cliente = await getClienteById(id, token);
  } catch {
    notFound();
  }

  return (
    <DashboardShell
      user={user}
      title={cliente.nome}
      description="Ficha e histórico de festas do cliente."
    >
      <ClienteFicha token={token} cliente={cliente} />
    </DashboardShell>
  );
}
