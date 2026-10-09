import { Router } from "express";

import {
  listNotifications,
  listUnreadNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
} from "../controllers/notificationController.js";

import { generalRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* =========================================================
   NOTIFICATION API RATE LIMITING
========================================================= */

router.use(generalRateLimiter);

/* =========================================================
   NOTIFICATION LIST
========================================================= */

router.get(
  "/",
  listNotifications,
);

router.get(
  "/unread",
  listUnreadNotifications,
);

/* =========================================================
   MARK NOTIFICATIONS AS READ
========================================================= */

router.patch(
  "/read-all",
  markAllAsRead,
);

router.patch(
  "/:notificationId/read",
  markAsRead,
);

/* =========================================================
   DELETE NOTIFICATION
========================================================= */

router.delete(
  "/:notificationId",
  removeNotification,
);

export default router;
