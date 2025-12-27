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
import { UserRole, AttendanceLogType, CohortStatus } from "@prisma/client";

describe("Attendance Module (QR System)", () => {
  let adminToken: string;
  let adminId: string;
  let tutorId: string;
  let studentToken: string;
  let studentId: string;
  let testQRCodeId: string;
  let testToken: string;
  let cohortId: string;
  let courseId: string;
  let timetableId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-attendance-${timestamp}@test.com`,
        password: "password",
        firstName: "Admin",
        lastName: "Attendance",
        role: UserRole.ADMIN,
        admin: { create: { staffId: `SA-${timestamp}`, permissions: ["*"] } },
        tutor: { create: { staffId: `ST-${timestamp}`, expertise: ["Testing"], bio: "Test Bio" } }
      },
      include: { admin: true, tutor: true }
    }) as any;
    adminId = adminUser.admin!.id;
    tutorId = adminUser.tutor!.id;
    adminToken = TokenUtil.generateAccessToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    const course = await prisma.course.create({
      data: {
        title: "Test Attendance Course",
        description: "Test",
        price: 100,
        duration: 4,
        createdById: adminId,
        syllabus: ["Week 1: Intro"]
      }
    });
    courseId = course.id;

    const studentUser = await prisma.user.create({
      data: {
        email: `student-attendance-${timestamp}@test.com`,
        password: "password",
        firstName: "Student",
        lastName: "Attendance",
        role: UserRole.STUDENT,
        student: { create: { studentId: `ST-ATT-${timestamp}` } }
      },
      include: { student: true }
    }) as any;
    studentId = studentUser.student!.id;
    studentToken = TokenUtil.generateAccessToken({ id: studentUser.id, email: studentUser.email, role: studentUser.role });

    const cohort = await prisma.cohort.create({
      data: {
        name: "Test Cohort A",
        courseId: courseId,
        tutorId: tutorId,
        createdById: adminId,
        status: CohortStatus.ONGOING,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 30),
      }
    });
    cohortId = cohort.id;

    await prisma.enrollment.create({
      data: {
        studentId: studentId,
        courseId: courseId,
        cohortId: cohortId
      }
    });

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const timetable = await prisma.timetable.create({
      data: {
        cohortId: cohortId,
        dayOfWeek: currentDay,
        startTime: "00:00", // Wide window for testing
        endTime: "23:59"
      }
    });
    timetableId = timetable.id;
  });

  afterAll(async () => {
    await prisma.attendanceLog.deleteMany();
    await prisma.attendanceQRCode.deleteMany();
    await prisma.timetable.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.cohort.deleteMany();
    await prisma.course.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.student.deleteMany();
    await prisma.user.deleteMany({ where: { role: { in: [UserRole.ADMIN, UserRole.STUDENT] } } });
  });

  describe("QR Code Generation", () => {
    it("should allow admin to generate a QR code with optional cohort linkage", async () => {
      const res = await request(app)
        .post("/api/v1/attendance/qr/generate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ locationName: "Main Entrance", cohortId });

      expect(res.status).toBe(201);
      expect(res.body.data.locationName).toBe("Main Entrance");
      expect(res.body.data.cohortId).toBe(cohortId);

      testQRCodeId = res.body.data.id;
      testToken = res.body.data.token;
    });

    it("should not allow student to generate a QR code", async () => {
      const res = await request(app)
        .post("/api/v1/attendance/qr/generate")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ locationName: "Forbidden Zone" });

      expect(res.status).toBe(403);
    });
  });

  describe("Integrated Scanning Logic", () => {
    it("should automatically resolve cohort and timetable during scan", async () => {
      // Create a general QR code (not tied to cohort)
      const genRes = await request(app)
        .post("/api/v1/attendance/qr/generate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ locationName: "General Hall" });
      
      const genToken = genRes.body.data.token;

      const res = await request(app)
        .post("/api/v1/attendance/scan")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          token: genToken,
          type: AttendanceLogType.CHECK_IN
        });

      expect(res.status).toBe(200);
      expect(res.body.data.cohortId).toBe(cohortId);
      expect(res.body.data.timetableId).toBe(timetableId);
    });

    it("should correctly record check-out", async () => {
      const res = await request(app)
        .post("/api/v1/attendance/scan")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          token: testToken,
          type: AttendanceLogType.CHECK_OUT
        });

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe(AttendanceLogType.CHECK_OUT);
      expect(res.body.data.cohortId).toBe(cohortId);
    });
  });

  describe("Attendance Reporting", () => {
    it("should retrieve cohort statistics", async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/cohort/${cohortId}/stats`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cohortName).toBe("Test Cohort A");
      expect(res.body.data.attendancePercentage).toBe(100); // 1 student, hashed and seen
      expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);
    });

    it("should allow admin to filter logs by cohortId", async () => {
      const res = await request(app)
        .get("/api/v1/attendance/logs")
        .query({ cohortId })
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((log: any) => {
        expect(log.cohortId).toBe(cohortId);
      });
    });
  });
});
