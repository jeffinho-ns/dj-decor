import { Banknote, TrendingUp, Users, Wallet } from "lucide-react";

import { PrevisaoCaixaSection } from "@/components/financeiro/previsao-caixa";
import { ComissaoRankingSection } from "@/components/vendas/comissao-ranking-widget";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ComissaoRanking, FinanceiroResumo, PrevisaoCaixa } from "@/types/financeiro";

interface FinanceiroPainelProps {
  resumo: FinanceiroResumo;
  previsao?: PrevisaoCaixa | null;
  comissaoRanking?: ComissaoRanking | null;
}

function FluxoCaixaBar({
  confirmadas,
  recebiveis,
}: {
  confirmadas: number;
  recebiveis: number;
}) {
  const total = confirmadas + recebiveis;
  const pctConfirmadas = total > 0 ? (confirmadas / total) * 100 : 0;

  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Fluxo de caixa
          </p>
          <p className="mt-1 font-display text-lg text-foreground">
            {formatCurrency(total)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Entradas confirmadas vs recebíveis
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne/12 text-champagne">
          <Wallet className="size-4" />
        </span>
      </div>

      <div className="mt-4 h-3 w-full max-w-full overflow-hidden rounded-full bg-foreground/8 sm:mt-5">
        <div
          className="h-full max-w-full rounded-full bg-status-done transition-all"
          style={{ width: `${pctConfirmadas}%` }}
        />
      </div>

      <div className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full bg-status-done" />
          Confirmadas{" "}
          <strong className="font-medium text-foreground">
            {formatCurrency(confirmadas)}
          </strong>
          {total > 0 ? (
            <span>({pctConfirmadas.toFixed(0)}%)</span>
          ) : null}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full bg-champagne/70" />
          Recebíveis{" "}
          <strong className="font-medium text-foreground">
            {formatCurrency(recebiveis)}
          </strong>
          {total > 0 ? (
            <span>({(100 - pctConfirmadas).toFixed(0)}%)</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function RentabilidadeTemaList({
  itens,
}: {
  itens: FinanceiroResumo["rentabilidadePorTema"];
}) {
  if (itens.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhum dado de rentabilidade por tema no período.
      </div>
    );
  }

  const maxReceita = Math.max(...itens.map((i) => i.receita), 1);

  return (
    <ul className="space-y-3">
      {itens.map((item) => {
        const widthPct = (item.receita / maxReceita) * 100;
        return (
          <li
            key={item.tema}
            className="min-w-0 rounded-lg border border-border/60 bg-card/40 px-4 py-3"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.tema}
                </p>
                <p className="mt-0.5 break-words text-xs text-muted-foreground">
                  Receita {formatCurrency(item.receita)}
                  {item.margem != null ? (
                    <>
                      {" "}
                      · margem{" "}
                      {item.margem <= 1 && item.margem >= -1
                        ? `${(item.margem * 100).toFixed(0)}%`
                        : formatCurrency(item.margem)}
                    </>
                  ) : null}
                </p>
              </div>
              {item.custo != null ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  Custo {formatCurrency(item.custo)}
                </span>
              ) : null}
            </div>
            <div className="mt-2.5 h-2 w-full max-w-full overflow-hidden rounded-full bg-foreground/8">
              <div
                className={cn("h-full max-w-full rounded-full bg-champagne/80")}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RankingVendedoresMobile({
  ranking,
}: {
  ranking: NonNullable<FinanceiroResumo["rankingVendedores"]>;
}) {
  return (
    <ul className="space-y-3 md:hidden">
      {ranking.map((row, index) => (
        <li
          key={row.vendedorId}
          className="rounded-xl border border-border/70 bg-card/40 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">#{index + 1}</p>
              <p className="font-medium text-foreground">{row.vendedorNome}</p>
            </div>
            <p className="shrink-0 font-display text-lg tabular-nums text-foreground">
              {formatCurrency(row.totalComissao)}
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Pagas</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {row.comissoesPagas != null
                  ? formatCurrency(row.comissoesPagas)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pendentes</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {row.comissoesPendentes != null
                  ? formatCurrency(row.comissoesPendentes)
                  : "—"}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function RankingVendedores({
  ranking,
}: {
  ranking: NonNullable<FinanceiroResumo["rankingVendedores"]>;
}) {
  return (
    <>
      <RankingVendedoresMobile ranking={ranking} />
      <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">#</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              Pagas
            </TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              Pendentes
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranking.map((row, index) => (
            <TableRow key={row.vendedorId}>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{row.vendedorNome}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(row.totalComissao)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {row.comissoesPagas != null
                  ? formatCurrency(row.comissoesPagas)
                  : "—"}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {row.comissoesPendentes != null
                  ? formatCurrency(row.comissoesPendentes)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
}

function ComissoesResumo({
  pendentes,
  pagas,
}: {
  pendentes: number;
  pagas: number;
}) {
  const total = pendentes + pagas;
  const pctPagas = total > 0 ? (pagas / total) * 100 : 0;

  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-champagne" />
        <p className="text-sm font-medium text-foreground">Comissões</p>
      </div>
      <p className="mt-3 font-display text-xl text-foreground sm:text-2xl">
        {formatCurrency(total)}
      </p>
      <p className="mt-1 break-words text-xs text-muted-foreground">
        {formatCurrency(pagas)} pagas · {formatCurrency(pendentes)} pendentes
      </p>
      <div className="mt-4 h-2 w-full max-w-full overflow-hidden rounded-full bg-foreground/8">
        <div
          className="h-full rounded-full bg-status-closed"
          style={{ width: `${pctPagas}%` }}
        />
      </div>
    </div>
  );
}

export function FinanceiroPainel({
  resumo,
  previsao,
  comissaoRanking,
}: FinanceiroPainelProps) {
  const temRanking =
    resumo.rankingVendedores != null && resumo.rankingVendedores.length > 0;
  const temRankingGamificado =
    comissaoRanking != null && comissaoRanking.ranking.length > 0;

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Entradas confirmadas"
          value={formatCurrency(resumo.entradasConfirmadas)}
          icon={Banknote}
          accent="sage"
          hint="Pagamentos já confirmados"
        />
        <StatCard
          label="Recebíveis"
          value={formatCurrency(resumo.recebiveis)}
          icon={Wallet}
          accent="champagne"
          hint="Pagamentos pendentes de confirmação"
        />
        <StatCard
          label="Comissões pagas"
          value={formatCurrency(resumo.comissoesPagas)}
          icon={TrendingUp}
          accent="blue"
        />
        <StatCard
          label="Comissões pendentes"
          value={formatCurrency(resumo.comissoesPendentes)}
          icon={Users}
          accent="neutral"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <FluxoCaixaBar
          confirmadas={resumo.entradasConfirmadas}
          recebiveis={resumo.recebiveis}
        />
        <ComissoesResumo
          pendentes={resumo.comissoesPendentes}
          pagas={resumo.comissoesPagas}
        />
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg text-foreground">
          Rentabilidade por tema
        </h2>
        <RentabilidadeTemaList itens={resumo.rentabilidadePorTema} />
      </section>

      {previsao ? (
        <section>
          <h2 className="mb-4 font-display text-lg text-foreground">
            Previsão de caixa
          </h2>
          <PrevisaoCaixaSection previsao={previsao} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 font-display text-lg text-foreground">
          {temRankingGamificado
            ? "Ranking de comissões (gamificado)"
            : temRanking
              ? "Ranking de vendedores"
              : "Resumo de comissões"}
        </h2>
        {temRankingGamificado ? (
          <ComissaoRankingSection ranking={comissaoRanking!} />
        ) : temRanking ? (
          <RankingVendedores ranking={resumo.rankingVendedores!} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard
              label="Total pago a vendedores"
              value={formatCurrency(resumo.comissoesPagas)}
              icon={TrendingUp}
              accent="blue"
            />
            <StatCard
              label="A pagar"
              value={formatCurrency(resumo.comissoesPendentes)}
              icon={Users}
              accent="neutral"
              hint="Ranking disponível quando a API retornar rankingVendedores"
            />
          </div>
        )}
      </section>
    </div>
  );
}
