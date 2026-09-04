import { StatusFesta, StatusPagamento, TamanhoDecoracao, TipoMidia } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { pdfAdapter } from "../integrations/pdf";
import { generatePortalToken } from "../lib/portal-token";
import { estoqueService } from "./estoque.service";
import { osService } from "./os.service";
import { clientesService } from "./clientes.service";
import { riscoService } from "./risco.service";
import { comissoesService } from "./comissoes.service";
import { bolasService } from "./bolas.service";

const equipeUserSelect = {
  id: true,
  nome: true,
  role: true,
} as const;

const festaInclude = {
  cliente: true,
  vendedor: {
    select: { id: true, nome: true, email: true, role: true },
  },
  montadorEquipe: { select: equipeUserSelect },
  desmontadorEquipe: { select: equipeUserSelect },
  pedidoBolas: {
    include: {
      itens: true,
      bolista: { select: { id: true, nome: true } },
      midias: {
        where: { tipo: TipoMidia.REFERENCIA_BOLAS },
        select: { id: true, tipo: true, mimeType: true, filename: true },
        orderBy: { criadoEm: "desc" },
        take: 12,
      },
    },
  },
} as const;

const equipeFieldsSchema = {
  montadorEquipeId: z.string().min(1).nullable().optional(),
  desmontadorEquipeId: z.string().min(1).nullable().optional(),
  montadorCarroProprio: z.boolean().optional(),
  desmontadorCarroProprio: z.boolean().optional(),
};

const createFestaSchema = z
  .object({
    clienteId: z.string().optional(),
    nomeCliente: z.string().min(2, "Nome do cliente é obrigatório").optional(),
    telefone: z.string().min(8, "Telefone é obrigatório").optional(),
    origem: z.string().max(80).nullable().optional(),
  tema: z.string().min(2, "Tema é obrigatório"),
  dataEvento: z.coerce.date({
    required_error: "Data/hora do evento é obrigatória",
    invalid_type_error: "Data/hora do evento inválida",
  }),
  horarioMontagem: z.coerce.date({
    required_error: "Horário de montagem é obrigatório",
    invalid_type_error: "Horário de montagem inválido",
  }),
  tamanhoDecoracao: z.nativeEnum(TamanhoDecoracao, {
    required_error: "Tamanho da decoração é obrigatório",
  }),
  itensExtras: z.array(z.string().min(1)).optional().default([]),
  kitCatalogo: z.string().min(1).nullable().optional(),
  pegueEMonte: z.boolean().optional().default(false),
  observacoes: z.string().max(2000).nullable().optional(),
  notasInternas: z.string().max(4000).nullable().optional(),
  endereco: z.string().min(5, "Endereço é obrigatório"),
  valor: z.coerce.number().positive("Valor deve ser positivo"),
  status: z.nativeEnum(StatusFesta).optional().default(StatusFesta.ORCAMENTO),
  vendedorId: z.string().optional(),
  ...equipeFieldsSchema,
  bolasItens: z
    .array(
      z.object({
        catalogoBolaId: z.string().min(1).nullable().optional(),
        nome: z.string().min(1).optional(),
        quantidade: z.coerce.number().int().positive().default(1),
        valorTabelaUnit: z.coerce.number().positive().optional(),
      })
    )
    .optional(),
  bolasCores: z.string().max(1000).nullable().optional(),
  bolasMidiaIds: z.array(z.string().min(1)).optional(),
  temaMidiaIds: z.array(z.string().min(1)).optional(),
})
  .superRefine((data, ctx) => {
    if (!data.clienteId) {
      if (!data.nomeCliente?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nome do cliente é obrigatório",
          path: ["nomeCliente"],
        });
      }
      if (!data.telefone?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Telefone é obrigatório",
          path: ["telefone"],
        });
      }
    }
  });

const updateFestaSchema = z.object({
  tema: z.string().min(2).optional(),
  dataEvento: z.coerce.date().optional(),
  horarioMontagem: z.coerce.date().optional(),
  tamanhoDecoracao: z.nativeEnum(TamanhoDecoracao).optional(),
  itensExtras: z.array(z.string().min(1)).optional(),
  kitCatalogo: z.string().min(1).nullable().optional(),
  pegueEMonte: z.boolean().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
  notasInternas: z.string().max(4000).nullable().optional(),
  endereco: z.string().min(5).optional(),
  valor: z.coerce.number().positive().optional(),
  status: z.nativeEnum(StatusFesta).optional(),
  nomeCliente: z.string().min(2).optional(),
  telefone: z.string().min(8).optional(),
  ...equipeFieldsSchema,
});

const updateChecklistSchema = z.object({
  itensExtrasConcluidos: z.array(z.string().min(1)),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(StatusFesta),
});

export type CreateFestaInput = z.infer<typeof createFestaSchema>;
export type UpdateFestaInput = z.infer<typeof updateFestaSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

/**
 * Transições de status consideradas válidas no fluxo de negócio.
 * Status terminais (CONCLUIDO, CANCELADO) não permitem mais transições.
 */
const STATUS_TRANSITIONS: Record<StatusFesta, StatusFesta[]> = {
  [StatusFesta.ORCAMENTO]: [
    StatusFesta.AGUARDANDO_PAGAMENTO,
    StatusFesta.FECHADO,
    StatusFesta.CANCELADO,
  ],
  [StatusFesta.AGUARDANDO_PAGAMENTO]: [
    StatusFesta.FECHADO,
    StatusFesta.PAGO,
    StatusFesta.ORCAMENTO,
    StatusFesta.CANCELADO,
  ],
  [StatusFesta.PAGO]: [StatusFesta.FECHADO, StatusFesta.CANCELADO],
  [StatusFesta.FECHADO]: [
    StatusFesta.EM_MONTAGEM,
    StatusFesta.PAGO,
    StatusFesta.CANCELADO,
  ],
  [StatusFesta.EM_MONTAGEM]: [StatusFesta.CONCLUIDO, StatusFesta.CANCELADO],
  [StatusFesta.CONCLUIDO]: [],
  [StatusFesta.CANCELADO]: [StatusFesta.ORCAMENTO],
};

export class FestasService {
  async list(options?: { lixeira?: boolean; vendedorId?: string }) {
    const statusWhere = options?.lixeira
      ? { status: StatusFesta.CANCELADO }
      : { status: { not: StatusFesta.CANCELADO } };
    const festas = await prisma.festa.findMany({
      where: {
        ...statusWhere,
        ...(options?.vendedorId ? { vendedorId: options.vendedorId } : {}),
      },
      include: festaInclude,
      orderBy: options?.lixeira
        ? [{ criadoEm: "desc" }]
        : [{ dataEvento: "asc" }, { horarioMontagem: "asc" }],
    });

    const riscoMap = await riscoService.computeForFestas(festas.map((f) => f.id));

    return festas.map((festa) => ({
      ...festa,
      risco: riscoMap.get(festa.id) ?? {
        score: 0,
        nivel: "BAIXO" as const,
        fatores: [],
      },
    }));
  }

  async getById(id: string) {
    const festa = await prisma.festa.findUnique({
      where: { id },
      include: festaInclude,
    });

    if (!festa) {
      throw new FestaNotFoundError(id);
    }

    return festa;
  }

  private async assertUsuarioEquipe(userId: string | null | undefined) {
    if (!userId) return;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.ativo) {
      throw new FestaValidationError("Pessoa da equipe inválida ou inativa");
    }
  }

  private precisaEquipeMontagem(festa: {
    pegueEMonte: boolean;
  }): boolean {
    return !festa.pegueEMonte;
  }

  async create(rawInput: unknown, fallbackVendedorId: string) {
    const data = createFestaSchema.parse(rawInput);
    const vendedorId = data.vendedorId ?? fallbackVendedorId;

    if (data.kitCatalogo === "SO_BOLAS") {
      if (!data.bolasItens || data.bolasItens.length === 0) {
        throw new FestaValidationError(
          "Venda só de bolas exige ao menos um item do catálogo de bolas"
        );
      }
    }

    await this.ensureVendedorExists(vendedorId);
    await this.assertUsuarioEquipe(data.montadorEquipeId);
    await this.assertUsuarioEquipe(data.desmontadorEquipeId);

    let cliente;
    if (data.clienteId) {
      const existing = await prisma.cliente.findUnique({
        where: { id: data.clienteId },
      });
      if (!existing) {
        throw new Error(`Cliente com id ${data.clienteId} não encontrado`);
      }
      if (
        data.nomeCliente?.trim() &&
        data.nomeCliente.trim() !== existing.nome
      ) {
        cliente = await prisma.cliente.update({
          where: { id: existing.id },
          data: { nome: data.nomeCliente.trim() },
        });
      } else {
        cliente = existing;
      }
    } else {
      cliente = await clientesService.findOrCreate({
        nome: data.nomeCliente!.trim(),
        telefone: data.telefone!.trim(),
        origem: data.origem,
      });
    }

    const avaliacao = await estoqueService.avaliarItensFesta({
      itensExtras: data.itensExtras,
      inicio: data.horarioMontagem,
      fim: data.dataEvento,
    });

    const observacaoEstoque = avaliacao.alertaCompraEstoque
      ? `[COMPRAR] Itens sem estoque suficiente: ${avaliacao.itensFaltaEstoque.join("; ")}`
      : null;
    const observacoesBase = data.observacoes?.trim()
      ? data.observacoes.trim()
      : null;
    const observacoes =
      observacaoEstoque && observacoesBase
        ? `${observacoesBase}\n\n${observacaoEstoque}`
        : observacaoEstoque ?? observacoesBase;

    const festa = await prisma.festa.create({
      data: {
        dataEvento: data.dataEvento,
        horarioMontagem: data.horarioMontagem,
        status: data.status,
        valor: data.valor,
        tema: data.tema,
        tamanhoDecoracao: data.tamanhoDecoracao,
        itensExtras: data.itensExtras,
        kitCatalogo: data.kitCatalogo ?? null,
        pegueEMonte: data.pegueEMonte,
        observacoes,
        notasInternas: data.notasInternas?.trim() || null,
        endereco: data.endereco,
        clienteId: cliente.id,
        vendedorId,
        portalToken: generatePortalToken(),
        alertaCompraEstoque: avaliacao.alertaCompraEstoque,
        itensFaltaEstoque: avaliacao.itensFaltaEstoque,
        vendaEm: new Date(),
        montadorEquipeId: data.montadorEquipeId ?? null,
        desmontadorEquipeId: data.desmontadorEquipeId ?? null,
        montadorCarroProprio: data.montadorCarroProprio ?? true,
        desmontadorCarroProprio: data.desmontadorCarroProprio ?? true,
      },
      include: festaInclude,
    });

    const temaMidiaIds = data.temaMidiaIds ?? [];
    if (temaMidiaIds.length > 0) {
      await prisma.midia.updateMany({
        where: { id: { in: temaMidiaIds } },
        data: { festaId: festa.id },
      });
    }

    if (data.bolasItens && data.bolasItens.length > 0) {
      await bolasService.upsertParaFesta(
        festa.id,
        data.bolasItens,
        {
          dataEvento: data.dataEvento,
          horarioMontagem: data.horarioMontagem,
          tema: data.tema,
          endereco: data.endereco,
          clienteNome: cliente.nome,
          clienteTelefone: cliente.telefone,
          observacoes: data.observacoes ?? null,
          cores: data.bolasCores ?? null,
          midiaIds: data.bolasMidiaIds ?? [],
        },
        vendedorId
      );
      return this.getById(festa.id);
    }

    // Fotos de bolas sem item de catálogo: ficam na festa até haver pedido
    const bolasMidiaIds = data.bolasMidiaIds ?? [];
    if (bolasMidiaIds.length > 0) {
      await prisma.midia.updateMany({
        where: { id: { in: bolasMidiaIds } },
        data: { festaId: festa.id },
      });
    }

    return festa;
  }

  async update(id: string, rawInput: unknown) {
    const data = updateFestaSchema.parse(rawInput);
    const festa = await this.getById(id);
    await this.assertUsuarioEquipe(data.montadorEquipeId);
    await this.assertUsuarioEquipe(data.desmontadorEquipeId);

    if (data.nomeCliente || data.telefone) {
      await prisma.cliente.update({
        where: { id: festa.clienteId },
        data: {
          ...(data.nomeCliente ? { nome: data.nomeCliente } : {}),
          ...(data.telefone ? { telefone: data.telefone } : {}),
        },
      });
    }

    const itensMudaram =
      data.itensExtras !== undefined &&
      JSON.stringify(data.itensExtras) !== JSON.stringify(festa.itensExtras);
    const valorMudou =
      data.valor !== undefined && Number(data.valor) !== Number(festa.valor);

    const itensFinais = data.itensExtras ?? festa.itensExtras;
    const inicio =
      data.horarioMontagem !== undefined
        ? data.horarioMontagem
        : festa.horarioMontagem;
    const fim =
      data.dataEvento !== undefined ? data.dataEvento : festa.dataEvento;

    let alertaCompraEstoque = festa.alertaCompraEstoque;
    let itensFaltaEstoque = festa.itensFaltaEstoque;
    let observacoes =
      data.observacoes !== undefined
        ? data.observacoes?.trim()
          ? data.observacoes.trim()
          : null
        : festa.observacoes;

    if (itensMudaram || data.horarioMontagem !== undefined || data.dataEvento !== undefined) {
      const avaliacao = await estoqueService.avaliarItensFesta({
        itensExtras: itensFinais,
        inicio,
        fim,
      });
      alertaCompraEstoque = avaliacao.alertaCompraEstoque;
      itensFaltaEstoque = avaliacao.itensFaltaEstoque;

      const marcador = "[COMPRAR]";
      const baseObs =
        data.observacoes !== undefined
          ? data.observacoes?.trim()
            ? data.observacoes.trim()
            : ""
          : (festa.observacoes ?? "");
      const semMarcador = baseObs
        .split(/\n\n/)
        .filter((bloco) => !bloco.trim().startsWith(marcador))
        .join("\n\n")
        .trim();
      const blocoCompra = avaliacao.alertaCompraEstoque
        ? `${marcador} Itens sem estoque suficiente: ${avaliacao.itensFaltaEstoque.join("; ")}`
        : null;
      observacoes =
        blocoCompra && semMarcador
          ? `${semMarcador}\n\n${blocoCompra}`
          : blocoCompra ?? (semMarcador || null);
    }

    const updated = await prisma.festa.update({
      where: { id },
      data: {
        ...(data.tema !== undefined ? { tema: data.tema } : {}),
        ...(data.dataEvento !== undefined ? { dataEvento: data.dataEvento } : {}),
        ...(data.horarioMontagem !== undefined
          ? { horarioMontagem: data.horarioMontagem }
          : {}),
        ...(data.tamanhoDecoracao !== undefined
          ? { tamanhoDecoracao: data.tamanhoDecoracao }
          : {}),
        ...(data.itensExtras !== undefined ? { itensExtras: data.itensExtras } : {}),
        ...(data.kitCatalogo !== undefined
          ? { kitCatalogo: data.kitCatalogo }
          : {}),
        ...(data.pegueEMonte !== undefined
          ? { pegueEMonte: data.pegueEMonte }
          : {}),
        observacoes,
        ...(data.notasInternas !== undefined
          ? { notasInternas: data.notasInternas?.trim() || null }
          : {}),
        ...(data.endereco !== undefined ? { endereco: data.endereco } : {}),
        ...(data.valor !== undefined ? { valor: data.valor } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.montadorEquipeId !== undefined
          ? { montadorEquipeId: data.montadorEquipeId }
          : {}),
        ...(data.desmontadorEquipeId !== undefined
          ? { desmontadorEquipeId: data.desmontadorEquipeId }
          : {}),
        ...(data.montadorCarroProprio !== undefined
          ? { montadorCarroProprio: data.montadorCarroProprio }
          : {}),
        ...(data.desmontadorCarroProprio !== undefined
          ? { desmontadorCarroProprio: data.desmontadorCarroProprio }
          : {}),
        alertaCompraEstoque,
        itensFaltaEstoque,
      },
      include: festaInclude,
    });

    await osService.syncEquipeFromFesta(id);

    if (data.notasInternas !== undefined) {
      await prisma.conversa.updateMany({
        where: { festaId: id },
        data: { notasInternas: updated.notasInternas },
      });
    }

    if (itensMudaram || valorMudou) {
      try {
        await pdfAdapter.gerarContratoLocacao(id);
      } catch (error) {
        console.error("[festas] falha ao regenerar contrato após update", error);
      }
    }

    return updated;
  }

  async remove(id: string) {
    await this.getById(id);
    return prisma.festa.delete({ where: { id } });
  }

  async updateChecklist(id: string, rawItensExtrasConcluidos: unknown) {
    const data = updateChecklistSchema.parse({
      itensExtrasConcluidos: rawItensExtrasConcluidos,
    });
    const festa = await this.getById(id);

    const validos = new Set(festa.itensExtras);
    const itensFiltrados = data.itensExtrasConcluidos.filter((item) =>
      validos.has(item)
    );

    return prisma.festa.update({
      where: { id },
      data: {
        itensExtrasConcluidos: itensFiltrados,
      },
      include: festaInclude,
    });
  }

  async updateStatus(id: string, rawInput: unknown) {
    const data = updateStatusSchema.parse(rawInput);
    const festa = await this.getById(id);

    if (data.status !== festa.status) {
      const permitidos = STATUS_TRANSITIONS[festa.status] ?? [];
      if (!permitidos.includes(data.status)) {
        throw new InvalidStatusTransitionError(festa.status, data.status);
      }
    }

    if (
      data.status === StatusFesta.FECHADO &&
      this.precisaEquipeMontagem(festa)
    ) {
      if (!festa.montadorEquipeId || !festa.desmontadorEquipeId) {
        throw new FestaValidationError(
          "Antes de fechar, escolha quem monta e quem desmonta"
        );
      }
    }

    const statusReavaliacao: StatusFesta[] = [
      StatusFesta.AGUARDANDO_PAGAMENTO,
      StatusFesta.PAGO,
      StatusFesta.FECHADO,
      StatusFesta.EM_MONTAGEM,
    ];
    const deveReavaliar = statusReavaliacao.includes(data.status);

    let alertaCompraEstoque = festa.alertaCompraEstoque;
    let itensFaltaEstoque = festa.itensFaltaEstoque;
    let observacoes = festa.observacoes;

    if (deveReavaliar) {
      const avaliacao = await estoqueService.avaliarItensFesta({
        itensExtras: festa.itensExtras,
        inicio: festa.horarioMontagem,
        fim: festa.dataEvento,
      });
      alertaCompraEstoque = avaliacao.alertaCompraEstoque;
      itensFaltaEstoque = avaliacao.itensFaltaEstoque;

      const marcador = "[COMPRAR]";
      const semMarcador = (festa.observacoes ?? "")
        .split(/\n\n/)
        .filter((bloco) => !bloco.trim().startsWith(marcador))
        .join("\n\n")
        .trim();
      const blocoCompra = avaliacao.alertaCompraEstoque
        ? `${marcador} Itens sem estoque suficiente: ${avaliacao.itensFaltaEstoque.join("; ")}`
        : null;
      observacoes =
        blocoCompra && semMarcador
          ? `${semMarcador}\n\n${blocoCompra}`
          : blocoCompra ?? (semMarcador || null);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const festaUpdated = await tx.festa.update({
        where: { id },
        data: {
          status: data.status,
          alertaCompraEstoque,
          itensFaltaEstoque,
          observacoes,
        },
        include: festaInclude,
      });

      if (data.status === StatusFesta.PAGO) {
        const confirmados = await tx.pagamento.aggregate({
          where: { festaId: id, status: StatusPagamento.CONFIRMADO },
          _sum: { valor: true },
        });
        const totalPago = Number(confirmados._sum.valor ?? 0);
        if (totalPago + 0.009 >= Number(festaUpdated.valor)) {
          if (!festaUpdated.quitadoEm) {
            await tx.festa.update({
              where: { id },
              data: { quitadoEm: new Date() },
            });
          }
          await comissoesService.gerarSplitFesta(tx, id);
        }
      }

      return festaUpdated;
    });

    if (data.status === StatusFesta.FECHADO) {
      try {
        await osService.prepararMontagemParaFesta(id);
      } catch (error) {
        console.error("[festas] falha ao preparar montagem ao fechar", error);
      }
    } else if (data.status === StatusFesta.EM_MONTAGEM) {
      await osService.ensureForFesta(id);
    }

    return updated;
  }

  private async ensureVendedorExists(vendedorId: string) {
    const existing = await prisma.user.findUnique({ where: { id: vendedorId } });

    if (existing) {
      return existing;
    }

    if (vendedorId === "mock-vendedor-id") {
      return prisma.user.create({
        data: {
          id: "mock-vendedor-id",
          nome: "Vendedor Mock",
          email: "vendedor@djdecor.com",
          senha: "mock-password-hash",
          role: "VENDEDOR",
        },
      });
    }

    throw new Error(`Vendedor com id ${vendedorId} não encontrado`);
  }
}

export class FestaNotFoundError extends Error {
  constructor(id: string) {
    super(`Festa com id ${id} não encontrada`);
    this.name = "FestaNotFoundError";
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: StatusFesta, to: StatusFesta) {
    super(`Transição de status inválida: ${from} -> ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

export class FestaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FestaValidationError";
  }
}

export const festasService = new FestasService();
