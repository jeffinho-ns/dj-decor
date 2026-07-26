import { Router } from "express";
import { webhooksController } from "../controllers/webhooks.controller";

const webhooksRoutes = Router();

webhooksRoutes.post("/atendimento-ia", (req, res) =>
  webhooksController.atendimentoIa(req, res)
);

export { webhooksRoutes };
