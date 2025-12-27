"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/generated/prisma");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new prisma_1.PrismaClient();
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
    console.log(" Admin Department created/verified");
    // 2. Create Initial Admin User
    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    const superAdmin = await prisma.user.upsert({
        where: { email: "admin@cirvee.com" },
        update: {
            role: prisma_1.UserRole.SUPER_ADMIN,
        },
        create: {
            email: "admin@cirvee.com",
            password: hashedPassword,
            firstName: "System",
            lastName: "Administrator",
            role: prisma_1.UserRole.SUPER_ADMIN,
            isEmailVerified: true,
            admin: {
                create: {
                    staffId: "CIRVEE-001",
                    departmentId: adminDept.id,
                    permissions: [],
                },
            },
        },
    });
    console.log("Initial Admin created:", superAdmin.email);
    console.log("Seed completed.");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
