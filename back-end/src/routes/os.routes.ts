import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { Role } from "@prisma/client";
import { osController } from "../controllers/os.controller";
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

const osRoutes = Router();

const montagemRoles = [Role.ADMIN, Role.GERENTE, Role.MONTADOR] as const;

osRoutes.use(auth);

osRoutes.get(
  "/today/rota",
  requireRoles(...montagemRoles),
  (req, res, next) => osController.listTodayRota(req, res, next)
);

osRoutes.get(
  "/today",
  requireRoles(...montagemRoles),
  (req, res, next) => osController.listToday(req, res, next)
);

osRoutes.get(
  "/mine",
  requireRoles(Role.MONTADOR),
  (req, res, next) => osController.listMine(req, res, next)
);

osRoutes.patch(
  "/:id/montador",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => osController.assignMontador(req, res, next)
);

osRoutes.get(
  "/:id",
  requireRoles(...montagemRoles),
  (req, res, next) => osController.getById(req, res, next)
);

osRoutes.post(
  "/:id/romaneio/itens",
  requireRoles(...montagemRoles),
  (req, res, next) => osController.addRomaneioItem(req, res, next)
);

osRoutes.patch(
  "/:id/romaneio/itens/:itemId",
  requireRoles(...montagemRoles),
  (req, res, next) => osController.updateRomaneioItem(req, res, next)
);

osRoutes.post(
  "/:id/romaneio/itens/:itemId/foto",
  requireRoles(...montagemRoles),
  handleMulter,
  (req, res, next) => osController.uploadItemFoto(req, res, next)
);

osRoutes.post(
  "/:id/romaneio/concluir",
  requireRoles(...montagemRoles),
  (req, res, next) => osController.concluirRomaneio(req, res, next)
);

osRoutes.post(
  "/:id/romaneio/seed",
  requireRoles(Role.ADMIN, Role.GERENTE, Role.MONTADOR),
  (req, res, next) => osController.seedRomaneio(req, res, next)
);

osRoutes.post(
  "/:id/checkin",
  requireRoles(Role.MONTADOR, Role.GERENTE, Role.ADMIN),
  (req, res, next) => osController.checkin(req, res, next)
);

osRoutes.post(
  "/:id/foto-final",
  requireRoles(Role.MONTADOR, Role.GERENTE, Role.ADMIN),
  handleMulter,
  (req, res, next) => osController.fotoFinal(req, res, next)
);

export { osRoutes };
