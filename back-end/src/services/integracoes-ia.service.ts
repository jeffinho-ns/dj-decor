import { Role, StatusFesta, TamanhoDecoracao } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { catalogoService } from "./catalogo.service";
import { festasService } from "./festas.service";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

const agendaQuerySchema = z.object({
  data: z.string().min(8, "Informe data (YYYY-MM-DD ou ISO)"),
  horarioMontagem: z.string().optional(),
});

const criarOrcamentoSchema = z.object({
  nomeCliente: z.string().min(2),
  telefone: z.string().min(8),
  tema: z.string().min(2),
  dataEvento: z.coerce.date(),
  horarioMontagem: z.coerce.date(),
  endereco: z.string().min(5),
  valor: z.coerce.number().positive(),
  tamanhoDecoracao: z.nativeEnum(TamanhoDecoracao).default(TamanhoDecoracao.M),
  kitCatalogo: z.string().min(1).nullable().optional(),
  pegueEMonte: z.boolean().optional().default(false),
  itensExtras: z.array(z.string().min(1)).optional().default([]),
  observacoes: z.string().max(2000).nullable().optional(),
  vendedorId: z.string().min(1).optional(),
});

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export class IntegracoesIaService {
  async listCatalogo() {
    const [kits, addons] = await Promise.all([
      catalogoService.listKits(true),
      catalogoService.listAddons(true),
    ]);
    return {
      kits: kits.map((k) => ({
        id: k.id,
        nome: k.nome,
        categoria: k.categoria,
        descricaoCurta: k.descricaoCurta,
        valorEquipe: Number(k.valorEquipe),
        valorPegueEMonte:
          k.valorPegueEMonte != null ? Number(k.valorPegueEMonte) : null,
        tamanhoSugerido: k.tamanhoSugerido,
        itens: k.itens,
      })),
      addons: addons.map((a) => ({
        id: a.id,
        nome: a.nome,
        valor: Number(a.valor),
        tipo: a.tipo,
      })),
    };
  }

  async checarAgenda(rawQuery: unknown) {
    const query = agendaQuerySchema.parse(rawQuery);
    const dataEvento = new Date(query.data);
    if (Number.isNaN(dataEvento.getTime())) {
      throw new IntegracaoIaValidationError("data inválida");
    }

    const festas = await prisma.festa.findMany({
      where: {
        status: { not: StatusFesta.CANCELADO },
        dataEvento: {
          gte: startOfDay(dataEvento),
          lte: endOfDay(dataEvento),
        },
      },
      select: {
        id: true,
        tema: true,
        horarioMontagem: true,
        dataEvento: true,
        status: true,
        pegueEMonte: true,
        cliente: { select: { nome: true, telefone: true } },
      },
      orderBy: { horarioMontagem: "asc" },
    });

    let conflitoProximo = false;
    if (query.horarioMontagem) {
      const alvo = new Date(query.horarioMontagem).getTime();
      if (!Number.isNaN(alvo)) {
        conflitoProximo = festas.some(
          (f) => Math.abs(f.horarioMontagem.getTime() - alvo) < 3 * 60 * 60 * 1000
        );
      }
    }

    return {
      ok: true,
      data: startOfDay(dataEvento).toISOString(),
      festasNoDia: festas.length,
      disponivel: festas.length < 4,
      conflitoProximo,
      detalhe: festas.map((f) => ({
        id: f.id,
        tema: f.tema,
        cliente: f.cliente.nome,
        telefone: f.cliente.telefone,
        montagem: f.horarioMontagem.toISOString(),
        festa: f.dataEvento.toISOString(),
        status: f.status,
        pegueEMonte: f.pegueEMonte,
      })),
    };
  }

  async criarOrcamento(rawBody: unknown) {
    const data = criarOrcamentoSchema.parse(rawBody);
    const vendedorId =
      data.vendedorId ?? (await this.resolveVendedorPadrao());

    const festa = await festasService.create(
      {
        nomeCliente: data.nomeCliente,
        telefone: data.telefone,
        tema: data.tema,
        dataEvento: data.dataEvento,
        horarioMontagem: data.horarioMontagem,
        endereco: data.endereco,
        valor: data.valor,
        tamanhoDecoracao: data.tamanhoDecoracao,
        kitCatalogo: data.kitCatalogo ?? null,
        pegueEMonte: data.pegueEMonte,
        itensExtras: data.itensExtras,
        observacoes:
          data.observacoes?.trim() ||
          "Criado pelo backend de atendimento IA",
        status: StatusFesta.ORCAMENTO,
        vendedorId,
      },
      vendedorId
    );

    return {
      ok: true,
      festa: {
        id: festa.id,
        status: festa.status,
        tema: festa.tema,
        valor: Number(festa.valor),
        dataEvento: festa.dataEvento,
        horarioMontagem: festa.horarioMontagem,
        cliente: festa.cliente,
        kitCatalogo: festa.kitCatalogo,
        pegueEMonte: festa.pegueEMonte,
      },
    };
  }

  async buscarFestasPorTelefone(telefoneRaw: string) {
    const digits = digitsOnly(telefoneRaw);
    if (digits.length < 8) {
      throw new IntegracaoIaValidationError("telefone inválido");
    }

    const festas = await prisma.festa.findMany({
      where: {
        status: { not: StatusFesta.CANCELADO },
        cliente: {
          OR: [
            { telefone: { contains: digits.slice(-8) } },
            { telefone: { contains: digits } },
          ],
        },
      },
      select: {
        id: true,
        tema: true,
        status: true,
        dataEvento: true,
        valor: true,
        kitCatalogo: true,
        pegueEMonte: true,
        cliente: { select: { id: true, nome: true, telefone: true } },
        vendedor: { select: { id: true, nome: true } },
      },
      orderBy: { dataEvento: "desc" },
      take: 10,
    });

    return {
      ok: true,
      total: festas.length,
      festas: festas.map((f) => ({
        ...f,
        valor: Number(f.valor),
      })),
    };
  }

  private async resolveVendedorPadrao(): Promise<string> {
    const preferidos = ["Debora", "Vitória", "Suellem", "Lorena"];
    for (const nome of preferidos) {
      const user = await prisma.user.findFirst({
        where: { nome, ativo: true },
        select: { id: true },
      });
      if (user) return user.id;
    }

    const qualquer = await prisma.user.findFirst({
      where: {
        ativo: true,
        role: { in: [Role.GERENTE, Role.VENDEDOR, Role.ADMIN] },
      },
      select: { id: true },
      orderBy: { nome: "asc" },
    });

    if (!qualquer) {
      throw new IntegracaoIaValidationError(
        "Nenhum vendedor ativo no CRM para atribuir o orçamento"
      );
    }
    return qualquer.id;
  }
}

export class IntegracaoIaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegracaoIaValidationError";
  }
}

export const integracoesIaService = new IntegracoesIaService();
