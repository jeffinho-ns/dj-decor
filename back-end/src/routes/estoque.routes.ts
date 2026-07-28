import { Router } from "express";
import { Role } from "@prisma/client";
import { estoqueController } from "../controllers/estoque.controller";
import { auth, requireRoles } from "../middlewares/auth";

const estoqueRoutes = Router();

estoqueRoutes.use(auth);

estoqueRoutes.get(
  "/disponibilidade",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.VENDEDOR),
  (req, res, next) => estoqueController.disponibilidade(req, res, next)
);

estoqueRoutes.post(
  "/reservar",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.VENDEDOR),
  (req, res, next) => estoqueController.reservar(req, res, next)
);

estoqueRoutes.delete(
  "/reservas/:id",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => estoqueController.liberar(req, res, next)
);

estoqueRoutes.get(
  "/festas/:festaId",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.VENDEDOR),
  (req, res, next) => estoqueController.listByFesta(req, res, next)
);

export { estoqueRoutes };
