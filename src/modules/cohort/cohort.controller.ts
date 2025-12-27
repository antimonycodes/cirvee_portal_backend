import { Response, NextFunction } from "express";
import { CohortService } from "./cohort.service";
import { AuthRequest } from "../../types";
import { ResponseUtil } from "../../utils/response";
import logger from "../../utils/logger";

export class CohortController {
  // CREATE COHORT 
  static async createCohort(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { courseId, tutorId, name, startDate, endDate } = req.body;

      const createdById = (req.user as any)?.admin?.id;
      if (!createdById) {
        return ResponseUtil.forbidden(res, "Only admins can create cohorts");
      }

      const cohort = await CohortService.createCohort({
        courseId,
        tutorId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdById,
      });

      return ResponseUtil.created(res, "Cohort created successfully", cohort);
    } catch (error: any) {
      logger.error("Create cohort error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // ASSIGN TUTOR 
  static async assignTutor(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { tutorId } = req.body;

      const cohort = await CohortService.assignTutor(id, tutorId);

      return ResponseUtil.success(res, "Tutor assigned successfully", cohort);
    } catch (error: any) {
      logger.error("Assign tutor error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }


  // GET COHORT STUDENTS 
  static async getCohortStudents(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const result = await CohortService.getCohortStudents(id);
      return ResponseUtil.success(res, "Cohort students retrieved successfully", result);
    } catch (error: any) {
      logger.error("Get cohort students error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // GET COHORT BY ID 
  static async getCohortById(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const cohort = await CohortService.getCohortById(id);
      return ResponseUtil.success(res, "Cohort retrieved successfully", cohort);
    } catch (error: any) {
      logger.error("Get cohort by ID error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // GET ALL COHORTS 
  static async getAllCohorts(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as any;
      const tutorId = req.query.tutorId as string;

      const result = await CohortService.getAllCohorts(page, limit, {
        status,
        tutorId,
      });

      return ResponseUtil.success(res, "All cohorts retrieved successfully", result);
    } catch (error: any) {
      logger.error("Get all cohorts error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }
}
