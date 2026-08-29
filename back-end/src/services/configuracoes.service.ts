import { FrequenciaPagamentoEquipe } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

const updateConfigSchema = z.object({
  comissaoPercentual: z.coerce.number().min(0).max(100).optional(),
  comissaoSociaPercentual: z.coerce.number().min(0).max(100).optional(),
  comissaoMetaSemanal: z.coerce.number().min(0).optional(),
  diariaMontador: z.coerce.number().min(0).optional(),
  diariaDesmontador: z.coerce.number().min(0).optional(),
  diariaMontadorCarroEmpresa: z.coerce.number().min(0).optional(),
  diariaDesmontadorCarroEmpresa: z.coerce.number().min(0).optional(),
  frequenciaPagamentoEquipe: z.nativeEnum(FrequenciaPagamentoEquipe).optional(),
  markupBolasPercentual: z.coerce.number().min(0).max(100).optional(),
  clausulasContrato: z.string().max(20000).nullable().optional(),
  nomeEmpresa: z.string().min(2).max(120).optional(),
  sloganEmpresa: z.string().min(2).max(200).optional(),
  telefoneEmpresa: z.string().max(30).nullable().optional(),
  whatsappEmpresa: z.string().max(30).nullable().optional(),
  enderecoEmpresa: z.string().max(300).nullable().optional(),
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
        comissaoSociaPercentual: 30,
        comissaoMetaSemanal: env.COMISSAO_META_SEMANAL,
        diariaMontador: 150,
        diariaDesmontador: 130,
        diariaMontadorCarroEmpresa: 130,
        diariaDesmontadorCarroEmpresa: 80,
        nomeEmpresa: "DJ festas",
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
        ...(data.comissaoSociaPercentual !== undefined
          ? { comissaoSociaPercentual: data.comissaoSociaPercentual }
          : {}),
        ...(data.comissaoMetaSemanal !== undefined
          ? { comissaoMetaSemanal: data.comissaoMetaSemanal }
          : {}),
        ...(data.diariaMontador !== undefined
          ? { diariaMontador: data.diariaMontador }
          : {}),
        ...(data.diariaDesmontador !== undefined
          ? { diariaDesmontador: data.diariaDesmontador }
          : {}),
        ...(data.diariaMontadorCarroEmpresa !== undefined
          ? { diariaMontadorCarroEmpresa: data.diariaMontadorCarroEmpresa }
          : {}),
        ...(data.diariaDesmontadorCarroEmpresa !== undefined
          ? {
              diariaDesmontadorCarroEmpresa: data.diariaDesmontadorCarroEmpresa,
            }
          : {}),
        ...(data.frequenciaPagamentoEquipe !== undefined
          ? { frequenciaPagamentoEquipe: data.frequenciaPagamentoEquipe }
          : {}),
        ...(data.markupBolasPercentual !== undefined
          ? { markupBolasPercentual: data.markupBolasPercentual }
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
        ...(data.telefoneEmpresa !== undefined
          ? { telefoneEmpresa: data.telefoneEmpresa }
          : {}),
        ...(data.whatsappEmpresa !== undefined
          ? { whatsappEmpresa: data.whatsappEmpresa }
          : {}),
        ...(data.enderecoEmpresa !== undefined
          ? { enderecoEmpresa: data.enderecoEmpresa }
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

  /** Percentual efetivo de comissão do vendedor (DB, fallback env). */
  async getComissaoPercentual(): Promise<number> {
    const cfg = await this.get();
    return Number(cfg.comissaoPercentual);
  }

  async getComissaoMetaSemanal(): Promise<number> {
    const cfg = await this.get();
    return Number(cfg.comissaoMetaSemanal);
  }

  async getRegrasFinanceiras() {
    const cfg = await this.get();
    return {
      comissaoVendedorPercentual: Number(cfg.comissaoPercentual),
      comissaoSociaPercentual: Number(cfg.comissaoSociaPercentual),
      diariaMontador: Number(cfg.diariaMontador),
      diariaDesmontador: Number(cfg.diariaDesmontador),
      diariaMontadorCarroEmpresa: Number(cfg.diariaMontadorCarroEmpresa),
      diariaDesmontadorCarroEmpresa: Number(cfg.diariaDesmontadorCarroEmpresa),
      frequenciaPagamentoEquipe: cfg.frequenciaPagamentoEquipe,
      markupBolasPercentual: Number(cfg.markupBolasPercentual ?? 10),
      comissaoMetaSemanal: Number(cfg.comissaoMetaSemanal),
    };
  }
}

export const configuracoesService = new ConfiguracoesService();
