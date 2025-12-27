import { Router } from "express";
import { AnnouncementController } from "./announcement.controller";
import { AnnouncementValidator } from "./announcement.validator";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/permission.middleware";
import { validateRequest } from "../../middleware/validation.middleware";
import { UserRole } from "@prisma/client";
import rateLimit from "express-rate-limit";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Announcements
 *     description: Announcement management and viewing endpoints
 */


const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Too many announcements created, please try again later",
});

const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: "Too many update requests, please slow down",
});

const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: "Too many delete requests, please slow down",
});

const likeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: "Too many like actions, please slow down",
});


/**
 * @swagger
 * /api/v1/announcements:
 *   get:
 *     summary: Get all announcements
 *     description: Returns announcements based on user access. Staff see all, students see global + their cohort announcements
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Announcements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       isGlobal:
 *                         type: boolean
 *                       createdByType:
 *                         type: string
 *                         enum: [SUPER_ADMIN, ADMIN, TUTOR]
 *                       cohorts:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             cohort:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                       likes:
 *                         type: array
 *                       _count:
 *                         type: object
 *                         properties:
 *                           likes:
 *                             type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  authenticate as any,
  AnnouncementValidator.list(),
  validateRequest,
  AnnouncementController.getAllAnnouncements as any
);

/**
 * @swagger
 * /api/v1/announcements/{id}:
 *   get:
 *     summary: Get announcement by ID
 *     description: Retrieve a single announcement. Access is checked based on user role and cohort membership
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Announcement ID
 *     responses:
 *       200:
 *         description: Announcement retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *                     isGlobal:
 *                       type: boolean
 *                     createdById:
 *                       type: string
 *                     createdByType:
 *                       type: string
 *                     admin:
 *                       type: object
 *                     tutor:
 *                       type: object
 *                     cohorts:
 *                       type: array
 *                     likes:
 *                       type: array
 *                     _count:
 *                       type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid announcement ID format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No access to this announcement
 *       404:
 *         description: Announcement not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  authenticate as any,
  AnnouncementValidator.getById(),
  validateRequest,
  AnnouncementController.getAnnouncementById as any
);

/**
 * @swagger
 * /api/v1/announcements:
 *   post:
 *     summary: Create new announcement
 *     description: Create an announcement. Can be global (all users) or cohort-specific. Only staff can create announcements
 *     tags: [Announcements]
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
 *               - content
 *               - isGlobal
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 description: Announcement title
 *                 example: "Important: Class Schedule Update"
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *                 description: Announcement content/body
 *                 example: "Please note that tomorrow's class has been rescheduled to 2 PM."
 *               isGlobal:
 *                 type: boolean
 *                 description: If true, visible to all users. If false, must specify cohortIds
 *                 example: false
 *               cohortIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Required if isGlobal is false. Array of cohort IDs this announcement is for
 *                 example: ["123e4567-e89b-12d3-a456-426614174000"]
 *     responses:
 *       201:
 *         description: Announcement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request data or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only staff can create announcements
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TUTOR) as any,
  createLimiter,
  AnnouncementValidator.create(),
  validateRequest,
  AnnouncementController.createAnnouncement as any
);

/**
 * @swagger
 * /api/v1/announcements/{id}:
 *   put:
 *     summary: Update announcement
 *     description: Update an existing announcement. Only the creator or super admin can update
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Announcement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 description: Updated title
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *                 description: Updated content
 *               isGlobal:
 *                 type: boolean
 *                 description: Change visibility scope
 *               cohortIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Update cohort associations. Required if changing isGlobal to false
 *     responses:
 *       200:
 *         description: Announcement updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only creator or super admin can update
 *       404:
 *         description: Announcement not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  authenticate as any,
  updateLimiter,
  AnnouncementValidator.update(),
  validateRequest,
  AnnouncementController.updateAnnouncement as any
);

/**
 * @swagger
 * /api/v1/announcements/{id}:
 *   delete:
 *     summary: Delete announcement
 *     description: Delete an announcement. Only the creator or super admin can delete
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Announcement ID
 *     responses:
 *       200:
 *         description: Announcement deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedData:
 *                       type: object
 *                       properties:
 *                         likes:
 *                           type: integer
 *                           description: Number of likes the announcement had
 *       400:
 *         description: Invalid announcement ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only creator or super admin can delete
 *       404:
 *         description: Announcement not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  authenticate as any,
  deleteLimiter,
  AnnouncementValidator.delete(),
  validateRequest,
  AnnouncementController.deleteAnnouncement as any
);

/**
 * @swagger
 * /api/v1/announcements/{id}/like:
 *   post:
 *     summary: Toggle like on announcement
 *     description: Like or unlike an announcement. Users can only like announcements they have access to
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Announcement ID
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   enum: ["Announcement liked", "Announcement unliked"]
 *                 data:
 *                   type: object
 *                   properties:
 *                     liked:
 *                       type: boolean
 *                       description: True if now liked, false if unliked
 *       400:
 *         description: Invalid announcement ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - No access to this announcement
 *       404:
 *         description: Announcement not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/like",
  authenticate as any,
  likeLimiter,
  AnnouncementValidator.toggleLike(),
  validateRequest,
  AnnouncementController.toggleLike as any
);

export default router;