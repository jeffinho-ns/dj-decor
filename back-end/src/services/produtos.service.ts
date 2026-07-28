import {
  Prisma,
  StatusUnidade,
  TamanhoDecoracao,
  type Produto,
  type ReservaEstoque,
  type UnidadeProduto,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const sugestoesSchema = z.object({
  tema: z.string().trim().min(1, "tema é obrigatório"),
  tamanho: z.nativeEnum(TamanhoDecoracao).optional(),
});

export type SugestoesQuery = z.infer<typeof sugestoesSchema>;

export type ProdutoSugestao = {
  id: string;
  nome: string;
  reason: string;
};

const createProdutoSchema = z.object({
  nome: z.string().trim().min(2, "Nome é obrigatório"),
  categoria: z.string().trim().min(2, "Categoria é obrigatória"),
  valorAluguel: z.coerce.number().positive("Valor de aluguel deve ser positivo"),
  tema: z.string().trim().min(1).nullable().optional(),
  requerQr: z.boolean().optional().default(false),
  ativo: z.boolean().optional().default(true),
});

const updateProdutoSchema = createProdutoSchema.partial();

const createUnidadeSchema = z.object({
  codigoQr: z.string().trim().min(2, "Código QR é obrigatório"),
  etiqueta: z.string().trim().min(1).nullable().optional(),
  status: z.nativeEnum(StatusUnidade).optional().default(StatusUnidade.DISPONIVEL),
});

export type CreateProdutoInput = z.infer<typeof createProdutoSchema>;
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>;
export type CreateUnidadeInput = z.infer<typeof createUnidadeSchema>;

export type ProdutoWithUnidades = Produto & { unidades: UnidadeProduto[] };

export class ProdutoNotFoundError extends Error {
  constructor(id: string) {
    super(`Produto não encontrado: ${id}`);
    this.name = "ProdutoNotFoundError";
  }
}

export class UnidadeNotFoundError extends Error {
  constructor(id: string) {
    super(`Unidade não encontrada: ${id}`);
    this.name = "UnidadeNotFoundError";
  }
}

export class CodigoQrInUseError extends Error {
  constructor() {
    super("Código QR já está em uso");
    this.name = "CodigoQrInUseError";
  }
}

export class ProdutosService {
  parseCreate(body: unknown): CreateProdutoInput {
    return createProdutoSchema.parse(body);
  }

  parseUpdate(body: unknown): UpdateProdutoInput {
    return updateProdutoSchema.parse(body);
  }

  parseUnidade(body: unknown): CreateUnidadeInput {
    return createUnidadeSchema.parse(body);
  }

  parseSugestoes(query: unknown): SugestoesQuery {
    return sugestoesSchema.parse(query);
  }

  async sugestoes({ tema, tamanho }: SugestoesQuery): Promise<ProdutoSugestao[]> {
    const candidatos = new Map<
      string,
      { id: string; nome: string; reason: string; score: number }
    >();

    const add = (
      produto: { id: string; nome: string },
      reason: string,
      score: number
    ) => {
      const atual = candidatos.get(produto.id);
      if (!atual || score > atual.score) {
        candidatos.set(produto.id, { ...produto, reason, score });
      }
    };

    const porTema = await prisma.produto.findMany({
      where: {
        ativo: true,
        OR: [
          { tema: { contains: tema, mode: "insensitive" } },
          { nome: { contains: tema, mode: "insensitive" } },
          { categoria: { contains: tema, mode: "insensitive" } },
        ],
      },
      select: { id: true, nome: true, tema: true },
      take: 10,
    });

    for (const p of porTema) {
      const campo =
        p.tema?.toLowerCase().includes(tema.toLowerCase())
          ? "tema"
          : p.nome.toLowerCase().includes(tema.toLowerCase())
            ? "nome"
            : "categoria";
      add(p, `Produto ativo com ${campo} compatível com "${tema}"`, 100);
    }

    const festaWhere: Prisma.FestaWhereInput = {
      tema: { contains: tema, mode: "insensitive" },
      ...(tamanho ? { tamanhoDecoracao: tamanho } : {}),
    };

    const reservas = await prisma.reservaEstoque.findMany({
      where: { festa: festaWhere },
      select: {
        unidade: {
          select: {
            produto: {
              select: { id: true, nome: true, ativo: true },
            },
          },
        },
      },
    });

    const usoPorProduto = new Map<string, { produto: { id: string; nome: string }; count: number }>();

    for (const r of reservas) {
      const produto = r.unidade.produto;
      if (!produto.ativo) continue;

      const entry = usoPorProduto.get(produto.id);
      if (entry) {
        entry.count += 1;
      } else {
        usoPorProduto.set(produto.id, { produto, count: 1 });
      }
    }

    for (const { produto, count } of usoPorProduto.values()) {
      const tamanhoLabel = tamanho ? ` (tamanho ${tamanho})` : "";
      add(
        produto,
        `Usado em ${count} festa${count === 1 ? "" : "s"} com tema similar${tamanhoLabel}`,
        50 + count
      );
    }

    const festasComKit = await prisma.festa.findMany({
      where: {
        ...festaWhere,
        kitCatalogo: { not: null },
      },
      select: {
        kitCatalogo: true,
        reservasEstoque: {
          select: {
            unidade: {
              select: {
                produto: {
                  select: { id: true, nome: true, ativo: true },
                },
              },
            },
          },
        },
      },
      take: 50,
    });

    for (const festa of festasComKit) {
      for (const reserva of festa.reservasEstoque) {
        const produto = reserva.unidade.produto;
        if (!produto.ativo) continue;

        add(
          produto,
          `Frequente no kit "${festa.kitCatalogo}" para festas com tema "${tema}"`,
          60
        );
      }
    }

    return [...candidatos.values()]
      .sort((a, b) => b.score - a.score || a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 5)
      .map(({ id, nome, reason }) => ({ id, nome, reason }));
  }

  async list(ativosOnly = false): Promise<ProdutoWithUnidades[]> {
    return prisma.produto.findMany({
      where: ativosOnly ? { ativo: true } : undefined,
      include: { unidades: { orderBy: { codigoQr: "asc" } } },
      orderBy: [{ categoria: "asc" }, { nome: "asc" }],
    });
  }

  async getById(id: string): Promise<ProdutoWithUnidades> {
    const produto = await prisma.produto.findUnique({
      where: { id },
      include: { unidades: { orderBy: { codigoQr: "asc" } } },
    });

    if (!produto) {
      throw new ProdutoNotFoundError(id);
    }

    return produto;
  }

  async create(input: CreateProdutoInput): Promise<ProdutoWithUnidades> {
    return prisma.produto.create({
      data: {
        nome: input.nome,
        categoria: input.categoria,
        valorAluguel: input.valorAluguel,
        tema: input.tema ?? null,
        requerQr: input.requerQr,
        ativo: input.ativo,
      },
      include: { unidades: true },
    });
  }

  async update(id: string, input: UpdateProdutoInput): Promise<ProdutoWithUnidades> {
    await this.getById(id);

    return prisma.produto.update({
      where: { id },
      data: {
        ...(input.nome !== undefined ? { nome: input.nome } : {}),
        ...(input.categoria !== undefined ? { categoria: input.categoria } : {}),
        ...(input.valorAluguel !== undefined
          ? { valorAluguel: input.valorAluguel }
          : {}),
        ...(input.tema !== undefined ? { tema: input.tema } : {}),
        ...(input.requerQr !== undefined ? { requerQr: input.requerQr } : {}),
        ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
      },
      include: { unidades: { orderBy: { codigoQr: "asc" } } },
    });
  }

  async addUnidade(
    produtoId: string,
    input: CreateUnidadeInput
  ): Promise<UnidadeProduto> {
    await this.getById(produtoId);

    try {
      return await prisma.unidadeProduto.create({
        data: {
          produtoId,
          codigoQr: input.codigoQr,
          etiqueta: input.etiqueta ?? null,
          status: input.status,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new CodigoQrInUseError();
      }
      throw error;
    }
  }
}

export const produtosService = new ProdutosService();

export type { ReservaEstoque };
