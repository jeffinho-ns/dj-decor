import {
  TamanhoDecoracao,
  TipoCatalogoAddon,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

const kitSchema = z.object({
  id: z.string().min(1).max(64),
  nome: z.string().min(2),
  categoria: z.string().min(1),
  descricaoCurta: z.string().min(1),
  valorEquipe: z.coerce.number().positive(),
  valorPegueEMonte: z.coerce.number().positive().nullable().optional(),
  tamanhoSugerido: z.nativeEnum(TamanhoDecoracao),
  itens: z.array(z.string().min(1)).default([]),
  ativo: z.boolean().optional().default(true),
  ordem: z.coerce.number().int().optional().default(0),
  imagemMidiaId: z.string().min(1).nullable().optional(),
});

const addonSchema = z.object({
  id: z.string().min(1).max(64),
  nome: z.string().min(2),
  valor: z.coerce.number().positive(),
  tipo: z.nativeEnum(TipoCatalogoAddon).optional().default(TipoCatalogoAddon.ADDON),
  ativo: z.boolean().optional().default(true),
  ordem: z.coerce.number().int().optional().default(0),
  imagemMidiaId: z.string().min(1).nullable().optional(),
});

export class CatalogoService {
  async listKits(apenasAtivos = true) {
    return prisma.catalogoKit.findMany({
      where: apenasAtivos ? { ativo: true } : undefined,
      include: {
        imagemMidia: {
          select: { id: true, mimeType: true, tamanho: true },
        },
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
  }

  async listAddons(apenasAtivos = true) {
    return prisma.catalogoAddon.findMany({
      where: apenasAtivos ? { ativo: true } : undefined,
      include: {
        imagemMidia: {
          select: { id: true, mimeType: true, tamanho: true },
        },
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
  }

  async listPublico() {
    const [kits, addons] = await Promise.all([
      this.listKits(true),
      this.listAddons(true),
    ]);
    return { kits, addons };
  }

  async upsertKit(raw: unknown) {
    const data = kitSchema.parse(raw);
    return prisma.catalogoKit.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        nome: data.nome,
        categoria: data.categoria,
        descricaoCurta: data.descricaoCurta,
        valorEquipe: data.valorEquipe,
        valorPegueEMonte: data.valorPegueEMonte ?? null,
        tamanhoSugerido: data.tamanhoSugerido,
        itens: data.itens,
        ativo: data.ativo,
        ordem: data.ordem,
        imagemMidiaId: data.imagemMidiaId ?? null,
      },
      update: {
        nome: data.nome,
        categoria: data.categoria,
        descricaoCurta: data.descricaoCurta,
        valorEquipe: data.valorEquipe,
        valorPegueEMonte: data.valorPegueEMonte ?? null,
        tamanhoSugerido: data.tamanhoSugerido,
        itens: data.itens,
        ativo: data.ativo,
        ordem: data.ordem,
        ...(data.imagemMidiaId !== undefined
          ? { imagemMidiaId: data.imagemMidiaId }
          : {}),
      },
      include: {
        imagemMidia: {
          select: { id: true, mimeType: true, tamanho: true },
        },
      },
    });
  }

  async upsertAddon(raw: unknown) {
    const data = addonSchema.parse(raw);
    return prisma.catalogoAddon.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        nome: data.nome,
        valor: data.valor,
        tipo: data.tipo,
        ativo: data.ativo,
        ordem: data.ordem,
        imagemMidiaId: data.imagemMidiaId ?? null,
      },
      update: {
        nome: data.nome,
        valor: data.valor,
        tipo: data.tipo,
        ativo: data.ativo,
        ordem: data.ordem,
        ...(data.imagemMidiaId !== undefined
          ? { imagemMidiaId: data.imagemMidiaId }
          : {}),
      },
      include: {
        imagemMidia: {
          select: { id: true, mimeType: true, tamanho: true },
        },
      },
    });
  }

  async setKitAtivo(id: string, ativo: boolean) {
    return prisma.catalogoKit.update({
      where: { id },
      data: { ativo },
    });
  }

  async setAddonAtivo(id: string, ativo: boolean) {
    return prisma.catalogoAddon.update({
      where: { id },
      data: { ativo },
    });
  }
}

export const catalogoService = new CatalogoService();
