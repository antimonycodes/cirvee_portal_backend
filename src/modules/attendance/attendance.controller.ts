import { Request, Response } from "express";
import { AttendanceService } from "./attendance.service";
import { ResponseUtil } from "../../utils/response";
import { AuthRequest } from "../../types";
import { AttendanceLogType } from "@prisma/client";

export class AttendanceController {
  //Generate a QR code for a location
   
  static async generateQRCode(req: AuthRequest, res: Response) {
    const { locationName, cohortId } = req.body;
    const adminId = req.user?.admin?.id;

    if (!adminId) {
      throw new Error("Only admins can generate QR codes");
    }

    if (!locationName) {
      throw new Error("Location name is required");
    }

    const qrCode = await AttendanceService.generateQRCode(adminId, locationName, cohortId);
    return ResponseUtil.created(res, "QR code generated successfully", qrCode);
  }

  // Process a QR scan

  static async processScan(req: AuthRequest, res: Response) {
    const { token, type } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User identification failed");
    }

    if (!token || !type) {
      throw new Error("Token and attendance type (CHECK_IN/CHECK_OUT) are required");
    }

    if (!Object.values(AttendanceLogType).includes(type)) {
      throw new Error("Invalid attendance type");
    }

    const log = await AttendanceService.processScan(userId, token, type as AttendanceLogType);
    return ResponseUtil.success(res, `Successfully ${type.toLowerCase().replace('_', ' ')}ed`, log);
  }

  // Get all attendance logs (Admin/Tutor)
   
  static async getAllLogs(req: Request, res: Response) {
    const { userId, cohortId, locationName, startDate, endDate } = req.query;

    const logs = await AttendanceService.getLogs({
      userId: userId as string,
      cohortId: cohortId as string,
      locationName: locationName as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    return ResponseUtil.success(res, "Attendance logs retrieved successfully", logs);
  }

  // Get attendance stats for a cohort (Admin/Tutor)

  static async getCohortStats(req: Request, res: Response) {
    const { cohortId } = req.params;
    const stats = await AttendanceService.getCohortStats(cohortId);
    return ResponseUtil.success(res, "Cohort stats retrieved successfully", stats);
  }

  // Get logs for current user
   
  static async getMyLogs(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User identification failed");
    }

    const logs = await AttendanceService.getMyLogs(userId);
    return ResponseUtil.success(res, "Your attendance logs retrieved successfully", logs);
  }

  // Deactivate a QR code
   
  static async deactivateQRCode(req: Request, res: Response) {
    const { id } = req.params;
    const qrCode = await AttendanceService.deactivateQRCode(id);
    return ResponseUtil.success(res, "QR code deactivated successfully", qrCode);
  }
}
