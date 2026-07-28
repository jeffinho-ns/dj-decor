import { prisma } from "../prisma/client";

/** Resultado da geração de contrato — Fase 3 preencherá pdfData/hash com Puppeteer. */
export interface ContratoLocacaoResult {
  id: string;
  festaId: string;
  geradoEm: Date;
  /** Buffer do PDF quando disponível; null enquanto stub (sem render). */
  pdfBuffer: Buffer | null;
  /** Indica se o PDF foi renderizado de fato ou apenas registrado no banco. */
  renderizado: boolean;
}

export interface PdfAdapter {
  gerarContratoLocacao(festaId: string): Promise<ContratoLocacaoResult>;
}

/**
 * Stub do adapter de PDF para contratos de locação.
 * Fase 3: substituir renderização por Puppeteer/HTML template e preencher pdfData + hash.
 */
export class PdfAdapterStub implements PdfAdapter {
  async gerarContratoLocacao(festaId: string): Promise<ContratoLocacaoResult> {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      include: { cliente: true },
    });

    if (!festa) {
      throw new Error(`Festa não encontrada: ${festaId}`);
    }

    const existente = await prisma.contrato.findUnique({
      where: { festaId },
    });

    if (existente) {
      console.info(
        "[pdf] contrato já existe para festa",
        festaId,
        "— retornando registro existente (stub, sem re-render)"
      );
      return {
        id: existente.id,
        festaId: existente.festaId,
        geradoEm: existente.geradoEm,
        pdfBuffer: existente.pdfData
          ? Buffer.from(existente.pdfData)
          : null,
        renderizado: existente.pdfData !== null,
      };
    }

    const contrato = await prisma.contrato.create({
      data: {
        festaId,
        pdfData: null,
        pdfUrl: null,
        hash: null,
      },
    });

    console.info(
      "[pdf] contrato stub registrado:",
      contrato.id,
      "festa=",
      festaId,
      "cliente=",
      festa.cliente.nome,
      "(pdfData=null — Puppeteer na Fase 3)"
    );

    return {
      id: contrato.id,
      festaId: contrato.festaId,
      geradoEm: contrato.geradoEm,
      pdfBuffer: null,
      renderizado: false,
    };
  }
}

export const pdfAdapter = new PdfAdapterStub();
