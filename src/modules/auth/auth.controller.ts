// import { Response, NextFunction } from "express";
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../types";
import { AuthService } from "./auth.service";
import { ResponseUtil } from "../../utils/response";
import logger from "../../utils/logger";
import prisma from "../../config/database";

export class AuthController {
  static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.studentSignup(req.body);
      return ResponseUtil.created(res, result.message, result);
    } catch (error: any) {
      logger.error("Signup error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      const result = await AuthService.verifyOtp(email, otp);
      return ResponseUtil.success(res, "Email verified successfully", result);
    } catch (error: any) {
      logger.error("OTP verification error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, password } = req.body;
      const result = await AuthService.studentLogin(studentId, password);
      return ResponseUtil.success(res, "Login successful", result);
    } catch (error: any) {
      logger.error("Login error:", error);
      return ResponseUtil.unauthorized(res, error.message);
    }
  }

  static async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.staffLogin(email, password);
      return ResponseUtil.success(res, "Login successful", result);
    } catch (error: any) {
      logger.error("Admin login error:", error);
      return ResponseUtil.unauthorized(res, error.message);
    }
  }

  // static async googleCallback(req: Request, res: Response) {
  //   try {
  //     // Passport attaches user to req
  //     const profile = req.user as any;
  //     const result = await AuthService.googleAuth(profile);

  //     // Redirect to frontend with tokens
  //     const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`;
  //     return res.redirect(redirectUrl);
  //   } catch (error: any) {
  //     logger.error("Google auth error:", error);
  //     return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  //   }
  // }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      return ResponseUtil.success(res, "Token refreshed successfully", result);
    } catch (error: any) {
      logger.error("Token refresh error:", error);
      return ResponseUtil.unauthorized(res, error.message);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      return ResponseUtil.success(res, result.message);
    } catch (error: any) {
      logger.error("Forgot password error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword);
      return ResponseUtil.success(res, result.message);
    } catch (error: any) {
      logger.error("Reset password error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.resendOtp(email);
      return ResponseUtil.success(res, result.message);
    } catch (error: any) {
      logger.error("Resend OTP error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await AuthService.logout(userId);
      return ResponseUtil.success(res, result.message);
    } catch (error: any) {
      logger.error("Logout error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user?.id;
      if (!userId) {
        return ResponseUtil.unauthorized(res, "User not authenticated");
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          profileImage: true,
          role: true,
          isEmailVerified: true,
          emailNotifications: true,
          smsNotifications: true,
          student: {
            select: {
              studentId: true,
              dateOfBirth: true,
              address: true,
            },
          },
          admin: {
            select: {
              staffId: true,
              department: true,
            },
          },
          tutor: {
            select: {
              staffId: true,
              bio: true,
              expertise: true,
            },
          },
        },
      });

      if (!user) {
        return ResponseUtil.notFound(res, "User profile not found");
      }

      return ResponseUtil.success(res, "Profile fetched successfully", user);
    } catch (error: any) {
      logger.error("Get profile error:", error);
      return ResponseUtil.badRequest(res, error.message);
    }
  }
}
