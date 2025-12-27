import { Response, NextFunction } from "express";
import { TimetableService } from "./timetable.service";
import { AuthRequest } from "../../types";
import { ResponseUtil } from "../../utils/response";
import logger from "../../utils/logger";

export class TimetableController {
  // CREATE TIMETABLE 
  static async createTimetable(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { cohortId, dayOfWeek, startTime, endTime } = req.body;

      const timetable = await TimetableService.createTimetable({
        cohortId,
        dayOfWeek,
        startTime,
        endTime,
      });

      return ResponseUtil.created(res, "Timetable created successfully", timetable);
    } catch (error: any) {
      logger.error("Create timetable error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // UPDATE TIMETABLE 
  static async updateTimetable(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { dayOfWeek, startTime, endTime } = req.body;

      const timetable = await TimetableService.updateTimetable(id, {
        dayOfWeek,
        startTime,
        endTime,
      });

      return ResponseUtil.success(res, "Timetable updated successfully", timetable);
    } catch (error: any) {
      logger.error("Update timetable error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // DELETE TIMETABLE 
  static async deleteTimetable(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      const result = await TimetableService.deleteTimetable(id);

      return ResponseUtil.success(res, result.message);
    } catch (error: any) {
      logger.error("Delete timetable error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // GET WEEKLY TIMETABLE (Students & Tutors - Dynamic)
  static async getWeeklyTimetable(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { cohortId } = req.params;

      const result = await TimetableService.getWeeklyTimetable(cohortId);

      return ResponseUtil.success(res, "Weekly timetable retrieved successfully", result);
    } catch (error: any) {
      logger.error("Get weekly timetable error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // GET ALL TIMETABLES FOR COHORT (Admin view)
  static async getAllTimetablesForCohort(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { cohortId } = req.params;

      const result = await TimetableService.getAllTimetablesForCohort(cohortId);

      return ResponseUtil.success(res, "Timetables retrieved successfully", result);
    } catch (error: any) {
      logger.error("Get all timetables error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }
}