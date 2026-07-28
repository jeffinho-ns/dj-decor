import { Prisma, StatusUnidade, type ReservaEstoque } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const reservarSchema = z
  .object({
    unidadeId: z.string().min(1, "unidadeId é obrigatório"),
    festaId: z.string().min(1, "festaId é obrigatório"),
    inicio: z.coerce.date({
      required_error: "início é obrigatório",
      invalid_type_error: "início inválido",
    }),
    fim: z.coerce.date({
      required_error: "fim é obrigatório",
      invalid_type_error: "fim inválido",
    }),
  })
  .refine((data) => data.fim > data.inicio, {
    message: "fim deve ser posterior ao início",
    path: ["fim"],
  });

const disponibilidadeSchema = z
  .object({
    produtoId: z.string().min(1, "produtoId é obrigatório"),
    inicio: z.coerce.date({
      required_error: "início é obrigatório",
      invalid_type_error: "início inválido",
    }),
    fim: z.coerce.date({
      required_error: "fim é obrigatório",
      invalid_type_error: "fim inválido",
    }),
  })
  .refine((data) => data.fim > data.inicio, {
    message: "fim deve ser posterior ao início",
    path: ["fim"],
  });

export type ReservarInput = z.infer<typeof reservarSchema>;
export type DisponibilidadeInput = z.infer<typeof disponibilidadeSchema>;

export class OverbookingError extends Error {
  constructor(message = "Unidade indisponível no período solicitado (overbooking)") {
    super(message);
    this.name = "OverbookingError";
  }
}

export class UnidadeEmManutencaoError extends Error {
  constructor() {
    super("Unidade em manutenção não pode ser reservada");
    this.name = "UnidadeEmManutencaoError";
  }
}

export class ReservaNotFoundError extends Error {
  constructor(id: string) {
    super(`Reserva não encontrada: ${id}`);
    this.name = "ReservaNotFoundError";
  }
}

export class FestaNotFoundForReservaError extends Error {
  constructor(id: string) {
    super(`Festa não encontrada: ${id}`);
    this.name = "FestaNotFoundForReservaError";
  }
}

export class UnidadeNotFoundForReservaError extends Error {
  constructor(id: string) {
    super(`Unidade não encontrada: ${id}`);
    this.name = "UnidadeNotFoundForReservaError";
  }
}

export class ProdutoNotFoundForEstoqueError extends Error {
  constructor(id: string) {
    super(`Produto não encontrado: ${id}`);
    this.name = "ProdutoNotFoundForEstoqueError";
  }
}

type ReservaComRelacoes = ReservaEstoque & {
  unidade: {
    id: string;
    codigoQr: string;
    etiqueta: string | null;
    status: StatusUnidade;
    produtoId: string;
    produto: { id: string; nome: string; categoria: string };
  };
  festa: {
    id: string;
    tema: string;
    dataEvento: Date;
    horarioMontagem: Date;
  };
};

export class EstoqueService {
  parseReservar(body: unknown): ReservarInput {
    return reservarSchema.parse(body);
  }

  parseDisponibilidade(query: unknown): DisponibilidadeInput {
    return disponibilidadeSchema.parse(query);
  }

  async disponibilidade({ produtoId, inicio, fim }: DisponibilidadeInput) {
    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
      include: {
        unidades: {
          where: {
            status: { not: StatusUnidade.MANUTENCAO },
          },
          orderBy: { codigoQr: "asc" },
        },
      },
    });

    if (!produto) {
      throw new ProdutoNotFoundForEstoqueError(produtoId);
    }

    const overlapping = await prisma.reservaEstoque.findMany({
      where: {
        unidade: { produtoId },
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
      select: { unidadeId: true },
    });

    const ocupadas = new Set(overlapping.map((r) => r.unidadeId));

    const livres = produto.unidades.filter((u) => !ocupadas.has(u.id));

    return {
      produto: {
        id: produto.id,
        nome: produto.nome,
        categoria: produto.categoria,
        valorAluguel: produto.valorAluguel,
      },
      inicio,
      fim,
      totalUnidades: produto.unidades.length,
      disponiveis: livres.length,
      unidades: livres,
    };
  }

  async reservar(input: ReservarInput): Promise<ReservaComRelacoes> {
    const { unidadeId, festaId, inicio, fim } = input;

    try {
      return await prisma.$transaction(
        async (tx) => {
          // Lock pessimista da unidade para evitar corrida
          const locked = await tx.$queryRaw<
            Array<{ id: string; status: StatusUnidade }>
          >`
            SELECT id, status
            FROM unidades_produto
            WHERE id = ${unidadeId}
            FOR UPDATE
          `;

          if (!locked.length) {
            throw new UnidadeNotFoundForReservaError(unidadeId);
          }

          const unidadeStatus = locked[0].status;

          if (unidadeStatus === StatusUnidade.MANUTENCAO) {
            throw new UnidadeEmManutencaoError();
          }

          const festa = await tx.festa.findUnique({
            where: { id: festaId },
            select: { id: true },
          });

          if (!festa) {
            throw new FestaNotFoundForReservaError(festaId);
          }

          const conflito = await tx.reservaEstoque.findFirst({
            where: {
              unidadeId,
              inicio: { lt: fim },
              fim: { gt: inicio },
            },
            select: { id: true },
          });

          if (conflito) {
            throw new OverbookingError();
          }

          const reserva = await tx.reservaEstoque.create({
            data: {
              unidadeId,
              festaId,
              inicio,
              fim,
            },
            include: {
              unidade: {
                include: {
                  produto: {
                    select: { id: true, nome: true, categoria: true },
                  },
                },
              },
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

          if (unidadeStatus === StatusUnidade.DISPONIVEL) {
            await tx.unidadeProduto.update({
              where: { id: unidadeId },
              data: { status: StatusUnidade.RESERVADA },
            });
          }

          return reserva;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        }
      );
    } catch (error) {
      if (
        error instanceof OverbookingError ||
        error instanceof UnidadeEmManutencaoError ||
        error instanceof UnidadeNotFoundForReservaError ||
        error instanceof FestaNotFoundForReservaError
      ) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        throw new OverbookingError(
          "Conflito de concorrência ao reservar. Tente novamente."
        );
      }

      throw error;
    }
  }

  async liberar(reservaId: string): Promise<{ ok: true; reservaId: string }> {
    await prisma.$transaction(async (tx) => {
      const reserva = await tx.reservaEstoque.findUnique({
        where: { id: reservaId },
      });

      if (!reserva) {
        throw new ReservaNotFoundError(reservaId);
      }

      await tx.reservaEstoque.delete({ where: { id: reservaId } });

      const outras = await tx.reservaEstoque.count({
        where: {
          unidadeId: reserva.unidadeId,
          fim: { gt: new Date() },
        },
      });

      if (outras === 0) {
        const unidade = await tx.unidadeProduto.findUnique({
          where: { id: reserva.unidadeId },
        });

        if (unidade && unidade.status === StatusUnidade.RESERVADA) {
          await tx.unidadeProduto.update({
            where: { id: reserva.unidadeId },
            data: { status: StatusUnidade.DISPONIVEL },
          });
        }
      }
    });

    return { ok: true, reservaId };
  }

  async listByFesta(festaId: string) {
    return prisma.reservaEstoque.findMany({
      where: { festaId },
      include: {
        unidade: {
          include: {
            produto: {
              select: { id: true, nome: true, categoria: true },
            },
          },
        },
      },
      orderBy: { inicio: "asc" },
    });
  }
}

export const estoqueService = new EstoqueService();
