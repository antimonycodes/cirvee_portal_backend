import { Router } from "express";
import { MaterialController } from "./material.controller";
import { AssignmentController } from "./assignment.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/permission.middleware";
import { UserRole } from "@prisma/client";
import { upload } from "../../middleware/upload.middleware";
import { validateRequest } from "../../middleware/validation.middleware";
import { body, param } from "express-validator";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Materials
 *     description: Cohort academic materials management
 *   - name: Assignments
 *     description: Cohort assignments and submissions management
 */

/* Materials */

/**
 * @swagger
 * /api/v1/academic/cohorts/{cohortId}/materials:
 *   post:
 *     summary: Add material to a cohort (Admin/Tutor only)
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [video, document, link]
 *               url:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Material added successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/cohorts/:cohortId/materials",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TUTOR) as any,
  upload.single("file"),
  [
    param("cohortId").isUUID().withMessage("Invalid cohort ID"),
    body("title").notEmpty().withMessage("Title is required"),
    body("type").isIn(["video", "document", "link"]).withMessage("Invalid material type"),
  ],
  validateRequest,
  MaterialController.addMaterial as any
);

/**
 * @swagger
 * /api/v1/academic/cohorts/{cohortId}/materials:
 *   get:
 *     summary: Get materials for a cohort
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Materials retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/cohorts/:cohortId/materials",
  authenticate as any,
  [param("cohortId").isUUID().withMessage("Invalid cohort ID")],
  validateRequest,
  MaterialController.getCohortMaterials as any
);

/**
 * @swagger
 * /api/v1/academic/materials/{id}:
 *   delete:
 *     summary: Delete a material
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Material deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Material not found
 */
router.delete(
  "/materials/:id",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TUTOR) as any,
  [param("id").isUUID().withMessage("Invalid material ID")],
  validateRequest,
  MaterialController.deleteMaterial as any
);

/**
 * @swagger
 * /api/v1/academic/cohorts/{cohortId}/materials/reorder:
 *   patch:
 *     summary: Reorder materials in a cohort
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - materialIds
 *             properties:
 *               materialIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Materials reordered successfully
 *       400:
 *         description: Invalid request
 */
router.patch(
  "/cohorts/:cohortId/materials/reorder",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TUTOR) as any,
  [
    param("cohortId").isUUID().withMessage("Invalid cohort ID"),
    body("materialIds").isArray().withMessage("materialIds must be an array"),
  ],
  validateRequest,
  MaterialController.reorderMaterials as any
);

/* Assignments */

/**
 * @swagger
 * /api/v1/academic/assignments:
 *   post:
 *     summary: Create assignment (Admin/Tutor only)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - cohortId
 *               - title
 *               - dueDate
 *               - totalMarks
 *             properties:
 *               cohortId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               totalMarks:
 *                 type: number
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  "/assignments",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TUTOR) as any,
  upload.array("attachments", 5), // up to 5 attachments
  [
    body("cohortId").isUUID().withMessage("Invalid cohort ID"),
    body("title").notEmpty().withMessage("Title is required"),
    body("dueDate").isISO8601().withMessage("Invalid due date"),
    body("totalMarks").isNumeric().withMessage("Total marks must be a number"),
  ],
  validateRequest,
  AssignmentController.createAssignment as any
);

/**
 * @swagger
 * /api/v1/academic/cohorts/{cohortId}/assignments:
 *   get:
 *     summary: List cohort assignments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully
 */
router.get(
  "/cohorts/:cohortId/assignments",
  authenticate as any,
  [param("cohortId").isUUID().withMessage("Invalid cohort ID")],
  validateRequest,
  AssignmentController.getCohortAssignments as any
);

/**
 * @swagger
 * /api/v1/academic/assignments/{id}/submit:
 *   post:
 *     summary: Submit assignment (Student only)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Assignment submitted successfully
 */
router.post(
  "/assignments/:id/submit",
  authenticate as any,
  requireRole(UserRole.STUDENT) as any,
  upload.single("file"),
  [param("id").isUUID().withMessage("Invalid assignment ID")],
  validateRequest,
  AssignmentController.submitAssignment as any
);

/**
 * @swagger
 * /api/v1/academic/submissions/{submissionId}/grade:
 *   patch:
 *     summary: Grade submission (Admin/Tutor only)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grade
 *             properties:
 *               grade:
 *                 type: number
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission graded successfully
 */
router.patch(
  "/submissions/:submissionId/grade",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TUTOR) as any,
  [
    param("submissionId").isUUID().withMessage("Invalid submission ID"),
    body("grade").isNumeric().withMessage("Grade must be a number"),
  ],
  validateRequest,
  AssignmentController.gradeSubmission as any
);

export default router;
