import { Router } from "express";
import { festasController } from "../controllers/festas.controller";
import { authVendedor } from "../middlewares/authVendedor";

const festasRoutes = Router();

festasRoutes.use(authVendedor);

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
