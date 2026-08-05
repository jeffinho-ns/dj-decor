import type { Prisma } from "@prisma/client";
import { StatusComissao, StatusPagamento, TipoRepasse } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { configuracoesService } from "./configuracoes.service";

const rankingQuerySchema = z.object({
  periodo: z.enum(["semana", "mes"]).default("semana"),
});

export type RankingQueryInput = z.infer<typeof rankingQuerySchema>;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/** YYYY-MM-DD no fuso America/Sao_Paulo. */
function ymdBrasil(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Início do mês civil da festa no fuso America/Sao_Paulo (evita virar mês anterior em UTC). */
function startOfMonthBrasil(dataEvento: Date): Date {
  const parts = ymdBrasil(dataEvento).split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month) {
    return startOfMonth(dataEvento);
  }
  // Meio-dia UTC no dia 1 evita ambiguidade de DST/limites
  return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
}

function money(value: number): number {
  return Number(value.toFixed(2));
}

const tipoLabel: Record<TipoRepasse, string> = {
  COMISSAO_VENDEDOR: "Comissão vendedor",
  COMISSAO_SOCIA: "Comissão sócia",
  COMISSAO_DONA: "Repasse dona",
  DIARIA_MONTAGEM: "Diária montagem",
  DIARIA_DESMONTAGEM: "Diária desmontagem",
};

export class ComissoesService {
  get percentualPadrao(): number {
    return env.COMISSAO_PERCENTUAL_DEFAULT;
  }

  /**
   * Gera o split da festa quitada:
   * vendedor % + cada sócia % + dona (resto), todos sobre o valor total.
   * Sócia com `sociaDesde` só entra se a venda da festa (vendaEm) foi fechada nessa data ou depois
   * — pipeline antigo da planilha não entra; só fechamentos novos.
   * Só fica liberado para pagar a partir do mês da data do evento.
   */
  async gerarSplitFesta(
    tx: Prisma.TransactionClient,
    festaId: string
  ) {
    const festa = await tx.festa.findUnique({
      where: { id: festaId },
      select: {
        id: true,
        valor: true,
        dataEvento: true,
        vendedorId: true,
        quitadoEm: true,
        vendaEm: true,
        observacoes: true,
      },
    });
    if (!festa) return [];

    const confirmados = await tx.pagamento.aggregate({
      where: { festaId, status: StatusPagamento.CONFIRMADO },
      _sum: { valor: true },
    });
    const totalPago = Number(confirmados._sum.valor ?? 0);
    const valorFesta = Number(festa.valor);
    if (totalPago + 0.009 < valorFesta) {
      return [];
    }

    // Primeira quitação: grava agora. Já quitadas (ex.: import) mantêm quitadoEm antigo.
    let quitadoEm = festa.quitadoEm;
    if (!quitadoEm) {
      quitadoEm = new Date();
      await tx.festa.update({
        where: { id: festaId },
        data: { quitadoEm },
      });
    }

    const cfg = await configuracoesService.getRegrasFinanceiras();
    const elegivelEm = startOfMonthBrasil(festa.dataEvento);

    const sociasRaw = await tx.user.findMany({
      where: { ehSocia: true, ativo: true },
      select: { id: true, sociaDesde: true },
      orderBy: { nome: "asc" },
    });
    // Pipeline importado (planilha) não entra para sócia com data de início.
    const pipelineImportado = (festa.observacoes || "").includes("import-");
    const vendaYmd = ymdBrasil(festa.vendaEm);
    const socias = sociasRaw.filter((socia) => {
      if (!socia.sociaDesde) return true;
      if (pipelineImportado) return false;
      return vendaYmd >= ymdBrasil(socia.sociaDesde);
    });
    const donas = await tx.user.findMany({
      where: { ehDona: true, ativo: true },
      select: { id: true },
      orderBy: { nome: "asc" },
    });

    // Cancela pendências antigas de comissão % desta festa (modelo antigo ou regeneração)
    await tx.comissao.updateMany({
      where: {
        festaId,
        status: StatusComissao.PENDENTE,
        tipo: {
          in: [
            TipoRepasse.COMISSAO_VENDEDOR,
            TipoRepasse.COMISSAO_SOCIA,
            TipoRepasse.COMISSAO_DONA,
          ],
        },
      },
      data: { status: StatusComissao.CANCELADA },
    });

    const created = [];

    const pctVendedor = cfg.comissaoVendedorPercentual;
    const valorVendedor = money((valorFesta * pctVendedor) / 100);
    created.push(
      await this.upsertRepasse(tx, {
        festaId,
        beneficiarioId: festa.vendedorId,
        tipo: TipoRepasse.COMISSAO_VENDEDOR,
        percentual: pctVendedor,
        valor: valorVendedor,
        elegivelEm,
      })
    );

    const pctSocia = cfg.comissaoSociaPercentual;
    let totalSocias = 0;
    for (const socia of socias) {
      const valorSocia = money((valorFesta * pctSocia) / 100);
      totalSocias += valorSocia;
      created.push(
        await this.upsertRepasse(tx, {
          festaId,
          beneficiarioId: socia.id,
          tipo: TipoRepasse.COMISSAO_SOCIA,
          percentual: pctSocia,
          valor: valorSocia,
          elegivelEm,
        })
      );
    }

    const restante = money(valorFesta - valorVendedor - totalSocias);
    if (donas.length > 0 && restante > 0) {
      const valorPorDona = money(restante / donas.length);
      const pctDona = money((restante / valorFesta) * 100);
      for (const dona of donas) {
        created.push(
          await this.upsertRepasse(tx, {
            festaId,
            beneficiarioId: dona.id,
            tipo: TipoRepasse.COMISSAO_DONA,
            percentual: pctDona,
            valor: valorPorDona,
            elegivelEm,
          })
        );
      }
    }

    return created;
  }

  /** Diárias ao finalizar a OS (1 diária montagem + 1 diária desmontagem). */
  async gerarDiariasOs(
    tx: Prisma.TransactionClient,
    params: {
      festaId: string;
      dataEvento: Date;
      montadorId: string | null;
      desmontadorId: string | null;
    }
  ) {
    const cfg = await configuracoesService.getRegrasFinanceiras();
    const elegivelEm = startOfMonthBrasil(params.dataEvento);
    const created = [];

    if (params.montadorId) {
      created.push(
        await this.upsertRepasse(tx, {
          festaId: params.festaId,
          beneficiarioId: params.montadorId,
          tipo: TipoRepasse.DIARIA_MONTAGEM,
          percentual: null,
          valor: money(cfg.diariaMontador),
          elegivelEm,
        })
      );
    }

    if (params.desmontadorId) {
      created.push(
        await this.upsertRepasse(tx, {
          festaId: params.festaId,
          beneficiarioId: params.desmontadorId,
          tipo: TipoRepasse.DIARIA_DESMONTAGEM,
          percentual: null,
          valor: money(cfg.diariaDesmontador),
          elegivelEm,
        })
      );
    }

    return created;
  }

  private async upsertRepasse(
    tx: Prisma.TransactionClient,
    data: {
      festaId: string;
      beneficiarioId: string;
      tipo: TipoRepasse;
      percentual: number | null;
      valor: number;
      elegivelEm: Date;
    }
  ) {
    const existing = await tx.comissao.findUnique({
      where: {
        festaId_beneficiarioId_tipo: {
          festaId: data.festaId,
          beneficiarioId: data.beneficiarioId,
          tipo: data.tipo,
        },
      },
    });

    if (existing?.status === StatusComissao.PAGA) {
      return existing;
    }

    if (existing) {
      return tx.comissao.update({
        where: { id: existing.id },
        data: {
          percentual: data.percentual,
          valor: data.valor,
          elegivelEm: data.elegivelEm,
          status: StatusComissao.PENDENTE,
          pagoEm: null,
        },
      });
    }

    return tx.comissao.create({
      data: {
        festaId: data.festaId,
        beneficiarioId: data.beneficiarioId,
        tipo: data.tipo,
        percentual: data.percentual,
        valor: data.valor,
        elegivelEm: data.elegivelEm,
        status: StatusComissao.PENDENTE,
      },
    });
  }

  async listByFesta(festaId: string) {
    return prisma.comissao.findMany({
      where: { festaId, status: { not: StatusComissao.CANCELADA } },
      include: {
        beneficiario: { select: { id: true, nome: true } },
      },
      orderBy: { criadoEm: "desc" },
    });
  }

  async listByBeneficiario(beneficiarioId: string) {
    const agora = new Date();
    const list = await prisma.comissao.findMany({
      where: {
        beneficiarioId,
        status: { not: StatusComissao.CANCELADA },
      },
      include: {
        festa: {
          select: {
            id: true,
            tema: true,
            dataEvento: true,
            cliente: { select: { nome: true } },
          },
        },
      },
      orderBy: { criadoEm: "desc" },
    });

    return list.map((item) => ({
      ...item,
      tipoLabel: tipoLabel[item.tipo],
      liberadoParaPagamento:
        item.status === StatusComissao.PAGA || item.elegivelEm <= agora,
    }));
  }

  /** @deprecated use listByBeneficiario */
  async listByVendedor(vendedorId: string) {
    return this.listByBeneficiario(vendedorId);
  }

  async listPendentes() {
    const agora = new Date();
    const list = await prisma.comissao.findMany({
      where: {
        status: StatusComissao.PENDENTE,
        elegivelEm: { lte: agora },
      },
      include: {
        beneficiario: { select: { id: true, nome: true, ehSocia: true, ehDona: true } },
        festa: {
          select: {
            id: true,
            tema: true,
            dataEvento: true,
            cliente: { select: { nome: true } },
          },
        },
      },
      orderBy: [{ elegivelEm: "asc" }, { criadoEm: "desc" }],
    });

    return list.map((item) => ({
      ...item,
      tipoLabel: tipoLabel[item.tipo],
      vendedor: item.beneficiario,
    }));
  }

  async marcarPagas(ids: string[]) {
    const agora = new Date();
    return prisma.comissao.updateMany({
      where: {
        id: { in: ids },
        status: StatusComissao.PENDENTE,
        elegivelEm: { lte: agora },
      },
      data: { status: StatusComissao.PAGA, pagoEm: new Date() },
    });
  }

  /**
   * Regenera o split de todas as festas quitadas (útil após import ou mudança de %).
   * Não altera comissões já marcadas como PAGA.
   */
  async reconciliarQuitadas() {
    const festas = await prisma.festa.findMany({
      select: {
        id: true,
        valor: true,
        pagamentos: {
          where: { status: StatusPagamento.CONFIRMADO },
          select: { valor: true },
        },
      },
    });

    let processadas = 0;
    let geradas = 0;

    for (const festa of festas) {
      const pago = festa.pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
      if (pago + 0.009 < Number(festa.valor)) continue;
      processadas += 1;
      const created = await prisma.$transaction(async (tx) =>
        this.gerarSplitFesta(tx, festa.id)
      );
      geradas += created.length;
    }

    return { processadas, geradas };
  }

  parseRankingQuery(query: unknown): RankingQueryInput {
    return rankingQuerySchema.parse(query);
  }

  async getRanking(rawQuery: unknown) {
    const { periodo } = this.parseRankingQuery(rawQuery);
    const agora = new Date();
    const inicio =
      periodo === "mes" ? startOfMonth(agora) : startOfWeek(agora);

    const comissoes = await prisma.comissao.findMany({
      where: {
        tipo: TipoRepasse.COMISSAO_VENDEDOR,
        status: { in: [StatusComissao.PENDENTE, StatusComissao.PAGA] },
        criadoEm: { gte: inicio },
      },
      include: {
        beneficiario: {
          select: { id: true, nome: true, comissaoMetaSemanal: true },
        },
      },
    });

    const porVendedor = new Map<
      string,
      { vendedorId: string; vendedorNome: string; totalComissao: number }
    >();

    for (const comissao of comissoes) {
      const atual = porVendedor.get(comissao.beneficiarioId) ?? {
        vendedorId: comissao.beneficiarioId,
        vendedorNome: comissao.beneficiario.nome,
        totalComissao: 0,
      };
      atual.totalComissao += Number(comissao.valor);
      porVendedor.set(comissao.beneficiarioId, atual);
    }

    let metaSemanalGlobal = env.COMISSAO_META_SEMANAL;
    try {
      metaSemanalGlobal = await configuracoesService.getComissaoMetaSemanal();
    } catch {
      // fallback
    }

    const metaSemanalPorVendedor = new Map<string, number>();
    for (const comissao of comissoes) {
      if (metaSemanalPorVendedor.has(comissao.beneficiarioId)) continue;
      const individual = comissao.beneficiario.comissaoMetaSemanal;
      metaSemanalPorVendedor.set(
        comissao.beneficiarioId,
        individual != null ? Number(individual) : metaSemanalGlobal
      );
    }

    const metaGlobal =
      periodo === "mes" ? metaSemanalGlobal * 4 : metaSemanalGlobal;

    const ranking = [...porVendedor.values()]
      .sort((a, b) => b.totalComissao - a.totalComissao)
      .map((item, index) => {
        const metaSemanal =
          metaSemanalPorVendedor.get(item.vendedorId) ?? metaSemanalGlobal;
        const meta = periodo === "mes" ? metaSemanal * 4 : metaSemanal;
        return {
          ...item,
          posicao: index + 1,
          meta,
          atingiuMeta: item.totalComissao >= meta,
          progressoMeta:
            meta > 0 ? Math.min(100, (item.totalComissao / meta) * 100) : 0,
        };
      });

    return { periodo, inicio: inicio.toISOString(), meta: metaGlobal, ranking };
  }
}

export const comissoesService = new ComissoesService();
