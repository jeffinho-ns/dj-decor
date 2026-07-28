import { StatusDesconto, StatusFesta } from "@prisma/client";
import { prisma } from "../prisma/client";

export type NivelRisco = "BAIXO" | "MEDIO" | "ALTO";

export interface RiscoOrcamento {
  score: number;
  nivel: NivelRisco;
  fatores: string[];
}

const DESCONTO_ALTO_PERCENTUAL = 15;
const ORCAMENTO_PARADO_DIAS = 7;
const EVENTO_PROXIMO_HORAS = 72;

function nivelFromScore(score: number): NivelRisco {
  if (score >= 67) return "ALTO";
  if (score >= 34) return "MEDIO";
  return "BAIXO";
}

function computeRisco(params: {
  festasAnterioresCliente: number;
  descontoPercentual: number | null;
  descontoStatus: StatusDesconto;
  dataEvento: Date;
  status: StatusFesta;
  criadoEm: Date;
  agora?: Date;
}): RiscoOrcamento {
  const agora = params.agora ?? new Date();
  const fatores: string[] = [];
  let score = 0;

  if (params.festasAnterioresCliente === 0) {
    score += 25;
    fatores.push("Cliente sem festas anteriores");
  }

  const descontoAlto =
    (params.descontoStatus === StatusDesconto.PENDENTE ||
      params.descontoStatus === StatusDesconto.APROVADO) &&
    params.descontoPercentual != null &&
    Number(params.descontoPercentual) >= DESCONTO_ALTO_PERCENTUAL;

  if (descontoAlto) {
    score += 25;
    fatores.push(
      `Desconto ${params.descontoStatus === StatusDesconto.PENDENTE ? "pendente" : "aprovado"} alto (${Number(params.descontoPercentual).toFixed(0)}%)`
    );
  }

  const horasAteEvento =
    (params.dataEvento.getTime() - agora.getTime()) / (1000 * 60 * 60);
  if (horasAteEvento >= 0 && horasAteEvento <= EVENTO_PROXIMO_HORAS) {
    score += 25;
    fatores.push("Evento em até 72 horas");
  }

  if (params.status === StatusFesta.ORCAMENTO) {
    const diasParado =
      (agora.getTime() - params.criadoEm.getTime()) / (1000 * 60 * 60 * 24);
    if (diasParado >= ORCAMENTO_PARADO_DIAS) {
      score += 25;
      fatores.push(
        `Orçamento parado há ${Math.floor(diasParado)} dias`
      );
    }
  }

  return {
    score: Math.min(100, score),
    nivel: nivelFromScore(Math.min(100, score)),
    fatores,
  };
}

export class RiscoService {
  async getByFestaId(festaId: string): Promise<RiscoOrcamento> {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: {
        id: true,
        clienteId: true,
        descontoPercentual: true,
        descontoStatus: true,
        dataEvento: true,
        status: true,
        criadoEm: true,
      },
    });

    if (!festa) {
      throw new RiscoFestaNotFoundError(festaId);
    }

    const festasAnteriores = await prisma.festa.count({
      where: {
        clienteId: festa.clienteId,
        id: { not: festa.id },
        status: { not: StatusFesta.CANCELADO },
      },
    });

    return computeRisco({
      festasAnterioresCliente: festasAnteriores,
      descontoPercentual: festa.descontoPercentual
        ? Number(festa.descontoPercentual)
        : null,
      descontoStatus: festa.descontoStatus,
      dataEvento: festa.dataEvento,
      status: festa.status,
      criadoEm: festa.criadoEm,
    });
  }

  async computeForFestas(
    festaIds: string[]
  ): Promise<Map<string, RiscoOrcamento>> {
    if (festaIds.length === 0) {
      return new Map();
    }

    const festas = await prisma.festa.findMany({
      where: { id: { in: festaIds } },
      select: {
        id: true,
        clienteId: true,
        descontoPercentual: true,
        descontoStatus: true,
        dataEvento: true,
        status: true,
        criadoEm: true,
      },
    });

    const clienteIds = [...new Set(festas.map((f) => f.clienteId))];

    const contagens = await prisma.festa.groupBy({
      by: ["clienteId"],
      where: {
        clienteId: { in: clienteIds },
        status: { not: StatusFesta.CANCELADO },
      },
      _count: { id: true },
    });

    const totalPorCliente = new Map(
      contagens.map((c) => [c.clienteId, c._count.id])
    );

    const result = new Map<string, RiscoOrcamento>();

    for (const festa of festas) {
      const totalCliente = totalPorCliente.get(festa.clienteId) ?? 0;
      const anteriores = Math.max(0, totalCliente - 1);

      result.set(
        festa.id,
        computeRisco({
          festasAnterioresCliente: anteriores,
          descontoPercentual: festa.descontoPercentual
            ? Number(festa.descontoPercentual)
            : null,
          descontoStatus: festa.descontoStatus,
          dataEvento: festa.dataEvento,
          status: festa.status,
          criadoEm: festa.criadoEm,
        })
      );
    }

    return result;
  }
}

export class RiscoFestaNotFoundError extends Error {
  constructor(id: string) {
    super(`Festa com id ${id} não encontrada`);
    this.name = "RiscoFestaNotFoundError";
  }
}

export const riscoService = new RiscoService();
