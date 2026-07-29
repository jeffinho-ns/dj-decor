import {
  Prisma,
  StatusFesta,
  StatusUnidade,
  TipoMovimentacao,
  type ReservaEstoque,
} from "@prisma/client";
import { z } from "zod";
import {
  consolidarNecessidades,
  INVENTARIO_CATALOGO,
  normalizarTexto,
} from "../catalog/inventario";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

function curaMs(): number {
  return env.ESTOQUE_CURA_HORAS * 60 * 60 * 1000;
}

/** Início efetivo da janela de ocupação considerando cura da reserva anterior. */
function inicioMenosCura(inicio: Date): Date {
  return new Date(inicio.getTime() - curaMs());
}

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

export type AlertaQr = {
  unidade: {
    id: string;
    etiqueta: string | null;
    status: StatusUnidade;
  };
  codigoQr: string;
  produto: { id: string; nome: string };
  saidaEm: Date;
  osId?: string;
  festaTema?: string;
};

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
        fim: { gt: inicioMenosCura(inicio) },
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
      curaHoras: env.ESTOQUE_CURA_HORAS,
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
              fim: { gt: inicioMenosCura(inicio) },
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
          fim: { gt: inicioMenosCura(new Date()) },
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

  async alertasQr(): Promise<AlertaQr[]> {
    const cutoff = new Date(Date.now() - env.QR_ALERTA_HORAS * 60 * 60 * 1000);

    const unidades = await prisma.unidadeProduto.findMany({
      where: { movimentacoes: { some: {} } },
      select: {
        id: true,
        codigoQr: true,
        etiqueta: true,
        status: true,
        produto: { select: { id: true, nome: true } },
        movimentacoes: {
          orderBy: { criadoEm: "desc" },
          take: 1,
          select: {
            tipo: true,
            criadoEm: true,
            osId: true,
            os: {
              select: {
                id: true,
                festa: { select: { tema: true, status: true } },
              },
            },
          },
        },
      },
    });

    const alertas: AlertaQr[] = [];

    for (const unidade of unidades) {
      const ultima = unidade.movimentacoes[0];
      if (!ultima || ultima.tipo !== TipoMovimentacao.SAIDA_GALPAO) {
        continue;
      }

      const festa = ultima.os?.festa;
      const saidaAntiga = ultima.criadoEm < cutoff;
      const festaConcluidaEmUso =
        festa?.status === StatusFesta.CONCLUIDO &&
        unidade.status === StatusUnidade.EM_USO;

      if (!saidaAntiga && !festaConcluidaEmUso) {
        continue;
      }

      alertas.push({
        unidade: {
          id: unidade.id,
          etiqueta: unidade.etiqueta,
          status: unidade.status,
        },
        codigoQr: unidade.codigoQr,
        produto: unidade.produto,
        saidaEm: ultima.criadoEm,
        ...(ultima.osId ? { osId: ultima.osId } : {}),
        ...(festa?.tema ? { festaTema: festa.tema } : {}),
      });
    }

    return alertas.sort(
      (a, b) => a.saidaEm.getTime() - b.saidaEm.getTime()
    );
  }

  /**
   * Avalia se os itensExtras da festa cabem no estoque no período.
   * Não bloqueia a venda — apenas lista faltas para compra antecipada.
   */
  async avaliarItensFesta(params: {
    itensExtras: string[];
    inicio: Date;
    fim: Date;
  }): Promise<{
    alertaCompraEstoque: boolean;
    itensFaltaEstoque: string[];
    detalhes: Array<{
      nome: string;
      necessario: number;
      disponivel: number;
      falta: number;
    }>;
  }> {
    const necessidades = consolidarNecessidades(params.itensExtras);
    if (necessidades.length === 0) {
      return { alertaCompraEstoque: false, itensFaltaEstoque: [], detalhes: [] };
    }

    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      include: {
        unidades: {
          where: { status: { not: StatusUnidade.MANUTENCAO } },
        },
      },
    });

    const overlapping = await prisma.reservaEstoque.findMany({
      where: {
        inicio: { lt: params.fim },
        fim: { gt: inicioMenosCura(params.inicio) },
      },
      select: { unidadeId: true },
    });
    const ocupadas = new Set(overlapping.map((r) => r.unidadeId));

    const detalhes: Array<{
      nome: string;
      necessario: number;
      disponivel: number;
      falta: number;
    }> = [];
    const itensFaltaEstoque: string[] = [];

    for (const necessidade of necessidades) {
      const def = INVENTARIO_CATALOGO.find((d) => d.chave === necessidade.chave);
      const produto =
        produtos.find(
          (p) => normalizarTexto(p.nome) === normalizarTexto(necessidade.nome)
        ) ??
        produtos.find((p) => {
          if (!def) return false;
          const aliases = [normalizarTexto(def.nome), ...def.aliases.map(normalizarTexto)];
          const pn = normalizarTexto(p.nome);
          return aliases.some((a) => pn === a || pn.includes(a) || a.includes(pn));
        });

      const disponivel = produto
        ? produto.unidades.filter((u) => !ocupadas.has(u.id)).length
        : 0;
      const falta = Math.max(0, necessidade.quantidade - disponivel);

      detalhes.push({
        nome: necessidade.nome,
        necessario: necessidade.quantidade,
        disponivel,
        falta,
      });

      if (falta > 0) {
        itensFaltaEstoque.push(
          `${necessidade.nome} (faltam ${falta} · precisa ${necessidade.quantidade}, tem ${disponivel})`
        );
      }
    }

    return {
      alertaCompraEstoque: itensFaltaEstoque.length > 0,
      itensFaltaEstoque,
      detalhes,
    };
  }

  /** Resumo do inventário para a tela de estoque. */
  async inventarioResumo() {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      include: { unidades: true },
      orderBy: [{ categoria: "asc" }, { nome: "asc" }],
    });

    return produtos.map((produto) => {
      const total = produto.unidades.length;
      const disponivel = produto.unidades.filter(
        (u) => u.status === StatusUnidade.DISPONIVEL
      ).length;
      const reservada = produto.unidades.filter(
        (u) => u.status === StatusUnidade.RESERVADA
      ).length;
      const emUso = produto.unidades.filter(
        (u) => u.status === StatusUnidade.EM_USO
      ).length;
      const manutencao = produto.unidades.filter(
        (u) => u.status === StatusUnidade.MANUTENCAO
      ).length;

      return {
        id: produto.id,
        nome: produto.nome,
        categoria: produto.categoria,
        valorAluguel: produto.valorAluguel,
        requerQr: produto.requerQr,
        total,
        disponivel,
        reservada,
        emUso,
        manutencao,
        unidades: produto.unidades,
      };
    });
  }

  /**
   * Upsert dos produtos do catálogo comercial e completa unidades até a qtd padrão.
   */
  async sincronizarCatalogo() {
    const criados: string[] = [];
    const atualizados: string[] = [];

    for (const item of INVENTARIO_CATALOGO) {
      let produto = await prisma.produto.findFirst({
        where: { nome: item.nome },
        include: { unidades: true },
      });

      if (!produto) {
        produto = await prisma.produto.create({
          data: {
            nome: item.nome,
            categoria: item.categoria,
            valorAluguel: item.valorAluguel,
            requerQr: item.requerQr ?? false,
            ativo: true,
          },
          include: { unidades: true },
        });
        criados.push(item.nome);
      } else {
        await prisma.produto.update({
          where: { id: produto.id },
          data: {
            categoria: item.categoria,
            valorAluguel: item.valorAluguel,
            requerQr: item.requerQr ?? produto.requerQr,
            ativo: true,
          },
        });
        atualizados.push(item.nome);
      }

      const faltam = Math.max(0, item.quantidadePadrao - produto.unidades.length);
      for (let i = 0; i < faltam; i++) {
        const seq = produto.unidades.length + i + 1;
        const codigoQr = `DJ-${item.chave.toUpperCase()}-${String(seq).padStart(3, "0")}`;
        try {
          await prisma.unidadeProduto.create({
            data: {
              produtoId: produto.id,
              codigoQr,
              etiqueta: `${item.nome} #${seq}`,
              status: StatusUnidade.DISPONIVEL,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            await prisma.unidadeProduto.create({
              data: {
                produtoId: produto.id,
                codigoQr: `${codigoQr}-${Date.now().toString(36)}`,
                etiqueta: `${item.nome} #${seq}`,
                status: StatusUnidade.DISPONIVEL,
              },
            });
          } else {
            throw error;
          }
        }
      }
    }

    const inventario = await this.inventarioResumo();
    return {
      criados,
      atualizados,
      totalProdutos: inventario.length,
      inventario,
    };
  }
}

export const estoqueService = new EstoqueService();