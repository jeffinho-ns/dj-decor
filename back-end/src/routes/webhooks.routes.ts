import { Router } from "express";
import { webhooksController } from "../controllers/webhooks.controller";

const webhooksRoutes = Router();

webhooksRoutes.post("/atendimento-ia", (req, res, next) =>
  webhooksController.atendimentoIa(req, res, next)
);

export { webhooksRoutes };
