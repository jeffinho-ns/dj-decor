import {
  Prisma,
  StatusUnidade,
  type Produto,
  type ReservaEstoque,
  type UnidadeProduto,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

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
