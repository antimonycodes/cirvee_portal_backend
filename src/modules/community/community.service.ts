import prisma from "@config/database";
import { UserRole } from "@prisma/client";
import logger from "@utils/logger";

export class CommunityService {
 
  // Check if user is a member of the community
  private static async checkMembership(
    communityId: string,
    userId: string
  ): Promise<boolean> {
    const member = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId },
      },
    });
    return !!member;
  }

  // Check if user can access community
  private static async canAccessCommunity(
    communityId: string,
    userId: string
  ): Promise<boolean> {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) throw new Error(`Community with ID ${communityId} not found`);

    // Public communities are accessible to all
    if (!community.isPrivate) return true;

    // Private communities require membership
    return await this.checkMembership(communityId, userId);
  }

  // LIST ALL COMMUNITIES (Optimized for N+1)
  static async listAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    const whereClause = {
      AND: [
        {
          OR: [
            { isPrivate: false },
            {
              isPrivate: true,
              members: {
                some: { userId },
              },
            },
          ],
        },
        ...(search ? [{
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }] : []),
      ],
    };

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          _count: { select: { members: true, posts: true } },
          members: {
            take: 3,
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                },
              },
            },
            orderBy: { joinedAt: 'desc' },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.community.count({ where: whereClause }),
    ]);

    logger.info(`Listed ${communities.length} communities for user ${userId}`);

    return {
      data: communities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET COMMUNITY BY ID
  static async getById(
    id: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20
  ) {
    // Check access
    const hasAccess = await this.canAccessCommunity(id, currentUserId);
    if (!hasAccess) {
      throw new Error(`You don't have access to private community ${id}`);
    }

    const skip = (page - 1) * limit;

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, posts: true } },
      },
    });

    if (!community) throw new Error(`Community with ID ${id} not found`);

    // Get posts separately with pagination
    const [posts, totalPosts] = await Promise.all([
      prisma.post.findMany({
        where: { communityId: id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              role: true,
            },
          },
          _count: { select: { likes: true, comments: true } },
          likes: {
            where: { userId: currentUserId },
            select: { id: true },
          },
          comments: {
            where: { parentId: null },
            take: 3,
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                },
              },
              _count: { select: { replies: true } },
            },
          },
        },
      }),
      prisma.post.count({ where: { communityId: id } }),
    ]);

    // Check if current user is a member
    const isMember = await this.checkMembership(id, currentUserId);

    logger.info(`User ${currentUserId} accessed community ${id}`);

    return {
      community,
      posts,
      isMember,
      pagination: {
        page,
        limit,
        total: totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      },
    };
  }

  // GET SINGLE POST DETAIL
  static async getPost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        community: { select: { id: true, isPrivate: true, name: true } },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        _count: { select: { likes: true, comments: true } },
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!post) throw new Error(`Post with ID ${postId} not found`);

    const hasAccess = await this.canAccessCommunity(post.community.id, userId);
    if (!hasAccess) {
      throw new Error(`You don't have access to posts in community ${post.community.name}`);
    }

    logger.info(`User ${userId} accessed post ${postId}`);
    return post;
  }

  // GET COMMUNITY MEMBERS
  static async getCommunityMembers(
    communityId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ) {
    const hasAccess = await this.canAccessCommunity(communityId, userId);
    if (!hasAccess) {
      throw new Error(`You don't have access to view members of community ${communityId}`);
    }

    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      prisma.communityMember.findMany({
        where: { communityId },
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              role: true,
            },
          },
        },
      }),
      prisma.communityMember.count({ where: { communityId } }),
    ]);

    logger.info(`Listed ${members.length} members for community ${communityId}`);

    return {
      members,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // CREATE COMMUNITY
  static async createCommunity(data: {
    name: string;
    description: string;
    coverImage?: string;
    isPrivate?: boolean;
    createdById: string;
  }) {
    // Validate input
    if (!data.name || data.name.trim().length < 3) {
      throw new Error("Community name must be at least 3 characters");
    }

    if (!data.description || data.description.trim().length < 10) {
      throw new Error("Description must be at least 10 characters");
    }

    if (data.name.length > 100) {
      throw new Error("Community name too long (max 100 characters)");
    }

    if (data.description.length > 500) {
      throw new Error("Description too long (max 500 characters)");
    }

    const community = await prisma.community.create({
      data: {
        name: data.name,
        description: data.description,
        coverImage: data.coverImage,
        isPrivate: data.isPrivate ?? false,
        createdById: data.createdById,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Auto-join creator as member
    await prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: data.createdById,
      },
    });

    logger.info(`Community '${community.name}' (${community.id}) created by user ${data.createdById}`);

    return community;
  }

  // UPDATE COMMUNITY
  static async updateCommunity(
    communityId: string,
    userId: string,
    userRole: UserRole,
    data: { 
      name?: string; 
      description?: string; 
      coverImage?: string; 
      isPrivate?: boolean 
    }
  ) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) throw new Error(`Community with ID ${communityId} not found`);

    const isCreator = community.createdById === userId;
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(userRole);

    if (!isCreator && !isAdmin) {
      throw new Error(`Only community creator or admin can edit community ${communityId}`);
    }

    // Validate if provided
    if (data.name !== undefined) {
      if (data.name.trim().length < 3 || data.name.length > 100) {
        throw new Error("Community name must be 3-100 characters");
      }
    }

    if (data.description !== undefined) {
      if (data.description.trim().length < 10 || data.description.length > 500) {
        throw new Error("Description must be 10-500 characters");
      }
    }

    const updatedCommunity = await prisma.community.update({
      where: { id: communityId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
        ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
      },
    });

    logger.info(`Community ${communityId} updated by user ${userId}`);
    return updatedCommunity;
  }

  // DELETE COMMUNITY
  static async deleteCommunity(
    communityId: string,
    userId: string,
    userRole: UserRole
  ) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: { _count: { select: { posts: true, members: true } } },
    });

    if (!community) throw new Error(`Community with ID ${communityId} not found`);

    const isCreator = community.createdById === userId;
    const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

    if (!isCreator && !isSuperAdmin) {
      throw new Error(`Only creator or super admin can delete community ${communityId}`);
    }

    await prisma.community.delete({ where: { id: communityId } });

    logger.info(
      `Community '${community.name}' (${communityId}) deleted by user ${userId}. ` +
      `Had ${community._count.members} members and ${community._count.posts} posts.`
    );

    return { 
      message: "Community deleted successfully",
      deletedData: {
        members: community._count.members,
        posts: community._count.posts,
      }
    };
  }

  // JOIN COMMUNITY (Fixed race condition)
  static async joinCommunity(communityId: string, userId: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) throw new Error(`Community with ID ${communityId} not found`);

    if (community.isPrivate) {
      throw new Error(
        `Cannot join private community '${community.name}'. You need an invitation.`
      );
    }

    try {
      const member = await prisma.communityMember.create({
        data: {
          communityId,
          userId,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
      });

      logger.info(`User ${userId} joined community '${community.name}' (${communityId})`);
      return member;
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        throw new Error(`You are already a member of community '${community.name}'`);
      }
      logger.error(`Error joining community ${communityId}:`, error);
      throw error;
    }
  }

  // LEAVE COMMUNITY 
  static async leaveCommunity(communityId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const member = await tx.communityMember.findUnique({
        where: {
          communityId_userId: { communityId, userId },
        },
      });

      if (!member) {
        throw new Error(`You are not a member of community ${communityId}`);
      }

      // I will come back to this
      // Don't allow community creator to leave???
      const community = await tx.community.findUnique({
        where: { id: communityId },
      });

      if (!community) throw new Error(`Community with ID ${communityId} not found`);

      if (community.createdById === userId) {
        throw new Error(
          `Community creator cannot leave '${community.name}'. Transfer ownership or delete the community.`
        );
      }

      await tx.communityMember.delete({
        where: { id: member.id },
      });

      logger.info(`User ${userId} left community '${community.name}' (${communityId})`);
      return { message: `Successfully left community '${community.name}'` };
    });
  }

  // CREATE POST
  static async createPost(
    communityId: string,
    authorId: string,
    data: { content: string; attachments?: string[] }
  ) {
    // Check access
    const isMember = await this.checkMembership(communityId, authorId);
    if (!isMember) {
      throw new Error(`You must be a member to post in community ${communityId}`);
    }

    // Validate content
    if (!data.content || data.content.trim().length === 0) {
      throw new Error("Post content cannot be empty");
    }

    if (data.content.length > 5000) {
      throw new Error("Post content too long (max 5000 characters)");
    }

    // Validate attachments
    if (data.attachments && data.attachments.length > 10) {
      throw new Error("Maximum 10 attachments allowed");
    }

    const post = await prisma.post.create({
      data: {
        communityId,
        authorId,
        content: data.content,
        attachments: data.attachments || [],
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    logger.info(`Post ${post.id} created in community ${communityId} by user ${authorId}`);
    return post;
  }

  // UPDATE POST
  static async updatePost(
    postId: string,
    userId: string,
    content: string,
    attachments?: string[]
  ) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { community: { select: { name: true } } },
    });

    if (!post) throw new Error(`Post with ID ${postId} not found`);

    if (post.authorId !== userId) {
      throw new Error(`Only the post author can edit post ${postId}`);
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error("Post content cannot be empty");
    }

    if (content.length > 5000) {
      throw new Error("Post content too long (max 5000 characters)");
    }

    // Validate attachments
    if (attachments && attachments.length > 10) {
      throw new Error("Maximum 10 attachments allowed");
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        ...(attachments !== undefined && { attachments }),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            role: true,
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    logger.info(`Post ${postId} updated by user ${userId} in community '${post.community.name}'`);
    return updatedPost;
  }

  // DELETE POST
  static async deletePost(
    postId: string,
    userId: string,
    userRole: UserRole
  ) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        community: { select: { name: true, createdById: true } },
      },
    });

    if (!post) throw new Error(`Post with ID ${postId} not found`);

    // Check authorization
    const isAuthor = post.authorId === userId;
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(userRole);
    const isCommunityCreator = post.community.createdById === userId;

    if (!isAuthor && !isAdmin && !isCommunityCreator) {
      throw new Error(`Unauthorized to delete post ${postId}`);
    }

    await prisma.post.delete({ where: { id: postId } });

    logger.info(
      `Post ${postId} deleted by user ${userId} from community '${post.community.name}' ` +
      `(author: ${isAuthor}, admin: ${isAdmin}, creator: ${isCommunityCreator})`
    );

    return { message: "Post deleted successfully" };
  }

  // ADD COMMENT OR REPLY
  static async addComment(
    postId: string,
    authorId: string,
    content: string,
    parentId?: string
  ) {
    if (!content || content.trim().length === 0) {
      throw new Error("Comment content cannot be empty");
    }
    
    if (content.length > 1000) {
      throw new Error("Comment too long (max 1000 characters)");
    }

    const post = await prisma.post.findUnique({ 
      where: { id: postId }, 
      include: { community: { select: { id: true, name: true } } } 
    });
    
    if (!post) throw new Error(`Post with ID ${postId} not found`);

    const isMember = await this.checkMembership(post.community.id, authorId);
    if (!isMember) {
      throw new Error(`You must be a member of '${post.community.name}' to comment`);
    }

    // Enforce max reply depth
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== postId) {
        throw new Error(`Parent comment ${parentId} not found for post ${postId}`);
      }

      if (parent.parentId) {
        throw new Error("Replies deeper than 2 levels are not allowed");
      }
    }

    const comment = await prisma.comment.create({
      data: { postId, authorId, content, parentId },
      include: { 
        author: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            profileImage: true 
          } 
        }, 
        _count: { select: { replies: true } } 
      },
    });

    logger.info(
      `Comment ${comment.id} added to post ${postId} by user ${authorId}` +
      `${parentId ? ` (reply to ${parentId})` : ''}`
    );

    return comment;
  }

  // UPDATE COMMENT
  static async updateComment(
    commentId: string,
    userId: string,
    content: string
  ) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: { community: { select: { name: true } } },
        },
      },
    });

    if (!comment) throw new Error(`Comment with ID ${commentId} not found`);

    if (comment.authorId !== userId) {
      throw new Error(`Only the comment author can edit comment ${commentId}`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error("Comment content cannot be empty");
    }

    if (content.length > 1000) {
      throw new Error("Comment too long (max 1000 characters)");
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        _count: { select: { replies: true } },
      },
    });

    logger.info(
      `Comment ${commentId} updated by user ${userId} in community '${comment.post.community.name}'`
    );

    return updatedComment;
  }

  // DELETE COMMENT
  static async deleteComment(
    commentId: string,
    userId: string,
    userRole: UserRole
  ) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            community: { select: { name: true, createdById: true } },
          },
        },
        _count: { select: { replies: true } },
      },
    });

    if (!comment) throw new Error(`Comment with ID ${commentId} not found`);

    // Check authorization
    const isAuthor = comment.authorId === userId;
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(userRole);
    const isCommunityCreator = comment.post.community.createdById === userId;
    const isPostAuthor = comment.post.authorId === userId;

    if (!isAuthor && !isAdmin && !isCommunityCreator && !isPostAuthor) {
      throw new Error(`Unauthorized to delete comment ${commentId}`);
    }

    // Delete comment and all its replies
    await prisma.comment.deleteMany({
      where: {
        OR: [{ id: commentId }, { parentId: commentId }],
      },
    });

    logger.info(
      `Comment ${commentId} and ${comment._count.replies} replies deleted by user ${userId} ` +
      `from community '${comment.post.community.name}' ` +
      `(author: ${isAuthor}, admin: ${isAdmin}, creator: ${isCommunityCreator})`
    );

    return { 
      message: "Comment deleted successfully",
      deletedReplies: comment._count.replies,
    };
  }

  // TOGGLE LIKE
  static async toggleLike(postId: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { community: { select: { name: true } } },
    });

    if (!post) throw new Error(`Post with ID ${postId} not found`);

    const isMember = await this.checkMembership(post.communityId, userId);
    if (!isMember) {
      throw new Error(`You must be a member of '${post.community.name}' to like posts`);
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.postLike.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existing) {
        await tx.postLike.delete({ where: { id: existing.id } });
        logger.info(`Post ${postId} unliked by user ${userId}`);
        return { liked: false };
      }

      await tx.postLike.create({ data: { postId, userId } });
      logger.info(`Post ${postId} liked by user ${userId}`);
      return { liked: true };
    });
  }

  // GET TOP-LEVEL COMMENTS
  static async getPostComments(
    postId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { communityId: true },
    });
    
    if (!post) throw new Error(`Post with ID ${postId} not found`);

    // Check if user is a member of the community
    const isMember = await this.checkMembership(post.communityId, userId);
    if (!isMember) {
      throw new Error(`You must be a member to view comments on post ${postId}`);
    }

    // Fetch top-level comments (parentId = null)
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId, parentId: null },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
      }),
      prisma.comment.count({
        where: { postId, parentId: null },
      }),
    ]);

    logger.info(`Retrieved ${comments.length} comments for post ${postId}`);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET REPLIES FOR A COMMENT
  static async getCommentReplies(
    commentId: string, 
    userId: string, 
    page = 1, 
    limit = 10
  ) {
    const skip = (page - 1) * limit;

    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { postId: true },
    });

    if (!parentComment) throw new Error(`Parent comment with ID ${commentId} not found`);

    // Verify membership
    const post = await prisma.post.findUnique({
      where: { id: parentComment.postId },
      select: { communityId: true },
    });
    
    if (!post) throw new Error(`Post ${parentComment.postId} not found`);

    const isMember = await this.checkMembership(post.communityId, userId);
    if (!isMember) {
      throw new Error(`You must be a member to view replies to comment ${commentId}`);
    }

    const [replies, total] = await Promise.all([
      prisma.comment.findMany({
        where: { parentId: commentId },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          author: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              profileImage: true 
            } 
          },
        },
      }),
      prisma.comment.count({ where: { parentId: commentId } }),
    ]);

    logger.info(`Retrieved ${replies.length} replies for comment ${commentId}`);

    return {
      replies,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}