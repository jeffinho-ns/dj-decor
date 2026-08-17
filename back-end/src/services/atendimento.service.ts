import {
  CanalAtendimento,
  DirecaoMensagem,
  ModoAtendimento,
  Role,
  StatusConversa,
  StatusFesta,
  TipoAtendimentoEvento,
  type Prisma,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { metaMessaging } from "../integrations/meta-messaging";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

const listSchema = z.object({
  status: z.nativeEnum(StatusConversa).optional(),
  canal: z.nativeEnum(CanalAtendimento).optional(),
  vendedorId: z.string().min(1).optional(),
  q: z.string().optional(),
  minhas: z.coerce.boolean().optional(),
});

const createManualSchema = z.object({
  contatoExterno: z.string().min(3),
  contatoNome: z.string().min(1).optional(),
  canal: z.nativeEnum(CanalAtendimento).default(CanalAtendimento.MANUAL),
  texto: z.string().min(1).optional(),
  clienteId: z.string().min(1).optional(),
});

const sendMessageSchema = z.object({
  texto: z.string().min(1).max(4000),
});

const assignSchema = z.object({
  vendedorId: z.string().min(1).nullable(),
});

const conversaInclude = {
  cliente: { select: { id: true, nome: true, telefone: true } },
  vendedor: { select: { id: true, nome: true, role: true } },
  festa: {
    select: {
      id: true,
      tema: true,
      status: true,
      valor: true,
      dataEvento: true,
    },
  },
  _count: { select: { mensagens: true } },
} satisfies Prisma.ConversaInclude;

export class ConversaNotFoundError extends Error {
  constructor(id: string) {
    super(`Conversa não encontrada: ${id}`);
    this.name = "ConversaNotFoundError";
  }
}

export class AtendimentoService {
  async list(
    rawQuery: unknown,
    viewer: { id: string; role: Role }
  ) {
    const query = listSchema.parse(rawQuery ?? {});
    const where: Prisma.ConversaWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.canal) where.canal = query.canal;

    if (query.minhas || viewer.role === Role.VENDEDOR) {
      where.OR = [
        { vendedorId: viewer.id },
        { vendedorId: null, modo: ModoAtendimento.AI },
      ];
    } else if (query.vendedorId) {
      where.vendedorId = query.vendedorId;
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.AND = [
        {
          OR: [
            { contatoNome: { contains: q, mode: "insensitive" } },
            { contatoExterno: { contains: q, mode: "insensitive" } },
            { cliente: { nome: { contains: q, mode: "insensitive" } } },
            { cliente: { telefone: { contains: digitsOnly(q) } } },
          ],
        },
      ];
    }

    return prisma.conversa.findMany({
      where,
      include: conversaInclude,
      orderBy: [{ ultimaMensagemEm: "desc" }, { atualizadoEm: "desc" }],
      take: 100,
    });
  }

  async getById(id: string) {
    const conversa = await prisma.conversa.findUnique({
      where: { id },
      include: {
        ...conversaInclude,
        mensagens: {
          orderBy: { criadoEm: "asc" },
          take: 200,
        },
        eventos: {
          orderBy: { criadoEm: "desc" },
          take: 50,
          include: {
            autor: { select: { id: true, nome: true } },
          },
        },
      },
    });
    if (!conversa) throw new ConversaNotFoundError(id);
    return conversa;
  }

  async createManual(raw: unknown, autorId: string) {
    const data = createManualSchema.parse(raw);
    const externalThreadId =
      data.canal === CanalAtendimento.WHATSAPP
        ? digitsOnly(data.contatoExterno)
        : data.contatoExterno.trim();

    const cliente =
      data.clienteId
        ? await prisma.cliente.findUnique({ where: { id: data.clienteId } })
        : await this.findClienteByTelefone(data.contatoExterno);

    const sugerido = cliente
      ? await this.sugerirVendedorRecorrente(cliente.id)
      : null;

    const conversa = await prisma.conversa.upsert({
      where: {
        canal_externalThreadId: {
          canal: data.canal,
          externalThreadId,
        },
      },
      create: {
        canal: data.canal,
        externalThreadId,
        contatoExterno: data.contatoExterno,
        contatoNome: data.contatoNome ?? cliente?.nome ?? null,
        clienteId: cliente?.id ?? null,
        vendedorId: sugerido?.vendedorId ?? null,
        modo: sugerido ? ModoAtendimento.HUMANO : ModoAtendimento.AI,
        status: StatusConversa.ABERTA,
        ultimaMensagemEm: new Date(),
      },
      update: {
        contatoExterno: data.contatoExterno,
        contatoNome: data.contatoNome ?? undefined,
        clienteId: cliente?.id ?? undefined,
        status: StatusConversa.ABERTA,
      },
      include: conversaInclude,
    });

    await this.registrarEvento(conversa.id, TipoAtendimentoEvento.CRIADA, {
      canal: data.canal,
      sugeridoVendedorId: sugerido?.vendedorId ?? null,
    }, autorId);

    if (data.texto?.trim()) {
      await this.appendOutbound({
        conversaId: conversa.id,
        texto: data.texto.trim(),
        autorTipo: "HUMANO",
        sendToProvider: false,
      });
    }

    return this.getById(conversa.id);
  }

  /**
   * Ingestão de mensagem inbound (webhook Meta ou teste).
   * Retorna conversa + flag se a IA deve responder.
   */
  async ingestInbound(params: {
    canal: CanalAtendimento;
    externalThreadId: string;
    contatoExterno?: string | null;
    contatoNome?: string | null;
    providerMessageId?: string | null;
    texto?: string | null;
    midiaUrl?: string | null;
    midiaMimeType?: string | null;
    timestamp?: Date;
  }) {
    if (params.providerMessageId) {
      const existing = await prisma.mensagemCanal.findUnique({
        where: { providerMessageId: params.providerMessageId },
      });
      if (existing) {
        const conversa = await this.getById(existing.conversaId);
        return { conversa, created: false, shouldRunAgent: false };
      }
    }

    const telefoneHint =
      params.canal === CanalAtendimento.WHATSAPP
        ? params.contatoExterno ?? params.externalThreadId
        : null;
    const cliente = telefoneHint
      ? await this.findClienteByTelefone(telefoneHint)
      : null;
    const sugerido = cliente
      ? await this.sugerirVendedorRecorrente(cliente.id)
      : null;

    const conversa = await prisma.conversa.upsert({
      where: {
        canal_externalThreadId: {
          canal: params.canal,
          externalThreadId: params.externalThreadId,
        },
      },
      create: {
        canal: params.canal,
        externalThreadId: params.externalThreadId,
        contatoExterno: params.contatoExterno ?? params.externalThreadId,
        contatoNome: params.contatoNome ?? cliente?.nome ?? null,
        clienteId: cliente?.id ?? null,
        vendedorId: sugerido?.vendedorId ?? null,
        modo: sugerido ? ModoAtendimento.HUMANO : ModoAtendimento.AI,
        status: StatusConversa.ABERTA,
        ultimaMensagemEm: params.timestamp ?? new Date(),
      },
      update: {
        contatoExterno: params.contatoExterno ?? undefined,
        contatoNome: params.contatoNome ?? undefined,
        clienteId: cliente?.id ?? undefined,
        status: StatusConversa.ABERTA,
        ultimaMensagemEm: params.timestamp ?? new Date(),
        ...(sugerido && !cliente
          ? {}
          : sugerido
            ? {
                // Só força handoff se ainda estava em AI e não há takeover humano recente
              }
            : {}),
      },
    });

    // Cliente recorrente: se conversa ainda em AI e há vendedor sugerido, handoff
    let modo = conversa.modo;
    if (
      sugerido &&
      conversa.modo === ModoAtendimento.AI &&
      !conversa.vendedorId
    ) {
      await prisma.conversa.update({
        where: { id: conversa.id },
        data: {
          vendedorId: sugerido.vendedorId,
          modo: ModoAtendimento.HUMANO,
        },
      });
      modo = ModoAtendimento.HUMANO;
      await this.registrarEvento(
        conversa.id,
        TipoAtendimentoEvento.HANDOFF,
        {
          motivo: "cliente_recorrente",
          vendedorId: sugerido.vendedorId,
          vendedorNome: sugerido.vendedorNome,
        },
        null
      );
    }

    await prisma.mensagemCanal.create({
      data: {
        conversaId: conversa.id,
        direcao: DirecaoMensagem.IN,
        texto: params.texto ?? null,
        midiaUrl: params.midiaUrl ?? null,
        midiaMimeType: params.midiaMimeType ?? null,
        providerMessageId: params.providerMessageId ?? null,
        autorTipo: "CLIENTE",
        criadoEm: params.timestamp ?? new Date(),
        festaId: conversa.festaId,
      },
    });

    await this.registrarEvento(conversa.id, TipoAtendimentoEvento.MENSAGEM, {
      direcao: "IN",
    });

    const shouldRunAgent = modo === ModoAtendimento.AI;

    return {
      conversa: await this.getById(conversa.id),
      created: true,
      shouldRunAgent,
      handoffRecorrente: Boolean(sugerido && modo === ModoAtendimento.HUMANO),
      sugerido,
    };
  }

  async sendHumanReply(
    conversaId: string,
    raw: unknown,
    autorId: string
  ) {
    const data = sendMessageSchema.parse(raw);
    const conversa = await this.getById(conversaId);

    // Takeover implícito
    if (conversa.modo === ModoAtendimento.AI) {
      await prisma.conversa.update({
        where: { id: conversaId },
        data: {
          modo: ModoAtendimento.HUMANO,
          vendedorId: conversa.vendedorId ?? autorId,
        },
      });
      await this.registrarEvento(
        conversaId,
        TipoAtendimentoEvento.TAKEOVER,
        {},
        autorId
      );
    }

    await this.appendOutbound({
      conversaId,
      texto: data.texto,
      autorTipo: "HUMANO",
      sendToProvider: true,
    });

    return this.getById(conversaId);
  }

  async appendOutbound(params: {
    conversaId: string;
    texto: string;
    autorTipo: "HUMANO" | "AI" | "SISTEMA";
    sendToProvider: boolean;
  }) {
    const conversa = await prisma.conversa.findUnique({
      where: { id: params.conversaId },
    });
    if (!conversa) throw new ConversaNotFoundError(params.conversaId);

    let providerMessageId: string | null = null;
    let statusEnvio: string | null = null;

    if (params.sendToProvider) {
      const to =
        conversa.contatoExterno ?? conversa.externalThreadId;
      try {
        const result = await metaMessaging.sendText({
          canal: conversa.canal,
          to,
          text: params.texto,
        });
        providerMessageId = result.providerMessageId;
        statusEnvio = result.stub ? "STUB" : "ENVIADA";
      } catch (err) {
        statusEnvio = "FALHA";
        console.error("[atendimento] falha ao enviar:", err);
      }
    }

    const mensagem = await prisma.mensagemCanal.create({
      data: {
        conversaId: params.conversaId,
        direcao: DirecaoMensagem.OUT,
        texto: params.texto,
        providerMessageId,
        statusEnvio,
        autorTipo: params.autorTipo,
        festaId: conversa.festaId,
      },
    });

    await prisma.conversa.update({
      where: { id: params.conversaId },
      data: { ultimaMensagemEm: new Date() },
    });

    return mensagem;
  }

  async takeover(conversaId: string, autorId: string) {
    await this.getById(conversaId);
    await prisma.conversa.update({
      where: { id: conversaId },
      data: {
        modo: ModoAtendimento.HUMANO,
        vendedorId: autorId,
        status: StatusConversa.ABERTA,
      },
    });
    await this.registrarEvento(
      conversaId,
      TipoAtendimentoEvento.TAKEOVER,
      {},
      autorId
    );
    return this.getById(conversaId);
  }

  async devolverIa(conversaId: string, autorId: string) {
    await this.getById(conversaId);
    await prisma.conversa.update({
      where: { id: conversaId },
      data: { modo: ModoAtendimento.AI, status: StatusConversa.ABERTA },
    });
    await this.registrarEvento(
      conversaId,
      TipoAtendimentoEvento.DEVOLVER_IA,
      {},
      autorId
    );
    return this.getById(conversaId);
  }

  async assign(conversaId: string, raw: unknown, autorId: string) {
    const data = assignSchema.parse(raw);
    await this.getById(conversaId);

    if (data.vendedorId) {
      const user = await prisma.user.findUnique({
        where: { id: data.vendedorId },
        select: { id: true, role: true, ativo: true },
      });
      if (!user?.ativo) throw new Error("Vendedor inválido");
    }

    await prisma.conversa.update({
      where: { id: conversaId },
      data: {
        vendedorId: data.vendedorId,
        modo: data.vendedorId
          ? ModoAtendimento.HUMANO
          : ModoAtendimento.AI,
      },
    });

    await this.registrarEvento(
      conversaId,
      TipoAtendimentoEvento.ATRIBUICAO,
      { vendedorId: data.vendedorId },
      autorId
    );

    return this.getById(conversaId);
  }

  async fechar(conversaId: string, autorId: string) {
    await this.getById(conversaId);
    await prisma.conversa.update({
      where: { id: conversaId },
      data: { status: StatusConversa.FECHADA },
    });
    await this.registrarEvento(
      conversaId,
      TipoAtendimentoEvento.FECHADA,
      {},
      autorId
    );
    return this.getById(conversaId);
  }

  async vincularFesta(conversaId: string, festaId: string) {
    await this.getById(conversaId);
    const festa = await prisma.festa.findUnique({ where: { id: festaId } });
    if (!festa) throw new Error(`Festa não encontrada: ${festaId}`);
    await prisma.conversa.update({
      where: { id: conversaId },
      data: {
        festaId,
        clienteId: festa.clienteId,
        vendedorId: festa.vendedorId,
      },
    });
    return this.getById(conversaId);
  }

  async listVendedores() {
    return prisma.user.findMany({
      where: {
        ativo: true,
        role: { in: [Role.VENDEDOR, Role.GERENTE, Role.ADMIN] },
      },
      select: { id: true, nome: true, role: true, telefone: true },
      orderBy: { nome: "asc" },
    });
  }

  async sugerirVendedorRecorrente(clienteId: string) {
    const ultima = await prisma.festa.findFirst({
      where: {
        clienteId,
        status: { not: StatusFesta.CANCELADO },
      },
      orderBy: { vendaEm: "desc" },
      select: {
        vendedorId: true,
        vendedor: { select: { id: true, nome: true, telefone: true } },
      },
    });
    if (!ultima) return null;
    return {
      vendedorId: ultima.vendedorId,
      vendedorNome: ultima.vendedor.nome,
      vendedorTelefone: ultima.vendedor.telefone,
    };
  }

  async findClienteByTelefone(telefone: string) {
    const digits = digitsOnly(telefone);
    if (digits.length < 8) return null;
    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { telefone: { contains: digits.slice(-8) } },
          { telefone: { contains: digits.slice(-9) } },
          { telefone: { contains: digits } },
        ],
      },
      take: 5,
    });
    return (
      clientes.find((c) => digitsOnly(c.telefone).endsWith(digits.slice(-8))) ??
      clientes[0] ??
      null
    );
  }

  async registrarEvento(
    conversaId: string,
    tipo: TipoAtendimentoEvento,
    payload?: Prisma.InputJsonValue,
    autorId?: string | null
  ) {
    return prisma.atendimentoEvento.create({
      data: {
        conversaId,
        tipo,
        payload: payload ?? undefined,
        autorId: autorId ?? null,
      },
    });
  }

  async metricas() {
    const [abertas, ai, humanas, fechadasHoje] = await Promise.all([
      prisma.conversa.count({ where: { status: StatusConversa.ABERTA } }),
      prisma.conversa.count({
        where: { status: StatusConversa.ABERTA, modo: ModoAtendimento.AI },
      }),
      prisma.conversa.count({
        where: {
          status: StatusConversa.ABERTA,
          modo: { in: [ModoAtendimento.HUMANO, ModoAtendimento.HIBRIDO] },
        },
      }),
      prisma.conversa.count({
        where: {
          status: StatusConversa.FECHADA,
          atualizadoEm: { gte: startOfDay(new Date()) },
        },
      }),
    ]);
    return { abertas, ai, humanas, fechadasHoje };
  }
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const atendimentoService = new AtendimentoService();
