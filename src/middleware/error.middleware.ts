import { Request, Response, NextFunction } from "express";
import { ResponseUtil } from "../utils/response";
import logger from "../utils/logger";
import { ForbiddenError, NotFoundError } from "../utils/httpErrors";

export const notFoundHandler = (req: Request, res: Response) => {
  ResponseUtil.notFound(res, `Route ${req.originalUrl} not found`);
};

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error("Error:", {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    return ResponseUtil.unauthorized(res, "Invalid token");
  }

  if (error.name === "TokenExpiredError") {
    return ResponseUtil.unauthorized(res, "Token expired");
  }

  // Prisma unique constraint
  if (error.code === "P2002") {
    return ResponseUtil.badRequest(res, "Record already exists");
  }

  // Custom HTTP errors
  if (error instanceof ForbiddenError) {
    return ResponseUtil.forbidden(res, error.message);
  }

  if (error instanceof NotFoundError) {
    return ResponseUtil.notFound(res, error.message);
  }

  // Fallback
  return ResponseUtil.internalError(
    res,
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message
  );
};
