import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { estoqueRoutes } from "./estoque.routes";
import { festasRoutes } from "./festas.routes";
import { midiasRoutes } from "./midias.routes";
import { pagamentosRoutes } from "./pagamentos.routes";
import { produtosRoutes } from "./produtos.routes";
import { webhooksRoutes } from "./webhooks.routes";

const routes = Router();

routes.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "dj-decor-api" });
});

routes.use("/auth", authRoutes);
routes.use("/festas", festasRoutes);
routes.use("/produtos", produtosRoutes);
routes.use("/estoque", estoqueRoutes);
routes.use("/midias", midiasRoutes);
routes.use(pagamentosRoutes);
routes.use("/webhooks", webhooksRoutes);

export { routes };
