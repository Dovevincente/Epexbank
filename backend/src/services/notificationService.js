import prisma from "../config/database.js";
import logger from "../utils/logger.js";

/* =========================================================
   CONSTANTS
========================================================= */

const NOTIFICATION_TYPES = Object.freeze({
  TRANSACTION: "TRANSACTION",
  SECURITY: "SECURITY",
  LOAN: "LOAN",
  INVESTMENT: "INVESTMENT",
  PAYMENT: "PAYMENT",
  SYSTEM: "SYSTEM",
  PROMOTION: "PROMOTION",
});

const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

/* =========================================================
   VALIDATION HELPERS
========================================================= */

function assertUserId(userId) {
  if (!userId || typeof userId !== "string") {
    const error = new Error(
      "A valid user ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertNotificationId(
  notificationId
) {
  if (
    !notificationId ||
    typeof notificationId !== "string"
  ) {
    const error = new Error(
      "A valid notification ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function normalizeString(
  value,
  fieldName,
  maxLength
) {
  if (
    value === undefined ||
    value === null
  ) {
    const error = new Error(
      `${fieldName} is required.`
    );

    error.statusCode = 400;
    throw error;
  }

  const normalized =
    String(value).trim();

  if (!normalized) {
    const error = new Error(
      `${fieldName} is required.`
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    normalized.length >
    maxLength
  ) {
    const error = new Error(
      `${fieldName} cannot exceed ${maxLength} characters.`
    );

    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function serializeNotification(
  notification
) {
  if (!notification) {
    return null;
  }

  return {
    ...notification,
  };
}

/* =========================================================
   CREATE NOTIFICATION
========================================================= */

/**
 * Create a notification for a specific customer.
 *
 * This is the central notification creation function that
 * other backend services can call.
 */
export async function createNotification({
  userId,
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  message,
  metadata,
}) {
  assertUserId(userId);

  const normalizedTitle =
    normalizeString(
      title,
      "Notification title",
      MAX_TITLE_LENGTH
    );

  const normalizedMessage =
    normalizeString(
      message,
      "Notification message",
      MAX_MESSAGE_LENGTH
    );

  if (
    !Object.values(
      NOTIFICATION_TYPES
    ).includes(type)
  ) {
    const error = new Error(
      `Invalid notification type: ${type}.`
    );

    error.statusCode = 400;
    throw error;
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
      },
    });

  if (!user) {
    const error = new Error(
      "User not found."
    );

    error.statusCode = 404;
    throw error;
  }

  const notification =
    await prisma.notification.create({
      data: {
        userId,

        type,

        title:
          normalizedTitle,

        message:
          normalizedMessage,

        ...(metadata !== undefined
          ? {
              metadata,
            }
          : {}),
      },
    });

  logger.info(
    "Notification created",
    {
      userId,
      notificationId:
        notification.id,
      type,
    }
  );

  return serializeNotification(
    notification
  );
}

/* =========================================================
   BULK NOTIFICATIONS
========================================================= */

/**
 * Create the same notification for multiple users.
 *
 * This is intended for controlled system/admin operations.
 */
export async function createBulkNotifications({
  userIds,
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  message,
  metadata,
}) {
  if (
    !Array.isArray(userIds) ||
    userIds.length === 0
  ) {
    const error = new Error(
      "At least one user ID is required."
    );

    error.statusCode = 400;
    throw error;
  }

  if (userIds.length > 1000) {
    const error = new Error(
      "A maximum of 1000 users can be notified at once."
    );

    error.statusCode = 400;
    throw error;
  }

  const normalizedTitle =
    normalizeString(
      title,
      "Notification title",
      MAX_TITLE_LENGTH
    );

  const normalizedMessage =
    normalizeString(
      message,
      "Notification message",
      MAX_MESSAGE_LENGTH
    );

  if (
    !Object.values(
      NOTIFICATION_TYPES
    ).includes(type)
  ) {
    const error = new Error(
      `Invalid notification type: ${type}.`
    );

    error.statusCode = 400;
    throw error;
  }

  const uniqueUserIds =
    [
      ...new Set(
        userIds.filter(
          (id) =>
            typeof id ===
            "string" &&
            id.trim()
        )
      ),
    ];

  if (
    uniqueUserIds.length === 0
  ) {
    const error = new Error(
      "No valid user IDs were provided."
    );

    error.statusCode = 400;
    throw error;
  }

  const existingUsers =
    await prisma.user.findMany({
      where: {
        id: {
          in: uniqueUserIds,
        },
      },

      select: {
        id: true,
      },
    });

  const validUserIds =
    new Set(
      existingUsers.map(
        (user) => user.id
      )
    );

  const data = uniqueUserIds
    .filter((id) =>
      validUserIds.has(id)
    )
    .map((userId) => ({
      userId,

      type,

      title:
        normalizedTitle,

      message:
        normalizedMessage,

      ...(metadata !== undefined
        ? {
            metadata,
          }
        : {}),
    }));

  if (data.length === 0) {
    const error = new Error(
      "None of the supplied users could be found."
    );

    error.statusCode = 404;
    throw error;
  }

  const result =
    await prisma.notification.createMany({
      data,
    });

  logger.info(
    "Bulk notifications created",
    {
      requestedUsers:
        uniqueUserIds.length,
      created:
        result.count,
      type,
    }
  );

  return {
    created:
      result.count,

    skipped:
      uniqueUserIds.length -
      result.count,
  };
}

/* =========================================================
   CUSTOMER NOTIFICATIONS
========================================================= */

/**
 * Get notifications for the authenticated customer.
 */
export async function getUserNotifications({
  userId,
  type,
  unreadOnly = false,
  page = 1,
  limit = 20,
}) {
  assertUserId(userId);

  const parsedPage =
    Math.max(
      Number(page) || 1,
      1
    );

  const parsedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

  const where = {
    userId,
  };

  if (type) {
    if (
      !Object.values(
        NOTIFICATION_TYPES
      ).includes(type)
    ) {
      const error = new Error(
        `Invalid notification type: ${type}.`
      );

      error.statusCode = 400;
      throw error;
    }

    where.type = type;
  }

  if (unreadOnly === true) {
    where.isRead = false;
  }

  const [
    notifications,
    total,
  ] = await prisma.$transaction([
    prisma.notification.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      skip:
        (parsedPage - 1) *
        parsedLimit,

      take:
        parsedLimit,
    }),

    prisma.notification.count({
      where,
    }),
  ]);

  return {
    items:
      notifications.map(
        serializeNotification
      ),

    pagination: {
      page:
        parsedPage,

      limit:
        parsedLimit,

      total,

      totalPages:
        Math.ceil(
          total / parsedLimit
        ),
    },
  };
}

/**
 * Get one notification belonging to the
 * authenticated customer.
 */
export async function getUserNotification({
  userId,
  notificationId,
}) {
  assertUserId(userId);

  assertNotificationId(
    notificationId
  );

  const notification =
    await prisma.notification.findFirst({
      where: {
        id:
          notificationId,

        userId,
      },
    });

  if (!notification) {
    const error = new Error(
      "Notification not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeNotification(
    notification
  );
}

/* =========================================================
   READ STATE
========================================================= */

/**
 * Mark one customer notification as read.
 */
export async function markNotificationAsRead({
  userId,
  notificationId,
}) {
  assertUserId(userId);

  assertNotificationId(
    notificationId
  );

  const notification =
    await prisma.notification.findFirst({
      where: {
        id:
          notificationId,

        userId,
      },
    });

  if (!notification) {
    const error = new Error(
      "Notification not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (notification.isRead) {
    return serializeNotification(
      notification
    );
  }

  const updated =
    await prisma.notification.update({
      where: {
        id:
          notification.id,
      },

      data: {
        isRead: true,

        readAt:
          new Date(),
      },
    });

  return serializeNotification(
    updated
  );
}

/**
 * Mark all customer notifications as read.
 */
export async function markAllNotificationsAsRead(
  userId
) {
  assertUserId(userId);

  const result =
    await prisma.notification.updateMany({
      where: {
        userId,

        isRead: false,
      },

      data: {
        isRead: true,

        readAt:
          new Date(),
      },
    });

  logger.info(
    "All notifications marked as read",
    {
      userId,
      count:
        result.count,
    }
  );

  return {
    updated:
      result.count,
  };
}

/* =========================================================
   UNREAD COUNT
========================================================= */

/**
 * Get the customer's unread notification count.
 */
export async function getUnreadNotificationCount(
  userId
) {
  assertUserId(userId);

  const count =
    await prisma.notification.count({
      where: {
        userId,

        isRead: false,
      },
    });

  return {
    unread:
      count,
  };
}

/**
 * Get unread counts grouped by notification type.
 */
export async function getUnreadNotificationSummary(
  userId
) {
  assertUserId(userId);

  const grouped =
    await prisma.notification.groupBy({
      by: [
        "type",
      ],

      where: {
        userId,

        isRead: false,
      },

      _count: {
        _all: true,
      },
    });

  const summary = {
    total: 0,

    [NOTIFICATION_TYPES.TRANSACTION]:
      0,

    [NOTIFICATION_TYPES.SECURITY]:
      0,

    [NOTIFICATION_TYPES.LOAN]:
      0,

    [NOTIFICATION_TYPES.INVESTMENT]:
      0,

    [NOTIFICATION_TYPES.PAYMENT]:
      0,

    [NOTIFICATION_TYPES.SYSTEM]:
      0,

    [NOTIFICATION_TYPES.PROMOTION]:
      0,
  };

  for (const item of grouped) {
    const count =
      item._count._all;

    summary[item.type] =
      count;

    summary.total +=
      count;
  }

  return summary;
}

/* =========================================================
   DELETE / CLEAR
========================================================= */

/**
 * Delete one notification belonging to the customer.
 */
export async function deleteNotification({
  userId,
  notificationId,
}) {
  assertUserId(userId);

  assertNotificationId(
    notificationId
  );

  const notification =
    await prisma.notification.findFirst({
      where: {
        id:
          notificationId,

        userId,
      },

      select: {
        id: true,
      },
    });

  if (!notification) {
    const error = new Error(
      "Notification not found."
    );

    error.statusCode = 404;
    throw error;
  }

  await prisma.notification.delete({
    where: {
      id:
        notification.id,
    },
  });

  logger.info(
    "Notification deleted",
    {
      userId,
      notificationId,
    }
  );

  return {
    deleted: true,
    notificationId,
  };
}

/**
 * Clear all notifications for a customer.
 */
export async function clearUserNotifications(
  userId
) {
  assertUserId(userId);

  const result =
    await prisma.notification.deleteMany({
      where: {
        userId,
      },
    });

  logger.info(
    "Customer notifications cleared",
    {
      userId,
      count:
        result.count,
    }
  );

  return {
    deleted:
      result.count,
  };
}

/* =========================================================
   SYSTEM NOTIFICATION HELPERS
========================================================= */

/**
 * Transaction notification.
 */
export async function notifyTransaction({
  userId,
  title,
  message,
  metadata,
}) {
  return createNotification({
    userId,
    type:
      NOTIFICATION_TYPES.TRANSACTION,
    title,
    message,
    metadata,
  });
}

/**
 * Security notification.
 */
export async function notifySecurity({
  userId,
  title,
  message,
  metadata,
}) {
  return createNotification({
    userId,
    type:
      NOTIFICATION_TYPES.SECURITY,
    title,
    message,
    metadata,
  });
}

/**
 * Loan notification.
 */
export async function notifyLoan({
  userId,
  title,
  message,
  metadata,
}) {
  return createNotification({
    userId,
    type:
      NOTIFICATION_TYPES.LOAN,
    title,
    message,
    metadata,
  });
}

/**
 * Investment notification.
 */
export async function notifyInvestment({
  userId,
  title,
  message,
  metadata,
}) {
  return createNotification({
    userId,
    type:
      NOTIFICATION_TYPES.INVESTMENT,
    title,
    message,
    metadata,
  });
}

/**
 * Payment notification.
 */
export async function notifyPayment({
  userId,
  title,
  message,
  metadata,
}) {
  return createNotification({
    userId,
    type:
      NOTIFICATION_TYPES.PAYMENT,
    title,
    message,
    metadata,
  });
}

/**
 * System notification.
 */
export async function notifySystem({
  userId,
  title,
  message,
  metadata,
}) {
  return createNotification({
    userId,
    type:
      NOTIFICATION_TYPES.SYSTEM,
    title,
    message,
    metadata,
  });
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const notificationService = {
  createNotification,
  createBulkNotifications,

  getUserNotifications,
  getUserNotification,

  markNotificationAsRead,
  markAllNotificationsAsRead,

  getUnreadNotificationCount,
  getUnreadNotificationSummary,

  deleteNotification,
  clearUserNotifications,

  notifyTransaction,
  notifySecurity,
  notifyLoan,
  notifyInvestment,
  notifyPayment,
  notifySystem,
};

export default notificationService;