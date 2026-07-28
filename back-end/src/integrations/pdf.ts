import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import type { Festa, Cliente, User } from "@prisma/client";
import { prisma } from "../prisma/client";

export interface ContratoLocacaoResult {
  id: string;
  festaId: string;
  geradoEm: Date;
  tamanho: number;
  hash: string;
}

export interface PdfAdapter {
  gerarContratoLocacao(festaId: string): Promise<ContratoLocacaoResult>;
}

type FestaContrato = Festa & {
  cliente: Cliente;
  vendedor: User;
};

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarMoeda(valor: { toString(): string }): string {
  const numero = Number(valor.toString());
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function renderContratoPdf(festa: FestaContrato): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("CONTRATO DE LOCAÇÃO DE DECORAÇÃO", { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(11).font("Helvetica");
    doc.text(
      "Pelo presente instrumento particular, as partes abaixo qualificadas celebram contrato de locação de decoração para evento, nos termos a seguir:"
    );
    doc.moveDown();

    doc.font("Helvetica-Bold").text("LOCADORA");
    doc.font("Helvetica");
    doc.text("DJ Decor — Decoração de Festas");
    doc.text(`Representante: ${festa.vendedor.nome}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").text("LOCATÁRIO(A)");
    doc.font("Helvetica");
    doc.text(`Nome: ${festa.cliente.nome}`);
    doc.text(`Telefone: ${festa.cliente.telefone}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").text("DADOS DO EVENTO");
    doc.font("Helvetica");
    doc.text(`Data do evento: ${formatarData(festa.dataEvento)}`);
    doc.text(`Horário de montagem: ${formatarDataHora(festa.horarioMontagem)}`);
    doc.text(`Endereço: ${festa.endereco}`);
    doc.text(`Tema: ${festa.tema}`);
    if (festa.kitCatalogo) {
      doc.text(`Kit catálogo: ${festa.kitCatalogo}`);
    }
    if (festa.itensExtras.length > 0) {
      doc.text(`Itens extras: ${festa.itensExtras.join(", ")}`);
    }
    if (festa.observacoes) {
      doc.text(`Observações: ${festa.observacoes}`);
    }
    doc.moveDown();

    doc.font("Helvetica-Bold").text("VALOR DA LOCAÇÃO");
    doc.font("Helvetica");
    doc.text(formatarMoeda(festa.valor));
    doc.moveDown();

    doc.font("Helvetica-Bold").text("CLÁUSULAS GERAIS");
    doc.font("Helvetica");
    doc.text(
      "1. O locatário declara ciência de que a decoração será montada conforme dados acima e se compromete a disponibilizar acesso ao local na data e horário acordados."
    );
    doc.moveDown(0.5);
    doc.text(
      "2. O pagamento deverá ser efetuado conforme condições acordadas entre as partes. A não quitação poderá impedir a montagem ou retirada dos materiais."
    );
    doc.moveDown(0.5);
    doc.text(
      "3. O locatário responsabiliza-se pela integridade dos materiais locados durante o período do evento, respondendo por danos ou extravios."
    );
    doc.moveDown(0.5);
    doc.text(
      "4. Este contrato é firmado em caráter particular, vinculando as partes às obrigações aqui descritas."
    );
    doc.moveDown(2);

    const assinaturaY = doc.y;
    doc.text("_________________________________________", 50, assinaturaY);
    doc.text("Locadora — DJ Decor", 50, assinaturaY + 15);
    doc.text("_________________________________________", 320, assinaturaY);
    doc.text("Locatário(a)", 320, assinaturaY + 15);

    doc.end();
  });
}

export class PdfKitAdapter implements PdfAdapter {
  async gerarContratoLocacao(festaId: string): Promise<ContratoLocacaoResult> {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      include: { cliente: true, vendedor: true },
    });

    if (!festa) {
      throw new Error(`Festa não encontrada: ${festaId}`);
    }

    const pdfBuffer = await renderContratoPdf(festa);
    const hash = createHash("sha256").update(pdfBuffer).digest("hex");

    const pdfBytes = new Uint8Array(pdfBuffer);

    const contrato = await prisma.contrato.upsert({
      where: { festaId },
      create: {
        festaId,
        pdfData: pdfBytes,
        hash,
        pdfUrl: null,
      },
      update: {
        pdfData: pdfBytes,
        hash,
        geradoEm: new Date(),
      },
    });

    return {
      id: contrato.id,
      festaId: contrato.festaId,
      geradoEm: contrato.geradoEm,
      tamanho: pdfBuffer.length,
      hash,
    };
  }
}

export const pdfAdapter = new PdfKitAdapter();
