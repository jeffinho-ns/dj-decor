import {
  Prisma,
  StatusFesta,
  StatusOS,
  TipoMidia,
} from "@prisma/client";
import { z } from "zod";
import {
  encontrarDefInventario,
  isItemServico,
  normalizarTexto,
  parseLinhaInventario,
} from "../catalog/inventario";
import { dispatchWhatsAppSafe } from "../integrations/whatsapp";
import { prisma } from "../prisma/client";
import { comissoesService } from "./comissoes.service";
import { estoqueService } from "./estoque.service";

const addRomaneioItemSchema = z
  .object({
    unidadeId: z.string().min(1).optional(),
    descricao: z.string().min(1).optional(),
  })
  .refine((data) => data.unidadeId || data.descricao, {
    message: "Informe unidadeId ou descricao",
  });

const updateRomaneioItemSchema = z.object({
  carregado: z.boolean().optional(),
  conferido: z.boolean().optional(),
  montado: z.boolean().optional(),
  retornado: z.boolean().optional(),
  fotoMidiaId: z.string().min(1).nullable().optional(),
});

const checkinSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

const fotoFinalSchema = z.object({
  midiaId: z.string().min(1),
});

const assignMontadorSchema = z.object({
  montadorId: z.string().min(1).nullable().optional(),
  desmontadorId: z.string().min(1).nullable().optional(),
  montadorCarroProprio: z.boolean().optional(),
  desmontadorCarroProprio: z.boolean().optional(),
});

export type AddRomaneioItemInput = z.infer<typeof addRomaneioItemSchema>;
export type UpdateRomaneioItemInput = z.infer<typeof updateRomaneioItemSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
export type FotoFinalInput = z.infer<typeof fotoFinalSchema>;
export type AssignMontadorInput = z.infer<typeof assignMontadorSchema>;

const osInclude = {
  festa: {
    include: {
      cliente: true,
      vendedor: {
        select: { id: true, nome: true, email: true, role: true },
      },
    },
  },
  montador: {
    select: { id: true, nome: true, email: true, role: true },
  },
  desmontador: {
    select: { id: true, nome: true, email: true, role: true },
  },
  itensRomaneio: {
    include: {
      unidade: {
        include: {
          produto: {
            select: { id: true, nome: true, categoria: true, requerQr: true },
          },
        },
      },
    },
    orderBy: { id: "asc" as const },
  },
} satisfies Prisma.OrdemServicoInclude;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface RotaDiaItem {
  ordem: number;
  osId: string;
  festaId: string;
  endereco: string;
  horarioMontagem: string;
  clienteNome: string;
  tema: string;
  checkinLat: number | null;
  checkinLng: number | null;
  criterio: "horario" | "proximidade";
}

function ordenarRotaDia(
  items: Omit<RotaDiaItem, "ordem" | "criterio">[]
): RotaDiaItem[] {
  const porHorario = [...items].sort(
    (a, b) =>
      new Date(a.horarioMontagem).getTime() -
      new Date(b.horarioMontagem).getTime()
  );

  const comCoords = porHorario.filter(
    (i) => i.checkinLat != null && i.checkinLng != null
  );

  if (comCoords.length < 2) {
    return porHorario.map((item, idx) => ({
      ...item,
      ordem: idx + 1,
      criterio: "horario" as const,
    }));
  }

  const restantes = new Set(comCoords.map((i) => i.osId));
  const ordenados: Omit<RotaDiaItem, "ordem" | "criterio">[] = [];

  let atual = comCoords[0];
  restantes.delete(atual.osId);
  ordenados.push(atual);

  while (restantes.size > 0) {
    let proximo: (typeof comCoords)[0] | null = null;
    let menorDist = Infinity;

    for (const candidato of comCoords) {
      if (!restantes.has(candidato.osId)) continue;
      const dist = haversineKm(
        atual.checkinLat!,
        atual.checkinLng!,
        candidato.checkinLat!,
        candidato.checkinLng!
      );
      if (dist < menorDist) {
        menorDist = dist;
        proximo = candidato;
      }
    }

    if (!proximo) break;
    restantes.delete(proximo.osId);
    ordenados.push(proximo);
    atual = proximo;
  }

  const ordenadosIds = new Set(ordenados.map((i) => i.osId));
  const semCoords = porHorario.filter((i) => !ordenadosIds.has(i.osId));
  const resultado = [...ordenados, ...semCoords];

  return resultado.map((item, idx) => ({
    ...item,
    ordem: idx + 1,
    criterio: comCoords.some((c) => c.osId === item.osId)
      ? ("proximidade" as const)
      : ("horario" as const),
  }));
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Horizonte padrão das montagens do montador (hoje + N dias). */
function endOfHorizon(daysAhead = 30): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDaysAgo(daysAgo: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export type FaseOperacao =
  | "separar"
  | "pronto_retirada"
  | "na_rua"
  | "a_caminho"
  | "no_local"
  | "montada"
  | "desmontar";

export interface OperacaoPainelItem {
  festaId: string;
  osId: string | null;
  clienteNome: string;
  tema: string;
  endereco: string;
  dataEvento: string;
  horarioMontagem: string;
  pegueEMonte: boolean;
  fase: FaseOperacao;
  faseLabel: string;
  itensPendentes: number;
  totalItens: number;
  itensRetornoPendentes: number;
  prontoRetiradaEm: string | null;
  retiradoClienteEm: string | null;
  montadorNome: string | null;
  desmontadorNome: string | null;
  montadorId: string | null;
  desmontadorId: string | null;
  atrasado: boolean;
  slaSeparacaoEstourado: boolean;
  slaLimiteEm: string | null;
}

const FASE_LABEL: Record<FaseOperacao, string> = {
  separar: "Separar",
  pronto_retirada: "Pronto p/ retirar",
  na_rua: "Na rua",
  a_caminho: "A caminho",
  no_local: "No local",
  montada: "Montada",
  desmontar: "Desmontar",
};

/** Horas antes do horário de montagem para concluir a separação. */
const SLA_SEPARACAO_HORAS_PADRAO = 3;

function resolverFaseOperacao(params: {
  pegueEMonte: boolean;
  romaneioConcluido: boolean;
  checkinAt: Date | null;
  montagemLocalConcluida: boolean;
  retornoConcluido: boolean;
  statusOs: StatusOS | null;
  statusFesta: StatusFesta;
  prontoRetiradaEm: Date | null;
  retiradoClienteEm: Date | null;
  dataEvento: Date;
}): FaseOperacao | null {
  if (params.retornoConcluido) return null;

  const eventoPassou = params.dataEvento.getTime() < startOfToday().getTime();

  if (params.pegueEMonte) {
    if (params.retiradoClienteEm) {
      if (eventoPassou || params.statusFesta === StatusFesta.CONCLUIDO) {
        return "desmontar";
      }
      return "na_rua";
    }
    if (params.prontoRetiradaEm || params.romaneioConcluido) {
      return "pronto_retirada";
    }
    return "separar";
  }

  if (!params.romaneioConcluido) return "separar";
  if (!params.checkinAt) return "a_caminho";
  if (!params.montagemLocalConcluida) return "no_local";
  if (params.statusOs !== StatusOS.FINALIZADA) return "montada";
  if (eventoPassou || params.statusFesta === StatusFesta.CONCLUIDO) {
    return "desmontar";
  }
  return "montada";
}

export class OsNotFoundError extends Error {
  constructor(id: string) {
    super(`Ordem de serviço não encontrada: ${id}`);
    this.name = "OsNotFoundError";
  }
}

export class OsItemNotFoundError extends Error {
  constructor(osId: string, itemId: string) {
    super(`Item de romaneio ${itemId} não encontrado na OS ${osId}`);
    this.name = "OsItemNotFoundError";
  }
}

export class OsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OsValidationError";
  }
}

export class OsService {
  parseAddRomaneioItem(body: unknown): AddRomaneioItemInput {
    return addRomaneioItemSchema.parse(body);
  }

  parseUpdateRomaneioItem(body: unknown): UpdateRomaneioItemInput {
    return updateRomaneioItemSchema.parse(body);
  }

  parseCheckin(body: unknown): CheckinInput {
    return checkinSchema.parse(body);
  }

  parseFotoFinal(body: unknown): FotoFinalInput {
    return fotoFinalSchema.parse(body);
  }

  parseAssignMontador(body: unknown): AssignMontadorInput {
    return assignMontadorSchema.parse(body);
  }

  async assignMontador(osId: string, rawInput: unknown) {
    const data = this.parseAssignMontador(rawInput);
    await this.getById(osId);

    if (data.montadorId) {
      await this.assertUsuarioEquipe(data.montadorId);
    }

    if (data.desmontadorId) {
      await this.assertUsuarioEquipe(data.desmontadorId);
    }

    const os = await prisma.ordemServico.update({
      where: { id: osId },
      data: {
        ...(data.montadorId !== undefined
          ? { montadorId: data.montadorId }
          : {}),
        ...(data.desmontadorId !== undefined
          ? { desmontadorId: data.desmontadorId }
          : {}),
        ...(data.montadorCarroProprio !== undefined
          ? { montadorCarroProprio: data.montadorCarroProprio }
          : {}),
        ...(data.desmontadorCarroProprio !== undefined
          ? { desmontadorCarroProprio: data.desmontadorCarroProprio }
          : {}),
      },
      include: osInclude,
    });

    await prisma.festa.update({
      where: { id: os.festaId },
      data: {
        ...(data.montadorId !== undefined
          ? { montadorEquipeId: data.montadorId }
          : {}),
        ...(data.desmontadorId !== undefined
          ? { desmontadorEquipeId: data.desmontadorId }
          : {}),
        ...(data.montadorCarroProprio !== undefined
          ? { montadorCarroProprio: data.montadorCarroProprio }
          : {}),
        ...(data.desmontadorCarroProprio !== undefined
          ? { desmontadorCarroProprio: data.desmontadorCarroProprio }
          : {}),
      },
    });

    return os;
  }

  private async assertUsuarioEquipe(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.ativo) {
      throw new OsValidationError("Pessoa inválida ou inativa");
    }
  }

  async syncEquipeFromFesta(festaId: string) {
    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: {
        montadorEquipeId: true,
        desmontadorEquipeId: true,
        montadorCarroProprio: true,
        desmontadorCarroProprio: true,
      },
    });
    if (!festa) return null;

    const existing = await prisma.ordemServico.findUnique({
      where: { festaId },
    });
    if (!existing) return null;

    return prisma.ordemServico.update({
      where: { id: existing.id },
      data: {
        montadorId: festa.montadorEquipeId,
        desmontadorId: festa.desmontadorEquipeId,
        montadorCarroProprio: festa.montadorCarroProprio,
        desmontadorCarroProprio: festa.desmontadorCarroProprio,
      },
      include: osInclude,
    });
  }

  async ensureForFesta(festaId: string) {
    const existing = await prisma.ordemServico.findUnique({
      where: { festaId },
      include: osInclude,
    });

    if (existing) {
      return (await this.syncEquipeFromFesta(festaId)) ?? existing;
    }

    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: {
        id: true,
        montadorEquipeId: true,
        desmontadorEquipeId: true,
        montadorCarroProprio: true,
        desmontadorCarroProprio: true,
      },
    });

    if (!festa) {
      throw new OsValidationError(`Festa não encontrada: ${festaId}`);
    }

    return prisma.ordemServico.create({
      data: {
        festaId,
        status: StatusOS.ABERTA,
        montadorId: festa.montadorEquipeId,
        desmontadorId: festa.desmontadorEquipeId,
        montadorCarroProprio: festa.montadorCarroProprio,
        desmontadorCarroProprio: festa.desmontadorCarroProprio,
      },
      include: osInclude,
    });
  }

  private async withFotoFinal<T extends { festaId: string }>(os: T) {
    const foto = await prisma.midia.findFirst({
      where: {
        festaId: os.festaId,
        tipo: {
          in: [TipoMidia.MONTAGEM_FINAL, TipoMidia.MONTAGEM_FOTO],
        },
      },
      orderBy: { criadoEm: "desc" },
      select: { id: true },
    });
    return { ...os, fotoFinalMidiaId: foto?.id ?? null };
  }

  async getById(id: string) {
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: osInclude,
    });

    if (!os) {
      throw new OsNotFoundError(id);
    }

    return this.withFotoFinal(os);
  }

  async listToday() {
    const inicio = startOfToday();
    const fim = endOfToday();

    const festas = await prisma.festa.findMany({
      where: {
        OR: [
          { horarioMontagem: { gte: inicio, lte: fim } },
          { dataEvento: { gte: inicio, lte: fim } },
        ],
        status: { not: StatusFesta.CANCELADO },
      },
      include: {
        cliente: true,
        vendedor: {
          select: { id: true, nome: true, email: true, role: true },
        },
        ordemServico: {
          include: {
            montador: {
              select: { id: true, nome: true, email: true, role: true },
            },
            itensRomaneio: {
              include: {
                unidade: {
                  include: {
                    produto: {
                      select: { id: true, nome: true, categoria: true },
                    },
                  },
                },
              },
              orderBy: { id: "asc" },
            },
          },
        },
      },
      orderBy: [{ horarioMontagem: "asc" }, { dataEvento: "asc" }],
    });

    return festas;
  }

  async listTodayRota(): Promise<RotaDiaItem[]> {
    const festas = await this.listToday();
    const base = festas
      .filter((f) => f.ordemServico)
      .map((f) => ({
        osId: f.ordemServico!.id,
        festaId: f.id,
        endereco: f.endereco,
        horarioMontagem: f.horarioMontagem.toISOString(),
        clienteNome: f.cliente.nome,
        tema: f.tema,
        checkinLat: f.ordemServico!.checkinLat,
        checkinLng: f.ordemServico!.checkinLng,
      }));

    return ordenarRotaDia(base);
  }

  /**
   * Painel operacional em tempo real: separação, Pegue e Monte na rua,
   * montagens do dia e fila de desmontagem.
   */
  async listOperacaoPainel(): Promise<OperacaoPainelItem[]> {
    const inicio = startOfDaysAgo(3);
    const fim = endOfHorizon(7);
    const agora = new Date();

    const config = await prisma.configuracaoNegocio.findUnique({
      where: { id: "default" },
      select: { slaSeparacaoHoras: true },
    });
    const slaHoras = config?.slaSeparacaoHoras ?? SLA_SEPARACAO_HORAS_PADRAO;

    const festas = await prisma.festa.findMany({
      where: {
        status: {
          in: [
            StatusFesta.PAGO,
            StatusFesta.FECHADO,
            StatusFesta.EM_MONTAGEM,
            StatusFesta.CONCLUIDO,
          ],
        },
        OR: [
          { horarioMontagem: { gte: inicio, lte: fim } },
          { dataEvento: { gte: inicio, lte: fim } },
          {
            pegueEMonte: true,
            OR: [
              { prontoRetiradaEm: { not: null } },
              { retiradoClienteEm: { not: null } },
            ],
            dataEvento: { gte: startOfDaysAgo(14), lte: fim },
          },
        ],
      },
      include: {
        cliente: { select: { nome: true } },
        ordemServico: {
          include: {
            montador: { select: { id: true, nome: true } },
            desmontador: { select: { id: true, nome: true } },
            itensRomaneio: {
              select: {
                carregado: true,
                conferido: true,
                retornado: true,
              },
            },
          },
        },
      },
      orderBy: [{ horarioMontagem: "asc" }, { dataEvento: "asc" }],
    });

    const itens: OperacaoPainelItem[] = [];

    for (const festa of festas) {
      const os = festa.ordemServico;
      if (os?.retornoConcluido) continue;

      const romaneioItens = os?.itensRomaneio ?? [];
      const pendentes = romaneioItens.filter(
        (i) => !i.carregado || !i.conferido
      ).length;
      const retornoPendentes = romaneioItens.filter((i) => !i.retornado).length;

      const fase = resolverFaseOperacao({
        pegueEMonte: festa.pegueEMonte,
        romaneioConcluido: os?.romaneioConcluido ?? false,
        checkinAt: os?.checkinAt ?? null,
        montagemLocalConcluida: os?.montagemLocalConcluida ?? false,
        retornoConcluido: os?.retornoConcluido ?? false,
        statusOs: os?.status ?? null,
        statusFesta: festa.status,
        prontoRetiradaEm: festa.prontoRetiradaEm,
        retiradoClienteEm: festa.retiradoClienteEm,
        dataEvento: festa.dataEvento,
      });

      if (!fase) continue;

      if (
        festa.status === StatusFesta.CONCLUIDO &&
        fase === "desmontar" &&
        !festa.pegueEMonte &&
        festa.dataEvento < startOfDaysAgo(2)
      ) {
        continue;
      }
      if (
        festa.status === StatusFesta.CONCLUIDO &&
        festa.pegueEMonte &&
        festa.retiradoClienteEm &&
        festa.dataEvento < startOfDaysAgo(7)
      ) {
        continue;
      }

      const slaLimite = new Date(festa.horarioMontagem);
      slaLimite.setHours(slaLimite.getHours() - slaHoras);
      const slaSeparacaoEstourado =
        !os?.romaneioConcluido && agora.getTime() > slaLimite.getTime();

      const eventoPassou =
        festa.dataEvento.getTime() < startOfToday().getTime();
      const atrasado =
        eventoPassou &&
        (fase === "na_rua" ||
          fase === "pronto_retirada" ||
          fase === "desmontar" ||
          fase === "separar" ||
          fase === "a_caminho" ||
          fase === "montada");

      itens.push({
        festaId: festa.id,
        osId: os?.id ?? null,
        clienteNome: festa.cliente.nome,
        tema: festa.tema,
        endereco: festa.endereco,
        dataEvento: festa.dataEvento.toISOString(),
        horarioMontagem: festa.horarioMontagem.toISOString(),
        pegueEMonte: festa.pegueEMonte,
        fase,
        faseLabel: FASE_LABEL[fase],
        itensPendentes: pendentes,
        totalItens: romaneioItens.length,
        itensRetornoPendentes: retornoPendentes,
        prontoRetiradaEm: festa.prontoRetiradaEm?.toISOString() ?? null,
        retiradoClienteEm: festa.retiradoClienteEm?.toISOString() ?? null,
        montadorNome: os?.montador?.nome ?? null,
        desmontadorNome: os?.desmontador?.nome ?? null,
        montadorId: os?.montador?.id ?? null,
        desmontadorId: os?.desmontador?.id ?? null,
        atrasado,
        slaSeparacaoEstourado,
        slaLimiteEm: slaLimite.toISOString(),
      });
    }

    const ordemFase: Record<FaseOperacao, number> = {
      separar: 0,
      a_caminho: 1,
      pronto_retirada: 2,
      no_local: 3,
      montada: 4,
      na_rua: 5,
      desmontar: 6,
    };

    return itens.sort((a, b) => {
      if (a.atrasado !== b.atrasado) return a.atrasado ? -1 : 1;
      if (a.slaSeparacaoEstourado !== b.slaSeparacaoEstourado) {
        return a.slaSeparacaoEstourado ? -1 : 1;
      }
      const df = ordemFase[a.fase] - ordemFase[b.fase];
      if (df !== 0) return df;
      return (
        new Date(a.horarioMontagem).getTime() -
        new Date(b.horarioMontagem).getTime()
      );
    });
  }

  async listMine(montadorId: string) {
    const inicio = startOfToday();
    const fim = endOfHorizon(30);

    return prisma.ordemServico.findMany({
      where: {
        OR: [{ montadorId }, { desmontadorId: montadorId }],
        festa: {
          OR: [
            { horarioMontagem: { gte: inicio, lte: fim } },
            { dataEvento: { gte: inicio, lte: fim } },
          ],
          status: {
            in: [
              StatusFesta.PAGO,
              StatusFesta.FECHADO,
              StatusFesta.EM_MONTAGEM,
              StatusFesta.CONCLUIDO,
            ],
          },
        },
      },
      include: osInclude,
      orderBy: { festa: { horarioMontagem: "asc" } },
    });
  }

  async addRomaneioItem(osId: string, rawInput: unknown) {
    const data = this.parseAddRomaneioItem(rawInput);
    const os = await this.getById(osId);

    let descricao = data.descricao ?? null;
    let unidadeId: string | null = data.unidadeId ?? null;

    if (unidadeId) {
      const unidade = await prisma.unidadeProduto.findUnique({
        where: { id: unidadeId },
        include: { produto: { select: { nome: true } } },
      });

      if (!unidade) {
        throw new OsValidationError(`Unidade não encontrada: ${unidadeId}`);
      }

      const reserva = await prisma.reservaEstoque.findFirst({
        where: { unidadeId, festaId: os.festaId },
      });

      if (!reserva) {
        throw new OsValidationError(
          "Unidade não está reservada para esta festa"
        );
      }

      const duplicado = await prisma.itemRomaneio.findFirst({
        where: { osId, unidadeId },
      });

      if (duplicado) {
        throw new OsValidationError("Unidade já consta no romaneio");
      }

      if (!descricao) {
        descricao = unidade.produto.nome;
        if (unidade.etiqueta) {
          descricao += ` (${unidade.etiqueta})`;
        }
      }
    }

    return prisma.itemRomaneio.create({
      data: {
        osId,
        unidadeId,
        descricao,
      },
      include: {
        unidade: {
          include: {
            produto: {
              select: { id: true, nome: true, categoria: true },
            },
          },
        },
      },
    });
  }

  async updateRomaneioItem(
    osId: string,
    itemId: string,
    rawInput: unknown
  ) {
    const data = this.parseUpdateRomaneioItem(rawInput);
    await this.getById(osId);

    const item = await prisma.itemRomaneio.findFirst({
      where: { id: itemId, osId },
      include: {
        unidade: { include: { produto: { select: { requerQr: true } } } },
      },
    });

    if (!item) {
      throw new OsItemNotFoundError(osId, itemId);
    }

    if (data.fotoMidiaId !== undefined && data.fotoMidiaId !== null) {
      const os = await this.getById(osId);
      const midia = await prisma.midia.findUnique({
        where: { id: data.fotoMidiaId },
      });
      if (!midia) {
        throw new OsValidationError(`Mídia não encontrada: ${data.fotoMidiaId}`);
      }
      if (midia.tipo !== TipoMidia.ITEM) {
        throw new OsValidationError("Mídia deve ser do tipo ITEM");
      }
      if (midia.festaId && midia.festaId !== os.festaId) {
        throw new OsValidationError("Mídia não pertence à festa desta OS");
      }
      if (!midia.festaId) {
        await prisma.midia.update({
          where: { id: data.fotoMidiaId },
          data: { festaId: os.festaId },
        });
      }
    }

    return prisma.itemRomaneio.update({
      where: { id: itemId },
      data: {
        ...(data.carregado !== undefined ? { carregado: data.carregado } : {}),
        ...(data.conferido !== undefined ? { conferido: data.conferido } : {}),
        ...(data.montado !== undefined ? { montado: data.montado } : {}),
        ...(data.retornado !== undefined ? { retornado: data.retornado } : {}),
        ...(data.fotoMidiaId !== undefined
          ? { fotoMidiaId: data.fotoMidiaId }
          : {}),
      },
      include: {
        unidade: {
          include: {
            produto: {
              select: { id: true, nome: true, categoria: true, requerQr: true },
            },
          },
        },
      },
    });
  }

  async uploadItemFoto(osId: string, itemId: string, midiaId: string) {
    return this.updateRomaneioItem(osId, itemId, { fotoMidiaId: midiaId });
  }

  async concluirRomaneio(osId: string) {
    const os = await this.getById(osId);

    if (os.itensRomaneio.length === 0) {
      throw new OsValidationError("Romaneio vazio — adicione itens antes de concluir");
    }

    const pendentes = os.itensRomaneio.filter(
      (item) => !item.carregado || !item.conferido
    );

    if (pendentes.length > 0) {
      throw new OsValidationError(
        "Todos os itens devem estar carregados e conferidos"
      );
    }

    const pegueEMonte = Boolean(os.festa.pegueEMonte);
    const agora = new Date();

    const osAtualizada = await prisma.$transaction(async (tx) => {
      const updated = await tx.ordemServico.update({
        where: { id: osId },
        data: {
          romaneioConcluido: true,
          // Pegue e Monte: fica no depósito (não "a caminho")
          status: pegueEMonte ? StatusOS.ROMANEIO : StatusOS.EM_TRANSITO,
        },
        include: osInclude,
      });

      if (pegueEMonte) {
        await tx.festa.update({
          where: { id: os.festaId },
          data: {
            separacaoConcluidaEm: agora,
            prontoRetiradaEm: agora,
          },
        });
      } else {
        const festaStatus = os.festa.status;
        const festaUpdate: {
          separacaoConcluidaEm: Date;
          status?: StatusFesta;
        } = { separacaoConcluidaEm: agora };
        if (
          festaStatus === StatusFesta.FECHADO ||
          festaStatus === StatusFesta.PAGO
        ) {
          festaUpdate.status = StatusFesta.EM_MONTAGEM;
          updated.festa.status = StatusFesta.EM_MONTAGEM;
        }
        await tx.festa.update({
          where: { id: os.festaId },
          data: festaUpdate,
        });
      }

      return updated;
    });

    if (pegueEMonte) {
      let portalUrl = "";
      try {
        const { portalService } = await import("./portal.service");
        const link = await portalService.buildPortalLink(os.festaId);
        portalUrl = link.url;
      } catch (err) {
        console.warn("[os] portal link pegue e monte:", err);
      }
      dispatchWhatsAppSafe({
        template: "pegue_monte_pronto",
        telefone: osAtualizada.festa.cliente.telefone,
        festaId: osAtualizada.festaId,
        payload: {
          tema: osAtualizada.festa.tema,
          data: osAtualizada.festa.dataEvento.toISOString(),
          portalUrl,
        },
      });
    } else {
      dispatchWhatsAppSafe({
        template: "equipe_a_caminho",
        telefone: osAtualizada.festa.cliente.telefone,
        festaId: osAtualizada.festaId,
        payload: {
          tema: osAtualizada.festa.tema,
          data: osAtualizada.festa.dataEvento.toISOString(),
          endereco: osAtualizada.festa.endereco,
        },
      });
    }

    return this.withFotoFinal(osAtualizada);
  }

  async seedRomaneioFromReservas(osId: string) {
    const os = await this.getById(osId);

    const reservas = await prisma.reservaEstoque.findMany({
      where: { festaId: os.festaId },
      include: {
        unidade: {
          include: { produto: { select: { nome: true } } },
        },
      },
    });

    const existentes = new Set(
      os.itensRomaneio
        .map((item) => item.unidadeId)
        .filter((id): id is string => id !== null)
    );

    await prisma.$transaction(
      reservas
        .filter((r) => !existentes.has(r.unidadeId))
        .map((reserva) => {
          const { unidade } = reserva;
          let descricao = unidade.produto.nome;
          if (unidade.etiqueta) {
            descricao += ` (${unidade.etiqueta})`;
          }

          return prisma.itemRomaneio.create({
            data: {
              osId,
              unidadeId: reserva.unidadeId,
              descricao,
            },
            include: {
              unidade: {
                include: {
                  produto: {
                    select: { id: true, nome: true, categoria: true },
                  },
                },
              },
            },
          });
        })
    );

    return this.getById(osId);
  }

  /**
   * Gera a lista completa do pedido (reservas + linhas do kit/extras).
   * Usado pelo botão "Gerar lista do pedido" — inclusive se a festa ainda
   * estiver PAGO e `prepararMontagemParaFesta` não tiver rodado no fechamento.
   */
  async seedRomaneioCompleto(osId: string) {
    const os = await this.getById(osId);
    return this.prepararMontagemParaFesta(os.festaId);
  }

  async prepararMontagemParaFesta(festaId: string) {
    const os = await this.ensureForFesta(festaId);

    try {
      await estoqueService.prepararReservaFesta(festaId);
    } catch (error) {
      // Reserva pode falhar (sem estoque cadastrado) — a listagem do pedido
      // ainda precisa existir para o montador separar / pegue e monte.
      console.warn(
        "[os] prepararReservaFesta falhou; seguindo com linhas do kit:",
        festaId,
        error
      );
    }
    await this.seedRomaneioFromReservas(os.id);

    const osAtual = await this.getById(os.id);

    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: {
        kitCatalogo: true,
        itensExtras: true,
        tema: true,
        pegueEMonte: true,
      },
    });

    const linhasPedido: string[] = [...(festa?.itensExtras ?? [])];
    if (festa?.kitCatalogo) {
      const kit = await prisma.catalogoKit.findUnique({
        where: { id: festa.kitCatalogo },
        select: { itens: true, nome: true },
      });
      if (kit) {
        linhasPedido.unshift(...kit.itens);
        // Garante ao menos uma linha identificável do kit
        if (kit.itens.length === 0 && kit.nome) {
          linhasPedido.unshift(kit.nome);
        }
      } else {
        linhasPedido.unshift(`Kit: ${festa.kitCatalogo}`);
      }
    }

    const descricoesExistentes = new Set(
      osAtual.itensRomaneio
        .map((item) => normalizarTexto(item.descricao ?? ""))
        .filter(Boolean)
    );

    const linhasParaCriar: string[] = [];

    const tentarAdicionar = (linha: string, forcar = false) => {
      const trimmed = linha.trim();
      if (!trimmed) return;
      if (!forcar && isItemServico(trimmed)) return;

      const norm = normalizarTexto(trimmed);
      if (descricoesExistentes.has(norm)) return;

      if (!forcar) {
        const parsed = parseLinhaInventario(trimmed);
        if (parsed) {
          const def = encontrarDefInventario(parsed.texto);
          if (def) {
            const cobertoPorReserva = osAtual.itensRomaneio.some((item) => {
              if (!item.unidade) return false;
              const pn = normalizarTexto(item.unidade.produto.nome);
              const aliases = [
                normalizarTexto(def.nome),
                ...def.aliases.map(normalizarTexto),
              ];
              return aliases.some(
                (alias) =>
                  pn === alias || pn.includes(alias) || alias.includes(pn)
              );
            });
            if (cobertoPorReserva) return;
          }
        }
      }

      if (!linhasParaCriar.some((l) => normalizarTexto(l) === norm)) {
        linhasParaCriar.push(trimmed);
        descricoesExistentes.add(norm);
      }
    };

    for (const linha of linhasPedido) {
      tentarAdicionar(linha, false);
    }

    // Se ainda não há nada para separar, força linhas do kit/extras
    // (cenário típico: estoque vazio + itens filtrados demais).
    const totalAtual =
      osAtual.itensRomaneio.length + linhasParaCriar.length;
    if (totalAtual === 0) {
      for (const linha of linhasPedido) {
        tentarAdicionar(linha, true);
      }
    }
    if (
      osAtual.itensRomaneio.length + linhasParaCriar.length === 0 &&
      festa?.tema
    ) {
      tentarAdicionar(
        festa.pegueEMonte
          ? `Materiais Pegue e Monte — ${festa.tema}`
          : `Materiais da festa — ${festa.tema}`,
        true
      );
    }

    if (linhasParaCriar.length > 0) {
      await prisma.$transaction(
        linhasParaCriar.map((descricao) =>
          prisma.itemRomaneio.create({
            data: {
              osId: os.id,
              descricao,
              unidadeId: null,
            },
          })
        )
      );
    }

    if (osAtual.status === StatusOS.ABERTA) {
      await prisma.ordemServico.update({
        where: { id: os.id },
        data: { status: StatusOS.ROMANEIO },
      });
    }

    return this.getById(os.id);
  }

  async checkin(osId: string, rawInput: unknown) {
    const data = this.parseCheckin(rawInput);
    await this.getById(osId);

    const atualizada = await prisma.ordemServico.update({
      where: { id: osId },
      data: {
        checkinLat: data.lat,
        checkinLng: data.lng,
        checkinAt: new Date(),
        status: StatusOS.CHECKIN,
      },
      include: osInclude,
    });

    return this.withFotoFinal(atualizada);
  }

  /**
   * Só registra a foto da montagem — não finaliza a OS.
   * A saída/finalização é um passo separado (`finalizar`).
   */
  async fotoFinal(osId: string, midiaId: string) {
    const os = await this.getById(osId);

    if (!os.montagemLocalConcluida) {
      throw new OsValidationError(
        "Conclua a montagem no local antes de enviar a foto"
      );
    }

    const midia = await prisma.midia.findUnique({
      where: { id: midiaId },
    });

    if (!midia) {
      throw new OsValidationError(`Mídia não encontrada: ${midiaId}`);
    }

    if (midia.tipo !== TipoMidia.MONTAGEM_FINAL && midia.tipo !== TipoMidia.MONTAGEM_FOTO) {
      throw new OsValidationError(
        "Mídia deve ser do tipo MONTAGEM_FINAL ou MONTAGEM_FOTO"
      );
    }

    if (midia.festaId && midia.festaId !== os.festaId) {
      throw new OsValidationError("Mídia não pertence à festa desta OS");
    }

    if (!midia.festaId) {
      await prisma.midia.update({
        where: { id: midiaId },
        data: { festaId: os.festaId },
      });
    }

    return this.getById(osId);
  }

  /** Marca checklist de montagem no local — sem finalizar a festa. */
  async concluirMontagemLocal(osId: string) {
    const os = await this.getById(osId);

    if (!os.checkinAt) {
      throw new OsValidationError(
        "Check-in no local é obrigatório antes de concluir a montagem"
      );
    }

    if (!os.romaneioConcluido) {
      throw new OsValidationError(
        "Romaneio do galpão deve estar concluído antes da montagem local"
      );
    }

    if (os.itensRomaneio.length === 0) {
      throw new OsValidationError("Romaneio vazio");
    }

    const naoMontados = os.itensRomaneio.filter((item) => !item.montado);
    if (naoMontados.length > 0) {
      throw new OsValidationError(
        "Todos os itens devem estar montados no local"
      );
    }

    if (os.montagemLocalConcluida) {
      return os;
    }

    const atualizada = await prisma.ordemServico.update({
      where: { id: osId },
      data: { montagemLocalConcluida: true },
      include: osInclude,
    });

    return this.withFotoFinal(atualizada);
  }

  /** Checklist de retorno: todos os itens voltaram ao depósito. */
  async concluirRetorno(osId: string) {
    const os = await this.getById(osId);

    if (!os.romaneioConcluido) {
      throw new OsValidationError(
        "Conclua a separação antes do checklist de retorno"
      );
    }
    if (os.itensRomaneio.length === 0) {
      throw new OsValidationError("Romaneio vazio");
    }

    const pendentes = os.itensRomaneio.filter((item) => !item.retornado);
    if (pendentes.length > 0) {
      throw new OsValidationError(
        "Marque todos os itens como retornados antes de concluir"
      );
    }

    if (os.retornoConcluido) {
      return this.withFotoFinal(os);
    }

    const atualizada = await prisma.ordemServico.update({
      where: { id: osId },
      data: {
        retornoConcluido: true,
        retornoConcluidoEm: new Date(),
      },
      include: osInclude,
    });

    return this.withFotoFinal(atualizada);
  }

  /**
   * Registrar saída: finaliza a OS e a festa após checklist + foto.
   */
  async finalizar(osId: string) {
    const os = await this.getById(osId);

    if (!os.romaneioConcluido) {
      throw new OsValidationError("Conclua a separação no estoque antes");
    }
    if (!os.checkinAt) {
      throw new OsValidationError("Faça o check-in no local antes");
    }
    if (!os.montagemLocalConcluida) {
      throw new OsValidationError("Conclua a montagem no local antes");
    }
    if (!os.fotoFinalMidiaId) {
      throw new OsValidationError(
        "Envie a foto da montagem antes de registrar a saída"
      );
    }

    if (os.status === StatusOS.FINALIZADA) {
      return os;
    }

    const festaStatus = os.festa.status;
    const podeConcluirFesta =
      festaStatus === StatusFesta.EM_MONTAGEM ||
      festaStatus === StatusFesta.FECHADO ||
      festaStatus === StatusFesta.PAGO;

    const osFinalizada = await prisma.$transaction(async (tx) => {
      if (podeConcluirFesta) {
        await tx.festa.update({
          where: { id: os.festaId },
          data: { status: StatusFesta.CONCLUIDO },
        });
      }

      const updated = await tx.ordemServico.update({
        where: { id: osId },
        data: { status: StatusOS.FINALIZADA },
        include: osInclude,
      });

      await comissoesService.gerarDiariasOs(tx, {
        festaId: updated.festaId,
        dataEvento: updated.festa.dataEvento,
        horarioMontagem: updated.festa.horarioMontagem,
        montadorId: updated.montadorId,
        desmontadorId: updated.desmontadorId,
        montadorCarroProprio: updated.montadorCarroProprio,
        desmontadorCarroProprio: updated.desmontadorCarroProprio,
      });

      return updated;
    });

    dispatchWhatsAppSafe({
      template: "montagem_finalizada",
      telefone: osFinalizada.festa.cliente.telefone,
      festaId: osFinalizada.festaId,
      payload: {
        tema: osFinalizada.festa.tema,
        data: osFinalizada.festa.dataEvento.toISOString(),
      },
    });

    dispatchWhatsAppSafe({
      template: "pos_venda_avaliacao",
      telefone: osFinalizada.festa.cliente.telefone,
      festaId: osFinalizada.festaId,
      payload: {
        tema: osFinalizada.festa.tema,
        data: osFinalizada.festa.dataEvento.toISOString(),
      },
    });

    return this.withFotoFinal(osFinalizada);
  }
}

export const osService = new OsService();
