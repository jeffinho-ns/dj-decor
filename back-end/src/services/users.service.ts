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
  ehSocia: z.boolean().optional(),
  ehDona: z.boolean().optional(),
  sociaDesde: z.coerce.date().nullable().optional(),
});

const updateUserSchema = z.object({
  nome: z.string().min(2).max(80).optional(),
  email: z.string().email().nullable().optional(),
  role: z.nativeEnum(Role).optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(6).max(100).optional(),
  ehSocia: z.boolean().optional(),
  ehDona: z.boolean().optional(),
  sociaDesde: z.coerce.date().nullable().optional(),
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

const userSelect = {
  id: true,
  nome: true,
  email: true,
  role: true,
  ativo: true,
  ehSocia: true,
  ehDona: true,
  sociaDesde: true,
} as const;

/** Meio-dia UTC do dia civil em SP (estável para comparar só a data). */
function inicioDiaBrasilAgora(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export class UsersService {
  async list() {
    return prisma.user.findMany({
      select: userSelect,
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    });
  }

  async create(raw: unknown) {
    const data = createUserSchema.parse(raw);
    const senhaPlain = data.senha?.trim() || "@123Mudar";
    const senhaHash = await bcrypt.hash(senhaPlain, SALT_ROUNDS);
    const ehSocia = data.ehSocia ?? false;
    const sociaDesde =
      data.sociaDesde !== undefined
        ? data.sociaDesde
        : ehSocia
          ? inicioDiaBrasilAgora()
          : null;

    try {
      return await prisma.user.create({
        data: {
          nome: data.nome.trim(),
          email: data.email ?? null,
          role: data.role,
          senha: senhaHash,
          ativo: true,
          ehSocia,
          ehDona: data.ehDona ?? false,
          sociaDesde,
        },
        select: userSelect,
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

    let sociaDesdeUpdate: Date | null | undefined = data.sociaDesde;
    if (data.ehSocia === false) {
      sociaDesdeUpdate = null;
    } else if (data.ehSocia === true && data.sociaDesde === undefined) {
      // Ao marcar sócia, começa a valer a partir de hoje (se ainda não tinha data).
      sociaDesdeUpdate = existing.sociaDesde ?? inicioDiaBrasilAgora();
    }

    try {
      return await prisma.user.update({
        where: { id },
        data: {
          ...(data.nome !== undefined ? { nome: data.nome.trim() } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
          ...(data.ehSocia !== undefined ? { ehSocia: data.ehSocia } : {}),
          ...(data.ehDona !== undefined ? { ehDona: data.ehDona } : {}),
          ...(sociaDesdeUpdate !== undefined
            ? { sociaDesde: sociaDesdeUpdate }
            : {}),
          ...(senhaHash ? { senha: senhaHash } : {}),
        },
        select: userSelect,
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

  /**
   * Remove o usuário se não houver histórico. Caso tenha vendas, OS,
   * comissões etc., apenas desativa o acesso para preservar o histórico.
   */
  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new UsersConflictError("Não é possível excluir a si mesmo");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new UsersNotFoundError(id);

    if (existing.role === Role.ADMIN && existing.ativo) {
      const adminsAtivos = await prisma.user.count({
        where: { role: Role.ADMIN, ativo: true },
      });
      if (adminsAtivos <= 1) {
        throw new UsersConflictError("Não é possível excluir o último admin");
      }
    }

    const [
      festasVendedor,
      comissoes,
      movimentacoes,
      followUps,
      conversas,
      eventos,
      osMontagem,
      osDesmontagem,
      midias,
    ] = await Promise.all([
      prisma.festa.count({ where: { vendedorId: id } }),
      prisma.comissao.count({ where: { beneficiarioId: id } }),
      prisma.movimentacaoQr.count({ where: { userId: id } }),
      prisma.followUpContato.count({ where: { userId: id } }),
      prisma.conversa.count({ where: { vendedorId: id } }),
      prisma.atendimentoEvento.count({ where: { autorId: id } }),
      prisma.ordemServico.count({ where: { montadorId: id } }),
      prisma.ordemServico.count({ where: { desmontadorId: id } }),
      prisma.midia.count({ where: { uploadedById: id } }),
    ]);

    const temHistorico =
      festasVendedor +
        comissoes +
        movimentacoes +
        followUps +
        conversas +
        eventos +
        osMontagem +
        osDesmontagem +
        midias >
      0;

    if (temHistorico) {
      const usuario = await prisma.user.update({
        where: { id },
        data: { ativo: false },
        select: userSelect,
      });
      return { modo: "desativado" as const, usuario };
    }

    try {
      const usuario = await prisma.user.delete({
        where: { id },
        select: userSelect,
      });
      return { modo: "excluido" as const, usuario };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2003" || error.code === "P2014")
      ) {
        const usuario = await prisma.user.update({
          where: { id },
          data: { ativo: false },
          select: userSelect,
        });
        return { modo: "desativado" as const, usuario };
      }
      throw error;
    }
  }
}

export const usersService = new UsersService();
