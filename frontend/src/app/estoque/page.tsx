import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EstoquePainel } from "@/components/estoque/estoque-painel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listAlertasQr, listInventario, listProdutos } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { AlertaQr, InventarioItem, Produto } from "@/types/estoque";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estoque | DJ Decor",
};

export default async function EstoquePage() {
  const { token, user } = await requireSession();

  if (user.role !== "ADMIN" && user.role !== "GERENTE") {
    redirect(user.role === "MONTADOR" ? "/montagem" : "/dashboard");
  }

  let produtos: Produto[] = [];
  let inventario: InventarioItem[] = [];
  let alertasQr: AlertaQr[] = [];
  let error: string | null = null;
  try {
    const results = await Promise.all([
      listProdutos(token),
      listInventario(token).catch(() => [] as InventarioItem[]),
      listAlertasQr(token).catch(() => [] as AlertaQr[]),
    ]);
    produtos = results[0];
    inventario = results[1];
    alertasQr = results[2];
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Falha ao carregar estoque da API";
  }

  return (
    <DashboardShell
      user={user}
      title="Estoque"
      description="Inventário completo dos itens de festa — conte o que tem e marque o que precisa comprar."
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          <p className="font-medium">Não foi possível carregar o estoque</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : null}

      <EstoquePainel
        produtos={produtos}
        inventario={inventario}
        alertasQr={alertasQr}
      />
    </DashboardShell>
  );
}
