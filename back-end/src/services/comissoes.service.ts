import type { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

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
}

export const comissoesService = new ComissoesService();
