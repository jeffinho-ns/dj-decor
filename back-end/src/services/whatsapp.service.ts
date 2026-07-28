import { prisma } from "../prisma/client";

export class FestaNotFoundForWhatsAppError extends Error {
  constructor(id: string) {
    super(`Festa não encontrada: ${id}`);
    this.name = "FestaNotFoundForWhatsAppError";
  }
}

export class WhatsAppService {
  async listByFesta(festaId: string) {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: { id: true },
    });

    if (!festa) {
      throw new FestaNotFoundForWhatsAppError(festaId);
    }

    return prisma.mensagemWhatsApp.findMany({
      where: { festaId },
      orderBy: { criadoEm: "desc" },
    });
  }
}

export const whatsappService = new WhatsAppService();
