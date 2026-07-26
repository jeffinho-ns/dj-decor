import { Router } from "express";
import { Role } from "@prisma/client";
import { festasController } from "../controllers/festas.controller";
import { auth, requireRoles } from "../middlewares/auth";

const festasRoutes = Router();

festasRoutes.use(auth);

festasRoutes.get(
  "/",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN, Role.MONTADOR),
  (req, res, next) => festasController.list(req, res, next)
);
festasRoutes.get(
  "/:id",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN, Role.MONTADOR),
  (req, res, next) => festasController.getById(req, res, next)
);
festasRoutes.post(
  "/",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => festasController.create(req, res, next)
);
festasRoutes.put(
  "/:id",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => festasController.update(req, res, next)
);
festasRoutes.delete(
  "/:id",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => festasController.remove(req, res, next)
);

export { festasRoutes };
