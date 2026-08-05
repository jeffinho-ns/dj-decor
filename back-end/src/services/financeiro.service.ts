import {
  Prisma,
  StatusComissao,
  StatusFesta,
  StatusPagamento,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const resumoQuerySchema = z.object({
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
});

const previsaoQuerySchema = z.object({
  dias: z.coerce.number().int().min(1).max(90).default(30),
});

export type ResumoQueryInput = z.infer<typeof resumoQuerySchema>;
export type PrevisaoQueryInput = z.infer<typeof previsaoQuerySchema>;

function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (value == null) {
    return 0;
  }
  return Number(value);
}

function buildPeriodo(inicio?: Date, fim?: Date) {
  if (!inicio && !fim) {
    return undefined;
  }

  return {
    ...(inicio ? { gte: inicio } : {}),
    ...(fim ? { lte: fim } : {}),
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function clampDate(date: Date, min: Date, max: Date): Date {
  if (date.getTime() < min.getTime()) return min;
  if (date.getTime() > max.getTime()) return max;
  return date;
}

/** Status em que o cliente já comprometeu pagamento (resta saldo). */
const STATUS_COM_RECEBIVEL: StatusFesta[] = [
  StatusFesta.AGUARDANDO_PAGAMENTO,
  StatusFesta.PAGO,
  StatusFesta.FECHADO,
];

export class FinanceiroService {
  parseResumoQuery(query: unknown): ResumoQueryInput {
    return resumoQuerySchema.parse(query);
  }

  parsePrevisaoQuery(query: unknown): PrevisaoQueryInput {
    return previsaoQuerySchema.parse(query);
  }

  async getResumo(rawQuery: unknown) {
    const { inicio, fim } = this.parseResumoQuery(rawQuery);
    const periodoPagamento = buildPeriodo(inicio, fim);
    const periodoFesta = buildPeriodo(inicio, fim);
    const agora = new Date();

    const pagamentoConfirmadoWhere: Prisma.PagamentoWhereInput = {
      status: StatusPagamento.CONFIRMADO,
      ...(periodoPagamento ? { confirmadoEm: periodoPagamento } : {}),
    };

    const pagamentoPendenteWhere: Prisma.PagamentoWhereInput = {
      status: StatusPagamento.PENDENTE,
    };

    const festaRentabilidadeWhere: Prisma.FestaWhereInput = {
      status: {
        in: [StatusFesta.CONCLUIDO, StatusFesta.PAGO, StatusFesta.FECHADO],
      },
      ...(periodoFesta ? { dataEvento: periodoFesta } : {}),
    };

    const comissaoWhereBase: Prisma.ComissaoWhereInput = periodoFesta
      ? {
          festa: {
            dataEvento: periodoFesta,
          },
        }
      : {};

    const [
      entradasConfirmadasAgg,
      recebiveisPendentesAgg,
      festasComSaldo,
      rentabilidadePorTema,
      comissoesPendentesLiberadasAgg,
      comissoesPendentesFuturasAgg,
      comissoesPagasAgg,
    ] = await Promise.all([
      prisma.pagamento.aggregate({
        where: pagamentoConfirmadoWhere,
        _sum: { valor: true },
      }),
      prisma.pagamento.aggregate({
        where: pagamentoPendenteWhere,
        _sum: { valor: true },
      }),
      prisma.festa.findMany({
        where: {
          status: { in: STATUS_COM_RECEBIVEL },
          ...(periodoFesta ? { dataEvento: periodoFesta } : {}),
        },
        select: {
          valor: true,
          status: true,
          pagamentos: {
            where: {
              status: {
                in: [StatusPagamento.CONFIRMADO, StatusPagamento.PENDENTE],
              },
            },
            select: { valor: true, status: true },
          },
        },
      }),
      prisma.festa.groupBy({
        by: ["tema"],
        where: festaRentabilidadeWhere,
        _sum: { valor: true },
        _count: { id: true },
        orderBy: { tema: "asc" },
      }),
      prisma.comissao.aggregate({
        where: {
          ...comissaoWhereBase,
          status: StatusComissao.PENDENTE,
          elegivelEm: { lte: agora },
        },
        _sum: { valor: true },
      }),
      prisma.comissao.aggregate({
        where: {
          ...comissaoWhereBase,
          status: StatusComissao.PENDENTE,
          elegivelEm: { gt: agora },
        },
        _sum: { valor: true },
      }),
      prisma.comissao.aggregate({
        where: {
          ...comissaoWhereBase,
          status: StatusComissao.PAGA,
        },
        _sum: { valor: true },
      }),
    ]);

    let saldoFestasAberto = 0;
    for (const festa of festasComSaldo) {
      const totalRegistrado = festa.pagamentos.reduce(
        (acc, pagamento) => acc + Number(pagamento.valor),
        0
      );
      const valorFesta = Number(festa.valor);
      if (totalRegistrado + 0.009 < valorFesta) {
        saldoFestasAberto += valorFesta - totalRegistrado;
      }
    }

    const pagamentosPendentes = toNumber(recebiveisPendentesAgg._sum.valor);
    const comissoesPendentesLiberadas = toNumber(
      comissoesPendentesLiberadasAgg._sum.valor
    );
    const comissoesPendentesFuturas = toNumber(
      comissoesPendentesFuturasAgg._sum.valor
    );

    return {
      periodo:
        inicio || fim
          ? {
              inicio: inicio?.toISOString() ?? null,
              fim: fim?.toISOString() ?? null,
            }
          : null,
      entradasConfirmadas: toNumber(entradasConfirmadasAgg._sum.valor),
      recebiveisPendentes: pagamentosPendentes + saldoFestasAberto,
      recebiveisDetalhe: {
        pagamentosPendentes,
        saldoFestasSemPagamentoCompleto: saldoFestasAberto,
      },
      rentabilidadePorTema: rentabilidadePorTema.map((item) => ({
        tema: item.tema,
        totalValor: toNumber(item._sum.valor),
        quantidade: item._count.id,
      })),
      /** Liberadas para pagar agora (mês do evento já chegou). */
      comissoesPendentes: comissoesPendentesLiberadas,
      comissoesPendentesLiberadas,
      comissoesPendentesFuturas,
      comissoesPendentesTotal:
        comissoesPendentesLiberadas + comissoesPendentesFuturas,
      comissoesPagas: toNumber(comissoesPagasAgg._sum.valor),
    };
  }

  async getPrevisao(rawQuery: unknown) {
    const { dias } = this.parsePrevisaoQuery(rawQuery);
    const hoje = startOfDay(new Date());
    const fim = addDays(hoje, dias);

    const buckets: {
      inicio: string;
      fim: string;
      confirmado: number;
      pendente: number;
      saldoFesta: number;
      total: number;
    }[] = [];

    for (let i = 0; i < dias; i += 7) {
      const bucketInicio = addDays(hoje, i);
      const bucketFim = addDays(hoje, Math.min(i + 6, dias - 1));
      bucketFim.setHours(23, 59, 59, 999);
      buckets.push({
        inicio: bucketInicio.toISOString(),
        fim: bucketFim.toISOString(),
        confirmado: 0,
        pendente: 0,
        saldoFesta: 0,
        total: 0,
      });
    }

    function bucketIndexFor(date: Date): number {
      const dayOffset = Math.floor(
        (startOfDay(date).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayOffset < 0 || dayOffset >= dias) return -1;
      return Math.floor(dayOffset / 7);
    }

    const [pagamentosConfirmados, pagamentosPendentes, festasComSaldo] =
      await Promise.all([
        prisma.pagamento.findMany({
          where: {
            status: StatusPagamento.CONFIRMADO,
            confirmadoEm: { gte: hoje, lte: fim },
          },
          select: { valor: true, confirmadoEm: true },
        }),
        prisma.pagamento.findMany({
          where: { status: StatusPagamento.PENDENTE },
          select: {
            valor: true,
            criadoEm: true,
            festa: { select: { dataEvento: true } },
          },
        }),
        prisma.festa.findMany({
          where: {
            status: { in: STATUS_COM_RECEBIVEL },
            dataEvento: { gte: hoje, lte: fim },
          },
          select: {
            valor: true,
            dataEvento: true,
            pagamentos: {
              where: {
                status: {
                  in: [StatusPagamento.CONFIRMADO, StatusPagamento.PENDENTE],
                },
              },
              select: { valor: true },
            },
          },
        }),
      ]);

    for (const pag of pagamentosConfirmados) {
      if (!pag.confirmadoEm) continue;
      const idx = bucketIndexFor(pag.confirmadoEm);
      if (idx < 0) continue;
      const valor = Number(pag.valor);
      buckets[idx].confirmado += valor;
      buckets[idx].total += valor;
    }

    for (const pag of pagamentosPendentes) {
      const dataRef = clampDate(
        pag.festa.dataEvento < hoje ? hoje : pag.festa.dataEvento,
        hoje,
        fim
      );
      const idx = bucketIndexFor(dataRef);
      if (idx < 0) continue;
      const valor = Number(pag.valor);
      buckets[idx].pendente += valor;
      buckets[idx].total += valor;
    }

    for (const festa of festasComSaldo) {
      const totalRegistrado = festa.pagamentos.reduce(
        (acc, p) => acc + Number(p.valor),
        0
      );
      const saldo = Number(festa.valor) - totalRegistrado;
      if (saldo <= 0.009) continue;

      const dataRef = clampDate(festa.dataEvento, hoje, fim);
      const idx = bucketIndexFor(dataRef);
      if (idx < 0) continue;
      buckets[idx].saldoFesta += saldo;
      buckets[idx].total += saldo;
    }

    const totalPrevisto = buckets.reduce((acc, b) => acc + b.total, 0);

    return {
      dias,
      inicio: hoje.toISOString(),
      fim: fim.toISOString(),
      totalPrevisto,
      periodos: buckets,
    };
  }
}

export const financeiroService = new FinanceiroService();
