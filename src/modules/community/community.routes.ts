import { Router } from "express";
import { CommunityController } from "./community.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/permission.middleware";
import { UserRole } from "@prisma/client";
import { body, param, query } from "express-validator";
import { validateRequest } from "../../middleware/validation.middleware";
import rateLimit from "express-rate-limit";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Communities
 *     description: Community management and social features
 */

// Rate limiters
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many posts created, please try again later",
});

const commentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: "Too many comments, please slow down",
});

const likeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: "Too many like actions, please slow down",
});

const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many delete requests, please slow down",
});

const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many update requests, please slow down",
});

/**
 * @swagger
 * /api/v1/communities:
 *   get:
 *     summary: Get all communities (with pagination and search)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search communities by name or description
 *     responses:
 *       200:
 *         description: Communities retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  authenticate as any,
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().isString().trim(),
  ],
  validateRequest,
  CommunityController.getAllCommunities as any
);

/**
 * @swagger
 * /api/v1/communities/{id}:
 *   get:
 *     summary: Get community details with posts
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Community details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access to private community
 *       404:
 *         description: Community not found
 */
router.get(
  "/:id",
  authenticate as any,
  [
    param("id").isUUID().withMessage("Invalid community ID"),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  CommunityController.getCommunityDetails as any
);

/**
 * @swagger
 * /api/v1/communities/{id}/members:
 *   get:
 *     summary: Get community members (paginated)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access
 *       404:
 *         description: Community not found
 */
router.get(
  "/:id/members",
  authenticate as any,
  [
    param("id").isUUID().withMessage("Invalid community ID"),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  CommunityController.getCommunityMembers as any
);

/**
 * @swagger
 * /api/v1/communities:
 *   post:
 *     summary: Create a new community (Admin/Tutor only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Community name
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Community description
 *               coverImage:
 *                 type: string
 *                 format: uri
 *                 description: Cover image URL
 *               isPrivate:
 *                 type: boolean
 *                 default: false
 *                 description: Whether community is private
 *     responses:
 *       201:
 *         description: Community created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  authenticate as any,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TUTOR) as any,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Community name is required")
      .isLength({ min: 3, max: 100 })
      .withMessage("Name must be 3-100 characters"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required")
      .isLength({ min: 10, max: 500 })
      .withMessage("Description must be 10-500 characters"),
    body("coverImage").optional().isURL().withMessage("Invalid cover image URL"),
    body("isPrivate").optional().isBoolean().withMessage("isPrivate must be a boolean"),
  ],
  validateRequest,
  CommunityController.createCommunity as any
);

/**
 * @swagger
 * /api/v1/communities/{id}:
 *   put:
 *     summary: Update community (Creator/Admin only)
 *     tags: [Communities]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               coverImage:
 *                 type: string
 *                 format: uri
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Community updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Community not found
 */
router.put(
  "/:id",
  authenticate as any,
  updateLimiter,
  [
    param("id").isUUID().withMessage("Invalid community ID"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Name must be 3-100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Description must be 10-500 characters"),
    body("coverImage").optional().isURL().withMessage("Invalid cover image URL"),
    body("isPrivate").optional().isBoolean().withMessage("isPrivate must be a boolean"),
  ],
  validateRequest,
  CommunityController.updateCommunity as any
);

/**
 * @swagger
 * /api/v1/communities/{id}:
 *   delete:
 *     summary: Delete community (Creator/Super Admin only)
 *     tags: [Communities]
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
 *         description: Community deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Community not found
 */
router.delete(
  "/:id",
  authenticate as any,
  deleteLimiter,
  [param("id").isUUID().withMessage("Invalid community ID")],
  validateRequest,
  CommunityController.deleteCommunity as any
);

/**
 * @swagger
 * /api/v1/communities/{id}/join:
 *   post:
 *     summary: Join a public community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community ID
 *     responses:
 *       201:
 *         description: Successfully joined community
 *       400:
 *         description: Already a member
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot join private community
 *       404:
 *         description: Community not found
 */
router.post(
  "/:id/join",
  authenticate as any,
  [param("id").isUUID().withMessage("Invalid community ID")],
  validateRequest,
  CommunityController.joinCommunity as any
);

/**
 * @swagger
 * /api/v1/communities/{id}/leave:
 *   post:
 *     summary: Leave a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community ID
 *     responses:
 *       200:
 *         description: Successfully left community
 *       400:
 *         description: Not a member
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Creator cannot leave
 */
router.post(
  "/:id/leave",
  authenticate as any,
  [param("id").isUUID().withMessage("Invalid community ID")],
  validateRequest,
  CommunityController.leaveCommunity as any
);

/**
 * @swagger
 * /api/v1/communities/{id}/posts:
 *   post:
 *     summary: Create a post in a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 description: Post content
 *               attachments:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: Attachment URLs
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member
 */
router.post(
  "/:id/posts",
  authenticate as any,
  postLimiter,
  [
    param("id").isUUID().withMessage("Invalid community ID"),
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Post content cannot be empty")
      .isLength({ max: 5000 })
      .withMessage("Post content too long (max 5000 characters)"),
    body("attachments")
      .optional()
      .isArray({ max: 10 })
      .withMessage("Maximum 10 attachments allowed"),
  ],
  validateRequest,
  CommunityController.createPost as any
);

/**
 * @swagger
 * /api/v1/communities/posts/{postId}:
 *   get:
 *     summary: Get single post detail
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access
 *       404:
 *         description: Post not found
 */
router.get(
  "/posts/:postId",
  authenticate as any,
  [param("postId").isUUID().withMessage("Invalid post ID")],
  validateRequest,
  CommunityController.getPostDetail as any
);

/**
 * @swagger
 * /api/v1/communities/posts/{postId}:
 *   put:
 *     summary: Update a post (Author only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *               attachments:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only author can edit
 *       404:
 *         description: Post not found
 */
router.put(
  "/posts/:postId",
  authenticate as any,
  updateLimiter,
  [
    param("postId").isUUID().withMessage("Invalid post ID"),
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Post content cannot be empty")
      .isLength({ max: 5000 })
      .withMessage("Post content too long (max 5000 characters)"),
    body("attachments")
      .optional()
      .isArray({ max: 10 })
      .withMessage("Maximum 10 attachments allowed"),
  ],
  validateRequest,
  CommunityController.updatePost as any
);

/**
 * @swagger
 * /api/v1/communities/posts/{postId}:
 *   delete:
 *     summary: Delete a post (Author/Admin only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.delete(
  "/posts/:postId",
  authenticate as any,
  deleteLimiter,
  [param("postId").isUUID().withMessage("Invalid post ID")],
  validateRequest,
  CommunityController.deletePost as any
);

/**
 * @swagger
 * /api/v1/communities/posts/{postId}/like:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member
 *       404:
 *         description: Post not found
 */
router.post(
  "/posts/:postId/like",
  authenticate as any,
  likeLimiter,
  [param("postId").isUUID().withMessage("Invalid post ID")],
  validateRequest,
  CommunityController.toggleLike as any
);

/**
 * @swagger
 * /api/v1/communities/posts/{postId}/comments:
 *   post:
 *     summary: Add comment or reply to a post
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 description: Comment content
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 description: Parent comment ID (for replies)
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member
 *       404:
 *         description: Post or parent comment not found
 */
router.post(
  "/posts/:postId/comments",
  authenticate as any,
  commentLimiter,
  [
    param("postId").isUUID().withMessage("Invalid post ID"),
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Comment content cannot be empty")
      .isLength({ max: 1000 })
      .withMessage("Comment too long (max 1000 characters)"),
    body("parentId").optional().isUUID().withMessage("Invalid parent comment ID"),
  ],
  validateRequest,
  CommunityController.addComment as any
);

/**
 * @swagger
 * /api/v1/communities/posts/{postId}/comments:
 *   get:
 *     summary: Get top-level comments for a post (paginated)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 */
router.get(
  "/posts/:postId/comments",
  authenticate as any,
  [
    param("postId").isUUID().withMessage("Invalid post ID"),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  CommunityController.getPostComments as any
);

/**
 * @swagger
 * /api/v1/communities/comments/{commentId}/replies:
 *   get:
 *     summary: Get replies for a specific comment (paginated)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 */
router.get(
  "/comments/:commentId/replies",
  authenticate as any,
  [
    param("commentId").isUUID().withMessage("Invalid comment ID"),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  CommunityController.getCommentReplies as any
);

/**
 * @swagger
 * /api/v1/communities/comments/{commentId}:
 *   put:
 *     summary: Update a comment (Author only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only author can edit
 *       404:
 *         description: Comment not found
 */
router.put(
  "/comments/:commentId",
  authenticate as any,
  updateLimiter,
  [
    param("commentId").isUUID().withMessage("Invalid comment ID"),
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Comment content cannot be empty")
      .isLength({ max: 1000 })
      .withMessage("Comment too long (max 1000 characters)"),
  ],
  validateRequest,
  CommunityController.updateComment as any
);

/**
 * @swagger
 * /api/v1/communities/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (Author/Admin only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Comment not found
 */
router.delete(
  "/comments/:commentId",
  authenticate as any,
  deleteLimiter,
  [param("commentId").isUUID().withMessage("Invalid comment ID")],
  validateRequest,
  CommunityController.deleteComment as any
);

export default router;