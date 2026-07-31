import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { catalogoRoutes } from "./catalogo.routes";
import { comissoesRoutes } from "./comissoes.routes";
import { configuracoesRoutes } from "./configuracoes.routes";
import { contratosRoutes } from "./contratos.routes";
import { equipeRoutes } from "./equipe.routes";
import { estoqueRoutes } from "./estoque.routes";
import { festasRoutes } from "./festas.routes";
import { financeiroRoutes } from "./financeiro.routes";
import { midiasRoutes } from "./midias.routes";
import { osRoutes } from "./os.routes";
import { pagamentosRoutes } from "./pagamentos.routes";
import { portalRoutes } from "./portal.routes";
import { produtosRoutes } from "./produtos.routes";
import { qrRoutes } from "./qr.routes";
import { usersRoutes } from "./users.routes";
import { webhooksRoutes } from "./webhooks.routes";
import { whatsappRoutes } from "./whatsapp.routes";

const routes = Router();

routes.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "dj-decor-api",
    version: "1.2.0",
    routes: [
      "festas",
      "comissoes",
      "financeiro",
      "estoque",
      "equipe",
      "os",
      "users",
      "configuracoes",
      "catalogo",
    ],
  });
});

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);
routes.use("/configuracoes", configuracoesRoutes);
routes.use("/catalogo", catalogoRoutes);
routes.use("/festas", festasRoutes);
routes.use("/financeiro", financeiroRoutes);
routes.use("/comissoes", comissoesRoutes);
routes.use("/produtos", produtosRoutes);
routes.use("/equipe", equipeRoutes);
routes.use("/estoque", estoqueRoutes);
routes.use("/midias", midiasRoutes);
routes.use("/os", osRoutes);
routes.use("/portal", portalRoutes);
routes.use("/qr", qrRoutes);
routes.use(pagamentosRoutes);
routes.use(contratosRoutes);
routes.use("/whatsapp", whatsappRoutes);
routes.use("/webhooks", webhooksRoutes);

export { routes };
