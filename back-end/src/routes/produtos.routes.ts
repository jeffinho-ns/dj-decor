import { Router } from "express";
import { Role } from "@prisma/client";
import { produtosController } from "../controllers/produtos.controller";
import { auth, requireRoles } from "../middlewares/auth";

const produtosRoutes = Router();

produtosRoutes.use(auth);

produtosRoutes.get(
  "/",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.VENDEDOR),
  (req, res, next) => produtosController.list(req, res, next)
);

produtosRoutes.get(
  "/:id",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.VENDEDOR),
  (req, res, next) => produtosController.getById(req, res, next)
);

produtosRoutes.post(
  "/",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => produtosController.create(req, res, next)
);

produtosRoutes.patch(
  "/:id",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => produtosController.update(req, res, next)
);

produtosRoutes.post(
  "/:id/unidades",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => produtosController.addUnidade(req, res, next)
);

export { produtosRoutes };
