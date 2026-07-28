import { Router } from "express";
import { Role } from "@prisma/client";
import { qrController } from "../controllers/qr.controller";
import { auth, requireRoles } from "../middlewares/auth";

const qrRoutes = Router();

qrRoutes.use(auth);

qrRoutes.post(
  "/scan",
  requireRoles(Role.MONTADOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => qrController.scan(req, res, next)
);

export { qrRoutes };
