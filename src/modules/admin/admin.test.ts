

// Mock Redis before importing app
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
import { IdGenerator } from "../../utils/idGenerator";

describe("Super Admin Endpoints", () => {
  let superAdminToken: string;
  let superAdminId: string;
  let adminToken: string;
  let adminId: string;
  let testDepartmentId: string;

  beforeAll(async () => {
    //Create a test department 
    const testDept = await prisma.department.create({
      data: {
        name: `Test-Dept-${Date.now()}`,
        description: "Test department for admin tests",
      },
    });
    testDepartmentId = testDept.id;

    //  Create a Super Admin User
    const superAdminEmail = `superadmin-${Date.now()}@test.com`;
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: "password123", 
        firstName: "Super",
        lastName: "Admin",
        role: "SUPER_ADMIN" as UserRole, 
        isActive: true,
        isEmailVerified: true,
      },
    });
    superAdminId = superAdmin.id;
    superAdminToken = TokenUtil.generateAccessToken({
        id: superAdmin.id,
        email: superAdmin.email,
        role: superAdmin.role
    });

    // Create a  Admin User 
    const adminEmail = `admin-${Date.now()}@test.com`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: "password123",
        firstName: "Regular",
        lastName: "Admin",
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      },
    });
    adminId = adminUser.id;
    adminToken = TokenUtil.generateAccessToken({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [superAdminId, adminId]
        }
      }
    });
    await prisma.admin.deleteMany({
        where: {
            user: {
                email: {
                    contains: "@test.com"
                }
            }
        }
    });
     await prisma.tutor.deleteMany({
        where: {
            user: {
                email: {
                    contains: "@test.com"
                }
            }
        }
    });
    await prisma.department.deleteMany({
        where: {
            id: testDepartmentId
        }
    });
    await prisma.$disconnect();
  });

  describe("POST /api/v1/admin/create-admin", () => {
    it("should allow SUPER_ADMIN to create an admin", async () => {
      const res = await request(app)
        .post("/api/v1/admin/create-admin")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          email: `newadmin-${Date.now()}@test.com`,
          password: "password123",
          firstName: "New",
          lastName: "Admin",
          department: testDepartmentId,
          permissions: ["READ_ONLY"],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(UserRole.ADMIN);
    });

    it("should allow SUPER_ADMIN to create a SUPER_ADMIN", async () => {
        const res = await request(app)
          .post("/api/v1/admin/create-admin")
          .set("Authorization", `Bearer ${superAdminToken}`)
          .send({
            email: `newsuperadmin-${Date.now()}@test.com`,
            password: "password123",
            firstName: "New",
            lastName: "SuperAdmin",
            department: testDepartmentId,
            permissions: ["SUPER_ADMIN"],
          });
  
        expect(res.status).toBe(201);
        expect(res.body.data.user.role).toBe("SUPER_ADMIN");
      });
  });

  describe("POST /api/v1/admin/create-tutor", () => {
    it("should allow SUPER_ADMIN to create a tutor", async () => {
      const res = await request(app)
        .post("/api/v1/admin/create-tutor")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          email: `tutor-${Date.now()}@test.com`,
          password: "password123",
          firstName: "New",
          lastName: "Tutor",
          courseCode: "WEB101",
          bio: "Expert tutor",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(UserRole.TUTOR);
    });
  });

  describe("GET /api/v1/admin/admins", () => {
    it("should allow SUPER_ADMIN to get all admins", async () => {
      const res = await request(app)
        .get("/api/v1/admin/admins")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

   describe("GET /api/v1/admin/tutors", () => {
    it("should allow SUPER_ADMIN to get all tutors", async () => {
      const res = await request(app)
        .get("/api/v1/admin/tutors")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
