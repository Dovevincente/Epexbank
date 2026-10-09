import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import env from "../config/env.js";

/* =========================================================
   SOCKET.IO SERVER
========================================================= */

let io = null;

/* =========================================================
   SOCKET AUTHENTICATION
========================================================= */

const authenticateSocket = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(
        /^Bearer\s+/i,
        "",
      );

    if (!token) {
      return next(
        new Error("Authentication required"),
      );
    }

    const decoded = jwt.verify(
      token,
      env.jwtSecret,
    );

    if (!decoded?.id) {
      return next(
        new Error("Invalid authentication token"),
      );
    }

    socket.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    return next(
      new Error(
        "Invalid or expired authentication token",
      ),
    );
  }
};

/* =========================================================
   INITIALIZE SOCKET.IO
========================================================= */

export const initializeSocket = (httpServer) => {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
      methods: [
        "GET",
        "POST",
      ],
    },
    transports: [
      "websocket",
      "polling",
    ],
  });

  /* =======================================================
     SOCKET AUTHENTICATION
  ======================================================= */

  io.use(authenticateSocket);

  /* =======================================================
     CONNECTION HANDLER
  ======================================================= */

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    socket.join(`user:${userId}`);

    if (socket.user.role) {
      socket.join(
        `role:${socket.user.role}`,
      );
    }

    socket.emit(
      "socket:connected",
      {
        success: true,
        message:
          "Real-time connection established",
      },
    );

    socket.on("disconnect", (reason) => {
      console.info(
        `[Socket] User ${userId} disconnected: ${reason}`,
      );
    });
  });

  console.info(
    "[Socket] Socket.IO server initialized",
  );

  return io;
};

/* =========================================================
   GET SOCKET.IO INSTANCE
========================================================= */

export const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized",
    );
  }

  return io;
};

/* =========================================================
   EMIT TO USER
========================================================= */

export const emitToUser = (
  userId,
  event,
  payload,
) => {
  if (!io) {
    return false;
  }

  io.to(`user:${userId}`).emit(
    event,
    payload,
  );

  return true;
};

/* =========================================================
   EMIT TO ROLE
========================================================= */

export const emitToRole = (
  role,
  event,
  payload,
) => {
  if (!io) {
    return false;
  }

  io.to(`role:${role}`).emit(
    event,
    payload,
  );

  return true;
};

/* =========================================================
   BROADCAST EVENT
========================================================= */

export const emitToAll = (
  event,
  payload,
) => {
  if (!io) {
    return false;
  }

  io.emit(
    event,
    payload,
  );

  return true;
};

/* =========================================================
   BANKING EVENT HELPERS
========================================================= */

export const emitTransactionUpdate = (
  userId,
  transaction,
) => {
  return emitToUser(
    userId,
    "transaction:updated",
    transaction,
  );
};

export const emitTransferUpdate = (
  userId,
  transfer,
) => {
  return emitToUser(
    userId,
    "transfer:updated",
    transfer,
  );
};

export const emitPaymentUpdate = (
  userId,
  payment,
) => {
  return emitToUser(
    userId,
    "payment:updated",
    payment,
  );
};

export const emitNotification = (
  userId,
  notification,
) => {
  return emitToUser(
    userId,
    "notification:new",
    notification,
  );
};
