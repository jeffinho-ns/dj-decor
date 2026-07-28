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

export { comissoesRoutes };
