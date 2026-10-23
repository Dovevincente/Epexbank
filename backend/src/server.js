
import http from "http";

import app from "./app.js";
import env from "./config/env.js";
import prisma from "./config/database.js";
import { initializeSocket } from "./sockets/socket.js";
import { startSavingsMaturityScheduler } from "./services/savingsMaturityScheduler.js";

/*
|--------------------------------------------------------------------------
| HTTP SERVER
|--------------------------------------------------------------------------
*/

const httpServer = http.createServer(app);

/*
|--------------------------------------------------------------------------
| PORT CONFIGURATION
|--------------------------------------------------------------------------
| Render provides process.env.PORT for web services.
| Keep env.port as the local-development fallback.
*/

const port = Number(process.env.PORT || env.port || 5000);
const host = "0.0.0.0";

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    await prisma.$connect();

    console.log("PostgreSQL connected successfully");

    initializeSocket(httpServer);

    httpServer.listen(port, host, () => {
      console.log("");
      console.log("========================================");
      console.log("           EPEX BANK API");
      console.log("========================================");
      console.log(`Environment: ${env.nodeEnv}`);
      console.log(`Port:        ${port}`);
      console.log(`Host:        ${host}`);
      console.log("API:         /api");
      console.log("Health:      /health");
      console.log("Realtime:    Socket.IO enabled");
      console.log("========================================");
      console.log("");

      try {
        startSavingsMaturityScheduler();
        console.log("[Savings Maturity] Scheduler initialized.");
      } catch (schedulerError) {
        console.error(
          "[Savings Maturity] Failed to initialize scheduler:",
          schedulerError,
        );
      }
    });
  } catch (error) {
    console.error("Failed to start Epex Bank API", error);

    await prisma.$disconnect().catch(() => {});

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| GRACEFUL SHUTDOWN
|--------------------------------------------------------------------------
*/

let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`\n${signal} received. Shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10000);

  forceExit.unref();

  httpServer.close(async (serverError) => {
    try {
      if (serverError) {
        console.error("HTTP server shutdown error:", serverError);
      }

      await prisma.$disconnect();

      console.log("PostgreSQL connection closed.");
      console.log("Epex Bank API stopped.");

      clearTimeout(forceExit);
      process.exit(serverError ? 1 : 0);
    } catch (error) {
      console.error("Error during shutdown:", error);

      clearTimeout(forceExit);
      process.exit(1);
    }
  });
};

/*
|--------------------------------------------------------------------------
| PROCESS SIGNALS
|--------------------------------------------------------------------------
*/

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

/*
|--------------------------------------------------------------------------
| UNHANDLED ERRORS
|--------------------------------------------------------------------------
*/

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

/*
|--------------------------------------------------------------------------
| BOOT
|--------------------------------------------------------------------------
*/

startServer();