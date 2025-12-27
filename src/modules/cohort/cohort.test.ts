
jest.mock("../../config/redis", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  },
  testRedis: jest.fn().mockResolvedValue(true),
}));

import request from "supertest";
import app from "../../app";
import prisma from "@config/database";
import { TokenUtil } from "../../utils/token";
import { UserRole } from "@prisma/client";

describe("Cohort Module Endpoints", () => {
  let adminToken: string;
  let adminUserId: string;
  let adminId: string;
  let tutorToken: string;
  let tutorUserId: string;
  let tutorId: string;
  let studentToken: string;
  let studentUserId: string;
  let testCourseId: string;
  let testCohortId: string;
  let testDeptId: string;
  let testTimetableId: string;

  beforeAll(async () => {
    // 1. Create a test department
    const dept = await prisma.department.create({
      data: {
        name: `Test-Dept-Cohort-${Date.now()}`,
        description: "Test department for cohort tests",
      },
    });
    testDeptId = dept.id;

    // 2. Create an Admin User
    const adminEmail = `admin-cohort-${Date.now()}@test.com`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: "password123",
        firstName: "Admin",
        lastName: "Cohort",
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
        admin: {
          create: {
            staffId: `STAFF-ADMIN-${Date.now()}`,
            departmentId: testDeptId,
            permissions: ["CREATE_COHORT", "ASSIGN_TUTOR"],
          }
        }
      },
      include: {
        admin: true
      }
    });
    adminUserId = adminUser.id;
    adminId = adminUser.admin!.id;
    adminToken = TokenUtil.generateAccessToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    // 3. Create a Tutor User
    const tutorEmail = `tutor-cohort-${Date.now()}@test.com`;
    const tutorUser = await prisma.user.create({
      data: {
        email: tutorEmail,
        password: "password123",
        firstName: "Tutor",
        lastName: "Cohort",
        role: UserRole.TUTOR,
        isActive: true,
        isEmailVerified: true,
        tutor: {
          create: {
            staffId: `STAFF-TUTOR-${Date.now()}`,
            departmentId: testDeptId,
            expertise: ["Testing"],
          }
        }
      },
      include: {
        tutor: true
      }
    });
    tutorUserId = tutorUser.id;
    tutorId = tutorUser.tutor!.id;
    tutorToken = TokenUtil.generateAccessToken({
      id: tutorUser.id,
      email: tutorUser.email,
      role: tutorUser.role,
    });

    // 4. Create a Student User
    const studentEmail = `student-cohort-${Date.now()}@test.com`;
    const studentUser = await prisma.user.create({
      data: {
        email: studentEmail,
        password: "password123",
        firstName: "Student",
        lastName: "Cohort",
        role: UserRole.STUDENT,
        isActive: true,
        isEmailVerified: true,
      },
    });
    studentUserId = studentUser.id;
    studentToken = TokenUtil.generateAccessToken({
      id: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
    });

    // 5. Create a Course (required for cohort)
    const course = await prisma.course.create({
      data: {
        title: "Cohort dependency course",
        description: "Required for cohort",
        syllabus: ["Topic 1"],
        price: 50,
        duration: 2,
        createdById: adminId,
      }
    });
    testCourseId = course.id;

    // 6. Create a Cohort for shared use
    const cohort = await prisma.cohort.create({
      data: {
        courseId: testCourseId,
        tutorId: tutorId,
        name: "Initial Test Cohort",
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 86400000 * 30),
        status: "UPCOMING",
        createdById: adminId,
      }
    });
    testCohortId = cohort.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.cohort.deleteMany({
      where: { courseId: testCourseId }
    });
    await prisma.course.deleteMany({
        where: { id: testCourseId }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUserId, tutorUserId, studentUserId] } }
    });
    await prisma.department.deleteMany({
      where: { id: testDeptId }
    });
    await prisma.$disconnect();
  });

  describe("POST /api/v1/cohorts", () => {
    it("should allow admin to create a cohort", async () => {
      const res = await request(app)
        .post("/api/v1/cohorts")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          courseId: testCourseId,
          tutorId: tutorId,
          name: "Test Cohort Alpha",
          startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          endDate: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days later
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Test Cohort Alpha");
      testCohortId = res.body.data.id;
    });

    it("should validate that end date is after start date", async () => {
        const res = await request(app)
          .post("/api/v1/cohorts")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            courseId: testCourseId,
            tutorId: tutorId,
            name: "Invalid Dates Cohort",
            startDate: new Date(Date.now() + 86400000).toISOString(),
            endDate: new Date(Date.now()).toISOString(), // Before start date
          });
  
        expect(res.status).toBe(400);
      });
  });

  describe("GET /api/v1/cohorts/:id", () => {
    it("should return cohort details with calculated fields", async () => {
      const res = await request(app)
        .get(`/api/v1/cohorts/${testCohortId}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testCohortId);
      expect(res.body.data).toHaveProperty("calculatedStatus");
      expect(res.body.data).toHaveProperty("progressPercentage");
    });
  });



  describe("PATCH /api/v1/cohorts/:id/assign-tutor", () => {
    it("should allow admin to reassign tutor", async () => {
      // Create another tutor to reassign to
      const tutor2User = await prisma.user.create({
        data: {
          email: `tutor2-${Date.now()}@test.com`,
          password: "password123",
          firstName: "Tutor2",
          lastName: "Reassign",
          role: UserRole.TUTOR,
          tutor: {
            create: {
              staffId: `STAFF-TUTOR2-${Date.now()}`,
              departmentId: testDeptId,
            }
          }
        },
        include: { tutor: true }
      });

      const res = await request(app)
        .patch(`/api/v1/cohorts/${testCohortId}/assign-tutor`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ tutorId: tutor2User.tutor!.id });

      expect(res.status).toBe(200);
      expect(res.body.data.tutorId).toBe(tutor2User.tutor!.id);
      
      // Reassign back to original tutor to avoid foreign key constraint during cleanup
      await prisma.cohort.update({
        where: { id: testCohortId },
        data: { tutorId }
      });

      // Cleanup tutor2
      await prisma.user.delete({ where: { id: tutor2User.id } });
    });
  });

   // ============ TIMETABLE TESTS ============

  describe("POST /api/v1/cohorts/timetables", () => {
    it("should allow admin to create a timetable entry", async () => {
      const res = await request(app)
        .post("/api/v1/cohorts/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          cohortId: testCohortId,
          dayOfWeek: "Monday",
          startTime: "09:00",
          endTime: "11:00",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dayOfWeek).toBe("Monday");
      expect(res.body.data.startTime).toBe("09:00");
      testTimetableId = res.body.data.id;
    });

    it("should prevent tutor from creating timetable entry", async () => {
      const res = await request(app)
        .post("/api/v1/cohorts/timetables")
        .set("Authorization", `Bearer ${tutorToken}`)
        .send({
          cohortId: testCohortId,
          dayOfWeek: "Tuesday",
          startTime: "10:00",
          endTime: "12:00",
        });

      expect(res.status).toBe(403);
    });

    it("should prevent student from creating timetable entry", async () => {
      const res = await request(app)
        .post("/api/v1/cohorts/timetables")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          cohortId: testCohortId,
          dayOfWeek: "Wednesday",
          startTime: "14:00",
          endTime: "16:00",
        });

      expect(res.status).toBe(403);
    });

    it("should validate time format", async () => {
      const res = await request(app)
        .post("/api/v1/cohorts/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          cohortId: testCohortId,
          dayOfWeek: "Monday",
          startTime: "9:00", // Invalid format (missing leading zero)
          endTime: "11:00",
        });

      expect(res.status).toBe(400);
    });

    it("should validate day of week", async () => {
      const res = await request(app)
        .post("/api/v1/cohorts/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          cohortId: testCohortId,
          dayOfWeek: "Funday", 
          startTime: "09:00",
          endTime: "11:00",
        });

      expect(res.status).toBe(400);
    });

    it("should detect time conflicts", async () => {
      // Create first timetable entry
      await prisma.timetable.create({
        data: {
          cohortId: testCohortId,
          dayOfWeek: "Tuesday",
          startTime: "14:00",
          endTime: "16:00",
        }
      });

      // Try to create overlapping entry
      const res = await request(app)
        .post("/api/v1/cohorts/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          cohortId: testCohortId,
          dayOfWeek: "Tuesday",
          startTime: "15:00", // Overlaps with 14:00-16:00
          endTime: "17:00",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("conflict");
    });

    it("should validate that end time is after start time", async () => {
      const res = await request(app)
        .post("/api/v1/cohorts/timetables")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          cohortId: testCohortId,
          dayOfWeek: "Wednesday",
          startTime: "15:00",
          endTime: "14:00", // Before start time
        });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/v1/cohorts/timetables/:id", () => {
    it("should allow admin to update timetable entry", async () => {
      const res = await request(app)
        .patch(`/api/v1/cohorts/timetables/${testTimetableId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: "10:00",
          endTime: "12:00",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.startTime).toBe("10:00");
      expect(res.body.data.endTime).toBe("12:00");
    });

    it("should prevent tutor from updating timetable", async () => {
      const res = await request(app)
        .patch(`/api/v1/cohorts/timetables/${testTimetableId}`)
        .set("Authorization", `Bearer ${tutorToken}`)
        .send({
          startTime: "11:00",
        });

      expect(res.status).toBe(403);
    });

    it("should validate updated times don't create conflicts", async () => {
      // Create another entry on Monday
      const anotherEntry = await prisma.timetable.create({
        data: {
          cohortId: testCohortId,
          dayOfWeek: "Monday",
          startTime: "14:00",
          endTime: "16:00",
        }
      });

      // Try to update testTimetableId to overlap
      const res = await request(app)
        .patch(`/api/v1/cohorts/timetables/${testTimetableId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: "15:00",
          endTime: "17:00",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("conflict");

      // Cleanup
      await prisma.timetable.delete({ where: { id: anotherEntry.id } });
    });
  });

  describe("GET /api/v1/cohorts/:cohortId/timetable/weekly", () => {
    beforeAll(async () => {
      // Create a full week's timetable
      const schedule = [
        { day: "Monday", start: "09:00", end: "11:00" },
        { day: "Tuesday", start: "09:00", end: "11:00" },
        { day: "Wednesday", start: "14:00", end: "16:00" },
        { day: "Thursday", start: "10:00", end: "12:00" },
        { day: "Friday", start: "09:00", end: "11:00" },
      ];

      for (const slot of schedule) {
        await prisma.timetable.create({
          data: {
            cohortId: testCohortId,
            dayOfWeek: slot.day,
            startTime: slot.start,
            endTime: slot.end,
          }
        });
      }
    });

    it("should allow student to view weekly timetable", async () => {
      const res = await request(app)
        .get(`/api/v1/cohorts/${testCohortId}/timetable/weekly`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("weekInfo");
      expect(res.body.data).toHaveProperty("schedule");
      expect(res.body.data.weekInfo).toHaveProperty("weekNumber");
      expect(res.body.data.weekInfo).toHaveProperty("startDate");
      expect(res.body.data.weekInfo).toHaveProperty("endDate");
      expect(Array.isArray(res.body.data.schedule)).toBe(true);
    });

    it("should allow tutor to view weekly timetable", async () => {
      const res = await request(app)
        .get(`/api/v1/cohorts/${testCohortId}/timetable/weekly`)
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("schedule");
    });

    it("should include actual dates for each day", async () => {
      const res = await request(app)
        .get(`/api/v1/cohorts/${testCohortId}/timetable/weekly`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const schedule = res.body.data.schedule;
      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0]).toHaveProperty("actualDate");
      expect(schedule[0]).toHaveProperty("isPast");
      expect(schedule[0]).toHaveProperty("isToday");
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .get(`/api/v1/cohorts/${testCohortId}/timetable/weekly`);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/cohorts/:cohortId/timetable/all", () => {
    it("should allow admin to view all timetables", async () => {
      const res = await request(app)
        .get(`/api/v1/cohorts/${testCohortId}/timetable/all`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("timetables");
      expect(Array.isArray(res.body.data.timetables)).toBe(true);
      expect(res.body.data).toHaveProperty("totalEntries");
    });

    it("should prevent tutor from accessing admin view", async () => {
      const res = await request(app)
        .get(`/api/v1/cohorts/${testCohortId}/timetable/all`)
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(res.status).toBe(403);
    });

    it("should prevent student from accessing admin view", async () => {
      const res = await request(app)
        .get(`/api/v1/cohorts/${testCohortId}/timetable/all`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/v1/cohorts/timetables/:id", () => {
    it("should allow admin to delete timetable entry", async () => {
      // Create a timetable to delete
      const timetableToDelete = await prisma.timetable.create({
        data: {
          cohortId: testCohortId,
          dayOfWeek: "Saturday",
          startTime: "10:00",
          endTime: "12:00",
        }
      });

      const res = await request(app)
        .delete(`/api/v1/cohorts/timetables/${timetableToDelete.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("deleted successfully");

      // Verify deletion
      const deleted = await prisma.timetable.findUnique({
        where: { id: timetableToDelete.id }
      });
      expect(deleted).toBeNull();
    });

    it("should prevent tutor from deleting timetable", async () => {
      const res = await request(app)
        .delete(`/api/v1/cohorts/timetables/${testTimetableId}`)
        .set("Authorization", `Bearer ${tutorToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 400 for non-existent timetable", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .delete(`/api/v1/cohorts/timetables/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });


});
