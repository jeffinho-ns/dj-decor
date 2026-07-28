import { prisma } from "../prisma/client";

export class ContratoNotFoundError extends Error {
  constructor(message = "Contrato não encontrado") {
    super(message);
    this.name = "ContratoNotFoundError";
  }
}

export class ContratoPdfNotAvailableError extends Error {
  constructor(message = "PDF do contrato não disponível") {
    super(message);
    this.name = "ContratoPdfNotAvailableError";
  }
}

export interface ContratoMetadata {
  id: string;
  festaId: string;
  geradoEm: Date;
  tamanho: number | null;
  hash: string | null;
  temPdf: boolean;
}

export class ContratosService {
  async getMetadataByFestaId(festaId: string): Promise<ContratoMetadata> {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: { id: true },
    });

    if (!festa) {
      throw new Error(`Festa não encontrada: ${festaId}`);
    }

    const contrato = await prisma.contrato.findUnique({
      where: { festaId },
    });

    if (!contrato) {
      throw new ContratoNotFoundError(
        `Contrato não encontrado para festa ${festaId}`
      );
    }

    return {
      id: contrato.id,
      festaId: contrato.festaId,
      geradoEm: contrato.geradoEm,
      tamanho: contrato.pdfData ? contrato.pdfData.length : null,
      hash: contrato.hash,
      temPdf: contrato.pdfData !== null,
    };
  }

  async getPdfByContratoId(contratoId: string): Promise<Buffer> {
    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
    });

    if (!contrato) {
      throw new ContratoNotFoundError();
    }

    if (!contrato.pdfData) {
      throw new ContratoPdfNotAvailableError();
    }

    return Buffer.from(contrato.pdfData);
  }
}

export const contratosService = new ContratosService();
