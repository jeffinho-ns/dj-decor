import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NovaVendaForm } from "@/components/vendas/nova-venda-form";

export default function NovaVendaPage() {
  return (
    <DashboardShell
      title="Nova Venda"
      description="Registre um novo orçamento de decoração."
    >
      <NovaVendaForm />
    </DashboardShell>
  );
}
