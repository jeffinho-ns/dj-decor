import { Router } from "express";
import { webhooksController } from "../controllers/webhooks.controller";
import { metaWebhooksController } from "../controllers/meta-webhooks.controller";

const webhooksRoutes = Router();

webhooksRoutes.post("/atendimento-ia", (req, res, next) =>
  webhooksController.atendimentoIa(req, res, next)
);

webhooksRoutes.get("/meta", (req, res) => metaWebhooksController.verify(req, res));
webhooksRoutes.post("/meta", (req, res, next) =>
  metaWebhooksController.inbound(req, res, next)
);

export { webhooksRoutes };
