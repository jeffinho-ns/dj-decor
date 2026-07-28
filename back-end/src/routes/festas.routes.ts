import { Router } from "express";
import { Role } from "@prisma/client";
import { descontosController } from "../controllers/descontos.controller";
import { festasController } from "../controllers/festas.controller";
import { auth, requireRoles } from "../middlewares/auth";

const festasRoutes = Router();

festasRoutes.use(auth);

festasRoutes.get(
  "/descontos/pendentes",
  requireRoles(Role.GERENTE, Role.ADMIN),
  (req, res, next) => descontosController.listPendentes(req, res, next)
);
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
  "/:id/desconto/aprovar",
  requireRoles(Role.GERENTE, Role.ADMIN),
  (req, res, next) => descontosController.aprovar(req, res, next)
);
festasRoutes.post(
  "/:id/desconto/recusar",
  requireRoles(Role.GERENTE, Role.ADMIN),
  (req, res, next) => descontosController.recusar(req, res, next)
);
festasRoutes.post(
  "/:id/desconto",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => descontosController.solicitar(req, res, next)
);
festasRoutes.patch(
  "/:id/checklist",
  requireRoles(Role.MONTADOR, Role.GERENTE, Role.ADMIN, Role.VENDEDOR),
  (req, res, next) => festasController.updateChecklist(req, res, next)
);
festasRoutes.patch(
  "/:id/status",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => festasController.updateStatus(req, res, next)
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
