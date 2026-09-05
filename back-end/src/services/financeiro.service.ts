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
}

export const financeiroService = new FinanceiroService();
