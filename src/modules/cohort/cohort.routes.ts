import { Router } from "express";
import { CohortController } from "./cohort.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/permission.middleware";
import { UserRole } from "@prisma/client";
import { validateRequest } from "../../middleware/validation.middleware";
import { body, param } from "express-validator";
import { TimetableController } from "./timetable.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Cohorts
 *     description: Cohort management endpoints
 */

/**
 * @swagger
 * /api/v1/cohorts:
 *   post:
 *     summary: Create a new cohort (ADMIN and above)
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - tutorId
 *               - name
 *               - startDate
 *               - endDate
 *             properties:
 *               courseId:
 *                 type: string
 *               tutorId:
 *                 type: string
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Cohort created successfully
 */
router.post(
  "/",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [
    body("courseId").isUUID().withMessage("Valid course ID is required"),
    body("tutorId").isUUID().withMessage("Valid tutor ID is required"),
    body("name").trim().notEmpty().withMessage("Cohort name is required"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate").isISO8601().withMessage("Valid end date is required"),
  ],
  validateRequest,
  CohortController.createCohort as any
);

/**
 * @swagger
 * /api/v1/cohorts/{id}/assign-tutor:
 *   patch:
 *     summary: Assign tutor to cohort (ADMIN and above)
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tutorId
 *             properties:
 *               tutorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tutor assigned successfully
 */
router.patch(
  "/:id/assign-tutor",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [
    param("id").isUUID().withMessage("Invalid cohort ID"),
    body("tutorId").isUUID().withMessage("Valid tutor ID is required"),
  ],
  validateRequest,
  CohortController.assignTutor as any
);

/**
 * @swagger
 * /api/v1/cohorts/{id}/students:
 *   get:
 *     summary: Get students in a cohort (ADMIN and above)
 *     tags: [Cohorts]
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
 *         description: Cohort students list
 */
router.get(
  "/:id/students",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [param("id").isUUID().withMessage("Invalid cohort ID")],
  validateRequest,
  CohortController.getCohortStudents as any
);

/**
 * @swagger
 * /api/v1/cohorts/{id}:
 *   get:
 *     summary: Get cohort by ID
 *     tags: [Cohorts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cohort details
 */
router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid cohort ID")],
  validateRequest,
  CohortController.getCohortById as any
);

/**
 * @swagger
 * /api/v1/cohorts:
 *   get:
 *     summary: Get all cohorts (ADMIN and above)
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UPCOMING, ONGOING, COMPLETED]
 *       - in: query
 *         name: tutorId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cohorts list
 */
router.get(
  "/",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  CohortController.getAllCohorts as any
);

/**
 * @swagger
 * /api/v1/cohorts/timetables:
 *   post:
 *     summary: Create timetable entry for a cohort
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cohortId
 *               - dayOfWeek
 *               - startTime
 *               - endTime
 *             properties:
 *               cohortId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the cohort
 *               dayOfWeek:
 *                 type: string
 *                 enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                 description: Day of the week
 *               startTime:
 *                 type: string
 *                 pattern: '^([01]\d|2[0-3]):([0-5]\d)$'
 *                 example: "09:00"
 *                 description: Start time in HH:mm format (24-hour)
 *               endTime:
 *                 type: string
 *                 pattern: '^([01]\d|2[0-3]):([0-5]\d)$'
 *                 example: "17:00"
 *                 description: End time in HH:mm format (24-hour)
 *     responses:
 *       201:
 *         description: Timetable created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post(
  "/timetables",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [
    body("cohortId").isUUID().withMessage("Valid cohort ID is required"),
    body("dayOfWeek").isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
      .withMessage("Valid day of week is required"),
    body("startTime").matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage("Start time must be in HH:mm format"),
    body("endTime").matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage("End time must be in HH:mm format"),
  ],
  validateRequest,
  TimetableController.createTimetable as any
);

/**
 * @swagger
 * /api/v1/cohorts/timetables/{id}:
 *   patch:
 *     summary: Update timetable entry
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Timetable entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dayOfWeek:
 *                 type: string
 *                 enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                 description: Day of the week
 *               startTime:
 *                 type: string
 *                 pattern: '^([01]\d|2[0-3]):([0-5]\d)$'
 *                 example: "09:00"
 *                 description: Start time in HH:mm format (24-hour)
 *               endTime:
 *                 type: string
 *                 pattern: '^([01]\d|2[0-3]):([0-5]\d)$'
 *                 example: "17:00"
 *                 description: End time in HH:mm format (24-hour)
 *     responses:
 *       200:
 *         description: Timetable updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Timetable not found
 */
router.patch(
  "/timetables/:id",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [
    param("id").isUUID().withMessage("Invalid timetable ID"),
    body("dayOfWeek").optional().isIn(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
      .withMessage("Valid day of week is required"),
    body("startTime").optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage("Start time must be in HH:mm format"),
    body("endTime").optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage("End time must be in HH:mm format"),
  ],
  validateRequest,
  TimetableController.updateTimetable as any
);

/**
 * @swagger
 * /api/v1/cohorts/timetables/{id}:
 *   delete:
 *     summary: Delete timetable entry
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Timetable entry ID
 *     responses:
 *       200:
 *         description: Timetable deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Timetable not found
 */
router.delete(
  "/timetables/:id",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [
    param("id").isUUID().withMessage("Invalid timetable ID"),
  ],
  validateRequest,
  TimetableController.deleteTimetable as any
);

/**
 * @swagger
 * /api/v1/cohorts/{cohortId}/timetable/weekly:
 *   get:
 *     summary: Get weekly timetable for a cohort (Students & Tutors)
 *     description: Returns the current week's timetable with sessions organized by day
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cohort ID
 *     responses:
 *       200:
 *         description: Weekly timetable retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cohortId:
 *                   type: string
 *                 cohortName:
 *                   type: string
 *                 weekStart:
 *                   type: string
 *                   format: date
 *                 weekEnd:
 *                   type: string
 *                   format: date
 *                 schedule:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         startTime:
 *                           type: string
 *                         endTime:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cohort not found
 */
router.get(
  "/:cohortId/timetable/weekly",
  authenticate as any,
  [
    param("cohortId").isUUID().withMessage("Invalid cohort ID"),
  ],
  validateRequest,
  TimetableController.getWeeklyTimetable as any
);

/**
 * @swagger
 * /api/v1/cohorts/{cohortId}/timetable/all:
 *   get:
 *     summary: Get all timetable entries for a cohort (Admin view)
 *     tags: [Timetables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Cohort ID
 *     responses:
 *       200:
 *         description: Timetables retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cohortId:
 *                   type: string
 *                 cohortName:
 *                   type: string
 *                 timetables:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       dayOfWeek:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                       endTime:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Cohort not found
 */
router.get(
  "/:cohortId/timetable/all",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) as any,
  [
    param("cohortId").isUUID().withMessage("Invalid cohort ID"),
  ],
  validateRequest,
  TimetableController.getAllTimetablesForCohort as any
);

export default router;