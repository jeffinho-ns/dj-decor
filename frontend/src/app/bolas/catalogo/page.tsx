import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CatalogoBolasPainel } from "@/components/bolas/catalogo-bolas-painel";
import { getBolasMarkup, listCatalogoBolas } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CatalogoBolasPage() {
  const { token, user } = await requireSession();
  const [itens, markup] = await Promise.all([
    listCatalogoBolas(token, true),
    getBolasMarkup(token),
  ]);

  return (
    <DashboardShell
      user={user}
      title="Catálogo de bolas"
      description="Sua tabela de preços. A empresa adiciona markup na venda ao cliente."
    >
      <CatalogoBolasPainel
        token={token}
        itens={itens}
        markupPercentual={markup.markupPercentual}
      />
    </DashboardShell>
  );
}
