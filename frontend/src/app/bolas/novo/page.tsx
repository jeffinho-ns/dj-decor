import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NovoServicoBolasForm } from "@/components/bolas/novo-servico-bolas-form";
import { getBolasMarkup, listCatalogoBolas } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NovoServicoBolasPage() {
  const { token, user } = await requireSession();
  const [catalogo, markup] = await Promise.all([
    listCatalogoBolas(token),
    getBolasMarkup(token),
  ]);

  return (
    <DashboardShell
      user={user}
      title="Novo serviço / venda"
      description="Cadastre venda DJ Decor (só bolas) ou serviço externo."
    >
      <NovoServicoBolasForm
        token={token}
        catalogo={catalogo}
        markupPercentual={markup.markupPercentual}
      />
    </DashboardShell>
  );
}
