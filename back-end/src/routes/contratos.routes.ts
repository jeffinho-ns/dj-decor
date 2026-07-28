import { Router } from "express";
import { Role } from "@prisma/client";
import { contratosController } from "../controllers/contratos.controller";
import { auth, requireRoles } from "../middlewares/auth";

/**
 * Montado na raiz em routes/index.ts (sem prefixo), no mesmo padrão de pagamentos:
 * POST /api/festas/:id/contrato
 */
const contratosRoutes = Router();

contratosRoutes.use(auth);

contratosRoutes.post(
  "/festas/:id/contrato",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => contratosController.gerar(req, res, next)
);

export { contratosRoutes };
