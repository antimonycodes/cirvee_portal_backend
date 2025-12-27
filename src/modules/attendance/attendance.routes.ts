import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/permission.middleware";
import { UserRole } from "@prisma/client";
import { validateRequest } from "../../middleware/validation.middleware";
import { body, param, query } from "express-validator";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Attendance
 *     description: Attendance tracking and QR code management
 */

/**
 * @swagger
 * /api/v1/attendance/scan:
 *   post:
 *     summary: Process QR code scan for check-in/check-out
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - type
 *             properties:
 *               token:
 *                 type: string
 *                 format: uuid
 *                 description: QR code token
 *               type:
 *                 type: string
 *                 enum: [CHECK_IN, CHECK_OUT]
 *                 description: Type of attendance action
 *     responses:
 *       200:
 *         description: Scan processed successfully
 *       400:
 *         description: Invalid request or inactive QR code
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/scan",
  authenticate as any,
  [
    body("token").notEmpty().withMessage("Token is required"),
    body("type").isIn(["CHECK_IN", "CHECK_OUT"]).withMessage("Type must be CHECK_IN or CHECK_OUT"),
  ],
  validateRequest,
  AttendanceController.processScan as any
);

/**
 * @swagger
 * /api/v1/attendance/my-logs:
 *   get:
 *     summary: Get current user's attendance logs
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/my-logs",
  authenticate as any,
  AttendanceController.getMyLogs as any
);

/**
 * @swagger
 * /api/v1/attendance/qr/generate:
 *   post:
 *     summary: Generate QR code for attendance tracking (Admin only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationName
 *             properties:
 *               locationName:
 *                 type: string
 *                 description: Name of the location for attendance
 *               cohortId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional cohort ID to associate with QR code
 *     responses:
 *       201:
 *         description: QR code generated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post(
  "/qr/generate",
  authenticate as any,
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN) as any,
  [
    body("locationName").notEmpty().withMessage("Location name is required"),
    body("cohortId").optional().isUUID().withMessage("Invalid cohort ID"),
  ],
  validateRequest,
  AttendanceController.generateQRCode as any
);

/**
 * @swagger
 * /api/v1/attendance/logs:
 *   get:
 *     summary: Get all attendance logs with filters (Admin/Tutor only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: cohortId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by cohort ID
 *       - in: query
 *         name: locationName
 *         schema:
 *           type: string
 *         description: Filter by location name
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *     responses:
 *       200:
 *         description: Attendance logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/logs",
  authenticate as any,
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TUTOR) as any,
  [
    query("userId").optional().isUUID().withMessage("Invalid user ID"),
    query("cohortId").optional().isUUID().withMessage("Invalid cohort ID"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
  ],
  validateRequest,
  AttendanceController.getAllLogs as any
);

/**
 * @swagger
 * /api/v1/attendance/cohort/{cohortId}/stats:
 *   get:
 *     summary: Get attendance statistics for a cohort (Admin/Tutor only)
 *     tags: [Attendance]
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
 *         description: Cohort statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cohortName:
 *                   type: string
 *                 attendancePercentage:
 *                   type: number
 *                 totalStudents:
 *                   type: number
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Cohort not found
 */
router.get(
  "/cohort/:cohortId/stats",
  authenticate as any,
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TUTOR) as any,
  [param("cohortId").isUUID().withMessage("Invalid cohort ID")],
  validateRequest,
  AttendanceController.getCohortStats as any
);

/**
 * @swagger
 * /api/v1/attendance/qr/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a QR code (Admin only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: QR code ID
 *     responses:
 *       200:
 *         description: QR code deactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: QR code not found
 */
router.patch(
  "/qr/:id/deactivate",
  authenticate as any,
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN) as any,
  [param("id").isUUID().withMessage("Invalid QR code ID")],
  validateRequest,
  AttendanceController.deactivateQRCode as any
);

export default router;