import { Router } from "express";
import { portalController } from "../controllers/portal.controller";

const portalRoutes = Router();

/** Portal do cliente — leitura pública (demo tokenless). */
portalRoutes.get("/:festaId/status", (req, res, next) =>
  portalController.getStatus(req, res, next)
);

export { portalRoutes };
