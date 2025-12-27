import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase, disconnectDatabase } from "@config/database";
import redis, { testRedis } from "./config/redis";
import logger from "./utils/logger";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test Database Connection
    logger.info(" Testing database connection...");
    await connectDatabase();

    // Test Redis Connection
    logger.info("Testing Redis connection...");
    const redisStatus = await testRedis();
    if (!redisStatus) {
      logger.warn(" Redis test failed, but server will continue");
    }

    const server = app.listen(PORT, () => {
      logger.info("=".repeat(50));
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API Docs: http://localhost:${PORT}/docs`);
      logger.info(` System Test: http://localhost:${PORT}/test-system`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info("HTTP server closed");

        await disconnectDatabase();
        await redis.quit();

        logger.info(" Graceful shutdown completed");
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error(" Forced shutdown after timeout");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error(" Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
