import { Router } from "express";
import { Role } from "@prisma/client";
import { configuracoesController } from "../controllers/configuracoes.controller";
import { auth, requireRoles } from "../middlewares/auth";

const configuracoesRoutes = Router();

configuracoesRoutes.use(auth);

configuracoesRoutes.get(
  "/",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => configuracoesController.get(req, res, next)
);

configuracoesRoutes.put(
  "/",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => configuracoesController.update(req, res, next)
);

export { configuracoesRoutes };
