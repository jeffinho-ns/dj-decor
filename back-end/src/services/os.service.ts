import {
  Prisma,
  Role,
  StatusFesta,
  StatusOS,
  TipoMidia,
} from "@prisma/client";
import { z } from "zod";
import { dispatchWhatsAppSafe } from "../integrations/whatsapp";
import { prisma } from "../prisma/client";

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
  montadorId: z.string().min(1),
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
    const { montadorId } = this.parseAssignMontador(rawInput);
    await this.getById(osId);

    const montador = await prisma.user.findUnique({ where: { id: montadorId } });
    if (!montador || montador.role !== Role.MONTADOR) {
      throw new OsValidationError("Montador inválido");
    }

    return prisma.ordemServico.update({
      where: { id: osId },
      data: { montadorId },
      include: osInclude,
    });
  }

  async ensureForFesta(festaId: string) {
    const existing = await prisma.ordemServico.findUnique({
      where: { festaId },
      include: osInclude,
    });

    if (existing) {
      return existing;
    }

    const festa = await prisma.festa.findUnique({
      where: { id: festaId },
      select: { id: true },
    });

    if (!festa) {
      throw new OsValidationError(`Festa não encontrada: ${festaId}`);
    }

    return prisma.ordemServico.create({
      data: {
        festaId,
        status: StatusOS.ABERTA,
      },
      include: osInclude,
    });
  }

  async getById(id: string) {
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: osInclude,
    });

    if (!os) {
      throw new OsNotFoundError(id);
    }

    return os;
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

  async listMine(montadorId: string) {
    const inicio = startOfToday();
    const fim = endOfToday();

    return prisma.ordemServico.findMany({
      where: {
        montadorId,
        festa: {
          OR: [
            { horarioMontagem: { gte: inicio, lte: fim } },
            { dataEvento: { gte: inicio, lte: fim } },
          ],
          status: { not: StatusFesta.CANCELADO },
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

    const altoValorSemFoto = os.itensRomaneio.filter(
      (item) =>
        item.unidade?.produto.requerQr === true && !item.fotoMidiaId
    );

    if (altoValorSemFoto.length > 0) {
      throw new OsValidationError(
        "Itens de alto valor exigem foto antes de concluir o romaneio"
      );
    }

    const osAtualizada = await prisma.ordemServico.update({
      where: { id: osId },
      data: {
        romaneioConcluido: true,
        status: StatusOS.EM_TRANSITO,
      },
      include: osInclude,
    });

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

    return osAtualizada;
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

  async checkin(osId: string, rawInput: unknown) {
    const data = this.parseCheckin(rawInput);
    await this.getById(osId);

    return prisma.ordemServico.update({
      where: { id: osId },
      data: {
        checkinLat: data.lat,
        checkinLng: data.lng,
        checkinAt: new Date(),
        status: StatusOS.CHECKIN,
      },
      include: osInclude,
    });
  }

  async fotoFinal(osId: string, midiaId: string) {
    const os = await this.getById(osId);

    const midia = await prisma.midia.findUnique({
      where: { id: midiaId },
    });

    if (!midia) {
      throw new OsValidationError(`Mídia não encontrada: ${midiaId}`);
    }

    if (midia.tipo !== TipoMidia.MONTAGEM_FINAL) {
      throw new OsValidationError(
        "Mídia deve ser do tipo MONTAGEM_FINAL"
      );
    }

    if (midia.festaId && midia.festaId !== os.festaId) {
      throw new OsValidationError("Mídia não pertence à festa desta OS");
    }

    const festaStatus = os.festa.status;
    const podeConcluirFesta =
      festaStatus === StatusFesta.EM_MONTAGEM ||
      festaStatus === StatusFesta.FECHADO;

    const osFinalizada = await prisma.$transaction(async (tx) => {
      if (podeConcluirFesta) {
        await tx.festa.update({
          where: { id: os.festaId },
          data: { status: StatusFesta.CONCLUIDO },
        });
      }

      if (!midia.festaId) {
        await tx.midia.update({
          where: { id: midiaId },
          data: { festaId: os.festaId },
        });
      }

      return tx.ordemServico.update({
        where: { id: osId },
        data: { status: StatusOS.FINALIZADA },
        include: osInclude,
      });
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

    return osFinalizada;
  }
}

export const osService = new OsService();
