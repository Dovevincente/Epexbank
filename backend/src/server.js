import { startSavingsMaturityScheduler } from "./services/savingsMaturityScheduler.js";
import http from "http";

import app from "./app.js";
import env from "./config/env.js";
import prisma from "./config/database.js";
import { initializeSocket } from "./sockets/socket.js";

/* =========================================================
   HTTP SERVER
========================================================= */

const httpServer = http.createServer(app);

/* =========================================================
   START SERVER
========================================================= */

const startServer = async () => {
  try {
    await prisma.$connect();

    console.log(
      "PostgreSQL connected successfully",
    );

    initializeSocket(httpServer);

    httpServer.listen(
      env.port,
      () => {
        console.log("");
        console.log("========================================");
        console.log("           EPEX BANK API");
        console.log("========================================");
        console.log(
          `Environment: ${env.nodeEnv}`,
        );
        console.log(
          `Port:        ${env.port}`,
        );
        console.log(
          `API:         http://localhost:${env.port}/api`,
        );
        console.log(
          `Health:      http://localhost:${env.port}/health`,
        );
        console.log(
          "Realtime:    Socket.IO enabled",
        );
        console.log("========================================");
        console.log("");
      },
    );
  } catch (error) {
    console.error(
      "Failed to start Epex Bank API",
    );

    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  }
};

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

const gracefulShutdown = async (signal) => {
  console.log(
    `\n${signal} received. Shutting down gracefully...`,
  );

  httpServer.close(async () => {
    try {
      await prisma.$disconnect();

      console.log(
        "PostgreSQL connection closed.",
      );

      console.log(
        "Epex Bank API stopped.",
      );

      process.exit(0);
    } catch (error) {
      console.error(
        "Error during shutdown:",
        error,
      );

      process.exit(1);
    }
  });
};

/* =========================================================
   PROCESS SIGNALS
========================================================= */

process.on(
  "SIGINT",
  () => gracefulShutdown("SIGINT"),
);

process.on(
  "SIGTERM",
  () => gracefulShutdown("SIGTERM"),
);

/* =========================================================
   UNHANDLED ERRORS
========================================================= */

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "Unhandled promise rejection:",
      reason,
    );
  },
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "Uncaught exception:",
      error,
    );

    gracefulShutdown(
      "UNCAUGHT_EXCEPTION",
    );
  },
);

/* =========================================================
   BOOT
========================================================= */

startServer();


/* Automatic Fixed Savings maturity processing */
startSavingsMaturityScheduler();

