import { Router } from "express";
import { Role } from "@prisma/client";
import { bolasController } from "../controllers/bolas.controller";
import { auth, requireRoles } from "../middlewares/auth";

const bolasRoutes = Router();

bolasRoutes.use(auth);

bolasRoutes.get(
  "/markup",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN, Role.BOLISTA),
  (req, res, next) => bolasController.markup(req, res, next)
);

bolasRoutes.get(
  "/catalogo",
  requireRoles(Role.VENDEDOR, Role.GERENTE, Role.ADMIN, Role.BOLISTA),
  (req, res, next) => bolasController.listCatalogo(req, res, next)
);

bolasRoutes.put(
  "/catalogo",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.upsertCatalogo(req, res, next)
);

bolasRoutes.patch(
  "/catalogo/:id/ativo",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.setCatalogoAtivo(req, res, next)
);

bolasRoutes.get(
  "/pedidos",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.listPedidos(req, res, next)
);

bolasRoutes.get(
  "/pedidos/:id",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.getPedido(req, res, next)
);

bolasRoutes.post(
  "/pedidos",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.createPedido(req, res, next)
);

bolasRoutes.patch(
  "/pedidos/:id",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.updatePedido(req, res, next)
);

bolasRoutes.post(
  "/pedidos/:id/repasse",
  requireRoles(Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.marcarRepasse(req, res, next)
);

bolasRoutes.get(
  "/financeiro",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.financeiro(req, res, next)
);

bolasRoutes.get(
  "/compras",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.listaCompras(req, res, next)
);

bolasRoutes.post(
  "/pedidos/:id/compras",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.addCompra(req, res, next)
);

bolasRoutes.patch(
  "/compras/:id",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.setCompraComprado(req, res, next)
);

bolasRoutes.delete(
  "/compras/:id",
  requireRoles(Role.BOLISTA, Role.ADMIN, Role.GERENTE),
  (req, res, next) => bolasController.removeCompra(req, res, next)
);

export { bolasRoutes };
