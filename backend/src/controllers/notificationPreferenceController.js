import prisma from "../config/database.js";

const PREFERENCE_KEYS = [
  "transactions",
  "security",
  "account",
  "email",
  "mobile",
];

const DEFAULT_PREFERENCES = {
  transactions: true,
  security: true,
  account: true,
  email: true,
  mobile: true,
};

const getAuthenticatedUserId = (req) => {
  const userId = req.user?.id;

  if (!userId) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return userId;
};

const sanitizePreferences = (preferences) => ({
  transactions:
    preferences?.transactions ??
    DEFAULT_PREFERENCES.transactions,

  security:
    preferences?.security ??
    DEFAULT_PREFERENCES.security,

  account:
    preferences?.account ??
    DEFAULT_PREFERENCES.account,

  email:
    preferences?.email ??
    DEFAULT_PREFERENCES.email,

  mobile:
    preferences?.mobile ??
    DEFAULT_PREFERENCES.mobile,
});

/**
 * GET /api/users/notification-preferences
 */
export const getNotificationPreferences = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getAuthenticatedUserId(req);

    let preferences =
      await prisma.notificationPreference.findUnique({
        where: {
          userId,
        },
      });

    if (!preferences) {
      preferences =
        await prisma.notificationPreference.create({
          data: {
            userId,
            ...DEFAULT_PREFERENCES,
          },
        });
    }

    return res.status(200).json({
      success: true,
      data: {
        preferences: sanitizePreferences(
          preferences,
        ),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/users/notification-preferences
 */
export const updateNotificationPreferences = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const body = req.body || {};

    const providedKeys = Object.keys(body);

    if (providedKeys.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one notification preference is required.",
      });
    }

    const invalidKeys = providedKeys.filter(
      (key) =>
        !PREFERENCE_KEYS.includes(key),
    );

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification preference: ${invalidKeys.join(
          ", ",
        )}`,
      });
    }

    const updateData = {};

    for (const key of providedKeys) {
      if (typeof body[key] !== "boolean") {
        return res.status(400).json({
          success: false,
          message: `${key} must be a boolean value.`,
        });
      }

      updateData[key] = body[key];
    }

    let preferences =
      await prisma.notificationPreference.findUnique({
        where: {
          userId,
        },
      });

    if (!preferences) {
      preferences =
        await prisma.notificationPreference.create({
          data: {
            userId,
            ...DEFAULT_PREFERENCES,
            ...updateData,
          },
        });
    } else {
      preferences =
        await prisma.notificationPreference.update({
          where: {
            userId,
          },
          data: updateData,
        });
    }

    return res.status(200).json({
      success: true,
      message:
        "Notification preferences updated successfully.",
      data: {
        preferences: sanitizePreferences(
          preferences,
        ),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  getNotificationPreferences,
  updateNotificationPreferences,
};