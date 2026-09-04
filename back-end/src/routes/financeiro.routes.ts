import { Router } from "express";
import { Role } from "@prisma/client";
import { financeiroController } from "../controllers/financeiro.controller";
import { auth, requireRoles } from "../middlewares/auth";

const financeiroRoutes = Router();

financeiroRoutes.use(auth);

financeiroRoutes.get(
  "/resumo",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => financeiroController.resumo(req, res, next)
);

financeiroRoutes.get(
  "/previsao",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => financeiroController.previsao(req, res, next)
);

financeiroRoutes.get(
  "/equipe-diarias",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => financeiroController.equipeDiarias(req, res, next)
);

financeiroRoutes.post(
  "/equipe-diarias/pagar",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => financeiroController.pagarEquipeDiarias(req, res, next)
);

financeiroRoutes.patch(
  "/equipe-diarias/frequencia",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => financeiroController.frequenciaEquipe(req, res, next)
);

financeiroRoutes.get(
  "/colaboradores",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => financeiroController.listColaboradores(req, res, next)
);

financeiroRoutes.get(
  "/colaboradores/:id",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => financeiroController.getColaborador(req, res, next)
);

export { financeiroRoutes };
