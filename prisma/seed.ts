import { PrismaClient, UserRole } from "@prisma/client";

import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

console.log("!!! SEED FILE LOADED !!!");

async function main() {
  console.log(" Starting seed...");

  // 1. Create Default Department
  const adminDept = await prisma.department.upsert({
    where: { name: "Administration" },
    update: {},
    create: {
      name: "Administration",
      description: "System Management and Governance",
    },
  });

  // 2. Create Initial Admin User
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@cirvee.com" },
    update: {
      role: UserRole.SUPER_ADMIN,
    },
    create: {
      email: "admin@cirvee.com",
      password: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
    },
  });

  const adminProfile = await prisma.admin.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      staffId: "CIRVEE-001",
      departmentId: adminDept.id,
      permissions: ["ALL"], 
    },
  });

  console.log(`Super Admin verified: ${user.email}`);
  console.log(`Admin Profile verified: ${adminProfile.staffId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
