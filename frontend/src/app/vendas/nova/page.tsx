import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NovaVendaForm } from "@/components/vendas/nova-venda-form";
import { getBolasMarkup, getConfiguracoes, listCatalogoBolas } from "@/lib/api";
import { requireSession } from "@/lib/session";

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { token, user } = await requireSession();
  const params = await searchParams;

  if (user.role === "MONTADOR") {
    redirect("/montagem");
  }
  if (user.role === "BOLISTA") {
    redirect("/bolas");
  }

  let catalogoBolas: Awaited<ReturnType<typeof listCatalogoBolas>> = [];
  let markupBolasPercentual = 10;
  try {
    const [catalogo, markup] = await Promise.all([
      listCatalogoBolas(token),
      getBolasMarkup(token),
    ]);
    catalogoBolas = catalogo;
    markupBolasPercentual = markup.markupPercentual;
  } catch {
    // catálogo de bolas opcional se API ainda não migrada
  }

  let enderecoEmpresa: string | null = null;
  try {
    const config = await getConfiguracoes(token);
    enderecoEmpresa = config.enderecoEmpresa?.trim() || null;
  } catch {
    enderecoEmpresa = null;
  }

  return (
    <DashboardShell
      user={user}
      title="Nova Venda"
      description="Registre um novo orçamento de decoração."
    >
      <NovaVendaForm
        token={token}
        initialClienteId={params.clienteId ?? null}
        viewerRole={user.role}
        enderecoEmpresaInicial={enderecoEmpresa}
        catalogoBolas={catalogoBolas}
        markupBolasPercentual={markupBolasPercentual}
      />
    </DashboardShell>
  );
}
