import type { Prisma } from "@prisma/client";
import { StatusComissao } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

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

  /**
   * Cria a comissão do vendedor referente a um pagamento confirmado.
   * Deve ser chamado dentro da mesma transação que confirma o pagamento.
   */
  async criarParaPagamento(
    tx: Prisma.TransactionClient,
    params: {
      festaId: string;
      vendedorId: string;
      valorPagamento: Prisma.Decimal | number;
    }
  ) {
    const percentual = this.percentualPadrao;
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

    const meta =
      periodo === "mes"
        ? env.COMISSAO_META_SEMANAL * 4
        : env.COMISSAO_META_SEMANAL;

    const ranking = [...porVendedor.values()]
      .sort((a, b) => b.totalComissao - a.totalComissao)
      .map((item, index) => ({
        ...item,
        posicao: index + 1,
        atingiuMeta: item.totalComissao >= meta,
        progressoMeta: meta > 0 ? Math.min(100, (item.totalComissao / meta) * 100) : 0,
      }));

    return {
      periodo,
      inicio: inicio.toISOString(),
      meta,
      ranking,
    };
  }
}

export const comissoesService = new ComissoesService();
