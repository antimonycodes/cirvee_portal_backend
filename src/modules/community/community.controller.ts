import { Response, NextFunction } from "express";
import { CommunityService } from "./community.service";
import { AuthRequest } from "../../types";
import { ResponseUtil } from "../../utils/response";
import logger from "../../utils/logger";

export class CommunityController {
  // GET ALL COMMUNITIES
  static async getAllCommunities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const result = await CommunityService.listAll(userId, page, limit, search);

      return ResponseUtil.paginated(
        res,
        "Communities retrieved successfully",
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error: any) {
      logger.error("Get all communities error:", error);
      return ResponseUtil.internalError(res, "Failed to fetch communities");
    }
  }

  // GET COMMUNITY DETAILS
  static async getCommunityDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const data = await CommunityService.getById(id, userId, page, limit);

      return ResponseUtil.success(
        res,
        "Community details retrieved successfully",
        {
          community: data.community,
          posts: data.posts,
          isMember: data.isMember,
        },
        200,
        data.pagination
      );
    } catch (error: any) {
      logger.error("Get community details error:", error);

      if (error.message.includes("access")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to load community");
    }
  }

  // GET SINGLE POST DETAIL
  static async getPostDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { postId } = req.params;
      const post = await CommunityService.getPost(postId, userId);

      return ResponseUtil.success(res, "Post retrieved successfully", post);
    } catch (error: any) {
      logger.error("Get post detail error:", error);

      if (error.message.includes("access")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to load post");
    }
  }

  // GET COMMUNITY MEMBERS
  static async getCommunityMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await CommunityService.getCommunityMembers(id, userId, page, limit);

      return ResponseUtil.paginated(
        res,
        "Community members retrieved successfully",
        result.members,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error: any) {
      logger.error("Get community members error:", error);

      if (error.message.includes("access")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to load community members");
    }
  }

  // CREATE COMMUNITY
  static async createCommunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { name, description, coverImage, isPrivate } = req.body;

      const community = await CommunityService.createCommunity({
        name,
        description,
        coverImage,
        isPrivate,
        createdById: userId,
      });

      return ResponseUtil.created(res, "Community created successfully", community);
    } catch (error: any) {
      logger.error("Create community error:", error);

      if (error.message.includes("characters")) {
        return ResponseUtil.badRequest(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to create community");
    }
  }

  // UPDATE COMMUNITY
  static async updateCommunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;
      const { name, description, coverImage, isPrivate } = req.body;

      const community = await CommunityService.updateCommunity(
        id,
        userId,
        userRole,
        { name, description, coverImage, isPrivate }
      );

      return ResponseUtil.success(res, "Community updated successfully", community);
    } catch (error: any) {
      logger.error("Update community error:", error);

      if (error.message.includes("Only") || error.message.includes("Unauthorized")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes("characters")) {
        return ResponseUtil.badRequest(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to update community");
    }
  }

  // DELETE COMMUNITY
  static async deleteCommunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;
      const result = await CommunityService.deleteCommunity(id, userId, userRole);

      return ResponseUtil.success(res, result.message, result.deletedData);
    } catch (error: any) {
      logger.error("Delete community error:", error);

      if (error.message.includes("Only") || error.message.includes("Unauthorized")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to delete community");
    }
  }

  // JOIN COMMUNITY
  static async joinCommunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;

      const member = await CommunityService.joinCommunity(id, userId);

      return ResponseUtil.created(res, "Successfully joined community", member);
    } catch (error: any) {
      logger.error("Join community error:", error);

      if (error.message.includes("private") || error.message.includes("invitation")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("already")) {
        return ResponseUtil.badRequest(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to join community");
    }
  }

  // LEAVE COMMUNITY
  static async leaveCommunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;

      const result = await CommunityService.leaveCommunity(id, userId);

      return ResponseUtil.success(res, result.message);
    } catch (error: any) {
      logger.error("Leave community error:", error);

      if (error.message.includes("creator") || error.message.includes("Transfer")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not a member")) {
        return ResponseUtil.badRequest(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to leave community");
    }
  }

  // CREATE POST
  static async createPost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { id } = req.params;
      const { content, attachments } = req.body;

      const post = await CommunityService.createPost(id, userId, {
        content,
        attachments,
      });

      return ResponseUtil.created(res, "Post created successfully", post);
    } catch (error: any) {
      logger.error("Create post error:", error);

      if (error.message.includes("member")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("empty") || error.message.includes("long") || error.message.includes("attachments")) {
        return ResponseUtil.badRequest(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to create post");
    }
  }

  // UPDATE POST
  static async updatePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { postId } = req.params;
      const { content, attachments } = req.body;

      const post = await CommunityService.updatePost(postId, userId, content, attachments);

      return ResponseUtil.success(res, "Post updated successfully", post);
    } catch (error: any) {
      logger.error("Update post error:", error);

      if (error.message.includes("Only") || error.message.includes("author")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes("empty") || error.message.includes("long") || error.message.includes("attachments")) {
        return ResponseUtil.badRequest(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to update post");
    }
  }

  // DELETE POST
  static async deletePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { postId } = req.params;

      const result = await CommunityService.deletePost(postId, userId, userRole);

      return ResponseUtil.success(res, result.message);
    } catch (error: any) {
      logger.error("Delete post error:", error);

      if (error.message.includes("Unauthorized")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to delete post");
    }
  }

  // TOGGLE LIKE
  static async toggleLike(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { postId } = req.params;

      const result = await CommunityService.toggleLike(postId, userId);

      return ResponseUtil.success(res, result.liked ? "Post liked" : "Post unliked", result);
    } catch (error: any) {
      logger.error("Toggle like error:", error);

      if (error.message.includes("member")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to toggle like");
    }
  }

  // ADD COMMENT
  static async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { postId } = req.params;
      const { content, parentId } = req.body;

      const comment = await CommunityService.addComment(postId, userId, content, parentId);

      return ResponseUtil.created(res, "Comment added successfully", comment);
    } catch (error: any) {
      logger.error("Add comment error:", error);

      if (error.message.includes("member")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (
        error.message.includes("empty") ||
        error.message.includes("long") ||
        error.message.includes("Parent") ||
        error.message.includes("deeper")
      ) {
        return ResponseUtil.badRequest(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to add comment");
    }
  }

  // UPDATE COMMENT
  static async updateComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { commentId } = req.params;
      const { content } = req.body;

      const comment = await CommunityService.updateComment(commentId, userId, content);

      return ResponseUtil.success(res, "Comment updated successfully", comment);
    } catch (error: any) {
      logger.error("Update comment error:", error);

      if (error.message.includes("Only") || error.message.includes("author")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes("empty") || error.message.includes("long")) {
        return ResponseUtil.badRequest(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to update comment");
    }
  }

  // DELETE COMMENT
  static async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { commentId } = req.params;

      const result = await CommunityService.deleteComment(commentId, userId, userRole);

      return ResponseUtil.success(res, result.message, { deletedReplies: result.deletedReplies });
    } catch (error: any) {
      logger.error("Delete comment error:", error);

      if (error.message.includes("Unauthorized")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to delete comment");
    }
  }

  // GET POST COMMENTS
  static async getPostComments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "Authentication required");
      }

      const { postId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await CommunityService.getPostComments(postId, userId, page, limit);

      return ResponseUtil.paginated(
        res,
        "Comments retrieved successfully",
        result.comments,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error: any) {
      logger.error("Get post comments error:", error);

      if (error.message.includes("member")) {
        return ResponseUtil.forbidden(res, error.message);
      }
      if (error.message.includes("not found")) {
        return ResponseUtil.notFound(res, error.message);
      }

      return ResponseUtil.internalError(res, "Failed to get comments");
    }
  }

  // GET REPLIES FOR A COMMENT
  static async getCommentReplies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return ResponseUtil.unauthorized(res, "Authentication required");

      const { commentId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await CommunityService.getCommentReplies(commentId, userId, page, limit);

      return ResponseUtil.paginated(
        res,
        "Replies retrieved successfully",
        result.replies,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error: any) {
      logger.error("Get comment replies error:", error);

      if (error.message.includes("member")) return ResponseUtil.forbidden(res, error.message);
      if (error.message.includes("not found")) return ResponseUtil.notFound(res, error.message);

      return ResponseUtil.internalError(res, "Failed to get replies");
    }
  }
}