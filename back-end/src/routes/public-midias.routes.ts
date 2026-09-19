import { Router } from "express";
import { TipoMidia } from "@prisma/client";
import {
  getFirebaseSignedUrl,
  isFirebaseConfigured,
} from "../integrations/firebase-storage";
import {
  ContratoNotFoundError,
  ContratoPdfNotAvailableError,
  contratosService,
} from "../services/contratos.service";
import { midiasService, MidiaNotFoundError } from "../services/midias.service";
import {
  verifyPublicContratoSig,
  verifyPublicMidiaSig,
} from "../utils/midia-public-url";

/**
 * URLs públicas assinadas para a Meta/WhatsApp baixar mídia/PDF.
 * Sem auth de usuário — validação por HMAC (exp + sig).
 */
const publicMidiasRoutes = Router();

const IMAGE_TIPOS: TipoMidia[] = [
  TipoMidia.REFERENCIA_FESTA,
  TipoMidia.CLIENTE_REFERENCIA,
  TipoMidia.MONTAGEM_FINAL,
  TipoMidia.MONTAGEM_FOTO,
  TipoMidia.REFERENCIA_BOLAS,
  TipoMidia.CATALOGO_ITEM,
];

publicMidiasRoutes.get("/midias/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "");
    const exp = String(req.query.exp || "");
    const sig = String(req.query.sig || "");
    if (!id || !verifyPublicMidiaSig(id, exp, sig)) {
      res.status(403).json({ message: "Link inválido ou expirado" });
      return;
    }

    const midia = await midiasService.getById(id);
    if (!IMAGE_TIPOS.includes(midia.tipo)) {
      res.status(403).json({ message: "Mídia não disponível" });
      return;
    }
    if (!String(midia.mimeType || "").startsWith("image/")) {
      res.status(415).json({ message: "Não é imagem" });
      return;
    }

    if (midia.storagePath && isFirebaseConfigured()) {
      const url = await getFirebaseSignedUrl(midia.storagePath, 30 * 60 * 1000);
      res.redirect(302, url);
      return;
    }

    if (!midia.data || midia.data.length === 0) {
      res.status(404).json({ message: "Arquivo sem conteúdo" });
      return;
    }

    res.setHeader("Content-Type", midia.mimeType);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(Buffer.from(midia.data));
  } catch (error) {
    if (error instanceof MidiaNotFoundError) {
      res.status(404).json({ message: error.message });
      return;
    }
    next(error);
  }
});

publicMidiasRoutes.get("/contratos/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "");
    const exp = String(req.query.exp || "");
    const sig = String(req.query.sig || "");
    if (!id || !verifyPublicContratoSig(id, exp, sig)) {
      res.status(403).json({ message: "Link inválido ou expirado" });
      return;
    }

    const pdf = await contratosService.getPdfByContratoId(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="contrato-${id.slice(0, 8)}.pdf"`
    );
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(pdf);
  } catch (error) {
    if (
      error instanceof ContratoNotFoundError ||
      error instanceof ContratoPdfNotAvailableError
    ) {
      res.status(404).json({ message: error.message });
      return;
    }
    next(error);
  }
});

export { publicMidiasRoutes };
