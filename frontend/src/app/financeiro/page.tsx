import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  FinanceiroShell,
  type FinanceiroAba,
} from "@/components/financeiro/financeiro-shell";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getComissaoRanking,
  getFinanceiroPrevisao,
  getFinanceiroResumo,
} from "@/lib/api";
import { requireSession } from "@/lib/session";
import type { ComissaoRanking, FinanceiroResumo, PrevisaoCaixa } from "@/types/financeiro";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financeiro | DJ festas",
};

interface FinanceiroPageProps {
  searchParams: Promise<{ mes?: string; aba?: string }>;
}

const ABAS_VALIDAS: FinanceiroAba[] = [
  "pagar",
  "colaboradores",
  "caixa",
  "festas",
  "calendario",
];

function mesAtualSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

function parseMes(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const month = Number(value.slice(5));
    if (month >= 1 && month <= 12) return value;
  }
  return mesAtualSaoPaulo();
}

function parseAba(value: string | undefined): FinanceiroAba {
  if (value && (ABAS_VALIDAS as string[]).includes(value)) {
    return value as FinanceiroAba;
  }
  return "pagar";
}

export default async function FinanceiroPage({
  searchParams,
}: FinanceiroPageProps) {
  const { token, user } = await requireSession();

  if (user.role !== "ADMIN" && user.role !== "GERENTE") {
    redirect(user.role === "MONTADOR" ? "/montagem" : "/dashboard");
  }

  const params = await searchParams;
  const mes = parseMes(params.mes);
  const aba = parseAba(params.aba);

  let resumo: FinanceiroResumo | null = null;
  let previsao: PrevisaoCaixa | null = null;
  let comissaoRanking: ComissaoRanking | null = null;
  let error: string | null = null;

  try {
    const results = await Promise.all([
      getFinanceiroResumo(token),
      getFinanceiroPrevisao(token, 30),
    ]);
    resumo = results[0];
    previsao = results[1];
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Falha ao carregar resumo financeiro da API";
  }

  if (!error) {
    try {
      comissaoRanking = await getComissaoRanking(token, "semana");
    } catch {
      comissaoRanking = null;
    }
  }

  return (
    <DashboardShell
      user={user}
      title="Financeiro"
      description="Fluxo de caixa, comissões e pagamento de desmontadores."
    >
      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive neo-sm">
          <p className="font-medium">Não foi possível carregar o financeiro</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      ) : resumo ? (
        <FinanceiroShell
          token={token}
          mes={mes}
          aba={aba}
          resumo={resumo}
          previsao={previsao}
          comissaoRanking={comissaoRanking}
        />
      ) : null}
    </DashboardShell>
  );
}
