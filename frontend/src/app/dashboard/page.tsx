import Link from "next/link";
import { CalendarClock, CalendarDays, PartyPopper, Sparkles, Wallet } from "lucide-react";

import { CtaBanner } from "@/components/dashboard/cta-banner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { QuickLinks } from "@/components/dashboard/quick-links";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { FestasTable } from "@/components/vendas/festas-table";
import { listFestas } from "@/lib/api";
import { computeFestasStats } from "@/lib/festas-stats";
import { formatCurrency } from "@/lib/format";
import { requireSession } from "@/lib/session";
import type { Festa } from "@/types/festa";
import type { Role } from "@/types/auth";

export const dynamic = "force-dynamic";

const ROLE_DESCRIPTION: Record<Role, string> = {
  ADMIN: "Visão SuperAdmin: métricas gerais e acessos de gestão.",
  GERENTE: "Panorama das operações: totais e status de todas as festas.",
  VENDEDOR:
    "Seu resumo de vendas e o caminho mais rápido para o próximo orçamento.",
};

export default async function DashboardPage() {
  const { token, user } = await requireSession();

  let festas: Festa[] = [];
  let loadError: string | null = null;
  try {
    festas = await listFestas(token);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Falha ao carregar dados da API";
  }

  const stats = computeFestasStats(festas);
  const recentes = [...festas]
    .sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    )
    .slice(0, 5);

  return (
    <DashboardShell
      user={user}
      title="Dashboard"
      description={ROLE_DESCRIPTION[user.role]}
    >
      <div className="space-y-8">
        <DashboardHeader nome={user.nome} role={user.role} />

        {loadError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">Não foi possível carregar os dados</p>
            <p className="mt-1 opacity-90">{loadError}</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Vendas registradas"
            value={String(stats.total)}
            icon={PartyPopper}
          />
          <StatCard
            label="Valor total"
            value={formatCurrency(stats.valorTotal)}
            icon={Wallet}
            accent="champagne"
          />
          <StatCard
            label="Orçamentos abertos"
            value={String(stats.orcamentos)}
            icon={CalendarClock}
            accent="blue"
          />
          <StatCard
            label="Festas concluídas"
            value={String(stats.concluidas)}
            icon={Sparkles}
            accent="sage"
          />
        </div>

        {user.role === "VENDEDOR" ? (
          <CtaBanner
            title="Pronto para fechar mais uma festa?"
            description="Registre um novo orçamento em poucos passos e acompanhe tudo em Vendas."
            href="/vendas/nova"
            cta="Nova Venda"
          />
        ) : null}

        {user.role !== "VENDEDOR" ? (
          <QuickLinks
            links={[
              {
                href: "/calendario",
                label: "Calendário",
                description: "Agenda do mês com horários de montagem",
                icon: CalendarDays,
              },
              {
                href: "/vendas",
                label: "Vendas",
                description: "Ver todos os orçamentos e festas",
                icon: PartyPopper,
              },
              {
                href: "/vendas/nova",
                label: "Nova Venda",
                description: "Registrar um novo orçamento",
                icon: Sparkles,
              },
            ]}
          />
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-foreground">
              Últimas movimentações
            </h3>
            <Link
              href="/vendas"
              className="text-sm text-champagne transition-colors hover:text-champagne/80"
            >
              Ver todas
            </Link>
          </div>
          <FestasTable festas={recentes} />
        </section>
      </div>
    </DashboardShell>
  );
}
