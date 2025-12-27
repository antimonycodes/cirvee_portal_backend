import prisma from "../config/database";
import { UserRole, CohortStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export const TestFactory = {
  /**
   * CREATE DEPARTMENT
   */
  async createDepartment(name?: string) {
    return prisma.department.create({
      data: {
        name: name || `Dept-${Math.random().toString(36).substring(7)}`,
        description: "Test Department Description",
      },
    });
  },

  /**
   * CREATE ADMIN USER 
   */
  async createAdmin(deptId?: string) {
    const password = await bcrypt.hash("password123", 10);
    return prisma.user.create({
      data: {
        email: `admin-${Date.now()}@test.com`,
        password,
        firstName: "Test",
        lastName: "Admin",
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
        admin: {
          create: {
            staffId: `ADM-${Math.random().toString(36).substring(7).toUpperCase()}`,
            departmentId: deptId,
            permissions: ["ALL"],
          },
        },
      },
      include: { admin: true },
    });
  },

  /**
   * CREATE TUTOR USER 
   */
  async createTutor() {
    const password = await bcrypt.hash("password123", 10);
    return prisma.user.create({
      data: {
        email: `tutor-${Date.now()}@test.com`,
        password,
        firstName: "Test",
        lastName: "Tutor",
        role: UserRole.TUTOR,
        isActive: true,
        isEmailVerified: true,
        tutor: {
          create: {
            staffId: `TUT-${Math.random().toString(36).substring(7).toUpperCase()}`,
          },
        },
      },
      include: { tutor: true },
    });
  },

  /**
   * CREATE COURSE
   */
  async createCourse(adminId: string) {
    return prisma.course.create({
      data: {
        title: `Course-${Math.random().toString(36).substring(7)}`,
        description: "Standard Test Course Description",
        syllabus: ["Topic A", "Topic B"],
        price: 200,
        duration: 8,
        createdById: adminId,
        isActive: true,
      },
    });
  },

  /**
   * CREATE COHORT
   */
  async createCohort(courseId: string, tutorId: string, adminId: string) {
    return prisma.cohort.create({
      data: {
        name: `Cohort-${Math.random().toString(36).substring(7)}`,
        courseId,
        tutorId,
        createdById: adminId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), 
        status: CohortStatus.UPCOMING,
        // capacity: 25,
      },
    });
  },

  // TEST  GLOBAL CLEANUP 
  
  async clearDatabase() {
    const deleteCohorts = prisma.cohort.deleteMany();
    const deleteCourses = prisma.course.deleteMany();
    const deleteAdmins = prisma.admin.deleteMany();
    const deleteTutors = prisma.tutor.deleteMany();
    const deleteUsers = prisma.user.deleteMany();
    const deleteDepts = prisma.department.deleteMany();

    await prisma.$transaction([
      deleteCohorts,
      deleteCourses,
      deleteAdmins,
      deleteTutors,
      deleteUsers,
      deleteDepts,
    ]);
  }
};