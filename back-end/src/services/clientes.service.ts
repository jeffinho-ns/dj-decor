import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

export function normalizePhoneDigits(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

const createClienteSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  telefone: z.string().min(8, "Telefone é obrigatório"),
  observacoes: z.string().max(5000).nullable().optional(),
  origem: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).optional().default([]),
});

const updateClienteSchema = z.object({
  nome: z.string().min(2).optional(),
  telefone: z.string().min(8).optional(),
  observacoes: z.string().max(5000).nullable().optional(),
  origem: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
});

export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;

export class ClienteNotFoundError extends Error {
  constructor(id: string) {
    super(`Cliente com id ${id} não encontrado`);
    this.name = "ClienteNotFoundError";
  }
}

export class ClientesService {
  async list(q?: string) {
    const trimmed = q?.trim();
    const where: Prisma.ClienteWhereInput = {};

    if (trimmed) {
      const digits = normalizePhoneDigits(trimmed);
      where.OR = [
        { nome: { contains: trimmed, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ telefone: { contains: digits } }] : []),
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        _count: { select: { festas: true } },
        festas: {
          select: { dataEvento: true },
          orderBy: { dataEvento: "desc" },
          take: 1,
        },
      },
      orderBy: [{ atualizadoEm: "desc" }],
      take: 100,
    });

    return clientes.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      observacoes: cliente.observacoes,
      origem: cliente.origem,
      tags: cliente.tags,
      criadoEm: cliente.criadoEm,
      atualizadoEm: cliente.atualizadoEm,
      totalFestas: cliente._count.festas,
      ultimaFesta: cliente.festas[0]?.dataEvento ?? null,
    }));
  }

  async getById(id: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        festas: {
          select: {
            id: true,
            tema: true,
            dataEvento: true,
            status: true,
            valor: true,
          },
          orderBy: { dataEvento: "desc" },
        },
        _count: { select: { festas: true } },
      },
    });

    if (!cliente) {
      throw new ClienteNotFoundError(id);
    }

    return {
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      observacoes: cliente.observacoes,
      origem: cliente.origem,
      tags: cliente.tags,
      criadoEm: cliente.criadoEm,
      atualizadoEm: cliente.atualizadoEm,
      totalFestas: cliente._count.festas,
      festas: cliente.festas,
    };
  }

  async findByTelefone(telefone: string) {
    const digits = normalizePhoneDigits(telefone);
    if (digits.length < 8) {
      return null;
    }

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        nome: string;
        telefone: string;
        observacoes: string | null;
        origem: string | null;
        tags: string[];
        criado_em: Date;
        atualizado_em: Date;
      }>
    >`
      SELECT id, nome, telefone, observacoes, origem, tags, criado_em, atualizado_em
      FROM clientes
      WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = ${digits}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      nome: row.nome,
      telefone: row.telefone,
      observacoes: row.observacoes,
      origem: row.origem,
      tags: row.tags,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em,
    };
  }

  async create(rawInput: unknown) {
    const data = createClienteSchema.parse(rawInput);
    return prisma.cliente.create({
      data: {
        nome: data.nome.trim(),
        telefone: data.telefone.trim(),
        observacoes: data.observacoes?.trim() || null,
        origem: data.origem?.trim() || null,
        tags: data.tags ?? [],
      },
    });
  }

  async update(id: string, rawInput: unknown) {
    await this.ensureExists(id);
    const data = updateClienteSchema.parse(rawInput);

    return prisma.cliente.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
        ...(data.telefone !== undefined ? { telefone: data.telefone.trim() } : {}),
        ...(data.observacoes !== undefined
          ? { observacoes: data.observacoes?.trim() || null }
          : {}),
        ...(data.origem !== undefined
          ? { origem: data.origem?.trim() || null }
          : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
      },
    });
  }

  async findOrCreate(params: {
    nome: string;
    telefone: string;
    origem?: string | null;
  }) {
    const existing = await this.findByTelefone(params.telefone);
    if (existing) {
      const updates: Prisma.ClienteUpdateInput = {};
      if (params.nome.trim() && params.nome.trim() !== existing.nome) {
        updates.nome = params.nome.trim();
      }
      if (params.origem?.trim() && !existing.origem) {
        updates.origem = params.origem.trim();
      }
      if (Object.keys(updates).length === 0) {
        return existing;
      }
      return prisma.cliente.update({
        where: { id: existing.id },
        data: updates,
      });
    }

    return prisma.cliente.create({
      data: {
        nome: params.nome.trim(),
        telefone: params.telefone.trim(),
        origem: params.origem?.trim() || null,
      },
    });
  }

  private async ensureExists(id: string) {
    const existing = await prisma.cliente.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new ClienteNotFoundError(id);
    }
  }
}

export const clientesService = new ClientesService();
