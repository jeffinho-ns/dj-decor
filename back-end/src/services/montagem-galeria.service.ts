import { randomUUID } from "node:crypto";
import { Role, TipoMidia } from "@prisma/client";
import {
  deleteFromFirebase,
  getFirebaseSignedUrl,
  isFirebaseConfigured,
  uploadToFirebase,
  FirebaseNotConfiguredError,
} from "../integrations/firebase-storage";
import { prisma } from "../prisma/client";
import { MidiaValidationError } from "./midias.service";
import { OsNotFoundError, OsValidationError } from "./os.service";

export const MAX_MONTAGEM_FOTOS = 6;
export const MAX_MONTAGEM_VIDEOS = 2;
export const MAX_MONTAGEM_FOTO_BYTES = 15 * 1024 * 1024;
export const MAX_MONTAGEM_VIDEO_BYTES = 100 * 1024 * 1024;

const FOTO_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const GALERIA_TIPOS: TipoMidia[] = [
  TipoMidia.MONTAGEM_FOTO,
  TipoMidia.MONTAGEM_VIDEO,
  TipoMidia.MONTAGEM_FINAL,
];

const galeriaSelect = {
  id: true,
  mimeType: true,
  tamanho: true,
  tipo: true,
  filename: true,
  storagePath: true,
  visivelPortal: true,
  ordem: true,
  festaId: true,
  uploadedById: true,
  criadoEm: true,
} as const;

function extFromMime(mime: string, filename?: string | null): string {
  if (filename && /\.[a-z0-9]+$/i.test(filename)) {
    return filename.slice(filename.lastIndexOf(".")).toLowerCase();
  }
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
  };
  return map[mime] ?? ".bin";
}

export class MontagemGaleriaService {
  assertPodeEditar(
    os: { montadorId: string | null },
    user: { id: string; role: Role }
  ) {
    if (user.role === Role.ADMIN) return;
    if (os.montadorId && os.montadorId !== user.id) {
      throw new OsValidationError(
        "Apenas o montador designado pode alterar esta montagem"
      );
    }
  }

  async listByOs(osId: string) {
    const os = await prisma.ordemServico.findUnique({
      where: { id: osId },
      select: { festaId: true },
    });
    if (!os) throw new OsNotFoundError(osId);

    return prisma.midia.findMany({
      where: {
        festaId: os.festaId,
        tipo: { in: GALERIA_TIPOS },
      },
      select: galeriaSelect,
      orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
    });
  }

  async upload(
    osId: string,
    file: Express.Multer.File | undefined,
    user: { id: string; role: Role }
  ) {
    if (!file) {
      throw new MidiaValidationError("Arquivo é obrigatório");
    }
    if (!isFirebaseConfigured()) {
      throw new FirebaseNotConfiguredError();
    }

    const os = await prisma.ordemServico.findUnique({
      where: { id: osId },
      select: {
        id: true,
        festaId: true,
        montadorId: true,
        montagemLocalConcluida: true,
      },
    });
    if (!os) throw new OsNotFoundError(osId);
    this.assertPodeEditar(os, user);

    if (!os.montagemLocalConcluida) {
      throw new OsValidationError(
        "Conclua a montagem no local antes de enviar a galeria"
      );
    }

    const isVideo = VIDEO_MIMES.has(file.mimetype);
    const isFoto = FOTO_MIMES.has(file.mimetype);
    if (!isVideo && !isFoto) {
      throw new MidiaValidationError(
        "Use JPEG, PNG, WebP, HEIC, MP4, MOV ou WebM"
      );
    }

    const maxBytes = isVideo
      ? MAX_MONTAGEM_VIDEO_BYTES
      : MAX_MONTAGEM_FOTO_BYTES;
    if (file.size > maxBytes) {
      throw new MidiaValidationError(
        isVideo
          ? "Vídeo excede o limite de 100 MB"
          : "Foto excede o limite de 15 MB"
      );
    }

    const existentes = await prisma.midia.findMany({
      where: {
        festaId: os.festaId,
        tipo: {
          in: [
            TipoMidia.MONTAGEM_FOTO,
            TipoMidia.MONTAGEM_VIDEO,
            TipoMidia.MONTAGEM_FINAL,
          ],
        },
      },
      select: { tipo: true },
    });

    const fotos = existentes.filter(
      (m) =>
        m.tipo === TipoMidia.MONTAGEM_FOTO ||
        m.tipo === TipoMidia.MONTAGEM_FINAL
    ).length;
    const videos = existentes.filter(
      (m) => m.tipo === TipoMidia.MONTAGEM_VIDEO
    ).length;

    if (isFoto && fotos >= MAX_MONTAGEM_FOTOS) {
      throw new MidiaValidationError(
        `Limite de ${MAX_MONTAGEM_FOTOS} fotos atingido`
      );
    }
    if (isVideo && videos >= MAX_MONTAGEM_VIDEOS) {
      throw new MidiaValidationError(
        `Limite de ${MAX_MONTAGEM_VIDEOS} vídeos atingido`
      );
    }

    const tipo = isVideo ? TipoMidia.MONTAGEM_VIDEO : TipoMidia.MONTAGEM_FOTO;
    const midiaId = randomUUID().replace(/-/g, "").slice(0, 24);
    const ext = extFromMime(file.mimetype, file.originalname);
    const storagePath = `festas/${os.festaId}/montagem/${midiaId}${ext}`;

    await uploadToFirebase({
      path: storagePath,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const ordem = existentes.length;

    try {
      return await prisma.midia.create({
        data: {
          id: midiaId,
          data: null,
          mimeType: file.mimetype,
          tamanho: file.size,
          tipo,
          filename: file.originalname || null,
          storagePath,
          visivelPortal: true,
          ordem,
          festaId: os.festaId,
          uploadedById: user.id,
        },
        select: galeriaSelect,
      });
    } catch (err) {
      await deleteFromFirebase(storagePath);
      throw err;
    }
  }

  async remove(
    osId: string,
    midiaId: string,
    user: { id: string; role: Role }
  ) {
    const os = await prisma.ordemServico.findUnique({
      where: { id: osId },
      select: { festaId: true, montadorId: true },
    });
    if (!os) throw new OsNotFoundError(osId);
    this.assertPodeEditar(os, user);

    const midia = await prisma.midia.findUnique({ where: { id: midiaId } });
    if (!midia || midia.festaId !== os.festaId) {
      throw new MidiaValidationError("Mídia não encontrada nesta montagem");
    }
    if (!GALERIA_TIPOS.includes(midia.tipo)) {
      throw new MidiaValidationError("Mídia não faz parte da galeria");
    }

    if (midia.storagePath) {
      await deleteFromFirebase(midia.storagePath);
    }
    await prisma.midia.delete({ where: { id: midiaId } });
    return { ok: true as const };
  }

  async signedUrl(osId: string, midiaId: string) {
    const os = await prisma.ordemServico.findUnique({
      where: { id: osId },
      select: { festaId: true },
    });
    if (!os) throw new OsNotFoundError(osId);

    const midia = await prisma.midia.findUnique({ where: { id: midiaId } });
    if (!midia || midia.festaId !== os.festaId) {
      throw new MidiaValidationError("Mídia não encontrada nesta montagem");
    }

    if (midia.storagePath) {
      const url = await getFirebaseSignedUrl(midia.storagePath);
      return {
        url,
        mimeType: midia.mimeType,
        filename: midia.filename,
        storage: "firebase" as const,
      };
    }

    if (midia.data) {
      return {
        url: null as string | null,
        mimeType: midia.mimeType,
        filename: midia.filename,
        storage: "db" as const,
        midiaId: midia.id,
      };
    }

    throw new MidiaValidationError("Arquivo indisponível");
  }
}

export const montagemGaleriaService = new MontagemGaleriaService();
