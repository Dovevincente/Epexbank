import express from "express";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../controllers/notificationPreferenceController.js";

import {
  getUserPreferences,
  updateUserPreferences,
} from "../controllers/userPreferenceController.js";

import {
  getCurrentUser,
} from "../controllers/userController.js";

import {
  authenticate,
} from "../middleware/auth.js";

const router =
  express.Router();

/*
 * ============================================================
 * CURRENT USER
 * ============================================================
 */

router.get(
  "/me",
  authenticate,
  getCurrentUser,
);

/*
 * ============================================================
 * USER PREFERENCES
 * ============================================================
 *
 * GET   /api/users/preferences
 * PATCH /api/users/preferences
 */

router.get(
  "/preferences",
  authenticate,
  getUserPreferences,
);

router.patch(
  "/preferences",
  authenticate,
  updateUserPreferences,
);

/*
 * ============================================================
 * NOTIFICATION PREFERENCES
 * ============================================================
 *
 * GET   /api/users/notification-preferences
 * PATCH /api/users/notification-preferences
 */

router.get(
  "/notification-preferences",
  authenticate,
  getNotificationPreferences,
);

router.patch(
  "/notification-preferences",
  authenticate,
  updateNotificationPreferences,
);

export default router;