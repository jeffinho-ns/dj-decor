import { Router } from "express";
import { Role } from "@prisma/client";
import { financeiroController } from "../controllers/financeiro.controller";
import { auth, requireRoles } from "../middlewares/auth";

const financeiroRoutes = Router();

financeiroRoutes.use(auth);

financeiroRoutes.get(
  "/resumo",
  requireRoles(Role.ADMIN),
  (req, res, next) => financeiroController.resumo(req, res, next)
);

financeiroRoutes.get(
  "/previsao",
  requireRoles(Role.ADMIN),
  (req, res, next) => financeiroController.previsao(req, res, next)
);

export { financeiroRoutes };
