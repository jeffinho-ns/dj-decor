import { StatusUnidade, TipoMovimentacao } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const scanSchema = z.object({
  codigoQr: z.string().min(1, "codigoQr é obrigatório"),
  tipo: z.nativeEnum(TipoMovimentacao),
  osId: z.string().min(1).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export type QrScanInput = z.infer<typeof scanSchema>;

export class QrUnidadeNotFoundError extends Error {
  constructor(codigo: string) {
    super(`Unidade com QR "${codigo}" não encontrada`);
    this.name = "QrUnidadeNotFoundError";
  }
}

export class QrValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrValidationError";
  }
}

export class QrService {
  parseScan(body: unknown): QrScanInput {
    return scanSchema.parse(body);
  }

  async scan(input: QrScanInput, userId: string) {
    const unidade = await prisma.unidadeProduto.findUnique({
      where: { codigoQr: input.codigoQr },
      include: {
        produto: { select: { id: true, nome: true, requerQr: true } },
      },
    });

    if (!unidade) {
      throw new QrUnidadeNotFoundError(input.codigoQr);
    }

    if (input.osId) {
      const os = await prisma.ordemServico.findUnique({
        where: { id: input.osId },
        select: { id: true },
      });
      if (!os) {
        throw new QrValidationError(`OS não encontrada: ${input.osId}`);
      }
    }

    return prisma.$transaction(async (tx) => {
      let novoStatus: StatusUnidade;

      if (input.tipo === TipoMovimentacao.SAIDA_GALPAO) {
        if (unidade.status === StatusUnidade.MANUTENCAO) {
          throw new QrValidationError(
            "Unidade em manutenção não pode sair do galpão"
          );
        }
        novoStatus = StatusUnidade.EM_USO;
      } else {
        const reservaAtiva = await tx.reservaEstoque.findFirst({
          where: {
            unidadeId: unidade.id,
            fim: { gt: new Date() },
          },
        });

        novoStatus = reservaAtiva
          ? StatusUnidade.RESERVADA
          : StatusUnidade.DISPONIVEL;
      }

      await tx.unidadeProduto.update({
        where: { id: unidade.id },
        data: { status: novoStatus },
      });

      const movimentacao = await tx.movimentacaoQr.create({
        data: {
          tipo: input.tipo,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          unidadeId: unidade.id,
          osId: input.osId ?? null,
          userId,
        },
        include: {
          unidade: {
            include: {
              produto: { select: { id: true, nome: true } },
            },
          },
          os: {
            select: { id: true, festaId: true, status: true },
          },
        },
      });

      return {
        movimentacao,
        unidadeStatus: novoStatus,
      };
    });
  }
}

export const qrService = new QrService();
