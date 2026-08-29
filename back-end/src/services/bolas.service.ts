import {
  Role,
  StatusPagamento,
  StatusPedidoBolas,
  StatusRepasseBolas,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { configuracoesService } from "./configuracoes.service";

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function markupCliente(valorTabela: number, markupPct: number): number {
  return money(valorTabela * (1 + markupPct / 100));
}

const itemInputSchema = z.object({
  catalogoBolaId: z.string().min(1).nullable().optional(),
  nome: z.string().min(1).optional(),
  quantidade: z.coerce.number().int().positive().default(1),
  valorTabelaUnit: z.coerce.number().positive().optional(),
});

const createPedidoSchema = z.object({
  festaId: z.string().min(1).nullable().optional(),
  dataEvento: z.coerce.date(),
  horarioMontagem: z.coerce.date(),
  horarioDesmontagem: z.coerce.date().nullable().optional(),
  tema: z.string().min(1),
  endereco: z.string().min(3),
  clienteNome: z.string().min(2),
  clienteTelefone: z.string().min(8),
  observacoes: z.string().max(2000).nullable().optional(),
  cores: z.string().max(1000).nullable().optional(),
  instrucoes: z.string().max(2000).nullable().optional(),
  itens: z.array(itemInputSchema).min(1),
  status: z.nativeEnum(StatusPedidoBolas).optional(),
  bolistaId: z.string().min(1).optional(),
  midiaIds: z.array(z.string().min(1)).optional(),
});

const updatePedidoSchema = z.object({
  dataEvento: z.coerce.date().optional(),
  horarioMontagem: z.coerce.date().optional(),
  horarioDesmontagem: z.coerce.date().nullable().optional(),
  tema: z.string().min(1).optional(),
  endereco: z.string().min(3).optional(),
  clienteNome: z.string().min(2).optional(),
  clienteTelefone: z.string().min(8).optional(),
  observacoes: z.string().max(2000).nullable().optional(),
  cores: z.string().max(1000).nullable().optional(),
  instrucoes: z.string().max(2000).nullable().optional(),
  status: z.nativeEnum(StatusPedidoBolas).optional(),
  montagemConcluida: z.boolean().optional(),
  desmontagemConcluida: z.boolean().optional(),
  statusPagamentoCliente: z.nativeEnum(StatusPagamento).optional(),
  itens: z.array(itemInputSchema).min(1).optional(),
});

const catalogoUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  nome: z.string().min(2),
  descricao: z.string().max(2000).nullable().optional(),
  valorTabela: z.coerce.number().positive(),
  ativo: z.boolean().optional().default(true),
  ordem: z.coerce.number().int().optional().default(0),
});

const pedidoInclude = {
  itens: {
    include: {
      catalogoBola: { select: { id: true, nome: true } },
    },
  },
  compras: { orderBy: { criadoEm: "asc" as const } },
  midias: {
    select: {
      id: true,
      mimeType: true,
      tamanho: true,
      tipo: true,
      filename: true,
      criadoEm: true,
    },
    orderBy: { criadoEm: "asc" as const },
  },
  bolista: { select: { id: true, nome: true, role: true } },
  festa: {
    select: {
      id: true,
      status: true,
      valor: true,
      tema: true,
      dataEvento: true,
    },
  },
} as const;

const compraSchema = z.object({
  descricao: z.string().min(1).max(300),
  quantidade: z.string().max(80).nullable().optional(),
});

export class PedidoBolasNotFoundError extends Error {
  constructor(id: string) {
    super(`Pedido de bolas ${id} não encontrado`);
    this.name = "PedidoBolasNotFoundError";
  }
}

export class BolasService {
  async getMarkupPercentual(): Promise<number> {
    const cfg = await configuracoesService.get();
    return Number(cfg.markupBolasPercentual ?? 10);
  }

  async resolveBolistaId(preferredId?: string | null): Promise<string> {
    if (preferredId) {
      const user = await prisma.user.findFirst({
        where: { id: preferredId, role: Role.BOLISTA, ativo: true },
      });
      if (user) return user.id;
    }
    const bolista = await prisma.user.findFirst({
      where: { role: Role.BOLISTA, ativo: true },
      orderBy: { nome: "asc" },
    });
    if (!bolista) {
      throw new Error("Nenhum profissional de bolas (BOLISTA) cadastrado");
    }
    return bolista.id;
  }

  private async resolveItens(
    rawItens: z.infer<typeof itemInputSchema>[],
    markupPct: number
  ) {
    const resolved: {
      catalogoBolaId: string | null;
      nome: string;
      quantidade: number;
      valorTabelaUnit: number;
      valorClienteUnit: number;
    }[] = [];

    for (const raw of rawItens) {
      let nome = raw.nome?.trim() ?? "";
      let valorTabelaUnit = raw.valorTabelaUnit;
      let catalogoBolaId: string | null = raw.catalogoBolaId ?? null;

      if (catalogoBolaId) {
        const cat = await prisma.catalogoBola.findUnique({
          where: { id: catalogoBolaId },
        });
        if (!cat || !cat.ativo) {
          throw new Error(`Item de catálogo de bolas inválido: ${catalogoBolaId}`);
        }
        nome = nome || cat.nome;
        valorTabelaUnit = valorTabelaUnit ?? Number(cat.valorTabela);
      }

      if (!nome || valorTabelaUnit == null || valorTabelaUnit <= 0) {
        throw new Error("Cada item de bolas precisa de nome e valor de tabela");
      }

      resolved.push({
        catalogoBolaId,
        nome,
        quantidade: raw.quantidade,
        valorTabelaUnit: money(valorTabelaUnit),
        valorClienteUnit: markupCliente(valorTabelaUnit, markupPct),
      });
    }

    return resolved;
  }

  private totaisFromItens(
    itens: { quantidade: number; valorTabelaUnit: number; valorClienteUnit: number }[]
  ) {
    const valorTabela = money(
      itens.reduce((s, i) => s + i.valorTabelaUnit * i.quantidade, 0)
    );
    const valorCliente = money(
      itens.reduce((s, i) => s + i.valorClienteUnit * i.quantidade, 0)
    );
    return {
      valorTabela,
      valorCliente,
      taxaEmpresa: money(valorCliente - valorTabela),
    };
  }

  async listCatalogo(apenasAtivos = true) {
    return prisma.catalogoBola.findMany({
      where: apenasAtivos ? { ativo: true } : undefined,
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
  }

  async upsertCatalogo(raw: unknown, userId: string) {
    const data = catalogoUpsertSchema.parse(raw);
    if (data.id) {
      return prisma.catalogoBola.update({
        where: { id: data.id },
        data: {
          nome: data.nome,
          descricao: data.descricao ?? null,
          valorTabela: data.valorTabela,
          ativo: data.ativo,
          ordem: data.ordem,
        },
      });
    }
    return prisma.catalogoBola.create({
      data: {
        nome: data.nome,
        descricao: data.descricao ?? null,
        valorTabela: data.valorTabela,
        ativo: data.ativo,
        ordem: data.ordem,
        criadoPorId: userId,
      },
    });
  }

  async setCatalogoAtivo(id: string, ativo: boolean) {
    return prisma.catalogoBola.update({
      where: { id },
      data: { ativo },
    });
  }

  async listPedidos(filters?: {
    bolistaId?: string;
    from?: Date;
    to?: Date;
  }) {
    return prisma.pedidoBolas.findMany({
      where: {
        ...(filters?.bolistaId ? { bolistaId: filters.bolistaId } : {}),
        ...(filters?.from || filters?.to
          ? {
              dataEvento: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
        status: { not: StatusPedidoBolas.CANCELADO },
      },
      include: pedidoInclude,
      orderBy: [{ dataEvento: "asc" }, { horarioMontagem: "asc" }],
    });
  }

  async getPedido(id: string) {
    const pedido = await prisma.pedidoBolas.findUnique({
      where: { id },
      include: pedidoInclude,
    });
    if (!pedido) throw new PedidoBolasNotFoundError(id);
    return pedido;
  }

  async getByFestaId(festaId: string) {
    return prisma.pedidoBolas.findUnique({
      where: { festaId },
      include: pedidoInclude,
    });
  }

  async createPedido(raw: unknown, actor: { id: string; role: Role }) {
    const data = createPedidoSchema.parse(raw);
    const markupPct = await this.getMarkupPercentual();
    const itens = await this.resolveItens(data.itens, markupPct);
    const totais = this.totaisFromItens(itens);
    const bolistaId = await this.resolveBolistaId(
      data.bolistaId ?? (actor.role === Role.BOLISTA ? actor.id : null)
    );

    if (data.festaId) {
      const existing = await prisma.pedidoBolas.findUnique({
        where: { festaId: data.festaId },
      });
      if (existing) {
        throw new Error("Esta festa já possui pedido de bolas");
      }
      const festa = await prisma.festa.findUnique({ where: { id: data.festaId } });
      if (!festa) throw new Error("Festa não encontrada");
    }

    const pedido = await prisma.pedidoBolas.create({
      data: {
        festaId: data.festaId ?? null,
        dataEvento: data.dataEvento,
        horarioMontagem: data.horarioMontagem,
        horarioDesmontagem: data.horarioDesmontagem ?? null,
        tema: data.tema,
        endereco: data.endereco,
        clienteNome: data.clienteNome,
        clienteTelefone: data.clienteTelefone,
        observacoes: data.observacoes ?? null,
        cores: data.cores ?? null,
        instrucoes: data.instrucoes ?? null,
        valorTabela: totais.valorTabela,
        valorCliente: totais.valorCliente,
        taxaEmpresa: totais.taxaEmpresa,
        markupPercentual: markupPct,
        status: data.status ?? StatusPedidoBolas.CONFIRMADO,
        bolistaId,
        itens: {
          create: itens.map((item) => ({
            catalogoBolaId: item.catalogoBolaId,
            nome: item.nome,
            quantidade: item.quantidade,
            valorTabelaUnit: item.valorTabelaUnit,
            valorClienteUnit: item.valorClienteUnit,
          })),
        },
      },
      include: pedidoInclude,
    });

    const midiaIds = data.midiaIds ?? [];
    if (midiaIds.length > 0) {
      await prisma.midia.updateMany({
        where: { id: { in: midiaIds } },
        data: { pedidoBolasId: pedido.id },
      });
      return this.getPedido(pedido.id);
    }

    return pedido;
  }

  /** Cria ou substitui pedido vinculado a uma festa (usado na nova venda). */
  async upsertParaFesta(
    festaId: string,
    rawItens: unknown,
    meta: {
      dataEvento: Date;
      horarioMontagem: Date;
      horarioDesmontagem?: Date | null;
      tema: string;
      endereco: string;
      clienteNome: string;
      clienteTelefone: string;
      observacoes?: string | null;
      cores?: string | null;
      midiaIds?: string[];
    },
    actorId: string
  ) {
    void actorId;
    const itensParsed = z.array(itemInputSchema).min(1).parse(rawItens);
    const markupPct = await this.getMarkupPercentual();
    const itens = await this.resolveItens(itensParsed, markupPct);
    const totais = this.totaisFromItens(itens);
    const bolistaId = await this.resolveBolistaId(null);
    const midiaIds = (meta.midiaIds ?? []).filter(Boolean);

    const existing = await prisma.pedidoBolas.findUnique({
      where: { festaId },
    });

    let pedidoId: string;

    if (existing) {
      await prisma.pedidoBolasItem.deleteMany({ where: { pedidoId: existing.id } });
      const updated = await prisma.pedidoBolas.update({
        where: { id: existing.id },
        data: {
          dataEvento: meta.dataEvento,
          horarioMontagem: meta.horarioMontagem,
          horarioDesmontagem: meta.horarioDesmontagem ?? null,
          tema: meta.tema,
          endereco: meta.endereco,
          clienteNome: meta.clienteNome,
          clienteTelefone: meta.clienteTelefone,
          observacoes: meta.observacoes ?? null,
          cores: meta.cores ?? null,
          valorTabela: totais.valorTabela,
          valorCliente: totais.valorCliente,
          taxaEmpresa: totais.taxaEmpresa,
          markupPercentual: markupPct,
          status: StatusPedidoBolas.CONFIRMADO,
          bolistaId,
          itens: {
            create: itens.map((item) => ({
              catalogoBolaId: item.catalogoBolaId,
              nome: item.nome,
              quantidade: item.quantidade,
              valorTabelaUnit: item.valorTabelaUnit,
              valorClienteUnit: item.valorClienteUnit,
            })),
          },
        },
      });
      pedidoId = updated.id;
    } else {
      const created = await prisma.pedidoBolas.create({
        data: {
          festaId,
          dataEvento: meta.dataEvento,
          horarioMontagem: meta.horarioMontagem,
          horarioDesmontagem: meta.horarioDesmontagem ?? null,
          tema: meta.tema,
          endereco: meta.endereco,
          clienteNome: meta.clienteNome,
          clienteTelefone: meta.clienteTelefone,
          observacoes: meta.observacoes ?? null,
          cores: meta.cores ?? null,
          valorTabela: totais.valorTabela,
          valorCliente: totais.valorCliente,
          taxaEmpresa: totais.taxaEmpresa,
          markupPercentual: markupPct,
          status: StatusPedidoBolas.CONFIRMADO,
          bolistaId,
          itens: {
            create: itens.map((item) => ({
              catalogoBolaId: item.catalogoBolaId,
              nome: item.nome,
              quantidade: item.quantidade,
              valorTabelaUnit: item.valorTabelaUnit,
              valorClienteUnit: item.valorClienteUnit,
            })),
          },
        },
      });
      pedidoId = created.id;
    }

    if (midiaIds.length > 0) {
      await prisma.midia.updateMany({
        where: { id: { in: midiaIds } },
        data: { pedidoBolasId: pedidoId, festaId },
      });
    }

    return this.getPedido(pedidoId);
  }

  async updatePedido(id: string, raw: unknown) {
    const data = updatePedidoSchema.parse(raw);
    await this.getPedido(id);

    let totaisPatch: {
      valorTabela?: number;
      valorCliente?: number;
      taxaEmpresa?: number;
      markupPercentual?: number;
    } = {};

    if (data.itens) {
      const markupPct = await this.getMarkupPercentual();
      const itens = await this.resolveItens(data.itens, markupPct);
      const totais = this.totaisFromItens(itens);
      await prisma.pedidoBolasItem.deleteMany({ where: { pedidoId: id } });
      await prisma.pedidoBolasItem.createMany({
        data: itens.map((item) => ({
          pedidoId: id,
          catalogoBolaId: item.catalogoBolaId,
          nome: item.nome,
          quantidade: item.quantidade,
          valorTabelaUnit: item.valorTabelaUnit,
          valorClienteUnit: item.valorClienteUnit,
        })),
      });
      totaisPatch = {
        valorTabela: totais.valorTabela,
        valorCliente: totais.valorCliente,
        taxaEmpresa: totais.taxaEmpresa,
        markupPercentual: markupPct,
      };
    }

    let status = data.status;
    if (data.montagemConcluida === true && !status) {
      status = StatusPedidoBolas.MONTADO;
    }
    if (data.desmontagemConcluida === true) {
      status = StatusPedidoBolas.CONCLUIDO;
    }

    return prisma.pedidoBolas.update({
      where: { id },
      data: {
        ...(data.dataEvento !== undefined ? { dataEvento: data.dataEvento } : {}),
        ...(data.horarioMontagem !== undefined
          ? { horarioMontagem: data.horarioMontagem }
          : {}),
        ...(data.horarioDesmontagem !== undefined
          ? { horarioDesmontagem: data.horarioDesmontagem }
          : {}),
        ...(data.tema !== undefined ? { tema: data.tema } : {}),
        ...(data.endereco !== undefined ? { endereco: data.endereco } : {}),
        ...(data.clienteNome !== undefined
          ? { clienteNome: data.clienteNome }
          : {}),
        ...(data.clienteTelefone !== undefined
          ? { clienteTelefone: data.clienteTelefone }
          : {}),
        ...(data.observacoes !== undefined
          ? { observacoes: data.observacoes }
          : {}),
        ...(data.cores !== undefined ? { cores: data.cores } : {}),
        ...(data.instrucoes !== undefined ? { instrucoes: data.instrucoes } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(data.montagemConcluida !== undefined
          ? { montagemConcluida: data.montagemConcluida }
          : {}),
        ...(data.desmontagemConcluida !== undefined
          ? { desmontagemConcluida: data.desmontagemConcluida }
          : {}),
        ...(data.statusPagamentoCliente !== undefined
          ? { statusPagamentoCliente: data.statusPagamentoCliente }
          : {}),
        ...totaisPatch,
      },
      include: pedidoInclude,
    });
  }

  async marcarRepasse(
    id: string,
    pago: boolean,
    obs?: string | null
  ) {
    await this.getPedido(id);
    return prisma.pedidoBolas.update({
      where: { id },
      data: {
        statusRepasse: pago
          ? StatusRepasseBolas.PAGO
          : StatusRepasseBolas.PENDENTE,
        repassadoEm: pago ? new Date() : null,
        repasseObs: obs ?? null,
      },
      include: pedidoInclude,
    });
  }

  async financeiroResumo(bolistaId?: string) {
    const where = {
      ...(bolistaId ? { bolistaId } : {}),
      status: { not: StatusPedidoBolas.CANCELADO },
    };
    const pedidos = await prisma.pedidoBolas.findMany({
      where,
      select: {
        id: true,
        valorTabela: true,
        valorCliente: true,
        taxaEmpresa: true,
        statusRepasse: true,
        statusPagamentoCliente: true,
        dataEvento: true,
        clienteNome: true,
        tema: true,
      },
      orderBy: { dataEvento: "desc" },
    });

    const aReceber = pedidos.filter(
      (p) => p.statusRepasse === StatusRepasseBolas.PENDENTE
    );
    const pagos = pedidos.filter(
      (p) => p.statusRepasse === StatusRepasseBolas.PAGO
    );

    return {
      aReceber: {
        total: money(aReceber.reduce((s, p) => s + Number(p.valorTabela), 0)),
        quantidade: aReceber.length,
        itens: aReceber,
      },
      pagos: {
        total: money(pagos.reduce((s, p) => s + Number(p.valorTabela), 0)),
        quantidade: pagos.length,
        itens: pagos,
      },
      taxaEmpresaTotal: money(
        pedidos.reduce((s, p) => s + Number(p.taxaEmpresa), 0)
      ),
    };
  }

  /** Após pagamentos da festa: sincroniza statusPagamentoCliente do pedido. */
  async syncPagamentoClientePorFesta(
    festaId: string,
    totalPago: number,
    valorDecoracao: number
  ) {
    const pedido = await prisma.pedidoBolas.findUnique({
      where: { festaId },
    });
    if (!pedido) return null;

    const devidoTotal = money(valorDecoracao + Number(pedido.valorCliente));
    const pago =
      totalPago + 0.009 >= devidoTotal
        ? StatusPagamento.CONFIRMADO
        : StatusPagamento.PENDENTE;

    if (pedido.statusPagamentoCliente === pago) return pedido;

    return prisma.pedidoBolas.update({
      where: { id: pedido.id },
      data: { statusPagamentoCliente: pago },
    });
  }

  async addCompra(pedidoId: string, raw: unknown) {
    await this.getPedido(pedidoId);
    const data = compraSchema.parse(raw);
    return prisma.pedidoBolasCompra.create({
      data: {
        pedidoId,
        descricao: data.descricao.trim(),
        quantidade: data.quantidade?.trim() || null,
      },
    });
  }

  async setCompraComprado(compraId: string, comprado: boolean) {
    const compra = await prisma.pedidoBolasCompra.findUnique({
      where: { id: compraId },
    });
    if (!compra) throw new Error("Item de compra não encontrado");
    return prisma.pedidoBolasCompra.update({
      where: { id: compraId },
      data: { comprado },
    });
  }

  async removeCompra(compraId: string) {
    await prisma.pedidoBolasCompra.delete({ where: { id: compraId } });
  }

  /** Agrega compras pendentes dos próximos N dias + sugestões dos itens dos pedidos. */
  async listaComprasSemana(bolistaId?: string, dias = 14) {
    const now = new Date();
    const fim = new Date(now);
    fim.setDate(fim.getDate() + dias);

    const pedidos = await prisma.pedidoBolas.findMany({
      where: {
        ...(bolistaId ? { bolistaId } : {}),
        status: { not: StatusPedidoBolas.CANCELADO },
        dataEvento: { gte: now, lte: fim },
      },
      include: {
        itens: true,
        compras: { orderBy: { criadoEm: "asc" } },
      },
      orderBy: { dataEvento: "asc" },
    });

    return pedidos.map((p) => ({
      id: p.id,
      dataEvento: p.dataEvento,
      clienteNome: p.clienteNome,
      tema: p.tema,
      cores: p.cores,
      itens: p.itens.map((i) => `${i.quantidade}× ${i.nome}`),
      compras: p.compras,
      pendentes: p.compras.filter((c) => !c.comprado).length,
    }));
  }
}

export const bolasService = new BolasService();
