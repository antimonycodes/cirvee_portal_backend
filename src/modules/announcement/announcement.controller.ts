import { Response, NextFunction } from "express";
import { AnnouncementService } from "./announcement.service";
import { AuthRequest } from "../../types";
import { ResponseUtil } from "../../utils/response";
import logger from "../../utils/logger";

export class AnnouncementController {
  // GET ALL ANNOUNCEMENTS
  static async getAllAnnouncements(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await AnnouncementService.listAll(userId, userRole, page, limit);

      return ResponseUtil.paginated(
        res,
        "Announcements retrieved successfully",
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error: any) {
      logger.error("Get all announcements error:", error);
      return ResponseUtil.internalError(res, "Failed to fetch announcements");
    }
  }

  // GET ANNOUNCEMENT BY ID
  static async getAnnouncementById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;

      const announcement = await AnnouncementService.getById(id, userId, userRole);

      return ResponseUtil.success(res, "Announcement retrieved successfully", announcement);
    } catch (error: any) {
      logger.error("Get announcement by ID error:", error);

      if (error.message.includes("access")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to fetch announcement");
    }
  }

  // CREATE ANNOUNCEMENT
  static async createAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { title, content, isGlobal, cohortIds } = req.body;

      const announcement = await AnnouncementService.createAnnouncement(
        userId,
        userRole,
        { title, content, isGlobal, cohortIds }
      );

      return ResponseUtil.created(res, "Announcement created successfully", announcement);
    } catch (error: any) {
      logger.error("Create announcement error:", error);

      if (error.message.includes("Only admins")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (
        error.message.includes("characters") ||
        error.message.includes("must specify") ||
        error.message.includes("invalid")
      ) {
        return ResponseUtil.badRequest(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to create announcement");
    }
  }

  // UPDATE ANNOUNCEMENT
  static async updateAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;
      const { title, content, isGlobal, cohortIds } = req.body;

      const announcement = await AnnouncementService.updateAnnouncement(
        id,
        userId,
        userRole,
        { title, content, isGlobal, cohortIds }
      );

      return ResponseUtil.success(res, "Announcement updated successfully", announcement);
    } catch (error: any) {
      logger.error("Update announcement error:", error);

      if (error.message.includes("Only") || error.message.includes("creator")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (
        error.message.includes("characters") ||
        error.message.includes("must specify") ||
        error.message.includes("invalid")
      ) {
        return ResponseUtil.badRequest(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to update announcement");
    }
  }

  // DELETE ANNOUNCEMENT
  static async deleteAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;

      const result = await AnnouncementService.deleteAnnouncement(id, userId, userRole);

      return ResponseUtil.success(res, result.message, result.deletedData);
    } catch (error: any) {
      logger.error("Delete announcement error:", error);

      if (error.message.includes("Only") || error.message.includes("creator")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to delete announcement");
    }
  }

  // TOGGLE LIKE
  static async toggleLike(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;

      const result = await AnnouncementService.toggleLike(id, userId, userRole);

      return ResponseUtil.success(
        res,
        result.liked ? "Announcement liked" : "Announcement unliked",
        result
      );
    } catch (error: any) {
      logger.error("Toggle like error:", error);

      if (error.message.includes("access")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to toggle like");
    }
  }
}