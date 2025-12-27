import { Request, Response } from "express";
import { AssignmentService } from "./assignment.service";
import { ResponseUtil } from "../../utils/response";
import { AuthRequest } from "../../types";

export class AssignmentController {
  static async createAssignment(req: AuthRequest, res: Response) {
    const { cohortId, title, description, dueDate, totalMarks } = req.body;
    const attachments = req.files as Express.Multer.File[];
    const tutorId = req.user?.tutor?.id;

    if (!tutorId && req.user?.role !== "ADMIN" && req.user?.role !== "SUPER_ADMIN") {
      throw new Error("Only tutors or admins can create assignments");
    }

    // Check
    const finalTutorId = tutorId || req.body.tutorId;

    if (!finalTutorId) {
       throw new Error("tutorId is required to create an assignment");
    }

    const assignment = await AssignmentService.createAssignment({
      cohortId,
      tutorId: finalTutorId,
      title,
      description,
      dueDate: new Date(dueDate),
      totalMarks: Number(totalMarks),
      attachments,
    });

    return ResponseUtil.created(res, "Assignment created successfully", assignment);
  }

  static async submitAssignment(req: AuthRequest, res: Response) {
    const { id: assignmentId } = req.params;
    const studentId = req.user?.student?.id;
    const file = req.file;

    if (!studentId) {
      throw new Error("Only students can submit assignments");
    }

    if (!file) {
      throw new Error("File is required for submission");
    }

    const submission = await AssignmentService.submitAssignment({
      assignmentId,
      studentId,
      file,
    });

    return ResponseUtil.created(res, "Assignment submitted successfully", submission);
  }

  static async gradeSubmission(req: AuthRequest, res: Response) {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const tutorId = req.user?.tutor?.id;

    if (!tutorId && req.user?.role !== "ADMIN" && req.user?.role !== "SUPER_ADMIN") {
        throw new Error("Only tutors or admins can grade submissions");
    }

    const submission = await AssignmentService.gradeSubmission({
      submissionId,
      tutorId: tutorId || "SYSTEM_ADMIN", 
      grade: Number(grade),
      feedback,
    });

    return ResponseUtil.success(res, "Submission graded successfully", submission);
  }

  static async getCohortAssignments(req: Request, res: Response) {
    const { cohortId } = req.params;
    const assignments = await AssignmentService.getCohortAssignments(cohortId);
    return ResponseUtil.success(res, "Assignments retrieved successfully", assignments);
  }
}
