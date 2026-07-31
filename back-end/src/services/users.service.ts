import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const SALT_ROUNDS = 10;

const createUserSchema = z.object({
  nome: z.string().min(2).max(80),
  email: z.string().email().nullable().optional(),
  role: z.nativeEnum(Role),
  senha: z.string().min(6).max(100).optional(),
});

const updateUserSchema = z.object({
  nome: z.string().min(2).max(80).optional(),
  email: z.string().email().nullable().optional(),
  role: z.nativeEnum(Role).optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(6).max(100).optional(),
});

export class UsersConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsersConflictError";
  }
}

export class UsersNotFoundError extends Error {
  constructor(id: string) {
    super(`Usuário não encontrado: ${id}`);
    this.name = "UsersNotFoundError";
  }
}

export class UsersService {
  async list() {
    return prisma.user.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
      },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    });
  }

  async create(raw: unknown) {
    const data = createUserSchema.parse(raw);
    const senhaPlain = data.senha?.trim() || "@123Mudar";
    const senhaHash = await bcrypt.hash(senhaPlain, SALT_ROUNDS);

    try {
      return await prisma.user.create({
        data: {
          nome: data.nome.trim(),
          email: data.email ?? null,
          role: data.role,
          senha: senhaHash,
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          ativo: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new UsersConflictError("Nome ou e-mail já está em uso");
      }
      throw error;
    }
  }

  async update(id: string, raw: unknown) {
    const data = updateUserSchema.parse(raw);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new UsersNotFoundError(id);

    const senhaHash = data.senha
      ? await bcrypt.hash(data.senha, SALT_ROUNDS)
      : undefined;

    try {
      return await prisma.user.update({
        where: { id },
        data: {
          ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
          ...(senhaHash ? { senha: senhaHash } : {}),
        },
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          ativo: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new UsersConflictError("Nome ou e-mail já está em uso");
      }
      throw error;
    }
  }
}

export const usersService = new UsersService();
