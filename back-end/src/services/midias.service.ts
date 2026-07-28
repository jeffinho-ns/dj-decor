import { TipoMidia } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";

export const MAX_MIDIA_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const uploadMetaSchema = z.object({
  tipo: z.nativeEnum(TipoMidia),
  festaId: z.string().min(1).nullable().optional(),
});

export type UploadMidiaMeta = z.infer<typeof uploadMetaSchema>;

export class MidiaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MidiaValidationError";
  }
}

export class MidiaNotFoundError extends Error {
  constructor(id: string) {
    super(`Mídia não encontrada: ${id}`);
    this.name = "MidiaNotFoundError";
  }
}

export class MidiasService {
  parseMeta(body: unknown): UploadMidiaMeta {
    return uploadMetaSchema.parse(body);
  }

  validateFile(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw new MidiaValidationError("Arquivo é obrigatório");
    }

    if (file.size > MAX_MIDIA_BYTES) {
      throw new MidiaValidationError("Arquivo excede o limite de 2 MB");
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      throw new MidiaValidationError(
        "MIME inválido. Use image/jpeg, image/png ou image/webp"
      );
    }

    return file;
  }

  async create(
    file: Express.Multer.File,
    meta: UploadMidiaMeta,
    uploadedById: string
  ) {
    if (meta.festaId) {
      const festa = await prisma.festa.findUnique({
        where: { id: meta.festaId },
        select: { id: true },
      });
      if (!festa) {
        throw new MidiaValidationError(`Festa não encontrada: ${meta.festaId}`);
      }
    }

    const midia = await prisma.midia.create({
      data: {
        data: new Uint8Array(file.buffer),
        mimeType: file.mimetype,
        tamanho: file.size,
        tipo: meta.tipo,
        filename: file.originalname || null,
        festaId: meta.festaId ?? null,
        uploadedById,
      },
      select: {
        id: true,
        mimeType: true,
        tamanho: true,
        tipo: true,
        filename: true,
        festaId: true,
        uploadedById: true,
        criadoEm: true,
      },
    });

    return midia;
  }

  async getById(id: string) {
    const midia = await prisma.midia.findUnique({ where: { id } });
    if (!midia) {
      throw new MidiaNotFoundError(id);
    }
    return midia;
  }
}

export const midiasService = new MidiasService();
