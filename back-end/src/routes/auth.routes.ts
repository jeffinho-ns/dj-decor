import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { auth } from "../middlewares/auth";

const authRoutes = Router();

authRoutes.post("/login", (req, res, next) => authController.login(req, res, next));
authRoutes.get("/me", auth, (req, res) => authController.me(req, res));
authRoutes.patch("/perfil", auth, (req, res, next) =>
  authController.updateProfile(req, res, next)
);
authRoutes.post("/logout", (req, res) => authController.logout(req, res));

export { authRoutes };
