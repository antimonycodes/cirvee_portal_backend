import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, ISessionUser } from "../types";
import { ResponseUtil } from "../utils/response";
import logger from "../utils/logger";
import prisma from "@config/database";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return ResponseUtil.unauthorized(res, "Authorization token is missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as ISessionUser;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true,
        role: true,
        isActive: true,
        admin: {
          select: {
            id: true,
            staffId: true,
            permissions: true,
          }
        },
        tutor: {
          select: {
            id: true,
            staffId: true,
          }
        },
        student: {
          select: {
            id: true,
            studentId: true,
          }
        }
      },
    });

    if (!user || !user.isActive) {
      return ResponseUtil.unauthorized(res, "User not found or deactivated");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      admin: user.admin,
      tutor: user.tutor,
      student: user.student,
    };

    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return ResponseUtil.unauthorized(res, "Invalid or  token");
  }
};
