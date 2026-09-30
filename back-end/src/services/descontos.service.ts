import { Prisma, StatusDesconto, StatusFesta, StatusPagamento } from "@prisma/client";
import { z } from "zod";
import {
  aplicarDesconto,
  DescontoInvalidoError,
  parseDescontoTexto,
  type DescontoInterpretado,
} from "../lib/desconto-texto";
import { prisma } from "../prisma/client";
import { comissoesService } from "./comissoes.service";
import { FestaNotFoundError } from "./festas.service";

const solicitarDescontoSchema = z
  .object({
    texto: z.string().trim().min(1).optional(),
    percentual: z.coerce
      .number()
      .min(0.01, "Percentual mínimo é 0,01%")
      .max(100, "Percentual máximo é 100%")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.texto && data.percentual == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Escreva o desconto, por exemplo "desconto de R$50" ou "desconto de 100%"',
        path: ["texto"],
      });
    }
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

export { DescontoInvalidoError };

function interpretarSolicitacao(data: SolicitarDescontoInput): DescontoInterpretado {
  if (data.texto) {
    return parseDescontoTexto(data.texto);
  }
  return { tipo: "percentual", percentual: data.percentual! };
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
    const interpretado = interpretarSolicitacao(data);
    const festa = await prisma.festa.findUnique({ where: { id: festaId } });

    if (!festa) {
      throw new FestaNotFoundError(festaId);
    }

    if (festa.descontoStatus === StatusDesconto.PENDENTE) {
      throw new DescontoJaPendenteError(festaId);
    }

    const valorBase =
      festa.descontoStatus === StatusDesconto.APROVADO
        ? Number(festa.valorOriginal ?? festa.valor)
        : Number(festa.valor);
    const { valorFinal } = aplicarDesconto(valorBase, interpretado);

    const updated = await prisma.festa.update({
      where: { id: festaId },
      data: {
        valorOriginal: valorBase,
        valor: valorFinal,
        descontoPercentual:
          interpretado.tipo === "percentual" ? interpretado.percentual : null,
        descontoValor: interpretado.tipo === "valor" ? interpretado.valor : null,
        descontoStatus: StatusDesconto.PENDENTE,
        descontoSolicitadoPorId: solicitanteId,
        descontoAprovadoPorId: null,
      },
      include: festaIncludeDesconto,
    });

    await this.sincronizarComissoes(festaId);
    return updated;
  }

  async aprovar(festaId: string, aprovadorId: string) {
    const festa = await prisma.festa.findUnique({ where: { id: festaId } });

    if (!festa) {
      throw new FestaNotFoundError(festaId);
    }

    if (festa.descontoStatus !== StatusDesconto.PENDENTE) {
      throw new DescontoNaoPendenteError(festaId);
    }

    if (festa.valorOriginal == null) {
      throw new DescontoSemValorOriginalError(festaId);
    }

    const valorOriginal = Number(festa.valorOriginal);
    const interpretado = this.interpretarRegistrado(festa);
    const { valorFinal } = aplicarDesconto(valorOriginal, interpretado);

    const updated = await prisma.$transaction(async (tx) => {
      let atual = await tx.festa.update({
        where: { id: festaId },
        data: {
          valor: valorFinal,
          descontoStatus: StatusDesconto.APROVADO,
          descontoAprovadoPorId: aprovadorId,
        },
        include: festaIncludeDesconto,
      });

      const confirmados = await tx.pagamento.aggregate({
        where: { festaId, status: StatusPagamento.CONFIRMADO },
        _sum: { valor: true },
      });
      const totalPago = Number(confirmados._sum.valor ?? 0);
      const quitado = totalPago + 0.009 >= valorFinal;

      if (quitado) {
        const statusInicial =
          atual.status === StatusFesta.ORCAMENTO ||
          atual.status === StatusFesta.AGUARDANDO_PAGAMENTO;
        atual = await tx.festa.update({
          where: { id: festaId },
          data: {
            ...(statusInicial ? { status: StatusFesta.PAGO } : {}),
            ...(atual.quitadoEm ? {} : { quitadoEm: new Date() }),
          },
          include: festaIncludeDesconto,
        });
      }

      return atual;
    });

    await this.sincronizarComissoes(festaId);
    return updated;
  }

  async recusar(festaId: string, aprovadorId: string) {
    const festa = await prisma.festa.findUnique({ where: { id: festaId } });

    if (!festa) {
      throw new FestaNotFoundError(festaId);
    }

    if (festa.descontoStatus !== StatusDesconto.PENDENTE) {
      throw new DescontoNaoPendenteError(festaId);
    }

    const valorRestaurado = Number(festa.valorOriginal ?? festa.valor);

    const updated = await prisma.festa.update({
      where: { id: festaId },
      data: {
        valor: valorRestaurado,
        valorOriginal: null,
        descontoStatus: StatusDesconto.RECUSADO,
        descontoAprovadoPorId: aprovadorId,
      },
      include: festaIncludeDesconto,
    });

    await this.sincronizarComissoes(festaId);
    return updated;
  }

  private interpretarRegistrado(festa: {
    id: string;
    descontoPercentual: Prisma.Decimal | null;
    descontoValor: Prisma.Decimal | null;
  }): DescontoInterpretado {
    if (festa.descontoValor != null) {
      return { tipo: "valor", valor: Number(festa.descontoValor) };
    }
    if (festa.descontoPercentual != null) {
      return {
        tipo: "percentual",
        percentual: Number(festa.descontoPercentual),
      };
    }
    throw new DescontoSemValorOriginalError(festa.id);
  }

  private async sincronizarComissoes(festaId: string) {
    try {
      await prisma.$transaction((tx) =>
        comissoesService.gerarSplitFesta(tx, festaId)
      );
    } catch (error) {
      console.error("[descontos] falha ao sincronizar repasses", error);
    }
  }
}

export const descontosService = new DescontosService();
