import { Router } from "express";
import { Role } from "@prisma/client";
import { usersController } from "../controllers/users.controller";
import { auth, requireRoles } from "../middlewares/auth";

const usersRoutes = Router();

usersRoutes.use(auth);

usersRoutes.get(
  "/",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => usersController.list(req, res, next)
);

usersRoutes.post("/", requireRoles(Role.ADMIN), (req, res, next) =>
  usersController.create(req, res, next)
);

usersRoutes.patch("/:id", requireRoles(Role.ADMIN), (req, res, next) =>
  usersController.update(req, res, next)
);

export { usersRoutes };
