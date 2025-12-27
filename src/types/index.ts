import { Request } from "express";
import {
  UserRole as PrismaUserRole,
  UserRole,
} from "@prisma/client";
export { UserRole } from "@prisma/client";

// export enum UserRole {
//   ADMIN = "admin",
//   TUTOR = "tutor",
//   STUDENT = "student",
// }

export enum Permission {
  // Users permission
  CREATE_USER = "create:user",
  UPDATE_USER = "update:user",
  DELETE_USER = "delete:user",
  VIEW_USER = "view:user",

  // Course permissions
  CREATE_COURSE = "create:course",
  UPDATE_COURSE = "update:course",
  DELETE_COURSE = "delete:course",
  VIEW_COURSE = "view:course",

  // Cohort permissions
  CREATE_COHORT = "create:cohort",
  UPDATE_COHORT = "update:cohort",
  DELETE_COHORT = "delete:cohort",
  ASSIGN_TUTOR = "assign:tutor",
  VIEW_COHORT = "view:cohort",

  // Enrollment permissions
  ENROLL_STUDENT = "enroll:student",
  VIEW_ENROLLMENT = "view:enrollment",

  // Community permissions
  CREATE_COMMUNITY = "create:community",
  DELETE_COMMUNITY = "delete:community",
  JOIN_COMMUNITY = "join:community",
  POST_IN_COMMUNITY = "post:community",

  // Announcement permissions
  CREATE_ANNOUNCEMENT = "create:announcement",
  DELETE_ANNOUNCEMENT = "delete:announcement",

  // Assignment permissions
  CREATE_ASSIGNMENT = "create:assignment",
  SUBMIT_ASSIGNMENT = "submit:assignment",
  GRADE_ASSIGNMENT = "grade:assignment",
  VIEW_ALL_SUBMISSIONS = "view:all_submissions",

  // Certificate permissions
  ISSUE_CERTIFICATE = "issue:certificate",
  DOWNLOAD_CERTIFICATE = "download:certificate",

  // Payment permissions
  VIEW_ALL_PAYMENTS = "view:all_payments",
  PROCESS_PAYMENT = "process:payment",
  VIEW_OWN_PAYMENTS = "view:own_payments",

  // Activity permissions
  VIEW_ALL_ACTIVITIES = "view:all_activities",
  VIEW_OWN_ACTIVITIES = "view:own_activities",
}

// export interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     role: PrismaUserRole;
//   };
// }

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  courseCode: string;
}

export interface LoginRequest {
  studentId: string;
  password: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface IUser {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profileImage?: string;
  phoneNumber?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  googleId?: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionUser {
  id: string;
  email: string;
  role: UserRole;
  admin?: {
    id: string;
    staffId: string;
    permissions: string[];
  } | null;
  tutor?: {
    id: string;
    staffId: string;
  } | null;
  student?: {
    id: string;
    studentId: string;
  } | null;
}

export interface AuthRequest extends Request {
  user?: ISessionUser;
}

export interface ICourse {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number; // weeks
  syllabus: string[];
  thumbnail?: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  createdBy: string;
  materials: IMaterial[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICohort {
  id: string;
  course: string;
  name: string;
  tutor: string;
  startDate: Date;
  endDate: Date;
  schedule: ISchedule[];
  maxStudents: number;
  enrolledStudents: string[];
  status: "upcoming" | "ongoing" | "completed";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISchedule {
  day: string;
  startTime: string;
  endTime: string;
  topic?: string;
}

export interface IMaterial {
  id: string;
  title: string;
  type: "video" | "document" | "link";
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface IAssignment {
  id: string;
  cohort: string;
  title: string;
  description: string;
  dueDate: Date;
  totalMarks: number;
  attachments?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssignmentSubmission {
  id: string;
  assignment: string;
  student: string;
  fileUrl: string;
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
  status: "submitted" | "graded" | "late";
}

export interface ISubmission {
  student: string;
  fileUrl: string;
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
}

export interface ICommunity {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[];
  posts: IPost[];
  createdAt: Date;
}

export interface IPost {
  id: string;
  author: string;
  content: string;
  attachments: string[];
  likes: string[];
  replies: IReply[];
  createdAt: Date;
}

export interface IReply {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export interface IAnnouncement {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  targetAudience: UserRole[];
  likes: string[];
  createdAt: Date;
}

export interface IEnrollment {
  id: string;
  student: string;
  course: string;
  cohort: string;
  enrollmentDate: Date;
  status: "active" | "completed" | "dropped";
  progress: number;
  paymentStatus: "paid" | "pending" | "partial";
}

export interface IPayment {
  id: string;
  student: string;
  course: string;
  cohort: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentMethod: string;
  transactionId?: string;
  plan?: "full" | "installment";
  installmentDetails?: {
    totalInstallments: number;
    paidInstallments: number;
    amountPerInstallment: number;
    nextDueDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ICertificate {
  id: string;
  student: string;
  course: string;
  cohort: string; 
  issueDate: Date;
  completionDate: Date;
  certificateNumber: string;
  grade?: string;
  pdfUrl: string;
  issuedBy: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
