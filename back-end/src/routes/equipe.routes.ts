import { Router } from "express";
import { Role } from "@prisma/client";
import { equipeController } from "../controllers/equipe.controller";
import { auth, requireRoles } from "../middlewares/auth";

const equipeRoutes = Router();

const gestaoRoles = [Role.ADMIN, Role.GERENTE] as const;

equipeRoutes.use(auth);

equipeRoutes.get(
  "/montadores",
  requireRoles(...gestaoRoles),
  (req, res, next) => equipeController.listMontadores(req, res, next)
);

equipeRoutes.get(
  "/agenda",
  requireRoles(...gestaoRoles),
  (req, res, next) => equipeController.listAgenda(req, res, next)
);

export { equipeRoutes };
