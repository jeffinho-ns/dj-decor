import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import { TipoMidia, type Cliente, type Festa, type User } from "@prisma/client";
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

function renderClausulasCustomizadas(
  doc: PDFKit.PDFDocument,
  texto: string
): void {
  const blocos = texto
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const bloco of blocos) {
    const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) continue;
    const titulo = linhas[0]!;
    const resto = linhas.slice(1);
    if (resto.length === 0) {
      doc.font("Helvetica").fontSize(10).text(titulo, { align: "justify" });
      doc.moveDown(0.8);
    } else {
      clausula(doc, titulo, resto);
    }
  }
}

function renderContratoPdf(
  festa: FestaContrato,
  opts: {
    nomeEmpresa: string;
    sloganEmpresa: string;
    clausulasContrato: string | null;
    logoBuffer: Buffer | null;
    referencias: Buffer[];
    assinaturaBuffer: Buffer | null;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (opts.logoBuffer) {
      try {
        doc.image(opts.logoBuffer, doc.page.width / 2 - 40, 40, {
          width: 80,
          align: "center",
        });
        doc.moveDown(4);
      } catch {
        // logo inválida — segue só com texto
      }
    }

    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#8B6914")
      .text(opts.nomeEmpresa.toUpperCase(), { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text(opts.sloganEmpresa, { align: "center" });
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
    doc.text(`Razão social: ${opts.nomeEmpresa} — Decoração de Festas`);
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

    if (opts.clausulasContrato?.trim()) {
      renderClausulasCustomizadas(doc, opts.clausulasContrato);
    } else {
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
    }

    if (opts.referencias.length > 0) {
      doc.addPage();
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Referências visuais da decoração", { align: "left" });
      doc.moveDown(0.8);
      doc.fontSize(10).font("Helvetica");

      let x = 50;
      let y = doc.y;
      const maxW = 220;
      const gap = 20;

      for (const buffer of opts.referencias.slice(0, 4)) {
        try {
          if (x + maxW > doc.page.width - 50) {
            x = 50;
            y += maxW + gap;
          }
          if (y + maxW > doc.page.height - 50) {
            doc.addPage();
            x = 50;
            y = 50;
          }
          doc.image(buffer, x, y, { fit: [maxW, maxW], align: "center" });
          x += maxW + gap;
        } catch {
          // ignora imagem inválida
        }
      }
      doc.y = y + maxW + gap;
    }

    doc.moveDown(1.5);
    const assinaturaY = Math.min(doc.y, doc.page.height - 120);
    if (opts.assinaturaBuffer) {
      try {
        doc.image(opts.assinaturaBuffer, 320, assinaturaY - 60, {
          fit: [180, 60],
        });
      } catch {
        // ignore
      }
    }
    doc.text("_________________________________________", 50, assinaturaY);
    doc.text(`LOCADORA — ${opts.nomeEmpresa}`, 50, assinaturaY + 14);
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

    const config = await prisma.configuracaoNegocio.findUnique({
      where: { id: "default" },
      include: { logoMidia: true },
    });

    const midias = await prisma.midia.findMany({
      where: {
        festaId,
        tipo: {
          in: [TipoMidia.REFERENCIA_FESTA, TipoMidia.ASSINATURA_CLIENTE],
        },
      },
      orderBy: { criadoEm: "desc" },
    });

    const referencias = midias
      .filter((m) => m.tipo === TipoMidia.REFERENCIA_FESTA)
      .slice(0, 4)
      .map((m) => Buffer.from(m.data));

    const assinatura = midias.find(
      (m) => m.tipo === TipoMidia.ASSINATURA_CLIENTE
    );

    const logoBuffer = config?.logoMidia
      ? Buffer.from(config.logoMidia.data)
      : null;

    const pdfBuffer = await renderContratoPdf(festa, {
      nomeEmpresa: config?.nomeEmpresa ?? "DJ Decor",
      sloganEmpresa:
        config?.sloganEmpresa ??
        "Decoração de Festas · Locação de Materiais",
      clausulasContrato: config?.clausulasContrato ?? null,
      logoBuffer,
      referencias,
      assinaturaBuffer: assinatura ? Buffer.from(assinatura.data) : null,
    });
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
