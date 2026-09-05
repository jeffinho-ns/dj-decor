import type { Prisma } from "@prisma/client";
import {
  Role,
  StatusComissao,
  StatusFesta,
  TipoRepasse,
} from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { configuracoesService } from "./configuracoes.service";

const rankingQuerySchema = z.object({
  periodo: z.enum(["semana", "mes"]).default("semana"),
});

const meusTotaisQuerySchema = z.object({
  periodo: z.enum(["semana", "quinzena", "mes"]).default("semana"),
  offset: z.coerce.number().int().min(-36).max(36).default(0),
});

export type RankingQueryInput = z.infer<typeof rankingQuerySchema>;
export type MeusTotaisQueryInput = z.infer<typeof meusTotaisQuerySchema>;

/** Montadora com acordo especial fora de Paracambi (30%). */
const NOME_SUELLEM = "Suellem";
/** Diária de montagem da Suellem só em Paracambi. */
const DIARIA_SUELLEM_PARACAMBI = 70;
/** % da Suellem quando a festa é fora de Paracambi. */
const PCT_SUELLEM_FORA = 30;

const STATUS_COM_REPASSE: StatusFesta[] = [
  StatusFesta.FECHADO,
  StatusFesta.PAGO,
  StatusFesta.EM_MONTAGEM,
  StatusFesta.CONCLUIDO,
];

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

/** Meio-dia UTC do dia civil em SP — 1 diária por pessoa/tipo/dia. */
function inicioDiaBrasil(date: Date): Date {
  const parts = ymdBrasil(date).split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
    );
  }
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function money(value: number): number {
  return Number(value.toFixed(2));
}

/** Liberado para pagar a partir do dia do evento (inclusive). */
export function festaJaAconteceu(dataEvento: Date, agora = new Date()): boolean {
  return ymdBrasil(dataEvento) <= ymdBrasil(agora);
}

const tipoLabel: Record<TipoRepasse, string> = {
  COMISSAO_VENDEDOR: "Comissão venda",
  COMISSAO_SOCIA: "Comissão montagem fora",
  COMISSAO_DONA: "Repasse Debora",
  DIARIA_MONTAGEM: "Diária montagem",
  DIARIA_DESMONTAGEM: "Diária desmontagem",
};

export class ComissoesService {
  get percentualPadrao(): number {
    return env.COMISSAO_PERCENTUAL_DEFAULT;
  }


  /**
   * Split / projeção da festa (a partir de FECHADO):
   * - Vendedor: 10% (em Paracambi; Suellem fora = 30% na venda)
   * - Outro vendedor fora: 10% + Suellem 30% (montagem fora)
   * - Lorena não recebe fatia de sócia — só 10% se vendeu
   * - Debora: resto
   * Liberação no extrato: a partir do dia do evento.
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
        status: true,
        kitCatalogo: true,
        foraParacambi: true,
        pegueEMonte: true,
        montadorEquipeId: true,
        desmontadorEquipeId: true,
        montadorCarroProprio: true,
        desmontadorCarroProprio: true,
      },
    });
    if (!festa) return [];

    if (festa.kitCatalogo === "SO_BOLAS") {
      await this.cancelarPendentesTipos(tx, festaId, [
        TipoRepasse.COMISSAO_VENDEDOR,
        TipoRepasse.COMISSAO_SOCIA,
        TipoRepasse.COMISSAO_DONA,
      ]);
      return [];
    }

    if (
      festa.status === StatusFesta.CANCELADO ||
      !STATUS_COM_REPASSE.includes(festa.status)
    ) {
      if (festa.status === StatusFesta.CANCELADO) {
        await this.cancelarPendentesTipos(tx, festaId, [
          TipoRepasse.COMISSAO_VENDEDOR,
          TipoRepasse.COMISSAO_SOCIA,
          TipoRepasse.COMISSAO_DONA,
          TipoRepasse.DIARIA_MONTAGEM,
          TipoRepasse.DIARIA_DESMONTAGEM,
        ]);
      }
      return [];
    }

    const cfg = await configuracoesService.getRegrasFinanceiras();
    const elegivelEm = startOfMonthBrasil(festa.dataEvento);
    const valorFesta = Number(festa.valor);
    const pctVendedor = cfg.comissaoVendedorPercentual;
    const suellem = await tx.user.findFirst({
      where: { nome: NOME_SUELLEM, ativo: true },
      select: { id: true, nome: true },
    });
    const donas = await tx.user.findMany({
      where: { ehDona: true, ativo: true },
      select: { id: true },
      orderBy: { nome: "asc" },
    });

    await this.cancelarPendentesTipos(tx, festaId, [
      TipoRepasse.COMISSAO_VENDEDOR,
      TipoRepasse.COMISSAO_SOCIA,
      TipoRepasse.COMISSAO_DONA,
    ]);

    const created = [];
    const vendedorEhSuellem = Boolean(suellem && festa.vendedorId === suellem.id);
    const fora = Boolean(festa.foraParacambi);
    let totalComissoes = 0;

    if (fora && vendedorEhSuellem && suellem) {
      const valor = money((valorFesta * PCT_SUELLEM_FORA) / 100);
      totalComissoes += valor;
      created.push(
        await this.upsertRepasse(tx, {
          festaId,
          beneficiarioId: suellem.id,
          tipo: TipoRepasse.COMISSAO_VENDEDOR,
          percentual: PCT_SUELLEM_FORA,
          valor,
          elegivelEm,
        })
      );
    } else if (fora && suellem && !vendedorEhSuellem) {
      const valorVend = money((valorFesta * pctVendedor) / 100);
      totalComissoes += valorVend;
      created.push(
        await this.upsertRepasse(tx, {
          festaId,
          beneficiarioId: festa.vendedorId,
          tipo: TipoRepasse.COMISSAO_VENDEDOR,
          percentual: pctVendedor,
          valor: valorVend,
          elegivelEm,
        })
      );
      const valorSuellem = money((valorFesta * PCT_SUELLEM_FORA) / 100);
      totalComissoes += valorSuellem;
      created.push(
        await this.upsertRepasse(tx, {
          festaId,
          beneficiarioId: suellem.id,
          tipo: TipoRepasse.COMISSAO_SOCIA,
          percentual: PCT_SUELLEM_FORA,
          valor: valorSuellem,
          elegivelEm,
        })
      );
    } else {
      const valorVend = money((valorFesta * pctVendedor) / 100);
      totalComissoes += valorVend;
      created.push(
        await this.upsertRepasse(tx, {
          festaId,
          beneficiarioId: festa.vendedorId,
          tipo: TipoRepasse.COMISSAO_VENDEDOR,
          percentual: pctVendedor,
          valor: valorVend,
          elegivelEm,
        })
      );
    }

    const restante = money(valorFesta - totalComissoes);
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

    const diarias = await this.sincronizarDiariasEquipe(tx, {
      festaId: festa.id,
      dataEvento: festa.dataEvento,
      foraParacambi: fora,
      pegueEMonte: festa.pegueEMonte,
      montadorId: festa.montadorEquipeId,
      desmontadorId: festa.desmontadorEquipeId,
      montadorCarroProprio: festa.montadorCarroProprio,
      desmontadorCarroProprio: festa.desmontadorCarroProprio,
      suellemId: suellem?.id ?? null,
    });
    created.push(...diarias);

    return created;
  }

  /**
   * Diárias ao escalar equipe:
   * - Desmontagem / montagem para quem for escalado (exceto role VENDEDOR)
   * - Suellem em Paracambi: diária montagem R$70; fora: sem diária (só %)
   */
  async sincronizarDiariasEquipe(
    tx: Prisma.TransactionClient,
    params: {
      festaId: string;
      dataEvento: Date;
      foraParacambi: boolean;
      pegueEMonte: boolean;
      montadorId: string | null;
      desmontadorId: string | null;
      montadorCarroProprio?: boolean;
      desmontadorCarroProprio?: boolean;
      suellemId?: string | null;
    }
  ) {
    const cfg = await configuracoesService.getRegrasFinanceiras();
    const elegivelEm = startOfMonthBrasil(params.dataEvento);
    const diaReferencia = inicioDiaBrasil(params.dataEvento);
    const created = [];

    await this.cancelarPendentesTipos(tx, params.festaId, [
      TipoRepasse.DIARIA_MONTAGEM,
      TipoRepasse.DIARIA_DESMONTAGEM,
    ]);

    if (!params.pegueEMonte && params.montadorId) {
      const montador = await tx.user.findUnique({
        where: { id: params.montadorId },
        select: { id: true, nome: true, role: true },
      });
      if (montador && montador.role !== Role.VENDEDOR) {
        const ehSuellem =
          montador.id === params.suellemId || montador.nome === NOME_SUELLEM;
        if (!(ehSuellem && params.foraParacambi)) {
          const valor = money(
            ehSuellem
              ? DIARIA_SUELLEM_PARACAMBI
              : params.montadorCarroProprio === false
                ? cfg.diariaMontadorCarroEmpresa
                : cfg.diariaMontador
          );
          const diaria = await this.emitirDiariaSeNova(tx, {
            festaId: params.festaId,
            beneficiarioId: montador.id,
            tipo: TipoRepasse.DIARIA_MONTAGEM,
            valor,
            elegivelEm,
            diaReferencia,
          });
          if (diaria) created.push(diaria);
        }
      }
    }

    // Suellem vendeu em Paracambi: diária de montagem R$70 mesmo se ainda não escalada como montadora
    if (
      !params.pegueEMonte &&
      !params.foraParacambi &&
      params.suellemId &&
      params.montadorId !== params.suellemId
    ) {
      const festa = await tx.festa.findUnique({
        where: { id: params.festaId },
        select: { vendedorId: true },
      });
      if (festa?.vendedorId === params.suellemId) {
        const diaria = await this.emitirDiariaSeNova(tx, {
          festaId: params.festaId,
          beneficiarioId: params.suellemId,
          tipo: TipoRepasse.DIARIA_MONTAGEM,
          valor: money(DIARIA_SUELLEM_PARACAMBI),
          elegivelEm,
          diaReferencia,
        });
        if (diaria) created.push(diaria);
      }
    }

    if (params.desmontadorId) {
      const desmontador = await tx.user.findUnique({
        where: { id: params.desmontadorId },
        select: { id: true, role: true },
      });
      if (desmontador && desmontador.role !== Role.VENDEDOR) {
        const diaria = await this.emitirDiariaSeNova(tx, {
          festaId: params.festaId,
          beneficiarioId: desmontador.id,
          tipo: TipoRepasse.DIARIA_DESMONTAGEM,
          valor: money(
            params.desmontadorCarroProprio === false
              ? cfg.diariaDesmontadorCarroEmpresa
              : cfg.diariaDesmontador
          ),
          elegivelEm,
          diaReferencia,
        });
        if (diaria) created.push(diaria);
      }
    }

    return created;
  }

  /** Ao finalizar OS — regenera diárias/split da festa. */
  async gerarDiariasOs(
    tx: Prisma.TransactionClient,
    params: {
      festaId: string;
      dataEvento: Date;
      horarioMontagem: Date;
      montadorId: string | null;
      desmontadorId: string | null;
      montadorCarroProprio?: boolean;
      desmontadorCarroProprio?: boolean;
    }
  ) {
    return this.gerarSplitFesta(tx, params.festaId);
  }

  private async cancelarPendentesTipos(
    tx: Prisma.TransactionClient,
    festaId: string,
    tipos: TipoRepasse[]
  ) {
    await tx.comissao.updateMany({
      where: {
        festaId,
        status: StatusComissao.PENDENTE,
        tipo: { in: tipos },
      },
      data: { status: StatusComissao.CANCELADA },
    });
  }

  /** Não duplica diária se a pessoa já tem o mesmo tipo no mesmo dia. */
  private async emitirDiariaSeNova(
    tx: Prisma.TransactionClient,
    data: {
      festaId: string;
      beneficiarioId: string;
      tipo: TipoRepasse;
      valor: number;
      elegivelEm: Date;
      diaReferencia: Date;
    }
  ) {
    const jaNoDia = await tx.comissao.findFirst({
      where: {
        beneficiarioId: data.beneficiarioId,
        tipo: data.tipo,
        diaReferencia: data.diaReferencia,
        status: { not: StatusComissao.CANCELADA },
        NOT: { festaId: data.festaId },
      },
    });
    if (jaNoDia) return null;

    return this.upsertRepasse(tx, {
      ...data,
      percentual: null,
    });
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
      diaReferencia?: Date | null;
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
          ...(data.diaReferencia !== undefined
            ? { diaReferencia: data.diaReferencia }
            : {}),
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
        diaReferencia: data.diaReferencia ?? null,
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
        item.status === StatusComissao.PAGA ||
        festaJaAconteceu(item.festa.dataEvento, agora),
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
        tipo: {
          notIn: [
            TipoRepasse.DIARIA_MONTAGEM,
            TipoRepasse.DIARIA_DESMONTAGEM,
          ],
        },
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

    return list
      .filter((item) => festaJaAconteceu(item.festa.dataEvento, agora))
      .map((item) => ({
        ...item,
        tipoLabel: tipoLabel[item.tipo],
        vendedor: item.beneficiario,
      }));
  }

  async marcarPagas(ids: string[]) {
    return prisma.comissao.updateMany({
      where: {
        id: { in: ids },
        status: StatusComissao.PENDENTE,
      },
      data: { status: StatusComissao.PAGA, pagoEm: new Date() },
    });
  }

  /** Marca (ou cria) a diária do dia como paga — independente do mês do evento. */
  async pagarDiariaDoDia(params: {
    festaId: string;
    beneficiarioId: string;
    tipo: TipoRepasse;
    valor: number;
    diaReferencia: Date;
  }) {
    const existing = await prisma.comissao.findFirst({
      where: {
        beneficiarioId: params.beneficiarioId,
        tipo: params.tipo,
        diaReferencia: params.diaReferencia,
        status: { not: StatusComissao.CANCELADA },
      },
    });
    if (existing?.status === StatusComissao.PAGA) return existing;
    if (existing) {
      return prisma.comissao.update({
        where: { id: existing.id },
        data: {
          status: StatusComissao.PAGA,
          pagoEm: new Date(),
          valor: params.valor,
        },
      });
    }
    return prisma.comissao.create({
      data: {
        festaId: params.festaId,
        beneficiarioId: params.beneficiarioId,
        tipo: params.tipo,
        percentual: null,
        valor: params.valor,
        elegivelEm: params.diaReferencia,
        diaReferencia: params.diaReferencia,
        status: StatusComissao.PAGA,
        pagoEm: new Date(),
      },
    });
  }

  /**
   * Regenera o split de todas as festas quitadas (útil após import ou mudança de %).
   * Não altera comissões já marcadas como PAGA.
   */
  async reconciliarQuitadas() {
    const festas = await prisma.festa.findMany({
      where: { status: { in: STATUS_COM_REPASSE } },
      select: { id: true },
    });

    let processadas = 0;
    let geradas = 0;

    for (const festa of festas) {
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

  private resolvePeriodoWindow(
    periodo: "semana" | "quinzena" | "mes",
    offset: number
  ): { inicio: Date; fim: Date; label: string } {
    const agora = new Date();
    if (periodo === "mes") {
      const base = new Date(agora.getFullYear(), agora.getMonth() + offset, 1);
      const inicio = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
      const fim = new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      const label = inicio.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      return { inicio, fim, label };
    }
    if (periodo === "quinzena") {
      const dia = agora.getDate();
      const primeira = dia <= 15;
      // offset em quinzenas
      let year = agora.getFullYear();
      let month = agora.getMonth();
      let half = primeira ? 0 : 1;
      const total = half + offset;
      month += Math.floor(total / 2);
      half = ((total % 2) + 2) % 2;
      while (month < 0) {
        month += 12;
        year -= 1;
      }
      while (month > 11) {
        month -= 12;
        year += 1;
      }
      const inicio = new Date(year, month, half === 0 ? 1 : 16, 0, 0, 0, 0);
      const fim =
        half === 0
          ? new Date(year, month, 15, 23, 59, 59, 999)
          : new Date(year, month + 1, 0, 23, 59, 59, 999);
      const label =
        half === 0
          ? `1–15/${String(month + 1).padStart(2, "0")}/${year}`
          : `16–fim/${String(month + 1).padStart(2, "0")}/${year}`;
      return { inicio, fim, label };
    }
    // semana (segunda–domingo), offset em semanas
    const inicio = startOfWeek(agora);
    inicio.setDate(inicio.getDate() + offset * 7);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    const label = `${inicio.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })} – ${fim.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })}`;
    return { inicio, fim, label };
  }

  /** Totais do próprio colaborador por período (semana / 15 dias / mês). */
  async getMeusTotais(beneficiarioId: string, rawQuery: unknown) {
    const { periodo, offset } = meusTotaisQuerySchema.parse(rawQuery ?? {});
    const { inicio, fim, label } = this.resolvePeriodoWindow(periodo, offset);
    const agora = new Date();

    const list = await prisma.comissao.findMany({
      where: {
        beneficiarioId,
        status: { not: StatusComissao.CANCELADA },
        elegivelEm: { gte: inicio, lte: fim },
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
      orderBy: { elegivelEm: "desc" },
    });

    const filtrados = list;

    const byTipo: Record<
      string,
      { tipo: string; label: string; pendente: number; pago: number; total: number }
    > = {};

    let totalPendente = 0;
    let totalPago = 0;
    let totalLiberado = 0;

    const lancamentos = filtrados.map((item) => {
      const valor = Number(item.valor);
      const liberado =
        item.status === StatusComissao.PAGA ||
        festaJaAconteceu(item.festa.dataEvento, agora);
      if (item.status === StatusComissao.PAGA) totalPago += valor;
      else {
        totalPendente += valor;
        if (liberado) totalLiberado += valor;
      }
      const key = item.tipo;
      const bucket = byTipo[key] ?? {
        tipo: key,
        label: tipoLabel[item.tipo],
        pendente: 0,
        pago: 0,
        total: 0,
      };
      bucket.total += valor;
      if (item.status === StatusComissao.PAGA) bucket.pago += valor;
      else bucket.pendente += valor;
      byTipo[key] = bucket;

      return {
        ...item,
        tipoLabel: tipoLabel[item.tipo],
        liberadoParaPagamento: liberado,
        valor,
      };
    });

    return {
      periodo,
      offset,
      label,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      total: money(totalPendente + totalPago),
      totalPendente: money(totalPendente),
      totalLiberado: money(totalLiberado),
      totalPago: money(totalPago),
      porTipo: Object.values(byTipo).map((b) => ({
        ...b,
        pendente: money(b.pendente),
        pago: money(b.pago),
        total: money(b.total),
      })),
      lancamentos,
    };
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
