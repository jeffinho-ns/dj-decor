import { StatusFesta, TamanhoDecoracao } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const createFestaSchema = z.object({
  nomeCliente: z.string().min(2, "Nome do cliente é obrigatório"),
  telefone: z.string().min(8, "Telefone é obrigatório"),
  tema: z.string().min(2, "Tema é obrigatório"),
  dataEvento: z.coerce.date({
    required_error: "Data/hora do evento é obrigatória",
    invalid_type_error: "Data/hora do evento inválida",
  }),
  horarioMontagem: z.coerce.date({
    required_error: "Horário de montagem é obrigatório",
    invalid_type_error: "Horário de montagem inválido",
  }),
  tamanhoDecoracao: z.nativeEnum(TamanhoDecoracao, {
    required_error: "Tamanho da decoração é obrigatório",
  }),
  itensExtras: z.array(z.string().min(1)).optional().default([]),
  kitCatalogo: z.string().min(1).nullable().optional(),
  pegueEMonte: z.boolean().optional().default(false),
  observacoes: z.string().max(2000).nullable().optional(),
  endereco: z.string().min(5, "Endereço é obrigatório"),
  valor: z.coerce.number().positive("Valor deve ser positivo"),
  status: z.nativeEnum(StatusFesta).optional().default(StatusFesta.ORCAMENTO),
  vendedorId: z.string().optional(),
});

const updateFestaSchema = z.object({
  tema: z.string().min(2).optional(),
  dataEvento: z.coerce.date().optional(),
  horarioMontagem: z.coerce.date().optional(),
  tamanhoDecoracao: z.nativeEnum(TamanhoDecoracao).optional(),
  itensExtras: z.array(z.string().min(1)).optional(),
  kitCatalogo: z.string().min(1).nullable().optional(),
  pegueEMonte: z.boolean().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
  endereco: z.string().min(5).optional(),
  valor: z.coerce.number().positive().optional(),
  status: z.nativeEnum(StatusFesta).optional(),
  nomeCliente: z.string().min(2).optional(),
  telefone: z.string().min(8).optional(),
});

const updateChecklistSchema = z.object({
  itensExtrasConcluidos: z.array(z.string().min(1)),
});

export type CreateFestaInput = z.infer<typeof createFestaSchema>;
export type UpdateFestaInput = z.infer<typeof updateFestaSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;

export class FestasService {
  async list() {
    return prisma.festa.findMany({
      include: {
        cliente: true,
        vendedor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
      orderBy: [{ dataEvento: "asc" }, { horarioMontagem: "asc" }],
    });
  }

  async getById(id: string) {
    const festa = await prisma.festa.findUnique({
      where: { id },
      include: {
        cliente: true,
        vendedor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });

    if (!festa) {
      throw new FestaNotFoundError(id);
    }

    return festa;
  }

  async create(rawInput: unknown, fallbackVendedorId: string) {
    const data = createFestaSchema.parse(rawInput);
    const vendedorId = data.vendedorId ?? fallbackVendedorId;

    await this.ensureVendedorExists(vendedorId);

    const cliente = await prisma.cliente.create({
      data: {
        nome: data.nomeCliente,
        telefone: data.telefone,
      },
    });

    return prisma.festa.create({
      data: {
        dataEvento: data.dataEvento,
        horarioMontagem: data.horarioMontagem,
        status: data.status,
        valor: data.valor,
        tema: data.tema,
        tamanhoDecoracao: data.tamanhoDecoracao,
        itensExtras: data.itensExtras,
        kitCatalogo: data.kitCatalogo ?? null,
        pegueEMonte: data.pegueEMonte,
        observacoes: data.observacoes?.trim() ? data.observacoes.trim() : null,
        endereco: data.endereco,
        clienteId: cliente.id,
        vendedorId,
      },
      include: {
        cliente: true,
        vendedor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });
  }

  async update(id: string, rawInput: unknown) {
    const data = updateFestaSchema.parse(rawInput);
    const festa = await this.getById(id);

    if (data.nomeCliente || data.telefone) {
      await prisma.cliente.update({
        where: { id: festa.clienteId },
        data: {
          ...(data.nomeCliente ? { nome: data.nomeCliente } : {}),
          ...(data.telefone ? { telefone: data.telefone } : {}),
        },
      });
    }

    return prisma.festa.update({
      where: { id },
      data: {
        ...(data.tema !== undefined ? { tema: data.tema } : {}),
        ...(data.dataEvento !== undefined ? { dataEvento: data.dataEvento } : {}),
        ...(data.horarioMontagem !== undefined
          ? { horarioMontagem: data.horarioMontagem }
          : {}),
        ...(data.tamanhoDecoracao !== undefined
          ? { tamanhoDecoracao: data.tamanhoDecoracao }
          : {}),
        ...(data.itensExtras !== undefined ? { itensExtras: data.itensExtras } : {}),
        ...(data.kitCatalogo !== undefined
          ? { kitCatalogo: data.kitCatalogo }
          : {}),
        ...(data.pegueEMonte !== undefined
          ? { pegueEMonte: data.pegueEMonte }
          : {}),
        ...(data.observacoes !== undefined
          ? {
              observacoes: data.observacoes?.trim()
                ? data.observacoes.trim()
                : null,
            }
          : {}),
        ...(data.endereco !== undefined ? { endereco: data.endereco } : {}),
        ...(data.valor !== undefined ? { valor: data.valor } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: {
        cliente: true,
        vendedor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    return prisma.festa.delete({ where: { id } });
  }

  async updateChecklist(id: string, rawItensExtrasConcluidos: unknown) {
    const data = updateChecklistSchema.parse({
      itensExtrasConcluidos: rawItensExtrasConcluidos,
    });
    const festa = await this.getById(id);

    const validos = new Set(festa.itensExtras);
    const itensFiltrados = data.itensExtrasConcluidos.filter((item) =>
      validos.has(item)
    );

    return prisma.festa.update({
      where: { id },
      data: {
        itensExtrasConcluidos: itensFiltrados,
      },
      include: {
        cliente: true,
        vendedor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });
  }

  private async ensureVendedorExists(vendedorId: string) {
    const existing = await prisma.user.findUnique({ where: { id: vendedorId } });

    if (existing) {
      return existing;
    }

    if (vendedorId === "mock-vendedor-id") {
      return prisma.user.create({
        data: {
          id: "mock-vendedor-id",
          nome: "Vendedor Mock",
          email: "vendedor@djdecor.com",
          senha: "mock-password-hash",
          role: "VENDEDOR",
        },
      });
    }

    throw new Error(`Vendedor com id ${vendedorId} não encontrado`);
  }
}

export class FestaNotFoundError extends Error {
  constructor(id: string) {
    super(`Festa com id ${id} não encontrada`);
    this.name = "FestaNotFoundError";
  }
}

export const festasService = new FestasService();
