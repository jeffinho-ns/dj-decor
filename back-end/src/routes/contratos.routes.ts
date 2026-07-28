import { Router } from "express";
import { Role } from "@prisma/client";
import { contratosController } from "../controllers/contratos.controller";
import { auth, requireRoles } from "../middlewares/auth";

/**
 * Montado na raiz em routes/index.ts (sem prefixo), no mesmo padrão de pagamentos:
 * POST /api/festas/:id/contrato
 * GET  /api/festas/:id/contrato
 * GET  /api/contratos/:id/pdf
 */
const contratosRoutes = Router();

const contratoRoles = [Role.VENDEDOR, Role.GERENTE, Role.ADMIN] as const;

contratosRoutes.use(auth);

contratosRoutes.post(
  "/festas/:id/contrato",
  requireRoles(...contratoRoles),
  (req, res, next) => contratosController.gerar(req, res, next)
);

contratosRoutes.get(
  "/festas/:id/contrato",
  requireRoles(...contratoRoles),
  (req, res, next) => contratosController.metadata(req, res, next)
);

contratosRoutes.get(
  "/contratos/:id/pdf",
  requireRoles(...contratoRoles),
  (req, res, next) => contratosController.streamPdf(req, res, next)
);

export { contratosRoutes };
