import { Router } from "express";
import { Role } from "@prisma/client";
import { pagamentosController } from "../controllers/pagamentos.controller";
import { auth, requireRoles } from "../middlewares/auth";

/**
 * Este router é montado na raiz (sem prefixo) em routes/index.ts, pois expõe
 * endpoints com dois formatos de path: `/festas/:id/pagamentos` (aninhado em
 * festa) e `/pagamentos/:id/confirmar` (recurso próprio).
 */
const pagamentosRoutes = Router();

pagamentosRoutes.use(auth);

pagamentosRoutes.post(
  "/festas/:id/pagamentos",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => pagamentosController.create(req, res, next)
);

pagamentosRoutes.get(
  "/festas/:id/pagamentos",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => pagamentosController.listByFesta(req, res, next)
);

pagamentosRoutes.patch(
  "/pagamentos/:id/confirmar",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => pagamentosController.confirmar(req, res, next)
);

export { pagamentosRoutes };
