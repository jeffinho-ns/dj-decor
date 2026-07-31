import { Router } from "express";
import {
  portalController,
  portalUpload,
} from "../controllers/portal.controller";

const portalRoutes = Router();

/** Compatibilidade com links antigos /portal?id=festaId */
portalRoutes.get("/legacy/:festaId/link", (req, res, next) =>
  portalController.resolveLegacy(req, res, next)
);

portalRoutes.get("/:token/status", (req, res, next) =>
  portalController.getStatus(req, res, next)
);
portalRoutes.get("/:token/midias/:midiaId", (req, res, next) =>
  portalController.getMidia(req, res, next)
);
portalRoutes.post("/:token/midias", portalUpload, (req, res, next) =>
  portalController.uploadMidia(req, res, next)
);
portalRoutes.post("/:token/assinar", portalUpload, (req, res, next) =>
  portalController.assinar(req, res, next)
);
portalRoutes.post("/:token/avaliar", (req, res, next) =>
  portalController.avaliar(req, res, next)
);

export { portalRoutes };
