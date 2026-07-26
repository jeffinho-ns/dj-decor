import { Router } from "express";
import { Role } from "@prisma/client";
import { festasController } from "../controllers/festas.controller";
import { auth, requireRoles } from "../middlewares/auth";

const festasRoutes = Router();

festasRoutes.use(auth, requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN));

festasRoutes.get("/", (req, res, next) => festasController.list(req, res, next));
festasRoutes.get("/:id", (req, res, next) =>
  festasController.getById(req, res, next)
);
festasRoutes.post("/", (req, res, next) =>
  festasController.create(req, res, next)
);
festasRoutes.put("/:id", (req, res, next) =>
  festasController.update(req, res, next)
);
festasRoutes.delete("/:id", (req, res, next) =>
  festasController.remove(req, res, next)
);

export { festasRoutes };
