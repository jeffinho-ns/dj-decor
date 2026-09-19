import { Router } from "express";

import { pushController } from "../controllers/push.controller";
import { auth } from "../middlewares/auth";

const pushRoutes = Router();

pushRoutes.use(auth);

pushRoutes.get("/chave-publica", (req, res) =>
  pushController.chavePublica(req, res)
);
pushRoutes.get("/inscricoes", (req, res, next) =>
  pushController.listar(req, res, next)
);
pushRoutes.post("/inscrever", (req, res, next) =>
  pushController.inscrever(req, res, next)
);
pushRoutes.post("/cancelar", (req, res, next) =>
  pushController.cancelar(req, res, next)
);
pushRoutes.post("/teste", (req, res, next) =>
  pushController.teste(req, res, next)
);

export { pushRoutes };
