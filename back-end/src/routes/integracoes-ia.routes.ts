import { Router } from "express";
import { authIaService } from "../middlewares/auth-ia-service";
import { integracoesIaController } from "../controllers/integracoes-ia.controller";

/**
 * API server-to-server para o backend de atendimento IA (Jtl1ma/backend).
 * Prefixo: /api/integracoes/ia
 */
const integracoesIaRoutes = Router();

integracoesIaRoutes.use(authIaService);

integracoesIaRoutes.get("/catalogo", (req, res, next) =>
  integracoesIaController.catalogo(req, res, next)
);

integracoesIaRoutes.get("/agenda", (req, res, next) =>
  integracoesIaController.agenda(req, res, next)
);

integracoesIaRoutes.post("/orcamentos", (req, res, next) =>
  integracoesIaController.criarOrcamento(req, res, next)
);

integracoesIaRoutes.get("/festas", (req, res, next) =>
  integracoesIaController.festasPorTelefone(req, res, next)
);

integracoesIaRoutes.post("/mensagens/inbound", (req, res, next) =>
  integracoesIaController.syncInbound(req, res, next)
);

integracoesIaRoutes.post("/mensagens/outbound", (req, res, next) =>
  integracoesIaController.syncOutbound(req, res, next)
);

export { integracoesIaRoutes };
