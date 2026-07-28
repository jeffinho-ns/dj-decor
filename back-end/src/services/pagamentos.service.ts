import { StatusFesta, StatusPagamento, TipoPagamento } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { comissoesService } from "./comissoes.service";

const createPagamentoSchema = z.object({
  valor: z.coerce.number().positive("Valor deve ser positivo"),
  tipo: z.nativeEnum(TipoPagamento).optional().default(TipoPagamento.PIX),
});

const confirmarPagamentoSchema = z.object({
  comprovanteMidiaId: z.string().min(1).nullable().optional(),
});

export type CreatePagamentoInput = z.infer<typeof createPagamentoSchema>;
export type ConfirmarPagamentoInput = z.infer<typeof confirmarPagamentoSchema>;

export class FestaNotFoundForPagamentoError extends Error {
  constructor(id: string) {
    super(`Festa não encontrada: ${id}`);
    this.name = "FestaNotFoundForPagamentoError";
  }
}

export class PagamentoNotFoundError extends Error {
  constructor(id: string) {
    super(`Pagamento não encontrado: ${id}`);
    this.name = "PagamentoNotFoundError";
  }
}

export class PagamentoJaConfirmadoError extends Error {
  constructor(id: string) {
    super(`Pagamento ${id} já está confirmado`);
    this.name = "PagamentoJaConfirmadoError";
  }
}

export class MidiaNotFoundForPagamentoError extends Error {
  constructor(id: string) {
    super(`Mídia de comprovante não encontrada: ${id}`);
    this.name = "MidiaNotFoundForPagamentoError";
  }
}

export class PagamentosService {
  parseCreate(body: unknown): CreatePagamentoInput {
    return createPagamentoSchema.parse(body);
  }

  parseConfirmar(body: unknown): ConfirmarPagamentoInput {
    return confirmarPagamentoSchema.parse(body ?? {});
  }

  async create(festaId: string, rawInput: unknown) {
    const data = this.parseCreate(rawInput);

    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: { id: true },
    });

    if (!festa) {
      throw new FestaNotFoundForPagamentoError(festaId);
    }

    return prisma.pagamento.create({
      data: {
        festaId,
        valor: data.valor,
        tipo: data.tipo,
        status: StatusPagamento.PENDENTE,
      },
    });
  }

  async listByFesta(festaId: string) {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: { id: true },
    });

    if (!festa) {
      throw new FestaNotFoundForPagamentoError(festaId);
    }

    return prisma.pagamento.findMany({
      where: { festaId },
      orderBy: { criadoEm: "desc" },
    });
  }

  /**
   * Confirma um pagamento pendente. Ao confirmar, gera a comissão do
   * vendedor sobre o valor pago e, se a festa ainda estiver aguardando
   * pagamento, avança seu status para PAGO.
   */
  async confirmar(pagamentoId: string, rawInput: unknown) {
    const data = this.parseConfirmar(rawInput);

    return prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.findUnique({
        where: { id: pagamentoId },
        include: {
          festa: {
            select: { id: true, status: true, vendedorId: true },
          },
        },
      });

      if (!pagamento) {
        throw new PagamentoNotFoundError(pagamentoId);
      }

      if (pagamento.status === StatusPagamento.CONFIRMADO) {
        throw new PagamentoJaConfirmadoError(pagamentoId);
      }

      if (data.comprovanteMidiaId) {
        const midia = await tx.midia.findUnique({
          where: { id: data.comprovanteMidiaId },
          select: { id: true },
        });
        if (!midia) {
          throw new MidiaNotFoundForPagamentoError(data.comprovanteMidiaId);
        }
      }

      const pagamentoAtualizado = await tx.pagamento.update({
        where: { id: pagamentoId },
        data: {
          status: StatusPagamento.CONFIRMADO,
          confirmadoEm: new Date(),
          ...(data.comprovanteMidiaId !== undefined
            ? { comprovanteMidiaId: data.comprovanteMidiaId }
            : {}),
        },
      });

      await comissoesService.criarParaPagamento(tx, {
        festaId: pagamento.festa.id,
        vendedorId: pagamento.festa.vendedorId,
        valorPagamento: pagamento.valor,
      });

      if (pagamento.festa.status === StatusFesta.AGUARDANDO_PAGAMENTO) {
        await tx.festa.update({
          where: { id: pagamento.festa.id },
          data: { status: StatusFesta.PAGO },
        });
      }

      return pagamentoAtualizado;
    });
  }
}

export const pagamentosService = new PagamentosService();
