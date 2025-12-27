import { Router } from "express";
import { CourseController } from "./course.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/permission.middleware";
import { UserRole } from "@prisma/client";
import { validateRequest } from "../../middleware/validation.middleware";
import { body, param } from "express-validator";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management endpoints
 */

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create a new course (SUPER_ADMIN only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - syllabus
 *               - price
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               syllabus:
 *                 type: array
 *                 items:
 *                   type: string
 *               coverImage:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Course created successfully
 */
router.post(
  "/",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("syllabus").isArray().withMessage("Syllabus must be an array"),
    body("price").isNumeric().withMessage("Price must be a number"),
    body("duration").isInt({ min: 1 }).withMessage("Duration must be a positive integer"),
  ],
  validateRequest,
  CourseController.createCourse as any
);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Update a course (SUPER_ADMIN only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               syllabus:
 *                 type: array
 *                 items:
 *                   type: string
 *               coverImage:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Course updated successfully
 */
router.put(
  "/:id",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [param("id").isUUID().withMessage("Invalid course ID")],
  validateRequest,
  CourseController.updateCourse as any
);

/**
 * @swagger
 * /api/v1/courses/{id}/activate:
 *   patch:
 *     summary: Activate a course (SUPER_ADMIN only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course activated successfully
 */
router.patch(
  "/:id/activate",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [param("id").isUUID().withMessage("Invalid course ID")],
  validateRequest,
  CourseController.activateCourse as any
);

/**
 * @swagger
 * /api/v1/courses/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a course (SUPER_ADMIN only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deactivated successfully
 */
router.patch(
  "/:id/deactivate",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [param("id").isUUID().withMessage("Invalid course ID")],
  validateRequest,
  CourseController.deactivateCourse as any
);

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Get all courses (Public)
 *     tags: [Courses]
//  *     security:
//  *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Courses list
 */
router.get(
  "/",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TUTOR, UserRole.STUDENT) as any,
  CourseController.getAllCourses as any
);

/**
 * @swagger
 * /api/v1/courses/public:
 *   get:
 *     summary: Get public active courses (no auth required)
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public courses list
 */
router.get("/public", CourseController.getPublicCourses as any);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details
 */
router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid course ID")],
  validateRequest,
  CourseController.getCourseById as any
);


/**
 * @swagger
 * /api/v1/courses/{courseId}/cohorts:
 *   get:
 *     summary: Get all cohorts for a course
 *     tags: [Cohorts]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cohorts list
 */
router.get(
  "/:courseId/cohorts",
  [param("courseId").isUUID().withMessage("Invalid course ID")],
  validateRequest,
  CourseController.getCohortsByCourse as any
);



export default router;
