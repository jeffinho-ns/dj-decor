import type { NextFunction, Request, Response } from "express";
import {
  portalService,
  PortalFestaNotFoundError,
} from "../services/portal.service";

export class PortalController {
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await portalService.getFestaStatus(
        req.params.festaId as string
      );
      res.status(200).json(status);
    } catch (error) {
      if (error instanceof PortalFestaNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const portalController = new PortalController();
