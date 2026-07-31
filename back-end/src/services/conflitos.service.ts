import { StatusFesta } from "@prisma/client";
import { prisma } from "../prisma/client";

export class ConflitosService {
  /**
   * Detecta festas no mesmo dia com sobreposição de horário de montagem
   * ou mesma janela (alerta operacional).
   */
  async paraFesta(festaId: string) {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: {
        id: true,
        dataEvento: true,
        horarioMontagem: true,
        status: true,
        tema: true,
        cliente: { select: { nome: true } },
      },
    });
    if (!festa) throw new Error(`Festa não encontrada: ${festaId}`);

    const diaInicio = new Date(festa.dataEvento);
    diaInicio.setHours(0, 0, 0, 0);
    const diaFim = new Date(festa.dataEvento);
    diaFim.setHours(23, 59, 59, 999);

    const outras = await prisma.festa.findMany({
      where: {
        id: { not: festaId },
        status: { not: StatusFesta.CANCELADO },
        dataEvento: { gte: diaInicio, lte: diaFim },
      },
      select: {
        id: true,
        tema: true,
        horarioMontagem: true,
        dataEvento: true,
        status: true,
        cliente: { select: { nome: true } },
      },
    });

    const montagemMs = festa.horarioMontagem.getTime();
    const conflitos = outras.filter((outra) => {
      const diff = Math.abs(outra.horarioMontagem.getTime() - montagemMs);
      return diff < 3 * 60 * 60 * 1000; // 3h
    });

    return {
      festaId,
      conflitosAgenda: conflitos.map((c) => ({
        id: c.id,
        cliente: c.cliente.nome,
        tema: c.tema,
        horarioMontagem: c.horarioMontagem.toISOString(),
        status: c.status,
        motivo: "Montagem no mesmo dia com menos de 3h de intervalo",
      })),
    };
  }
}

export const conflitosService = new ConflitosService();
