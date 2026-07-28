import { Prisma, StatusDesconto } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { FestaNotFoundError } from "./festas.service";

const solicitarDescontoSchema = z.object({
  percentual: z.coerce
    .number()
    .min(1, "Percentual mínimo é 1%")
    .max(50, "Percentual máximo é 50%"),
});

export type SolicitarDescontoInput = z.infer<typeof solicitarDescontoSchema>;

const festaIncludeDesconto = {
  cliente: true,
  vendedor: {
    select: { id: true, nome: true, email: true, role: true },
  },
  descontoSolicitadoPor: {
    select: { id: true, nome: true, email: true, role: true },
  },
  descontoAprovadoPor: {
    select: { id: true, nome: true, email: true, role: true },
  },
} satisfies Prisma.FestaInclude;

export class DescontoJaPendenteError extends Error {
  constructor(festaId: string) {
    super(`Festa ${festaId} já possui desconto pendente de aprovação`);
    this.name = "DescontoJaPendenteError";
  }
}

export class DescontoNaoPendenteError extends Error {
  constructor(festaId: string) {
    super(`Festa ${festaId} não possui desconto pendente`);
    this.name = "DescontoNaoPendenteError";
  }
}

export class DescontoSemValorOriginalError extends Error {
  constructor(festaId: string) {
    super(`Festa ${festaId} não possui valor original para aplicar desconto`);
    this.name = "DescontoSemValorOriginalError";
  }
}

export class DescontosService {
  parseSolicitar(body: unknown): SolicitarDescontoInput {
    return solicitarDescontoSchema.parse(body);
  }

  async listPendentes() {
    return prisma.festa.findMany({
      where: { descontoStatus: StatusDesconto.PENDENTE },
      include: festaIncludeDesconto,
      orderBy: { criadoEm: "desc" },
    });
  }

  async solicitar(festaId: string, solicitanteId: string, rawInput: unknown) {
    const data = this.parseSolicitar(rawInput);
    const festa = await prisma.festa.findUnique({ where: { id: festaId } });

    if (!festa) {
      throw new FestaNotFoundError(festaId);
    }

    if (festa.descontoStatus === StatusDesconto.PENDENTE) {
      throw new DescontoJaPendenteError(festaId);
    }

    const valorOriginal = festa.valorOriginal ?? festa.valor;

    return prisma.festa.update({
      where: { id: festaId },
      data: {
        valorOriginal,
        descontoPercentual: data.percentual,
        descontoStatus: StatusDesconto.PENDENTE,
        descontoSolicitadoPorId: solicitanteId,
        descontoAprovadoPorId: null,
      },
      include: festaIncludeDesconto,
    });
  }

  async aprovar(festaId: string, aprovadorId: string) {
    const festa = await prisma.festa.findUnique({ where: { id: festaId } });

    if (!festa) {
      throw new FestaNotFoundError(festaId);
    }

    if (festa.descontoStatus !== StatusDesconto.PENDENTE) {
      throw new DescontoNaoPendenteError(festaId);
    }

    if (festa.valorOriginal == null || festa.descontoPercentual == null) {
      throw new DescontoSemValorOriginalError(festaId);
    }

    const valorOriginal = Number(festa.valorOriginal);
    const percentual = Number(festa.descontoPercentual);
    const valorComDesconto = Number(
      (valorOriginal * (1 - percentual / 100)).toFixed(2)
    );

    return prisma.festa.update({
      where: { id: festaId },
      data: {
        valor: valorComDesconto,
        descontoStatus: StatusDesconto.APROVADO,
        descontoAprovadoPorId: aprovadorId,
      },
      include: festaIncludeDesconto,
    });
  }

  async recusar(festaId: string, aprovadorId: string) {
    const festa = await prisma.festa.findUnique({ where: { id: festaId } });

    if (!festa) {
      throw new FestaNotFoundError(festaId);
    }

    if (festa.descontoStatus !== StatusDesconto.PENDENTE) {
      throw new DescontoNaoPendenteError(festaId);
    }

    return prisma.festa.update({
      where: { id: festaId },
      data: {
        descontoStatus: StatusDesconto.RECUSADO,
        descontoAprovadoPorId: aprovadorId,
      },
      include: festaIncludeDesconto,
    });
  }
}

export const descontosService = new DescontosService();
