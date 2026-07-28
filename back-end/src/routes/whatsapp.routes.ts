import { Router } from "express";
import { Role } from "@prisma/client";
import { whatsappController } from "../controllers/whatsapp.controller";
import { auth, requireRoles } from "../middlewares/auth";

const whatsappRoutes = Router();

whatsappRoutes.use(auth);

whatsappRoutes.get(
  "/mensagens",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.VENDEDOR),
  (req, res, next) => whatsappController.listMensagens(req, res, next)
);

export { whatsappRoutes };
