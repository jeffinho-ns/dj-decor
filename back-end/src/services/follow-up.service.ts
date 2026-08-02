import { StatusFesta } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { riscoService } from "./risco.service";

const followUpSchema = z.object({
  canal: z.string().min(1).default("WHATSAPP"),
  nota: z.string().max(2000).optional(),
  proximoContatoEm: z.coerce.date().optional().nullable(),
});

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export type ListFilaOptions = {
  vendedorId?: string;
  hoje?: boolean;
};

function proximoContatoDaFesta(
  followUps: Array<{ proximoContatoEm: Date | null }>
): Date | null {
  for (const row of followUps) {
    if (row.proximoContatoEm) return row.proximoContatoEm;
  }
  return null;
}

function prioridadeProximoContato(proximo: Date | null): number {
  if (!proximo) return 3;
  const hoje = startOfDay(new Date());
  const dia = startOfDay(proximo);
  if (dia.getTime() < hoje.getTime()) return 0;
  if (dia.getTime() === hoje.getTime()) return 1;
  return 2;
}

export class FollowUpService {
  /** Orçamentos parados / risco alto para fila comercial. */
  async listFila(options: ListFilaOptions = {}) {
    const festas = await prisma.festa.findMany({
      where: {
        status: {
          in: [StatusFesta.ORCAMENTO, StatusFesta.AGUARDANDO_PAGAMENTO],
        },
        ...(options.vendedorId ? { vendedorId: options.vendedorId } : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        vendedor: { select: { id: true, nome: true } },
        followUps: {
          orderBy: { criadoEm: "desc" },
          take: 3,
          include: { user: { select: { id: true, nome: true } } },
        },
      },
      orderBy: { criadoEm: "asc" },
    });

    const riscoMap = await riscoService.computeForFestas(festas.map((f) => f.id));
    const hojeFim = endOfDay(new Date());

    return festas
      .map((festa) => ({
        ...festa,
        risco: riscoMap.get(festa.id) ?? {
          score: 0,
          nivel: "BAIXO" as const,
          fatores: [],
        },
        proximoContatoEm: proximoContatoDaFesta(festa.followUps),
      }))
      .filter(
        (f) =>
          f.risco.nivel !== "BAIXO" || f.status === StatusFesta.ORCAMENTO
      )
      .filter((f) => {
        if (!options.hoje) return true;
        const proximo = f.proximoContatoEm;
        return proximo != null && proximo.getTime() <= hojeFim.getTime();
      })
      .sort((a, b) => {
        const pa = prioridadeProximoContato(a.proximoContatoEm);
        const pb = prioridadeProximoContato(b.proximoContatoEm);
        if (pa !== pb) return pa - pb;
        return b.risco.score - a.risco.score;
      });
  }

  async registrar(festaId: string, userId: string, raw: unknown) {
    const data = followUpSchema.parse(raw);
    const festa = await prisma.festa.findUnique({ where: { id: festaId } });
    if (!festa) throw new Error(`Festa não encontrada: ${festaId}`);

    return prisma.followUpContato.create({
      data: {
        festaId,
        userId,
        canal: data.canal,
        nota: data.nota?.trim() || null,
        proximoContatoEm: data.proximoContatoEm ?? null,
      },
      include: {
        user: { select: { id: true, nome: true } },
      },
    });
  }
}

export const followUpService = new FollowUpService();
