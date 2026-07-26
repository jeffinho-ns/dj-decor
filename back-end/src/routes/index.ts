import { Router } from "express";
import { festasRoutes } from "./festas.routes";
import { webhooksRoutes } from "./webhooks.routes";

const routes = Router();

routes.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "dj-decor-api" });
});

routes.use("/festas", festasRoutes);
routes.use("/webhooks", webhooksRoutes);

export { routes };
