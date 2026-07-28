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
    month: "long",
    year: "numeric",
  });
}

function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
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

function clausula(
  doc: PDFKit.PDFDocument,
  titulo: string,
  paragrafos: string[]
): void {
  doc.font("Helvetica-Bold").text(titulo);
  doc.font("Helvetica");
  for (const texto of paragrafos) {
    doc.moveDown(0.4);
    doc.text(texto, { align: "justify" });
  }
  doc.moveDown(0.8);
}

function renderContratoPdf(festa: FestaContrato): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Cabeçalho DJ Decor
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#8B6914")
      .text("DJ DECOR", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Decoração de Festas · Locação de Materiais", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fillColor("#000000")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("CONTRATO DE LOCAÇÃO DE DECORAÇÃO", { align: "center" });
    doc.moveDown(1.2);

    doc.fontSize(10).font("Helvetica");
    doc.text(
      `Contrato nº ${festa.id.slice(0, 8).toUpperCase()} · Emitido em ${formatarData(new Date())}`,
      { align: "center" }
    );
    doc.moveDown(1.2);

    doc.text(
      "Pelo presente instrumento particular, de um lado a LOCADORA e, de outro, o(a) LOCATÁRIO(A), " +
        "qualificados abaixo, celebram o presente contrato de locação de decoração para evento, " +
        "nos termos das cláusulas seguintes:",
      { align: "justify" }
    );
    doc.moveDown(1);

    doc.font("Helvetica-Bold").text("LOCADORA");
    doc.font("Helvetica");
    doc.text("Razão social: DJ Decor — Decoração de Festas");
    doc.text(`Representante / vendedor(a): ${festa.vendedor.nome}`);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("LOCATÁRIO(A)");
    doc.font("Helvetica");
    doc.text(`Nome: ${festa.cliente.nome}`);
    doc.text(`Telefone: ${festa.cliente.telefone}`);
    doc.moveDown(1);

    const itensDescricao = [
      festa.kitCatalogo ? `Kit: ${festa.kitCatalogo}` : null,
      festa.itensExtras.length > 0
        ? `Extras: ${festa.itensExtras.join(", ")}`
        : null,
      festa.observacoes ? `Obs.: ${festa.observacoes}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    clausula(doc, "CLÁUSULA 1 — DO OBJETO", [
      `1.1. A LOCADORA compromete-se a disponibilizar, em regime de locação, a decoração ` +
        `referente ao tema "${festa.tema}" para o evento do(a) LOCATÁRIO(A).`,
      itensDescricao
        ? `1.2. Composição contratada: ${itensDescricao}.`
        : "1.2. A composição detalhada dos itens consta do orçamento aprovado entre as partes.",
      "1.3. Os materiais permanecem de propriedade exclusiva da LOCADORA, cedidos apenas para uso no evento.",
    ]);

    clausula(doc, "CLÁUSULA 2 — DO PRAZO E DO LOCAL", [
      `2.1. Data do evento: ${formatarData(festa.dataEvento)}.`,
      `2.2. Horário previsto para montagem: ${formatarDataHora(festa.horarioMontagem)}.`,
      `2.3. Local de montagem: ${festa.endereco}.`,
      "2.4. O(A) LOCATÁRIO(A) deverá garantir acesso ao local no horário acordado, com espaço adequado para montagem e desmontagem.",
    ]);

    clausula(doc, "CLÁUSULA 3 — DO VALOR E DO PAGAMENTO", [
      `3.1. Valor total da locação: ${formatarMoeda(festa.valor)}.`,
      "3.2. O pagamento deverá ser efetuado conforme condições acordadas entre as partes (PIX, transferência ou outro meio combinado).",
      "3.3. A não quitação integral até a data do evento poderá impedir a montagem, a entrega dos materiais ou a desmontagem programada.",
    ]);

    clausula(doc, "CLÁUSULA 4 — DAS RESPONSABILIDADES", [
      "4.1. A LOCADORA responsabiliza-se pela montagem e desmontagem conforme especificações acordadas, empregando materiais em bom estado de conservação.",
      "4.2. O(A) LOCATÁRIO(A) responsabiliza-se pela integridade dos materiais locados durante o período do evento, respondendo por danos, extravios ou mau uso.",
      "4.3. Alterações de layout, itens ou horários após a confirmação poderão gerar custos adicionais, mediante concordância prévia.",
      "4.4. A LOCADORA não se responsabiliza por impedimentos causados por condições climáticas extremas, falta de energia elétrica ou restrições do local não informadas previamente.",
    ]);

    clausula(doc, "CLÁUSULA 5 — DISPOSIÇÕES GERAIS E FORO", [
      "5.1. Este contrato é firmado em caráter particular, obrigando as partes, seus herdeiros e sucessores.",
      "5.2. Eventuais tolerâncias quanto ao cumprimento de cláusulas não implicam novação ou renúncia de direitos.",
      "5.3. Fica eleito o foro da comarca de domicílio da LOCADORA para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.",
    ]);

    doc.moveDown(1.5);
    const assinaturaY = doc.y;
    doc.text("_________________________________________", 50, assinaturaY);
    doc.text("LOCADORA — DJ Decor", 50, assinaturaY + 14);
    doc.text("_________________________________________", 320, assinaturaY);
    doc.text("LOCATÁRIO(A)", 320, assinaturaY + 14);

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
