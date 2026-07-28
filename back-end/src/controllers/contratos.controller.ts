import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { pdfAdapter } from "../integrations/pdf";
import {
  ContratoNotFoundError,
  ContratoPdfNotAvailableError,
  contratosService,
} from "../services/contratos.service";

function getParamId(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].length > 0) {
    return value[0];
  }
  return null;
}

export class ContratosController {
  async gerar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const festaId = getParamId(req.params.id);
      if (!festaId) {
        res.status(400).json({ error: "ID da festa é obrigatório" });
        return;
      }

      const result = await pdfAdapter.gerarContratoLocacao(festaId);

      res.status(201).json({
        id: result.id,
        geradoEm: result.geradoEm,
        tamanho: result.tamanho,
        hash: result.hash,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Festa não encontrada")) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async metadata(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const festaId = getParamId(req.params.id);
      if (!festaId) {
        res.status(400).json({ error: "ID da festa é obrigatório" });
        return;
      }

      const metadata = await contratosService.getMetadataByFestaId(festaId);
      res.status(200).json(metadata);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Festa não encontrada")) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof ContratoNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async streamPdf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const contratoId = getParamId(req.params.id);
      if (!contratoId) {
        res.status(400).json({ error: "ID do contrato é obrigatório" });
        return;
      }

      const pdfBuffer = await contratosService.getPdfByContratoId(contratoId);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", String(pdfBuffer.length));
      res.setHeader(
        "Content-Disposition",
        `inline; filename="contrato-${contratoId}.pdf"`
      );
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.status(200).send(pdfBuffer);
    } catch (error) {
      if (error instanceof ContratoNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof ContratoPdfNotAvailableError) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}

export const contratosController = new ContratosController();
