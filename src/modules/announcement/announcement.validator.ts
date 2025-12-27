import { body, param, query } from "express-validator";

export class AnnouncementValidator {
  static list() {
    return [
      query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer")
        .toInt(),
      query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    ];
  }

  static getById() {
    return [
      param("id")
        .isUUID()
        .withMessage("Invalid announcement ID format"),
    ];
  }

  static create() {
    return [
      body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ min: 3, max: 200 })
        .withMessage("Title must be between 3 and 200 characters"),
      
      body("content")
        .trim()
        .notEmpty()
        .withMessage("Content is required")
        .isLength({ min: 10, max: 5000 })
        .withMessage("Content must be between 10 and 5000 characters"),
      
      body("isGlobal")
        .isBoolean()
        .withMessage("isGlobal must be a boolean"),
      
      body("cohortIds")
        .optional()
        .isArray()
        .withMessage("cohortIds must be an array"),
      
      body("cohortIds.*")
        .optional()
        .isUUID()
        .withMessage("Each cohort ID must be a valid UUID"),
      
      body("isGlobal")
        .custom((value, { req }) => {
          if (value === false) {
            const cohortIds = req.body.cohortIds;
            if (!cohortIds || !Array.isArray(cohortIds) || cohortIds.length === 0) {
              throw new Error("Non general announcements must specify at least one cohort");
            }
          }
          return true;
        }),
    ];
  }

  static update() {
    return [
      param("id")
        .isUUID()
        .withMessage("Invalid announcement ID format"),
      
      body("title")
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage("Title must be between 3 and 200 characters"),
      
      body("content")
        .optional()
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage("Content must be between 10 and 5000 characters"),
      
      body("isGlobal")
        .optional()
        .isBoolean()
        .withMessage("isGlobal must be a boolean"),
      
      body("cohortIds")
        .optional()
        .isArray()
        .withMessage("cohortIds must be an array"),
      
      body("cohortIds.*")
        .optional()
        .isUUID()
        .withMessage("Each cohort ID must be a valid UUID"),
      
      body("isGlobal")
        .optional()
        .custom((value, { req }) => {
          if (value === false && req.body.cohortIds !== undefined) {
            const cohortIds = req.body.cohortIds;
            if (!Array.isArray(cohortIds) || cohortIds.length === 0) {
              throw new Error("Non-global announcements must specify at least one cohort");
            }
          }
          return true;
        }),
    ];
  }

  static delete() {
    return [
      param("id")
        .isUUID()
        .withMessage("Invalid announcement ID format"),
    ];
  }

  static toggleLike() {
    return [
      param("id")
        .isUUID()
        .withMessage("Invalid announcement ID format"),
    ];
  }
}