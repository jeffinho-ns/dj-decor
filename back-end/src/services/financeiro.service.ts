import {
  FrequenciaPagamentoEquipe,
  Prisma,
  Role,
  StatusComissao,
  StatusFesta,
  StatusPagamento,
  TipoRepasse,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import {
  inicioDiaBrasil,
  periodoEquipe,
  ymdBrasil,
  ymdNoPeriodo,
  ymdToUtcNoon,
} from "../lib/periodo-equipe";
import { configuracoesService } from "./configuracoes.service";
import { comissoesService, festaJaAconteceu } from "./comissoes.service";

const resumoQuerySchema = z.object({
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
});

const previsaoQuerySchema = z.object({
  dias: z.coerce.number().int().min(1).max(90).default(30),
});

const equipeDiariasQuerySchema = z.object({
  offset: z.coerce.number().int().min(-36).max(36).default(0),
});

const pagarEquipeSchema = z.object({
  pessoaId: z.string().min(1).optional(),
  offset: z.coerce.number().int().min(-36).max(36).default(0),
});

const frequenciaEquipeSchema = z.object({
  frequencia: z.nativeEnum(FrequenciaPagamentoEquipe),
});

const aPagarQuerySchema = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "mes deve ser YYYY-MM")
    .optional(),
});

const calendarioDiariasQuerySchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, "mes deve ser YYYY-MM"),
});

const mesObrigatorioSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, "mes deve ser YYYY-MM"),
});

const festasMesQuerySchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, "mes deve ser YYYY-MM"),
});

/** Pipeline fechado / em execução — aba Festas do financeiro. */
const STATUS_FESTAS_MES: StatusFesta[] = [
  StatusFesta.FECHADO,
  StatusFesta.PAGO,
  StatusFesta.EM_MONTAGEM,
  StatusFesta.CONCLUIDO,
];

const TIPO_LABEL_A_PAGAR: Record<TipoRepasse, string> = {
  COMISSAO_VENDEDOR: "Comissão venda",
  COMISSAO_SOCIA: "Comissão montagem fora",
  COMISSAO_DONA: "Repasse Debora",
  DIARIA_MONTAGEM: "Diária montagem",
  DIARIA_DESMONTAGEM: "Diária desmontagem",
};

export type ResumoQueryInput = z.infer<typeof resumoQuerySchema>;
export type PrevisaoQueryInput = z.infer<typeof previsaoQuerySchema>;

function labelMesBrasil(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  if (!y || !m) return mes;
  const raw = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0)).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

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

  async listEquipeDiarias(rawQuery: unknown) {
    const { offset } = equipeDiariasQuerySchema.parse(rawQuery);
    const regras = await configuracoesService.getRegrasFinanceiras();
    const frequencia = regras.frequenciaPagamentoEquipe;
    const { inicioYmd, fimYmd, label } = periodoEquipe(frequencia, offset);

    const padStart = ymdToUtcNoon(inicioYmd);
    padStart.setUTCDate(padStart.getUTCDate() - 1);
    const padEnd = ymdToUtcNoon(fimYmd);
    padEnd.setUTCDate(padEnd.getUTCDate() + 1);

    const festas = await prisma.festa.findMany({
      where: {
        status: {
          in: [
            StatusFesta.PAGO,
            StatusFesta.FECHADO,
            StatusFesta.EM_MONTAGEM,
            StatusFesta.CONCLUIDO,
          ],
        },
        OR: [
          { horarioMontagem: { gte: padStart, lte: padEnd } },
          { dataEvento: { gte: padStart, lte: padEnd } },
        ],
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        montadorEquipe: { select: { id: true, nome: true } },
        desmontadorEquipe: { select: { id: true, nome: true } },
        ordemServico: {
          include: {
            montador: { select: { id: true, nome: true } },
            desmontador: { select: { id: true, nome: true } },
          },
        },
      },
    });

    const diaInicio = ymdToUtcNoon(inicioYmd);
    const diaFim = ymdToUtcNoon(fimYmd);
    const comissoes = await prisma.comissao.findMany({
      where: {
        tipo: TipoRepasse.DIARIA_DESMONTAGEM,
        status: { not: StatusComissao.CANCELADA },
        OR: [
          { diaReferencia: { gte: diaInicio, lte: diaFim } },
          {
            diaReferencia: null,
            festaId: { in: festas.map((f) => f.id) },
          },
        ],
      },
      select: {
        id: true,
        beneficiarioId: true,
        tipo: true,
        status: true,
        valor: true,
        diaReferencia: true,
        festa: {
          select: { horarioMontagem: true, dataEvento: true },
        },
      },
    });

    type DiaKey = string;
    type DiaAcc = {
      ymd: string;
      tipo: TipoRepasse;
      pessoaId: string;
      pessoaNome: string;
      carroProprio: boolean;
      valor: number;
      festas: Array<{ id: string; tema: string; clienteNome: string }>;
    };
    const dias = new Map<DiaKey, DiaAcc>();

    const pushDia = (params: {
      ymd: string;
      tipo: TipoRepasse;
      pessoa: { id: string; nome: string } | null;
      carroProprio: boolean;
      festa: { id: string; tema: string; clienteNome: string };
    }) => {
      if (!params.pessoa) return;
      if (!ymdNoPeriodo(params.ymd, inicioYmd, fimYmd)) return;
      const key = `${params.pessoa.id}|${params.tipo}|${params.ymd}`;
      const valor = params.carroProprio
        ? regras.diariaDesmontador
        : regras.diariaDesmontadorCarroEmpresa;
      const existing = dias.get(key);
      if (existing) {
        if (!existing.festas.some((f) => f.id === params.festa.id)) {
          existing.festas.push(params.festa);
        }
        return;
      }
      dias.set(key, {
        ymd: params.ymd,
        tipo: params.tipo,
        pessoaId: params.pessoa.id,
        pessoaNome: params.pessoa.nome,
        carroProprio: params.carroProprio,
        valor,
        festas: [params.festa],
      });
    };

    for (const festa of festas) {
      const resumoFesta = {
        id: festa.id,
        tema: festa.tema,
        clienteNome: festa.cliente.nome,
      };
      const desmontador =
        festa.ordemServico?.desmontador ?? festa.desmontadorEquipe;
      const desmontadorCarro =
        festa.ordemServico?.desmontadorCarroProprio ??
        festa.desmontadorCarroProprio;

      pushDia({
        ymd: ymdBrasil(festa.dataEvento),
        tipo: TipoRepasse.DIARIA_DESMONTAGEM,
        pessoa: desmontador,
        carroProprio: desmontadorCarro,
        festa: resumoFesta,
      });
    }

    const comissaoByKey = new Map<
      string,
      (typeof comissoes)[number]
    >();
    for (const c of comissoes) {
      const ymd = c.diaReferencia
        ? ymdBrasil(c.diaReferencia)
        : ymdBrasil(c.festa.dataEvento);
      if (!ymdNoPeriodo(ymd, inicioYmd, fimYmd)) continue;
      const key = `${c.beneficiarioId}|${c.tipo}|${ymd}`;
      const prev = comissaoByKey.get(key);
      if (!prev || (prev.status !== StatusComissao.PAGA && c.status === StatusComissao.PAGA)) {
        comissaoByKey.set(key, c);
      }
    }

    type PessoaAcc = {
      id: string;
      nome: string;
      dias: Array<{
        ymd: string;
        tipo: "DIARIA_MONTAGEM" | "DIARIA_DESMONTAGEM";
        tipoLabel: string;
        carroProprio: boolean;
        valor: number;
        status: "PENDENTE" | "PAGA";
        comissaoId: string | null;
        festas: Array<{ id: string; tema: string; clienteNome: string }>;
      }>;
      total: number;
      totalPendente: number;
      totalPago: number;
      diasPendentes: number;
      diasPagos: number;
    };
    const pessoas = new Map<string, PessoaAcc>();

    const sortedDias = [...dias.values()].sort((a, b) =>
      a.ymd === b.ymd
        ? a.tipo.localeCompare(b.tipo)
        : a.ymd.localeCompare(b.ymd)
    );

    for (const dia of sortedDias) {
      const key = `${dia.pessoaId}|${dia.tipo}|${dia.ymd}`;
      const comissao = comissaoByKey.get(key);
      const status: "PENDENTE" | "PAGA" =
        comissao?.status === StatusComissao.PAGA ? "PAGA" : "PENDENTE";
      const valor = comissao ? Number(comissao.valor) : dia.valor;
      let pessoa = pessoas.get(dia.pessoaId);
      if (!pessoa) {
        pessoa = {
          id: dia.pessoaId,
          nome: dia.pessoaNome,
          dias: [],
          total: 0,
          totalPendente: 0,
          totalPago: 0,
          diasPendentes: 0,
          diasPagos: 0,
        };
        pessoas.set(dia.pessoaId, pessoa);
      }
      pessoa.dias.push({
        ymd: dia.ymd,
        tipo: dia.tipo as "DIARIA_MONTAGEM" | "DIARIA_DESMONTAGEM",
        tipoLabel: "Desmontagem",
        carroProprio: dia.carroProprio,
        valor,
        status,
        comissaoId: comissao?.id ?? null,
        festas: dia.festas,
      });
      pessoa.total += valor;
      if (status === "PAGA") {
        pessoa.totalPago += valor;
        pessoa.diasPagos += 1;
      } else {
        pessoa.totalPendente += valor;
        pessoa.diasPendentes += 1;
      }
    }

    const pessoasLista = [...pessoas.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );

    return {
      frequencia,
      offset,
      inicioYmd,
      fimYmd,
      label,
      totalPendente: pessoasLista.reduce((acc, p) => acc + p.totalPendente, 0),
      totalPago: pessoasLista.reduce((acc, p) => acc + p.totalPago, 0),
      pessoas: pessoasLista,
    };
  }

  async pagarEquipeDiarias(rawBody: unknown) {
    const { pessoaId, offset } = pagarEquipeSchema.parse(rawBody);
    const lista = await this.listEquipeDiarias({ offset });
    const alvos = pessoaId
      ? lista.pessoas.filter((p) => p.id === pessoaId)
      : lista.pessoas;

    let pagas = 0;
    for (const pessoa of alvos) {
      for (const dia of pessoa.dias) {
        if (dia.status === "PAGA") continue;
        const festaId = dia.festas[0]?.id;
        if (!festaId) continue;
        await comissoesService.pagarDiariaDoDia({
          festaId,
          beneficiarioId: pessoa.id,
          tipo: dia.tipo as TipoRepasse,
          valor: dia.valor,
          diaReferencia: inicioDiaBrasil(ymdToUtcNoon(dia.ymd)),
        });
        pagas += 1;
      }
    }

    const atualizado = await this.listEquipeDiarias({ offset });
    return { pagas, ...atualizado };
  }

  async atualizarFrequenciaEquipe(rawBody: unknown) {
    const { frequencia } = frequenciaEquipeSchema.parse(rawBody);
    await configuracoesService.update({ frequenciaPagamentoEquipe: frequencia });
    return this.listEquipeDiarias({ offset: 0 });
  }

  /**
   * Fila "A pagar": todos os lançamentos PENDENTE já liberados
   * (festa aconteceu — dataEvento Brasil ≤ hoje), incluindo diárias.
   * Filtro opcional `mes=YYYY-MM` por elegivelEm ou dataEvento.
   */
  async listAPagar(rawQuery?: unknown) {
    const { mes } = aPagarQuerySchema.parse(rawQuery ?? {});
    const agora = new Date();

    const list = await prisma.comissao.findMany({
      where: { status: StatusComissao.PENDENTE },
      include: {
        beneficiario: { select: { id: true, nome: true } },
        festa: {
          select: { id: true, tema: true, dataEvento: true },
        },
      },
      orderBy: [{ elegivelEm: "asc" }, { criadoEm: "desc" }],
    });

    const itens = list
      .filter((item) => festaJaAconteceu(item.festa.dataEvento, agora))
      .filter((item) => {
        if (!mes) return true;
        const ymdEvento = ymdBrasil(item.festa.dataEvento);
        const ymdElegivel = ymdBrasil(item.elegivelEm);
        return (
          ymdEvento.startsWith(mes) || ymdElegivel.startsWith(mes)
        );
      })
      .map((item) => ({
        id: item.id,
        beneficiarioId: item.beneficiarioId,
        beneficiarioNome: item.beneficiario.nome,
        tipo: item.tipo,
        tipoLabel: TIPO_LABEL_A_PAGAR[item.tipo] ?? item.tipo,
        valor: Number(item.valor),
        festaId: item.festaId,
        festaTema: item.festa.tema,
        dataEvento: item.festa.dataEvento.toISOString(),
        liberado: true as const,
      }));

    const total = Number(
      itens.reduce((acc, i) => acc + i.valor, 0).toFixed(2)
    );

    return {
      mes: mes ?? null,
      label: mes ? labelMesBrasil(mes) : "Todos liberados",
      total,
      itens,
    };
  }

  /** Lista colaboradores com totais a receber (visão gestão). */
  async listColaboradores() {
    const agora = new Date();
    const users = await prisma.user.findMany({
      where: {
        ativo: true,
        role: {
          in: [Role.VENDEDOR, Role.GERENTE, Role.ADMIN, Role.MONTADOR],
        },
      },
      select: {
        id: true,
        nome: true,
        role: true,
        telefone: true,
        email: true,
        ehSocia: true,
        ehDona: true,
      },
      orderBy: { nome: "asc" },
    });

    const comissoes = await prisma.comissao.findMany({
      where: {
        status: { not: StatusComissao.CANCELADA },
        beneficiarioId: { in: users.map((u) => u.id) },
      },
      select: {
        beneficiarioId: true,
        tipo: true,
        valor: true,
        status: true,
        elegivelEm: true,
        festa: { select: { dataEvento: true } },
      },
    });

    const byUser = new Map<
      string,
      {
        pendente: number;
        liberado: number;
        pago: number;
        comissaoVenda: number;
        diariaMontagem: number;
        diariaDesmontagem: number;
        comissaoFora: number;
        divisao: number;
      }
    >();

    for (const c of comissoes) {
      const acc = byUser.get(c.beneficiarioId) ?? {
        pendente: 0,
        liberado: 0,
        pago: 0,
        comissaoVenda: 0,
        diariaMontagem: 0,
        diariaDesmontagem: 0,
        comissaoFora: 0,
        divisao: 0,
      };
      const valor = Number(c.valor);
      const liberado =
        c.status === StatusComissao.PAGA ||
        festaJaAconteceu(c.festa.dataEvento, agora);
      if (c.status === StatusComissao.PAGA) acc.pago += valor;
      else {
        acc.pendente += valor;
        if (liberado) acc.liberado += valor;
      }
      if (c.tipo === TipoRepasse.COMISSAO_VENDEDOR) acc.comissaoVenda += valor;
      else if (c.tipo === TipoRepasse.DIARIA_MONTAGEM)
        acc.diariaMontagem += valor;
      else if (c.tipo === TipoRepasse.DIARIA_DESMONTAGEM)
        acc.diariaDesmontagem += valor;
      else if (c.tipo === TipoRepasse.COMISSAO_SOCIA) acc.comissaoFora += valor;
      else acc.divisao += valor;
      byUser.set(c.beneficiarioId, acc);
    }

    return users.map((u) => {
      const t = byUser.get(u.id) ?? {
        pendente: 0,
        liberado: 0,
        pago: 0,
        comissaoVenda: 0,
        diariaMontagem: 0,
        diariaDesmontagem: 0,
        comissaoFora: 0,
        divisao: 0,
      };
      const totalDiarias = t.diariaMontagem + t.diariaDesmontagem;
      return {
        id: u.id,
        nome: u.nome,
        role: u.role,
        telefone: u.telefone,
        email: u.email,
        ehSocia: u.ehSocia,
        ehDona: u.ehDona,
        totalPendente: Number(t.pendente.toFixed(2)),
        totalLiberado: Number(t.liberado.toFixed(2)),
        totalPago: Number(t.pago.toFixed(2)),
        totalComissaoVenda: Number(t.comissaoVenda.toFixed(2)),
        totalDiariaMontagem: Number(t.diariaMontagem.toFixed(2)),
        totalDiariaDesmontagem: Number(t.diariaDesmontagem.toFixed(2)),
        totalDiarias: Number(totalDiarias.toFixed(2)),
        totalComissaoFora: Number(t.comissaoFora.toFixed(2)),
        totalDivisao: Number(t.divisao.toFixed(2)),
      };
    });
  }

  async getColaboradorDetalhe(id: string, rawQuery: unknown) {
    const query = z
      .object({
        periodo: z.enum(["semana", "quinzena", "mes", "tudo"]).default("mes"),
        offset: z.coerce.number().int().min(-36).max(36).default(0),
      })
      .parse(rawQuery ?? {});

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        role: true,
        telefone: true,
        email: true,
        ehSocia: true,
        ehDona: true,
        ativo: true,
      },
    });
    if (!user) {
      throw new Error(`Colaborador não encontrado: ${id}`);
    }

    const totais = await comissoesService.getMeusTotais(
      id,
      query.periodo === "tudo"
        ? { periodo: "mes", offset: 0 }
        : { periodo: query.periodo, offset: query.offset }
    );

    // Se "tudo", busca extrato completo
    let lancamentos = totais.lancamentos;
    let porTipo = totais.porTipo;
    let total = totais.total;
    let totalPendente = totais.totalPendente;
    let totalLiberado = totais.totalLiberado;
    let totalPago = totais.totalPago;
    let label = totais.label;
    let inicio = totais.inicio;
    let fim = totais.fim;

    if (query.periodo === "tudo") {
      const full = await comissoesService.listByBeneficiario(id);
      const agora = new Date();
      const byTipo: Record<
        string,
        { tipo: string; label: string; pendente: number; pago: number; total: number }
      > = {};
      totalPendente = 0;
      totalPago = 0;
      totalLiberado = 0;
      lancamentos = full.map((item) => {
        const valor = Number(item.valor);
        if (item.status === "PAGA") totalPago += valor;
        else {
          totalPendente += valor;
          if (item.liberadoParaPagamento) totalLiberado += valor;
        }
        const key = String(item.tipo ?? "OUTRO");
        const bucket = byTipo[key] ?? {
          tipo: key,
          label: String(item.tipoLabel ?? key),
          pendente: 0,
          pago: 0,
          total: 0,
        };
        bucket.total += valor;
        if (item.status === "PAGA") bucket.pago += valor;
        else bucket.pendente += valor;
        byTipo[key] = bucket;
        return { ...item, valor };
      });
      porTipo = Object.values(byTipo);
      total = Number((totalPendente + totalPago).toFixed(2));
      totalPendente = Number(totalPendente.toFixed(2));
      totalLiberado = Number(totalLiberado.toFixed(2));
      totalPago = Number(totalPago.toFixed(2));
      label = "Todo o histórico";
      const oldest = full.length
        ? new Date(full[full.length - 1]!.criadoEm as string | Date)
        : new Date(0);
      inicio = oldest.toISOString();
      fim = agora.toISOString();
    }

    const festasVendidas = await prisma.festa.findMany({
      where: {
        vendedorId: id,
        status: { not: StatusFesta.CANCELADO },
      },
      select: {
        id: true,
        tema: true,
        status: true,
        valor: true,
        dataEvento: true,
        cliente: { select: { nome: true } },
      },
      orderBy: { dataEvento: "desc" },
      take: 80,
    });

    return {
      colaborador: user,
      periodo: query.periodo,
      offset: query.offset,
      label,
      inicio,
      fim,
      total,
      totalPendente,
      totalLiberado,
      totalPago,
      porTipo,
      lancamentos,
      festasVendidas: festasVendidas.map((f) => ({
        id: f.id,
        tema: f.tema,
        status: f.status,
        valor: Number(f.valor),
        dataEvento: f.dataEvento.toISOString(),
        clienteNome: f.cliente.nome,
      })),
    };
  }

  /**
   * Festas do mês (dataEvento em America/Sao_Paulo) no pipeline fechado,
   * com resumo de split (comissões + diárias) quando existirem.
   */
  async listFestasMes(rawQuery: unknown) {
    const { mes } = festasMesQuerySchema.parse(rawQuery);
    const [y, m] = mes.split("-").map(Number);
    // Padding de ±2 dias para cobrir bordas de fuso.
    const padStart = new Date(Date.UTC(y, m - 1, -1, 0, 0, 0));
    const padEnd = new Date(Date.UTC(y, m, 2, 23, 59, 59, 999));

    const festas = await prisma.festa.findMany({
      where: {
        status: { in: STATUS_FESTAS_MES },
        dataEvento: { gte: padStart, lte: padEnd },
      },
      select: {
        id: true,
        tema: true,
        status: true,
        valor: true,
        dataEvento: true,
        foraParacambi: true,
        cliente: { select: { nome: true } },
        vendedor: { select: { id: true, nome: true } },
        montadorEquipe: { select: { id: true, nome: true } },
        desmontadorEquipe: { select: { id: true, nome: true } },
        comissoes: {
          where: { status: { not: StatusComissao.CANCELADA } },
          select: {
            tipo: true,
            percentual: true,
            valor: true,
            status: true,
            beneficiario: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: { dataEvento: "asc" },
    });

    const itens = festas
      .filter((f) => ymdBrasil(f.dataEvento).startsWith(mes))
      .map((f) => {
        const comissoes = f.comissoes;
        let split: {
          vendedor: {
            percentual: number | null;
            valor: number;
            beneficiarioNome: string;
          } | null;
          suellemFora: {
            percentual: number | null;
            valor: number;
            beneficiarioNome: string;
          } | null;
          debora: { percentual: number | null; valor: number } | null;
          diarias: {
            montagem: number;
            desmontagem: number;
            total: number;
          };
          total: number;
        } | null = null;

        if (comissoes.length > 0) {
          const vend = comissoes.find(
            (c) => c.tipo === TipoRepasse.COMISSAO_VENDEDOR
          );
          const fora = comissoes.find(
            (c) => c.tipo === TipoRepasse.COMISSAO_SOCIA
          );
          const donas = comissoes.filter(
            (c) => c.tipo === TipoRepasse.COMISSAO_DONA
          );
          const montagem = comissoes
            .filter((c) => c.tipo === TipoRepasse.DIARIA_MONTAGEM)
            .reduce((acc, c) => acc + Number(c.valor), 0);
          const desmontagem = comissoes
            .filter((c) => c.tipo === TipoRepasse.DIARIA_DESMONTAGEM)
            .reduce((acc, c) => acc + Number(c.valor), 0);
          const deboraValor = donas.reduce(
            (acc, c) => acc + Number(c.valor),
            0
          );
          const deboraPct =
            donas.length > 0
              ? donas.reduce(
                  (acc, c) => acc + (c.percentual != null ? Number(c.percentual) : 0),
                  0
                )
              : null;
          const totalSplit = Number(
            comissoes
              .reduce((acc, c) => acc + Number(c.valor), 0)
              .toFixed(2)
          );

          split = {
            vendedor: vend
              ? {
                  percentual:
                    vend.percentual != null ? Number(vend.percentual) : null,
                  valor: Number(vend.valor),
                  beneficiarioNome: vend.beneficiario.nome,
                }
              : null,
            suellemFora: fora
              ? {
                  percentual:
                    fora.percentual != null ? Number(fora.percentual) : null,
                  valor: Number(fora.valor),
                  beneficiarioNome: fora.beneficiario.nome,
                }
              : null,
            debora:
              deboraValor > 0
                ? {
                    percentual: deboraPct != null && deboraPct > 0
                      ? Number(deboraPct.toFixed(2))
                      : null,
                    valor: Number(deboraValor.toFixed(2)),
                  }
                : null,
            diarias: {
              montagem: Number(montagem.toFixed(2)),
              desmontagem: Number(desmontagem.toFixed(2)),
              total: Number((montagem + desmontagem).toFixed(2)),
            },
            total: totalSplit,
          };
        }

        return {
          id: f.id,
          tema: f.tema,
          status: f.status,
          valor: Number(f.valor),
          dataEvento: f.dataEvento.toISOString(),
          clienteNome: f.cliente.nome,
          foraParacambi: f.foraParacambi,
          vendedor: { id: f.vendedor.id, nome: f.vendedor.nome },
          montador: f.montadorEquipe
            ? { id: f.montadorEquipe.id, nome: f.montadorEquipe.nome }
            : null,
          desmontador: f.desmontadorEquipe
            ? { id: f.desmontadorEquipe.id, nome: f.desmontadorEquipe.nome }
            : null,
          split,
        };
      });

    const totalValor = Number(
      itens.reduce((acc, i) => acc + i.valor, 0).toFixed(2)
    );

    return {
      mes,
      label: labelMesBrasil(mes),
      totalValor,
      quantidade: itens.length,
      itens,
    };
  }

  /**
   * Totais de COMISSAO_DONA da Debora (ehDona) no mês do evento.
   * pendente = ainda não pago; liberado = pendente e festa já aconteceu; pago = PAGA.
   */
  async resumoDeboraMes(rawQuery?: unknown) {
    const { mes } = mesObrigatorioSchema.parse(rawQuery ?? {});
    const agora = new Date();

    const donas = await prisma.user.findMany({
      where: { ehDona: true, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });

    const comissoes = await prisma.comissao.findMany({
      where: {
        tipo: TipoRepasse.COMISSAO_DONA,
        status: { not: StatusComissao.CANCELADA },
        beneficiario: { ehDona: true },
      },
      select: {
        valor: true,
        status: true,
        festa: { select: { dataEvento: true } },
      },
    });

    let pendente = 0;
    let liberado = 0;
    let pago = 0;

    for (const c of comissoes) {
      if (!ymdBrasil(c.festa.dataEvento).startsWith(mes)) continue;
      const valor = Number(c.valor);
      if (c.status === StatusComissao.PAGA) {
        pago += valor;
      } else {
        pendente += valor;
        if (festaJaAconteceu(c.festa.dataEvento, agora)) {
          liberado += valor;
        }
      }
    }

    return {
      mes,
      label: labelMesBrasil(mes),
      beneficiarias: donas,
      pendente: Number(pendente.toFixed(2)),
      liberado: Number(liberado.toFixed(2)),
      pago: Number(pago.toFixed(2)),
      total: Number((pendente + pago).toFixed(2)),
    };
  }

  /**
   * Festas do mês cujo endereço parece fora de Paracambi
   * (sem "paracambi" no texto) e ainda não marcadas como foraParacambi.
   */
  async alertasForaParacambi(rawQuery?: unknown) {
    const { mes } = mesObrigatorioSchema.parse(rawQuery ?? {});

    const festas = await prisma.festa.findMany({
      where: {
        foraParacambi: false,
        status: {
          notIn: [StatusFesta.CANCELADO, StatusFesta.ORCAMENTO],
        },
      },
      select: {
        id: true,
        tema: true,
        endereco: true,
        dataEvento: true,
        status: true,
        cliente: { select: { nome: true } },
      },
      orderBy: { dataEvento: "asc" },
    });

    const itens = festas
      .filter((f) => ymdBrasil(f.dataEvento).startsWith(mes))
      .filter((f) => !f.endereco.toLowerCase().includes("paracambi"))
      .map((f) => ({
        id: f.id,
        tema: f.tema,
        endereco: f.endereco,
        dataEvento: f.dataEvento.toISOString(),
        status: f.status,
        clienteNome: f.cliente.nome,
      }));

    return {
      mes,
      label: labelMesBrasil(mes),
      total: itens.length,
      itens,
    };
  }

  /**
   * Agenda de diárias do mês: montagem (horarioMontagem) e desmontagem (dataEvento).
   * Prefere Comissao DIARIA_*; completa com equipe escalada nas festas.
   */
  async listCalendarioDiarias(rawQuery: unknown) {
    const { mes } = calendarioDiariasQuerySchema.parse(rawQuery);
    const [year, month] = mes.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
    const inicioYmd = `${mes}-01`;
    const fimYmd = `${mes}-${String(lastDay).padStart(2, "0")}`;
    const padStart = ymdToUtcNoon(inicioYmd);
    padStart.setUTCDate(padStart.getUTCDate() - 1);
    const padEnd = ymdToUtcNoon(fimYmd);
    padEnd.setUTCDate(padEnd.getUTCDate() + 1);
    const diaInicio = ymdToUtcNoon(inicioYmd);
    const diaFim = ymdToUtcNoon(fimYmd);

    const regras = await configuracoesService.getRegrasFinanceiras();

    const festas = await prisma.festa.findMany({
      where: {
        status: {
          in: [
            StatusFesta.PAGO,
            StatusFesta.FECHADO,
            StatusFesta.EM_MONTAGEM,
            StatusFesta.CONCLUIDO,
          ],
        },
        OR: [
          { horarioMontagem: { gte: padStart, lte: padEnd } },
          { dataEvento: { gte: padStart, lte: padEnd } },
        ],
      },
      include: {
        cliente: { select: { nome: true } },
        montadorEquipe: { select: { id: true, nome: true, role: true } },
        desmontadorEquipe: { select: { id: true, nome: true, role: true } },
        ordemServico: {
          include: {
            montador: { select: { id: true, nome: true, role: true } },
            desmontador: { select: { id: true, nome: true, role: true } },
          },
        },
      },
    });

    const comissoes = await prisma.comissao.findMany({
      where: {
        tipo: {
          in: [TipoRepasse.DIARIA_MONTAGEM, TipoRepasse.DIARIA_DESMONTAGEM],
        },
        status: { not: StatusComissao.CANCELADA },
        OR: [
          { diaReferencia: { gte: diaInicio, lte: diaFim } },
          {
            diaReferencia: null,
            festaId: { in: festas.map((f) => f.id) },
          },
        ],
      },
      include: {
        beneficiario: { select: { id: true, nome: true } },
        festa: {
          select: {
            id: true,
            tema: true,
            dataEvento: true,
            horarioMontagem: true,
          },
        },
      },
    });

    type PessoaDia = {
      pessoaId: string;
      pessoaNome: string;
      tipo: "DIARIA_MONTAGEM" | "DIARIA_DESMONTAGEM";
      tipoLabel: string;
      valor: number;
      status: "PENDENTE" | "PAGA" | "PREVISTA";
      comissaoId: string | null;
      festaId: string;
      festaTema: string;
    };

    const byDay = new Map<string, PessoaDia[]>();

    const push = (ymd: string, entry: PessoaDia) => {
      if (!ymdNoPeriodo(ymd, inicioYmd, fimYmd)) return;
      const list = byDay.get(ymd) ?? [];
      const dup = list.find(
        (p) =>
          p.pessoaId === entry.pessoaId &&
          p.tipo === entry.tipo &&
          p.festaId === entry.festaId
      );
      if (dup) {
        if (entry.comissaoId && !dup.comissaoId) {
          Object.assign(dup, entry);
        }
        return;
      }
      list.push(entry);
      byDay.set(ymd, list);
    };

    for (const c of comissoes) {
      const ymd =
        c.diaReferencia != null
          ? ymdBrasil(c.diaReferencia)
          : c.tipo === TipoRepasse.DIARIA_MONTAGEM
            ? ymdBrasil(c.festa.horarioMontagem)
            : ymdBrasil(c.festa.dataEvento);
      push(ymd, {
        pessoaId: c.beneficiario.id,
        pessoaNome: c.beneficiario.nome,
        tipo: c.tipo as "DIARIA_MONTAGEM" | "DIARIA_DESMONTAGEM",
        tipoLabel: TIPO_LABEL_A_PAGAR[c.tipo] ?? c.tipo,
        valor: Number(c.valor),
        status: c.status === StatusComissao.PAGA ? "PAGA" : "PENDENTE",
        comissaoId: c.id,
        festaId: c.festa.id,
        festaTema: c.festa.tema,
      });
    }

    for (const festa of festas) {
      const montador =
        festa.ordemServico?.montador ?? festa.montadorEquipe;
      const desmontador =
        festa.ordemServico?.desmontador ?? festa.desmontadorEquipe;
      const montadorCarro =
        festa.ordemServico?.montadorCarroProprio ?? festa.montadorCarroProprio;
      const desmontadorCarro =
        festa.ordemServico?.desmontadorCarroProprio ??
        festa.desmontadorCarroProprio;

      if (
        montador &&
        montador.role !== Role.VENDEDOR &&
        !festa.pegueEMonte
      ) {
        const ymd = ymdBrasil(festa.horarioMontagem);
        const valor = montadorCarro
          ? regras.diariaMontador
          : regras.diariaMontadorCarroEmpresa;
        push(ymd, {
          pessoaId: montador.id,
          pessoaNome: montador.nome,
          tipo: "DIARIA_MONTAGEM",
          tipoLabel: TIPO_LABEL_A_PAGAR.DIARIA_MONTAGEM,
          valor,
          status: "PREVISTA",
          comissaoId: null,
          festaId: festa.id,
          festaTema: festa.tema,
        });
      }

      if (desmontador && desmontador.role !== Role.VENDEDOR) {
        const ymd = ymdBrasil(festa.dataEvento);
        const valor = desmontadorCarro
          ? regras.diariaDesmontador
          : regras.diariaDesmontadorCarroEmpresa;
        push(ymd, {
          pessoaId: desmontador.id,
          pessoaNome: desmontador.nome,
          tipo: "DIARIA_DESMONTAGEM",
          tipoLabel: TIPO_LABEL_A_PAGAR.DIARIA_DESMONTAGEM,
          valor,
          status: "PREVISTA",
          comissaoId: null,
          festaId: festa.id,
          festaTema: festa.tema,
        });
      }
    }

    const dias = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ymd, pessoas]) => {
        const sorted = [...pessoas].sort(
          (a, b) =>
            a.tipo.localeCompare(b.tipo) ||
            a.pessoaNome.localeCompare(b.pessoaNome, "pt-BR")
        );
        const total = Number(
          sorted.reduce((acc, p) => acc + p.valor, 0).toFixed(2)
        );
        return { ymd, total, pessoas: sorted };
      });

    return {
      mes,
      label: labelMesBrasil(mes),
      inicioYmd,
      fimYmd,
      total: Number(dias.reduce((acc, d) => acc + d.total, 0).toFixed(2)),
      dias,
    };
  }
}

export const financeiroService = new FinanceiroService();
