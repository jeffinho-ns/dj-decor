import { Router } from "express";
import { Role } from "@prisma/client";
import { catalogoController } from "../controllers/catalogo.controller";
import { auth, requireRoles } from "../middlewares/auth";

const catalogoRoutes = Router();

catalogoRoutes.use(auth);

catalogoRoutes.get(
  "/",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => catalogoController.listPublico(req, res, next)
);

catalogoRoutes.get(
  "/kits",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => catalogoController.listKitsAdmin(req, res, next)
);

catalogoRoutes.get(
  "/addons",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => catalogoController.listAddonsAdmin(req, res, next)
);

catalogoRoutes.put(
  "/kits",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => catalogoController.upsertKit(req, res, next)
);

catalogoRoutes.put(
  "/addons",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => catalogoController.upsertAddon(req, res, next)
);

catalogoRoutes.patch(
  "/kits/:id/ativo",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => catalogoController.setKitAtivo(req, res, next)
);

catalogoRoutes.patch(
  "/addons/:id/ativo",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => catalogoController.setAddonAtivo(req, res, next)
);

export { catalogoRoutes };
