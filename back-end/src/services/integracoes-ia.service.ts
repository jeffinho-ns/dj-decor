import { CanalAtendimento, Role, StatusFesta, TamanhoDecoracao } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { atendimentoService } from "./atendimento.service";
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
  notasInternas: z.string().max(4000).nullable().optional(),
  /** Fora de Paracambi → split Suellem 30% quando aplicável. */
  foraParacambi: z.boolean().optional().default(false),
  origem: z.string().max(80).nullable().optional(),
  vendedorId: z.string().min(1).optional(),
  conversaId: z.string().min(1).optional(),
  montadorEquipeId: z.string().min(1).nullable().optional(),
  desmontadorEquipeId: z.string().min(1).nullable().optional(),
  montadorCarroProprio: z.boolean().optional(),
  desmontadorCarroProprio: z.boolean().optional(),
  /**
   * Se true, após criar em ORCAMENTO avança para FECHADO
   * (pegue-e-monte ou quando equipe já veio no payload).
   */
  fechar: z.boolean().optional().default(false),
});

const inboundSchema = z.object({
  waId: z.string().min(5),
  texto: z.string().max(8000).nullable().optional(),
  contatoNome: z.string().max(200).nullable().optional(),
  providerMessageId: z.string().max(200).nullable().optional(),
  timestamp: z.coerce.date().optional(),
  canal: z
    .nativeEnum(CanalAtendimento)
    .optional()
    .default(CanalAtendimento.WHATSAPP),
});

const outboundSchema = z.object({
  waId: z.string().min(5),
  texto: z.string().min(1).max(8000),
  conversaId: z.string().min(1).optional(),
  providerMessageId: z.string().max(200).nullable().optional(),
  autorTipo: z.enum(["AI", "HUMANO", "SISTEMA"]).optional().default("AI"),
});

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export class IntegracoesIaService {
  /**
   * Espelha mensagem do cliente (Meta → backend IA → CRM inbox).
   * Não dispara o agente Groq do CRM — a Debysinha vive no backend de IA.
   */
  async syncInbound(raw: unknown) {
    const data = inboundSchema.parse(raw);
    const result = await atendimentoService.ingestInbound({
      canal: data.canal,
      externalThreadId: data.waId,
      contatoExterno: data.waId,
      contatoNome: data.contatoNome ?? null,
      providerMessageId: data.providerMessageId ?? null,
      texto: data.texto ?? null,
      timestamp: data.timestamp,
    });

    return {
      ok: true,
      conversaId: result.conversa.id,
      modo: result.conversa.modo,
      status: result.conversa.status,
      shouldRunAgent: result.shouldRunAgent,
      handoffRecorrente: Boolean(result.handoffRecorrente),
      sugerido: result.sugerido
        ? {
            vendedorId: result.sugerido.vendedorId,
            vendedorNome: result.sugerido.vendedorNome,
          }
        : null,
      cliente: result.conversa.cliente
        ? {
            id: result.conversa.cliente.id,
            nome: result.conversa.cliente.nome,
            telefone: result.conversa.cliente.telefone,
          }
        : null,
      festaId:
        result.conversa.festa?.status === StatusFesta.CANCELADO
          ? null
          : result.conversa.festaId,
      created: result.created,
    };
  }

  /**
   * Espelha resposta já enviada pelo backend IA via Meta (sendToProvider=false).
   */
  async syncOutbound(raw: unknown) {
    const data = outboundSchema.parse(raw);

    let conversaId = data.conversaId;
    if (!conversaId) {
      const conversa = await prisma.conversa.findUnique({
        where: {
          canal_externalThreadId: {
            canal: CanalAtendimento.WHATSAPP,
            externalThreadId: data.waId,
          },
        },
        select: { id: true },
      });
      if (!conversa) {
        const created = await atendimentoService.ingestInbound({
          canal: CanalAtendimento.WHATSAPP,
          externalThreadId: data.waId,
          contatoExterno: data.waId,
          texto: null,
        });
        conversaId = created.conversa.id;
      } else {
        conversaId = conversa.id;
      }
    }

    const mensagem = await atendimentoService.appendOutbound({
      conversaId,
      texto: data.texto,
      autorTipo: data.autorTipo,
      sendToProvider: false,
    });

    await prisma.mensagemCanal.update({
      where: { id: mensagem.id },
      data: {
        ...(data.providerMessageId
          ? { providerMessageId: data.providerMessageId }
          : {}),
        statusEnvio: "ENVIADA_VIA_IA",
      },
    });

    return {
      ok: true,
      conversaId,
      mensagemId: mensagem.id,
    };
  }

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
          (f) =>
            Math.abs(f.horarioMontagem.getTime() - alvo) < 3 * 60 * 60 * 1000
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

  async getConversa(conversaId: string) {
    const conversa = await atendimentoService.getById(conversaId);
    return {
      ok: true,
      conversa: {
        id: conversa.id,
        canal: conversa.canal,
        modo: conversa.modo,
        status: conversa.status,
        contatoNome: conversa.contatoNome,
        contatoExterno: conversa.contatoExterno,
        externalThreadId: conversa.externalThreadId,
        clienteId: conversa.clienteId,
        festaId: conversa.festaId,
        vendedorId: conversa.vendedorId,
        vendedor: conversa.vendedor
          ? { id: conversa.vendedor.id, nome: conversa.vendedor.nome }
          : null,
        cliente: conversa.cliente
          ? {
              id: conversa.cliente.id,
              nome: conversa.cliente.nome,
              telefone: conversa.cliente.telefone,
            }
          : null,
        notasInternas: conversa.notasInternas,
        festa: conversa.festa
          ? {
              id: conversa.festa.id,
              status: conversa.festa.status,
              tema: conversa.festa.tema,
            }
          : null,
        mensagens: conversa.mensagens.slice(-30).map((m) => ({
          direcao: m.direcao,
          autorTipo: m.autorTipo,
          texto: m.texto,
          criadoEm: m.criadoEm,
        })),
      },
    };
  }

  async criarOrcamento(rawBody: unknown) {
    const data = criarOrcamentoSchema.parse(rawBody);

    let vendedorId = data.vendedorId;
    if (!vendedorId && data.conversaId) {
      try {
        const conversa = await atendimentoService.getById(data.conversaId);
        vendedorId = conversa.vendedorId ?? undefined;
      } catch {
        /* conversa opcional */
      }
    }
    vendedorId = vendedorId ?? (await this.resolveVendedorPadrao());

    const endereco = data.endereco.trim();
    const foraParacambi =
      data.foraParacambi ||
      (endereco.length >= 5 && !endereco.toLowerCase().includes("paracambi"));

    let festa = await festasService.create(
      {
        nomeCliente: data.nomeCliente,
        telefone: data.telefone,
        tema: data.tema,
        dataEvento: data.dataEvento,
        horarioMontagem: data.horarioMontagem,
        endereco,
        valor: data.valor,
        tamanhoDecoracao: data.tamanhoDecoracao,
        kitCatalogo: data.kitCatalogo ?? null,
        pegueEMonte: data.pegueEMonte,
        itensExtras: data.itensExtras,
        observacoes:
          data.observacoes?.trim() ||
          "Criado pelo backend de atendimento IA",
        notasInternas: data.notasInternas?.trim() || null,
        foraParacambi,
        origem: data.origem?.trim() || "WhatsApp",
        status: StatusFesta.ORCAMENTO,
        vendedorId,
        montadorEquipeId: data.montadorEquipeId ?? null,
        desmontadorEquipeId: data.desmontadorEquipeId ?? null,
        montadorCarroProprio: data.montadorCarroProprio,
        desmontadorCarroProprio: data.desmontadorCarroProprio,
      },
      vendedorId
    );

    if (data.conversaId) {
      try {
        await atendimentoService.vincularFesta(data.conversaId, festa.id);
      } catch (err) {
        console.error(
          "[integracoes-ia] falha ao vincular festa na conversa",
          err
        );
      }
    }

    if (data.fechar) {
      try {
        festa = await festasService.updateStatus(festa.id, {
          status: StatusFesta.FECHADO,
        });
      } catch (err) {
        console.error(
          "[integracoes-ia] festa criada, mas falha ao fechar:",
          err
        );
      }
    }

    return {
      ok: true,
      festa: {
        id: festa.id,
        status: festa.status,
        tema: festa.tema,
        valor: Number(festa.valor),
        dataEvento: festa.dataEvento,
        horarioMontagem: festa.horarioMontagem,
        endereco: festa.endereco,
        foraParacambi: festa.foraParacambi,
        tamanhoDecoracao: festa.tamanhoDecoracao,
        observacoes: festa.observacoes,
        notasInternas: festa.notasInternas,
        vendedorId: festa.vendedorId,
        vendedor: festa.vendedor
          ? { id: festa.vendedor.id, nome: festa.vendedor.nome }
          : null,
        cliente: festa.cliente,
        kitCatalogo: festa.kitCatalogo,
        pegueEMonte: festa.pegueEMonte,
        itensExtras: festa.itensExtras,
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
        horarioMontagem: true,
        endereco: true,
        valor: true,
        kitCatalogo: true,
        pegueEMonte: true,
        foraParacambi: true,
        observacoes: true,
        notasInternas: true,
        tamanhoDecoracao: true,
        itensExtras: true,
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
