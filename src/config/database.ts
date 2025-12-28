import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("PostgreSQL connected successfully");

    // verify connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database query test successful");
  } catch (error) {
    logger.error("Database connection failed:", error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};

export default prisma;
