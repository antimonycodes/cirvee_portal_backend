import { Response, NextFunction } from "express";
import { AuthRequest } from "../../types";
import { AdminService } from "./admin.service";
import { ResponseUtil } from "../../utils/response";
import logger from "../../utils/logger";

export class AdminController {
  static async createAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await AdminService.createAdmin(req.body);
      return ResponseUtil.created(res, "Admin created successfully", result);
    } catch (error: any) {
      logger.error("Create admin error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async createTutor(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await AdminService.createTutor(req.body);
      return ResponseUtil.created(res, "Tutor created successfully", result);
    } catch (error: any) {
      logger.error("Create tutor error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async getAllAdmins(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await AdminService.getAllAdmins(page, limit);
      return ResponseUtil.paginated(
        res,
        "Admins fetched successfully",
        result.admins,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error: any) {
      logger.error("Get admins error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async getAllTutors(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await AdminService.getAllTutors(page, limit);
      return ResponseUtil.paginated(
        res,
        "Tutors fetched successfully",
        result.tutors,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error: any) {
      logger.error("Get tutors error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async deactivateUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = req.params;
      const result = await AdminService.deactivateUser(userId);
      return ResponseUtil.success(res, result.message);
    } catch (error: any) {
      logger.error("Deactivate user error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async activateUser(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = req.params;
      const result = await AdminService.activateUser(userId);
      return ResponseUtil.success(res, result.message);
    } catch (error: any) {  
      logger.error("Activate user error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }
}
