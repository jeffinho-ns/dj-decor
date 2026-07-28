import { Prisma, Role, StatusFesta } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const agendaQuerySchema = z.object({
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
});

export type AgendaQuery = z.infer<typeof agendaQuerySchema>;

const agendaOsInclude = {
  festa: {
    select: {
      id: true,
      dataEvento: true,
      horarioMontagem: true,
      tema: true,
      endereco: true,
      status: true,
      cliente: {
        select: { id: true, nome: true, telefone: true },
      },
    },
  },
  montador: {
    select: { id: true, nome: true },
  },
} satisfies Prisma.OrdemServicoInclude;

export class EquipeService {
  parseAgendaQuery(query: unknown): AgendaQuery {
    const parsed = agendaQuerySchema.parse(query);
    if (parsed.fim < parsed.inicio) {
      throw new EquipeValidationError("Parâmetro fim deve ser posterior a inicio");
    }
    return parsed;
  }

  async listMontadores() {
    return prisma.user.findMany({
      where: { role: Role.MONTADOR },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });
  }

  async listAgenda(query: unknown) {
    const { inicio, fim } = this.parseAgendaQuery(query);

    return prisma.ordemServico.findMany({
      where: {
        festa: {
          OR: [
            { horarioMontagem: { gte: inicio, lte: fim } },
            { dataEvento: { gte: inicio, lte: fim } },
          ],
          status: { not: StatusFesta.CANCELADO },
        },
      },
      include: agendaOsInclude,
      orderBy: [
        { festa: { horarioMontagem: "asc" } },
        { festa: { dataEvento: "asc" } },
      ],
    });
  }
}

export class EquipeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EquipeValidationError";
  }
}

export const equipeService = new EquipeService();
