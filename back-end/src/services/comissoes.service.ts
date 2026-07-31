import type { Prisma } from "@prisma/client";
import { StatusComissao } from "@prisma/client";
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

export class ComissoesService {
  get percentualPadrao(): number {
    return env.COMISSAO_PERCENTUAL_DEFAULT;
  }

  async criarParaPagamento(
    tx: Prisma.TransactionClient,
    params: {
      festaId: string;
      vendedorId: string;
      valorPagamento: Prisma.Decimal | number;
    }
  ) {
    let percentual = this.percentualPadrao;
    try {
      percentual = await configuracoesService.getComissaoPercentual();
    } catch {
      // fallback env
    }
    const valorPagamentoNum =
      typeof params.valorPagamento === "number"
        ? params.valorPagamento
        : Number(params.valorPagamento);
    const valorComissao = Number(
      ((valorPagamentoNum * percentual) / 100).toFixed(2)
    );

    return tx.comissao.create({
      data: {
        festaId: params.festaId,
        vendedorId: params.vendedorId,
        percentual,
        valor: valorComissao,
      },
    });
  }

  async listByFesta(festaId: string) {
    return prisma.comissao.findMany({
      where: { festaId },
      orderBy: { criadoEm: "desc" },
    });
  }

  async listByVendedor(vendedorId: string) {
    return prisma.comissao.findMany({
      where: { vendedorId },
      orderBy: { criadoEm: "desc" },
    });
  }

  async listPendentes() {
    return prisma.comissao.findMany({
      where: { status: StatusComissao.PENDENTE },
      include: {
        vendedor: { select: { id: true, nome: true } },
        festa: {
          select: {
            id: true,
            tema: true,
            cliente: { select: { nome: true } },
          },
        },
      },
      orderBy: { criadoEm: "desc" },
    });
  }

  async marcarPagas(ids: string[]) {
    return prisma.comissao.updateMany({
      where: { id: { in: ids }, status: StatusComissao.PENDENTE },
      data: { status: StatusComissao.PAGA, pagoEm: new Date() },
    });
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
        status: { in: [StatusComissao.PENDENTE, StatusComissao.PAGA] },
        criadoEm: { gte: inicio },
      },
      include: {
        vendedor: { select: { id: true, nome: true } },
      },
    });

    const porVendedor = new Map<
      string,
      { vendedorId: string; vendedorNome: string; totalComissao: number }
    >();

    for (const comissao of comissoes) {
      const atual = porVendedor.get(comissao.vendedorId) ?? {
        vendedorId: comissao.vendedorId,
        vendedorNome: comissao.vendedor.nome,
        totalComissao: 0,
      };
      atual.totalComissao += Number(comissao.valor);
      porVendedor.set(comissao.vendedorId, atual);
    }

    let metaSemanal = env.COMISSAO_META_SEMANAL;
    try {
      metaSemanal = await configuracoesService.getComissaoMetaSemanal();
    } catch {
      // fallback
    }
    const meta = periodo === "mes" ? metaSemanal * 4 : metaSemanal;

    const ranking = [...porVendedor.values()]
      .sort((a, b) => b.totalComissao - a.totalComissao)
      .map((item, index) => ({
        ...item,
        posicao: index + 1,
        atingiuMeta: item.totalComissao >= meta,
        progressoMeta:
          meta > 0 ? Math.min(100, (item.totalComissao / meta) * 100) : 0,
      }));

    return { periodo, inicio: inicio.toISOString(), meta, ranking };
  }
}

export const comissoesService = new ComissoesService();
