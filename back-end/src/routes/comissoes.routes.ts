import { Router } from "express";
import { Role } from "@prisma/client";
import { comissoesController } from "../controllers/comissoes.controller";
import { auth, requireRoles } from "../middlewares/auth";

const comissoesRoutes = Router();

comissoesRoutes.use(auth);

comissoesRoutes.get(
  "/ranking",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => comissoesController.ranking(req, res, next)
);

comissoesRoutes.get(
  "/minhas",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => comissoesController.minhas(req, res, next)
);

comissoesRoutes.get(
  "/pendentes",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => comissoesController.pendentes(req, res, next)
);

comissoesRoutes.post(
  "/marcar-pagas",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => comissoesController.marcarPagas(req, res, next)
);

comissoesRoutes.post(
  "/reconciliar",
  requireRoles(Role.ADMIN),
  (req, res, next) => comissoesController.reconciliar(req, res, next)
);

export { comissoesRoutes };
