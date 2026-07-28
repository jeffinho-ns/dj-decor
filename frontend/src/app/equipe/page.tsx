import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  EquipePainel,
  toLocalDateValue,
} from "@/components/equipe/equipe-painel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { listEquipeAgenda, listMontadores } from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { AgendaOs, Montador } from "@/types/equipe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Equipe | DJ Decor",
};

export default async function EquipePage() {
  const { token, user } = await requireSession();

  if (user.role !== "ADMIN" && user.role !== "GERENTE") {
    redirect(user.role === "MONTADOR" ? "/montagem" : "/dashboard");
  }

  const hoje = new Date();
  const fimSemana = new Date(hoje);
  fimSemana.setDate(fimSemana.getDate() + 7);

  const defaultInicio = toLocalDateValue(hoje);
  const defaultFim = toLocalDateValue(fimSemana);

  let montadores: Montador[] = [];
  let agenda: AgendaOs[] = [];
  let error: string | null = null;

  try {
    [montadores, agenda] = await Promise.all([
      listMontadores(token),
      listEquipeAgenda(
        {
          inicio: new Date(defaultInicio).toISOString(),
          fim: new Date(defaultFim + "T23:59:59").toISOString(),
        },
        token
      ),
    ]);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Falha ao carregar dados da equipe";
  }

  return (
    <DashboardShell
      user={user}
      title="Equipe"
      description="Agenda de montagens e alocação de montadores."
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Não foi possível carregar a equipe</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : null}

      <EquipePainel
        initialAgenda={agenda}
        montadores={montadores}
        defaultInicio={defaultInicio}
        defaultFim={defaultFim}
      />
    </DashboardShell>
  );
}
