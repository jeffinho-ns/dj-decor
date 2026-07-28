import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { Role } from "@prisma/client";
import { midiasController } from "../controllers/midias.controller";
import { auth, requireRoles } from "../middlewares/auth";
import { MAX_MIDIA_BYTES } from "../services/midias.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MIDIA_BYTES },
});

function handleMulter(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ message: "Arquivo excede o limite de 2 MB" });
        return;
      }
      res.status(400).json({ message: err.message });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

const midiasRoutes = Router();

midiasRoutes.use(auth);

midiasRoutes.post(
  "/",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.VENDEDOR, Role.MONTADOR),
  handleMulter,
  (req, res, next) => midiasController.upload(req, res, next)
);

midiasRoutes.get(
  "/:id",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.VENDEDOR, Role.MONTADOR),
  (req, res, next) => midiasController.getById(req, res, next)
);

export { midiasRoutes };
