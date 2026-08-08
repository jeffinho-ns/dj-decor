import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import {
  StatusPagamento,
  TipoMidia,
  type Cliente,
  type Festa,
  type Pagamento,
  type User,
} from "@prisma/client";
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
  pagamentos: Pick<Pagamento, "valor" | "status">[];
};

interface ValoresContrato {
  valorTotal: number;
  adiantamento: number;
  saldo: number;
}

function calcularValoresContrato(
  festa: Pick<FestaContrato, "valor" | "pagamentos">
): ValoresContrato {
  const valorTotal = Number(festa.valor.toString());
  const adiantamento = festa.pagamentos
    .filter((p) => p.status === StatusPagamento.CONFIRMADO)
    .reduce((acc, p) => acc + Number(p.valor.toString()), 0);
  const saldo = Math.max(0, Number((valorTotal - adiantamento).toFixed(2)));
  return { valorTotal, adiantamento, saldo };
}

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarHora(data: Date): string {
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
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

function formatarMoeda(valor: { toString(): string } | number): string {
  const numero = typeof valor === "number" ? valor : Number(valor.toString());
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
    telefoneEmpresa?: string | null;
    enderecoEmpresa?: string | null;
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

    const { valorTotal, adiantamento: totalPago, saldo } =
      calcularValoresContrato(festa);
    const pegueEMonte = Boolean(festa.pegueEMonte);
    const labelData = pegueEMonte ? "Data da retirada" : "Data do evento";
    const labelHora = pegueEMonte
      ? "Horário da retirada"
      : "Horário do evento";

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
    if (opts.telefoneEmpresa?.trim()) {
      doc.text(`Telefone / WhatsApp: ${opts.telefoneEmpresa.trim()}`);
    }
    if (opts.enderecoEmpresa?.trim()) {
      doc.text(`Endereço / depósito: ${opts.enderecoEmpresa.trim()}`);
    }
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").text("LOCATÁRIO(A)");
    doc.font("Helvetica");
    doc.text(`Nome: ${festa.cliente.nome}`);
    doc.text(`Telefone: ${festa.cliente.telefone}`);
    doc.moveDown(1);

    // Bloco de dados da festa — sempre presente (mesmo com cláusulas custom)
    doc.font("Helvetica-Bold").text("DADOS DO PEDIDO");
    doc.font("Helvetica");
    doc.text(`Cliente: ${festa.cliente.nome}`);
    doc.text(`Telefone: ${festa.cliente.telefone}`);
    doc.text(`Tema: ${festa.tema}`);
    doc.text(`Tamanho: ${festa.tamanhoDecoracao}`);
    doc.text(
      `Modalidade: ${pegueEMonte ? "Pegue e monte" : "Montagem pela equipe"}`
    );
    doc.text(`${labelData}: ${formatarData(festa.dataEvento)}`);
    doc.text(`${labelHora}: ${formatarHora(festa.dataEvento)}`);
    if (!pegueEMonte) {
      doc.text(
        `Horário de montagem: ${formatarDataHora(festa.horarioMontagem)}`
      );
    }
    doc.text(`Local: ${festa.endereco}`);
    doc.text(`Valor total: ${formatarMoeda(valorTotal)}`);
    doc.text(
      totalPago > 0
        ? `Adiantamento / sinal confirmado: ${formatarMoeda(totalPago)}`
        : "Adiantamento / sinal confirmado: nenhum valor confirmado até o momento"
    );
    doc.text(`Saldo restante: ${formatarMoeda(saldo)}`);
    if (saldo > 0) {
      doc.text(
        "O saldo deverá ser quitado até a véspera do evento, independentemente do meio (PIX, espécie ou cartão)."
      );
    }
    doc.moveDown(0.6);

    if (festa.kitCatalogo) {
      doc.text(`Kit: ${festa.kitCatalogo}`);
    }
    if (festa.itensExtras.length > 0) {
      doc.text("Itens / extras:");
      for (const item of festa.itensExtras) {
        doc.text(`• ${item}`);
      }
    }
    if (festa.observacoes?.trim()) {
      doc.text(`Observações: ${festa.observacoes.trim()}`);
    }
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
          `referente ao tema "${festa.tema}" (tamanho ${festa.tamanhoDecoracao}) para o evento do(a) LOCATÁRIO(A).`,
        itensDescricao
          ? `1.2. Composição contratada: ${itensDescricao}.`
          : "1.2. A composição detalhada dos itens consta do orçamento aprovado entre as partes.",
        "1.3. Os materiais permanecem de propriedade exclusiva da LOCADORA, cedidos apenas para uso no evento.",
      ]);

      clausula(doc, "CLÁUSULA 2 — DO PRAZO E DO LOCAL", [
        `2.1. ${labelData}: ${formatarData(festa.dataEvento)}.`,
        `2.2. ${labelHora}: ${formatarHora(festa.dataEvento)}.`,
        pegueEMonte
          ? `2.3. Local de retirada/entrega: ${festa.endereco}.`
          : `2.3. Horário previsto para montagem: ${formatarDataHora(festa.horarioMontagem)}.`,
        pegueEMonte
          ? "2.4. No pegue e monte, o(a) LOCATÁRIO(A) retira e devolve os materiais conforme combinado, salvo se houver serviço de leva e busca."
          : `2.4. Local de montagem: ${festa.endereco}.`,
        "2.5. O(A) LOCATÁRIO(A) deverá garantir acesso ao local no horário acordado, com espaço adequado.",
      ]);

      clausula(doc, "CLÁUSULA 3 — DO VALOR E DO PAGAMENTO", [
        `3.1. Valor total da locação: ${formatarMoeda(valorTotal)}.`,
        totalPago > 0
          ? `3.2. Adiantamento / sinal já confirmado: ${formatarMoeda(totalPago)}. Saldo restante: ${formatarMoeda(saldo)}.`
          : "3.2. Nenhum adiantamento confirmado até a emissão deste contrato. O pagamento deverá ser efetuado conforme condições acordadas (PIX, espécie, cartão ou outro meio).",
        "3.3. Se houver valor restante, deverá ser quitado até a véspera do evento, independentemente do meio de pagamento (PIX, espécie ou cartão).",
        "3.4. A não quitação integral até a véspera do evento poderá impedir a montagem, a entrega dos materiais ou a desmontagem programada.",
      ]);

      clausula(doc, "CLÁUSULA 4 — DAS RESPONSABILIDADES", [
        "4.1. A LOCADORA responsabiliza-se pela disponibilidade dos materiais conforme especificações acordadas, em bom estado de conservação.",
        "4.2. O(A) LOCATÁRIO(A) responsabiliza-se pela integridade dos materiais locados durante o período do evento, respondendo por danos, extravios ou mau uso.",
        "4.3. Alterações de layout, itens ou horários após a confirmação poderão gerar custos adicionais, mediante concordância prévia.",
        "4.4. A LOCADORA não se responsabiliza por impedimentos causados por condições climáticas extremas, falta de energia elétrica ou restrições do local não informadas previamente.",
      ]);

      clausula(doc, "CLÁUSULA 5 — DISPOSIÇÕES GERAIS E FORO", [
        "5.1. Este contrato é firmado em caráter particular, obrigando as partes, seus herdeiros e sucessores.",
        "5.2. Eventuais tolerâncias quanto ao cumprimento de cláusulas não implicam novação ou renúncia de direitos.",
        "5.3. Fica eleito o foro da comarca de Paracambi/RJ (domicílio da LOCADORA) para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.",
      ]);
    }

    // Sempre presente — regra de negócio acordada com a marca
    clausula(doc, "CLÁUSULA — DESISTÊNCIA E CRÉDITO", [
      "O valor pago (sinal ou qualquer parcela) não é devolvido em caso de desistência.",
      "O montante fica como crédito por até 12 (doze) meses, podendo ser usado em outra data ou transferido para outra pessoa.",
    ]);

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
      include: {
        cliente: true,
        vendedor: true,
        pagamentos: { select: { valor: true, status: true } },
      },
    });

    if (!festa) {
      throw new Error(`Festa não encontrada: ${festaId}`);
    }

    const [config, midias] = await Promise.all([
      prisma.configuracaoNegocio.findUnique({
        where: { id: "default" },
        include: { logoMidia: true },
      }),
      prisma.midia.findMany({
        where: {
          festaId,
          tipo: {
            in: [TipoMidia.REFERENCIA_FESTA, TipoMidia.ASSINATURA_CLIENTE],
          },
        },
        orderBy: { criadoEm: "desc" },
      }),
    ]);

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
      nomeEmpresa: config?.nomeEmpresa ?? "Débora Pimentel Decoradora",
      sloganEmpresa:
        config?.sloganEmpresa ??
        "Decoração de Festas · Paracambi - RJ",
      clausulasContrato: config?.clausulasContrato ?? null,
      telefoneEmpresa: config?.telefoneEmpresa ?? null,
      enderecoEmpresa: config?.enderecoEmpresa ?? null,
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
