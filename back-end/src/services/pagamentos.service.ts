import { StatusFesta, StatusPagamento, TipoPagamento } from "@prisma/client";
import { z } from "zod";
import { dispatchWhatsAppSafe } from "../integrations/whatsapp";
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
   * Confirma um pagamento pendente. Gera comissão sobre o valor pago.
   * Só marca a festa como PAGO quando a soma dos confirmados cobre o valor;
   * entrada parcial mantém/avança para AGUARDANDO_PAGAMENTO.
   */
  async confirmar(pagamentoId: string, rawInput: unknown) {
    const data = this.parseConfirmar(rawInput);

    const { pagamento: pagamentoAtualizado, festa } = await prisma.$transaction(
      async (tx) => {
        const pagamento = await tx.pagamento.findUnique({
          where: { id: pagamentoId },
          include: {
            festa: {
              select: {
                id: true,
                status: true,
                valor: true,
                vendedorId: true,
                tema: true,
                dataEvento: true,
                itensExtras: true,
                cliente: { select: { telefone: true } },
              },
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

        const confirmados = await tx.pagamento.aggregate({
          where: {
            festaId: pagamento.festa.id,
            status: StatusPagamento.CONFIRMADO,
          },
          _sum: { valor: true },
        });
        const totalPago = Number(confirmados._sum.valor ?? 0);
        const valorFesta = Number(pagamento.festa.valor);
        const quitado = totalPago + 0.009 >= valorFesta;

        const statusAtual = pagamento.festa.status;
        if (
          quitado &&
          (statusAtual === StatusFesta.ORCAMENTO ||
            statusAtual === StatusFesta.AGUARDANDO_PAGAMENTO)
        ) {
          await tx.festa.update({
            where: { id: pagamento.festa.id },
            data: { status: StatusFesta.PAGO },
          });
        } else if (
          !quitado &&
          statusAtual === StatusFesta.ORCAMENTO
        ) {
          await tx.festa.update({
            where: { id: pagamento.festa.id },
            data: { status: StatusFesta.AGUARDANDO_PAGAMENTO },
          });
        }

        return { pagamento: pagamentoAtualizado, festa: pagamento.festa };
      }
    );

    dispatchWhatsAppSafe({
      template: "pagamento_confirmado",
      telefone: festa.cliente.telefone,
      festaId: festa.id,
      payload: {
        tema: festa.tema,
        data: festa.dataEvento.toISOString(),
        valor: Number(pagamentoAtualizado.valor),
      },
    });

    dispatchWhatsAppSafe({
      template: "upsell_extras",
      telefone: festa.cliente.telefone,
      festaId: festa.id,
      payload: {
        tema: festa.tema,
        data: festa.dataEvento.toISOString(),
        itensExtras: festa.itensExtras ?? [],
      },
    });

    return pagamentoAtualizado;
  }

  /** Anexa ou troca o comprovante de um pagamento (pendente ou confirmado). */
  async anexarComprovante(pagamentoId: string, rawInput: unknown) {
    const data = z
      .object({ comprovanteMidiaId: z.string().min(1) })
      .parse(rawInput ?? {});

    const pagamento = await prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      select: { id: true },
    });
    if (!pagamento) {
      throw new PagamentoNotFoundError(pagamentoId);
    }

    const midia = await prisma.midia.findUnique({
      where: { id: data.comprovanteMidiaId },
      select: { id: true },
    });
    if (!midia) {
      throw new MidiaNotFoundForPagamentoError(data.comprovanteMidiaId);
    }

    return prisma.pagamento.update({
      where: { id: pagamentoId },
      data: { comprovanteMidiaId: data.comprovanteMidiaId },
    });
  }

  /**
   * Gera dados de PIX (stub local até integrar PSP real).
   * Preenche pixTxid / pixCopiaCola / pixQrCode / pixExpiresAt.
   */
  async gerarPix(pagamentoId: string) {
    const pagamento = await prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      include: {
        festa: { select: { id: true, tema: true, cliente: { select: { nome: true } } } },
      },
    });
    if (!pagamento) throw new PagamentoNotFoundError(pagamentoId);
    if (pagamento.status === StatusPagamento.CONFIRMADO) {
      throw new PagamentoJaConfirmadoError(pagamentoId);
    }

    const txid = `DJ${pagamento.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20).toUpperCase()}`;
    const valor = Number(pagamento.valor).toFixed(2);
    const copiaCola = `00020126580014BR.GOV.BCB.PIX0136${txid}520400005303986540${valor.length}${valor}5802BR5925DJ DECOR6009SAO PAULO62070503***6304ABCD`;
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    return prisma.pagamento.update({
      where: { id: pagamentoId },
      data: {
        tipo: TipoPagamento.PIX,
        pixTxid: txid,
        pixCopiaCola: copiaCola,
        pixQrCode: copiaCola,
        pixExpiresAt: expires,
      },
    });
  }
}

export const pagamentosService = new PagamentosService();
