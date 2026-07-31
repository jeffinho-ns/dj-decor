import { StatusFesta } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { riscoService } from "./risco.service";

const followUpSchema = z.object({
  canal: z.string().min(1).default("WHATSAPP"),
  nota: z.string().max(2000).optional(),
});

export class FollowUpService {
  /** Orçamentos parados / risco alto para fila comercial. */
  async listFila() {
    const festas = await prisma.festa.findMany({
      where: {
        status: {
          in: [StatusFesta.ORCAMENTO, StatusFesta.AGUARDANDO_PAGAMENTO],
        },
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

    return festas
      .map((festa) => ({
        ...festa,
        risco: riscoMap.get(festa.id) ?? {
          score: 0,
          nivel: "BAIXO" as const,
          fatores: [],
        },
      }))
      .filter(
        (f) =>
          f.risco.nivel !== "BAIXO" ||
          f.status === StatusFesta.ORCAMENTO
      )
      .sort((a, b) => b.risco.score - a.risco.score);
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
      },
      include: {
        user: { select: { id: true, nome: true } },
      },
    });
  }
}

export const followUpService = new FollowUpService();
