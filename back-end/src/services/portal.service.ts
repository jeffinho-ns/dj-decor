import { prisma } from "../prisma/client";

export class PortalFestaNotFoundError extends Error {
  constructor(id: string) {
    super(`Festa não encontrada: ${id}`);
    this.name = "PortalFestaNotFoundError";
  }
}

/** Status público da festa — sem dados sensíveis (valor, cliente, endereço). */
export interface PortalFestaStatus {
  status: string;
  dataEvento: string;
  tema: string;
}

export class PortalService {
  async getFestaStatus(festaId: string): Promise<PortalFestaStatus> {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: {
        status: true,
        dataEvento: true,
        tema: true,
      },
    });

    if (!festa) {
      throw new PortalFestaNotFoundError(festaId);
    }

    return {
      status: festa.status,
      dataEvento: festa.dataEvento.toISOString(),
      tema: festa.tema,
    };
  }
}

export const portalService = new PortalService();
