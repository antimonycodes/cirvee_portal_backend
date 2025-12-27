import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/permission.middleware";
import { UserRole } from "@prisma/client";
import { validateRequest } from "../../middleware/validation.middleware";
import { body } from "express-validator";

const router = Router();

router.use(authenticate as any);
router.use(requireRole(UserRole.ADMIN) as any);

/**
 * @swagger
 * tags:
 *   name: Admin Management
 *   description: Admin and tutor management endpoints (Admin only)
 */

/**
 * @swagger
 * /api/v1/admin/create-admin:
 *   post:
 *     summary: Create a new admin
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               department:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Admin created successfully
 */
router.post(
  "/create-admin",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
  ],
  validateRequest,
  AdminController.createAdmin as any
);

/**
 * @swagger
 * /api/v1/admin/create-tutor:
 *   post:
 *     summary: Create a new tutor
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - courseCode
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               courseCode:
 *                 type: string
 *                 example: WD
 *               bio:
 *                 type: string
 *               expertise:
 *                 type: array
 *                 items:
 *                   type: string
 *               yearsOfExperience:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Tutor created successfully
 */
router.post(
  "/create-tutor",
  [
    body("email").isEmail().normalizeEmail(),
    body("firstName").trim().notEmpty(),
    body("lastName").trim().notEmpty(),
    body("courseCode").trim().notEmpty(),
  ],
  validateRequest, 
  AdminController.createTutor as any
);

/**
 * @swagger
 * /api/v1/admin/admins:
 *   get:
 *     summary: Get all admins
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Admins list
 */
router.get("/admins", AdminController.getAllAdmins as any);

/**
 * @swagger
 * /api/v1/admin/tutors:
 *   get:
 *     summary: Get all tutors
 *     tags: [Admin Management]
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
 *     responses:
 *       200:
 *         description: Tutors list
 */
router.get("/tutors", AdminController.getAllTutors as any);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/deactivate:
 *   patch:
 *     summary: Deactivate a user
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.patch(
  "/users/:userId/deactivate",
  AdminController.deactivateUser as any
);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/activate:
 *   patch:
 *     summary: Activate a user
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.patch(
  "/users/:userId/activate",
  AdminController.activateUser as any
);

export default router;
