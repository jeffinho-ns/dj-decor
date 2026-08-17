import { Router } from "express";
import { Role } from "@prisma/client";
import { atendimentoController } from "../controllers/atendimento.controller";
import { auth, requireRoles } from "../middlewares/auth";

const atendimentoRoutes = Router();

const ROLES = [Role.VENDEDOR, Role.GERENTE, Role.ADMIN] as const;

atendimentoRoutes.use(auth);

atendimentoRoutes.get("/", requireRoles(...ROLES), (req, res, next) =>
  atendimentoController.list(req, res, next)
);

atendimentoRoutes.get("/metricas", requireRoles(...ROLES), (req, res, next) =>
  atendimentoController.metricas(req, res, next)
);

atendimentoRoutes.get(
  "/vendedores",
  requireRoles(...ROLES),
  (req, res, next) => atendimentoController.vendedores(req, res, next)
);

atendimentoRoutes.post(
  "/simular-inbound",
  requireRoles(...ROLES),
  (req, res, next) => atendimentoController.simularInbound(req, res, next)
);

atendimentoRoutes.post("/", requireRoles(...ROLES), (req, res, next) =>
  atendimentoController.createManual(req, res, next)
);

atendimentoRoutes.get("/:id", requireRoles(...ROLES), (req, res, next) =>
  atendimentoController.getById(req, res, next)
);

atendimentoRoutes.post(
  "/:id/mensagens",
  requireRoles(...ROLES),
  (req, res, next) => atendimentoController.reply(req, res, next)
);

atendimentoRoutes.post(
  "/:id/takeover",
  requireRoles(...ROLES),
  (req, res, next) => atendimentoController.takeover(req, res, next)
);

atendimentoRoutes.post(
  "/:id/devolver-ia",
  requireRoles(...ROLES),
  (req, res, next) => atendimentoController.devolverIa(req, res, next)
);

atendimentoRoutes.post(
  "/:id/atribuir",
  requireRoles(...ROLES),
  (req, res, next) => atendimentoController.assign(req, res, next)
);

atendimentoRoutes.post(
  "/:id/fechar",
  requireRoles(...ROLES),
  (req, res, next) => atendimentoController.fechar(req, res, next)
);

atendimentoRoutes.post(
  "/:id/vincular-festa",
  requireRoles(...ROLES),
  (req, res, next) => atendimentoController.vincularFesta(req, res, next)
);

export { atendimentoRoutes };
