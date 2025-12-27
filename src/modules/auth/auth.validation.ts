import { body } from "express-validator";

export const signupValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number"),
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("phoneNumber")
    .optional()
    .isMobilePhone("any")
    .withMessage("Valid phone number required"),
  body("courseCode")
    .trim()
    .notEmpty()
    .withMessage("Course code is required")
    .isLength({ min: 2, max: 10 })
    .withMessage("Course code must be 2-10 characters"),
];

export const loginValidation = [
  body("studentId").trim().notEmpty().withMessage("Student ID is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const adminLoginValidation = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email or Staff ID is required"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

export const verifyOtpValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be 6 digits"),
];

export const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
];

export const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number"),
];

export const refreshTokenValidation = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];

export const resendOtpValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
];
