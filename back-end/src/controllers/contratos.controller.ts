import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth";
import { pdfAdapter } from "../integrations/pdf";

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
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Festa não encontrada")) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  }
}

export const contratosController = new ContratosController();
