import prisma from "@config/database";
import { CohortStatus } from "@prisma/client";
import logger from "../../utils/logger";

export class CohortService {
//  CALCULATE STATUS
  static calculateCohortStatus(startDate: Date, endDate: Date): CohortStatus {
    const now = new Date();
    
    if (now < startDate) {
      return CohortStatus.UPCOMING;
    } else if (now >= startDate && now <= endDate) {
      return CohortStatus.ONGOING;
    } else {
      return CohortStatus.COMPLETED;
    }
  }

  //  CALCULATE PROGRESS
  static calculateProgress(startDate: Date, endDate: Date): number {
    const now = new Date();
    const start = startDate.getTime();
    const end = endDate.getTime();
    const current = now.getTime();

    if (current < start) {
      return 0;
    } else if (current > end) {
      return 100;
    } else {
      const progress = ((current - start) / (end - start)) * 100;
      return Math.round(progress * 100) / 100; // Round to 2 decimal places
    }
  }

  // CREATE COHORT
  static async createCohort(data: {
    courseId: string;
    tutorId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    createdById: string;
  }) {
    if (data.startDate >= data.endDate) {
      throw new Error("End date must be after start date");
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course) {
      throw new Error("Course not found");
    }

    const tutor = await prisma.tutor.findUnique({
      where: { id: data.tutorId },
    });
    if (!tutor) {
      throw new Error("Tutor not found");
    }

    // Calculate initial status
    const status = this.calculateCohortStatus(data.startDate, data.endDate);

    const cohort = await prisma.cohort.create({
      data: {
        courseId: data.courseId,
        tutorId: data.tutorId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        status,
        createdById: data.createdById,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            duration: true,
          },
        },
        tutor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Cohort created: ${cohort.name} for course ${data.courseId}`);
    return cohort;
  }

  // ASSIGN TUTOR
  static async assignTutor(cohortId: string, tutorId: string) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
    });
    if (!cohort) {
      throw new Error("Cohort not found");
    }

    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
    });
    if (!tutor) {
      throw new Error("Tutor not found");
    }

    const updated = await prisma.cohort.update({
      where: { id: cohortId },
      data: { tutorId },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Tutor ${tutorId} assigned to cohort ${cohortId}`);
    return updated;
  }

 

  // GET COHORT STUDENTS
  static async getCohortStudents(cohortId: string) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        enrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cohort) {
      throw new Error("Cohort not found");
    }

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      students: cohort.enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        enrollmentDate: enrollment.enrollmentDate,
        status: enrollment.status,
        progress: enrollment.progress,
        student: {
          id: enrollment.student.id,
          studentId: enrollment.student.studentId,
          user: enrollment.student.user,
        },
      })),
      totalStudents: cohort.enrollments.length,
    };
  }

  // GET COHORT BY ID
  static async getCohortById(cohortId: string) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            price: true,
          },
        },
        tutor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            materials: true,
            assignments: true,
            timetables: true,
          },
        },
      },
    });

    if (!cohort) {
      throw new Error("Cohort not found");
    }

    return {
      ...cohort,
      calculatedStatus: this.calculateCohortStatus(
        cohort.startDate,
        cohort.endDate
      ),
      progressPercentage: this.calculateProgress(
        cohort.startDate,
        cohort.endDate
      ),
    };
  }

  // GET ALL COHORTS
  static async getAllCohorts(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: CohortStatus;
      tutorId?: string;
    }
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.tutorId) {
      where.tutorId = filters.tutorId;
    }

    const [cohorts, total] = await Promise.all([
      prisma.cohort.findMany({
        where,
        skip,
        take: limit,
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          tutor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        orderBy: {
          startDate: "desc",
        },
      }),
      prisma.cohort.count({ where }),
    ]);

    // Add calculated fields
    const cohortsWithCalculations = cohorts.map((cohort) => ({
      ...cohort,
      calculatedStatus: this.calculateCohortStatus(
        cohort.startDate,
        cohort.endDate
      ),
      progressPercentage: this.calculateProgress(
        cohort.startDate,
        cohort.endDate
      ),
    }));

    return {
      cohorts: cohortsWithCalculations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
