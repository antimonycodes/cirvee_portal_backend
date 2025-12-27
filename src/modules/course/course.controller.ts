import { Response, NextFunction } from "express";
import { CourseService } from "./course.service";
import { AuthRequest } from "../../types";
import { ResponseUtil } from "../../utils/response";
import logger from "../../utils/logger";

export class CourseController {
  // CREATE COURSE
  static async createCourse(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const {
        title,
        description,
        syllabus,
        coverImage,
        category,
        price,
        duration,
      } = req.body;

      const createdById = req.user!.admin?.id;
      if (!createdById) {
        return ResponseUtil.forbidden(res, "Only admins can create courses");
      }

      const course = await CourseService.createCourse({
        title,
        description,
        syllabus,
        coverImage,
        category,
        price: parseFloat(price),
        duration: parseInt(duration),
        createdById,
      });

      return ResponseUtil.created(res, "Course created successfully", course);
    } catch (error: any) {
      logger.error("Create course error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // UPDATE COURSE
  static async updateCourse(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        syllabus,
        coverImage,
        category,
        price,
        duration,
      } = req.body;

      const course = await CourseService.updateCourse(id, {
        title,
        description,
        syllabus,
        coverImage,
        category,
        price: price ? parseFloat(price) : undefined,
        duration: duration ? parseInt(duration) : undefined,
      });

      return ResponseUtil.success(res, "Course updated successfully", course);
    } catch (error: any) {
      logger.error("Update course error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // ACTIVATE COURSE
  static async activateCourse(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const result = await CourseService.activateCourse(id);
      return ResponseUtil.success(res, "Course activated successfully", result.course);
    } catch (error: any) {
      logger.error("Activate course error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // DEACTIVATE COURSE
  static async deactivateCourse(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const result = await CourseService.deactivateCourse(id);
      return ResponseUtil.success(res, "Course deactivated successfully", result.course);
    } catch (error: any) {
      logger.error("Deactivate course error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // GET ALL COURSES
  static async getAllCourses(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const isActive = req.query.isActive
        ? req.query.isActive === "true"
        : undefined;
      const category = req.query.category as string;

      const result = await CourseService.getAllCourses(page, limit, {
        isActive,
        category,
      });

      return ResponseUtil.success(res, "Courses retrieved successfully", result);
    } catch (error: any) {
      logger.error("Get all courses error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // GET PUBLIC COURSES
  static async getPublicCourses(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const category = req.query.category as string;

      const result = await CourseService.getPublicCourses(
        page,
        limit,
        category
      );

      return ResponseUtil.success(res, "Courses retrieved successfully", result);
    } catch (error: any) {
      logger.error("Get public courses error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  // GET COURSE BY ID
  static async getCourseById(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const course = await CourseService.getCourseById(id);
      return ResponseUtil.success(res, "Course retrieved successfully", course);
    } catch (error: any) {
      logger.error("Get course by ID error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

    // GET COHORTS BY COURSE
    static async getCohortsByCourse(
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ) {
      try {
        const { courseId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
  
        const result = await CourseService.getCohortsByCourse(
          courseId,
          page,
          limit
        );
  
        return ResponseUtil.success(res, "Cohorts retrieved successfully", result);
      } catch (error: any) {
        logger.error("Get cohorts by course error:", error);
        return ResponseUtil.badRequest(res, error.message);
      }
    }
  
}
