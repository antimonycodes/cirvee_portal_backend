import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { UserRole } from "@prisma/client";
import { ResponseUtil } from "../utils/response";

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      ResponseUtil.unauthorized(res, "User not authenticated");
      return; 
    }

    //  SUPER_ADMIN  access 
    if (req.user.role === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    if (!roles.includes(req.user.role)) {
      ResponseUtil.forbidden(res, "Not sufficient permissions");
      return;
    }

    next();
  };
};
