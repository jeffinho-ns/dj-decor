import { Router } from "express";
import { Role } from "@prisma/client";
import { clientesController } from "../controllers/clientes.controller";
import { auth, requireRoles } from "../middlewares/auth";

const clientesRoutes = Router();

const ROLES = [Role.VENDEDOR, Role.GERENTE, Role.ADMIN] as const;

clientesRoutes.use(auth);

clientesRoutes.get("/", requireRoles(...ROLES), (req, res, next) =>
  clientesController.list(req, res, next)
);

clientesRoutes.get("/buscar", requireRoles(...ROLES), (req, res, next) =>
  clientesController.buscarPorTelefone(req, res, next)
);

clientesRoutes.get("/:id", requireRoles(...ROLES), (req, res, next) =>
  clientesController.getById(req, res, next)
);

clientesRoutes.post("/", requireRoles(...ROLES), (req, res, next) =>
  clientesController.create(req, res, next)
);

clientesRoutes.patch("/:id", requireRoles(...ROLES), (req, res, next) =>
  clientesController.update(req, res, next)
);

export { clientesRoutes };
