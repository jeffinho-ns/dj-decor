import { Prisma, Role, StatusFesta, StatusOS } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const agendaQuerySchema = z.object({
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
});

export type AgendaQuery = z.infer<typeof agendaQuerySchema>;

/** Festas que devem aparecer na alocação de equipe (já pagas / em operação). */
const STATUS_EQUIPE: StatusFesta[] = [
  StatusFesta.PAGO,
  StatusFesta.FECHADO,
  StatusFesta.EM_MONTAGEM,
  StatusFesta.CONCLUIDO,
];

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
      where: { role: Role.MONTADOR, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });
  }

  /**
   * Garante OS para festas pagas/fechadas no período (sem OS ainda),
   * para a gestão poder atribuir montador antes/ junto do fechamento.
   */
  private async ensureOsNoPeriodo(inicio: Date, fim: Date) {
    const festas = await prisma.festa.findMany({
      where: {
        status: { in: STATUS_EQUIPE },
        OR: [
          { horarioMontagem: { gte: inicio, lte: fim } },
          { dataEvento: { gte: inicio, lte: fim } },
        ],
        ordemServico: null,
      },
      select: { id: true },
    });

    if (festas.length === 0) return;

    await prisma.ordemServico.createMany({
      data: festas.map((f) => ({
        festaId: f.id,
        status: StatusOS.ABERTA,
      })),
      skipDuplicates: true,
    });
  }

  async listAgenda(query: unknown) {
    const { inicio, fim } = this.parseAgendaQuery(query);

    await this.ensureOsNoPeriodo(inicio, fim);

    return prisma.ordemServico.findMany({
      where: {
        festa: {
          OR: [
            { horarioMontagem: { gte: inicio, lte: fim } },
            { dataEvento: { gte: inicio, lte: fim } },
          ],
          status: { in: STATUS_EQUIPE },
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
