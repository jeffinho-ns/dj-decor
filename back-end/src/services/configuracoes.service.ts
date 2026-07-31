import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

const updateConfigSchema = z.object({
  comissaoPercentual: z.coerce.number().min(0).max(100).optional(),
  comissaoMetaSemanal: z.coerce.number().min(0).optional(),
  clausulasContrato: z.string().max(20000).nullable().optional(),
  nomeEmpresa: z.string().min(2).max(120).optional(),
  sloganEmpresa: z.string().min(2).max(200).optional(),
  logoMidiaId: z.string().min(1).nullable().optional(),
});

export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;

export class ConfiguracoesService {
  async get() {
    const existing = await prisma.configuracaoNegocio.findUnique({
      where: { id: "default" },
      include: {
        logoMidia: {
          select: { id: true, mimeType: true, tamanho: true, tipo: true },
        },
      },
    });

    if (existing) return existing;

    return prisma.configuracaoNegocio.create({
      data: {
        id: "default",
        comissaoPercentual: env.COMISSAO_PERCENTUAL_DEFAULT,
        comissaoMetaSemanal: env.COMISSAO_META_SEMANAL,
        nomeEmpresa: "DJ Decor",
        sloganEmpresa: "Decoração de Festas · Locação de Materiais",
      },
      include: {
        logoMidia: {
          select: { id: true, mimeType: true, tamanho: true, tipo: true },
        },
      },
    });
  }

  async update(raw: unknown) {
    const data = updateConfigSchema.parse(raw);
    await this.get();

    return prisma.configuracaoNegocio.update({
      where: { id: "default" },
      data: {
        ...(data.comissaoPercentual !== undefined
          ? { comissaoPercentual: data.comissaoPercentual }
          : {}),
        ...(data.comissaoMetaSemanal !== undefined
          ? { comissaoMetaSemanal: data.comissaoMetaSemanal }
          : {}),
        ...(data.clausulasContrato !== undefined
          ? { clausulasContrato: data.clausulasContrato }
          : {}),
        ...(data.nomeEmpresa !== undefined
          ? { nomeEmpresa: data.nomeEmpresa }
          : {}),
        ...(data.sloganEmpresa !== undefined
          ? { sloganEmpresa: data.sloganEmpresa }
          : {}),
        ...(data.logoMidiaId !== undefined
          ? { logoMidiaId: data.logoMidiaId }
          : {}),
      },
      include: {
        logoMidia: {
          select: { id: true, mimeType: true, tamanho: true, tipo: true },
        },
      },
    });
  }

  /** Percentual efetivo de comissão (DB, fallback env). */
  async getComissaoPercentual(): Promise<number> {
    const cfg = await this.get();
    return Number(cfg.comissaoPercentual);
  }

  async getComissaoMetaSemanal(): Promise<number> {
    const cfg = await this.get();
    return Number(cfg.comissaoMetaSemanal);
  }
}

export const configuracoesService = new ConfiguracoesService();
