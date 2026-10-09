import prisma from "../config/database.js";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  transactions: true,
  security: true,
  account: true,
  email: true,
  mobile: true,
};

const NOTIFICATION_PREFERENCE_FIELDS = [
  "transactions",
  "security",
  "account",
  "email",
  "mobile",
];

const getAuthenticatedUserId = (req) => {
  if (!req.user?.id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return req.user.id;
};

const serializeNotificationPreferences = (preferences) => ({
  id: preferences?.id ?? null,
  transactions:
    preferences?.transactions ??
    DEFAULT_NOTIFICATION_PREFERENCES.transactions,
  security:
    preferences?.security ??
    DEFAULT_NOTIFICATION_PREFERENCES.security,
  account:
    preferences?.account ??
    DEFAULT_NOTIFICATION_PREFERENCES.account,
  email:
    preferences?.email ??
    DEFAULT_NOTIFICATION_PREFERENCES.email,
  mobile:
    preferences?.mobile ??
    DEFAULT_NOTIFICATION_PREFERENCES.mobile,
  createdAt: preferences?.createdAt ?? null,
  updatedAt: preferences?.updatedAt ?? null,
});

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,

        profile: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            dateOfBirth: true,
            nationality: true,
            country: true,
            state: true,
            city: true,
            address: true,
            postalCode: true,
            profileImage: true,
          },
        },

        kyc: {
          select: {
            status: true,
            verifiedAt: true,
          },
        },

        accounts: {
          select: {
            id: true,
            accountNumber: true,
            type: true,
            status: true,
            balance: true,
            availableBalance: true,
            ledgerBalance: true,
            currency: {
              select: {
                code: true,
                name: true,
                symbol: true,
                decimals: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        wallets: {
          select: {
            id: true,
            type: true,
            balance: true,
            currency: {
              select: {
                code: true,
                name: true,
                symbol: true,
                decimals: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },

        investmentAccount: {
          select: {
            id: true,
            cashBalance: true,
            totalValue: true,
            profitLoss: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/notification-preferences
 */
export const getNotificationPreferences = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    let preferences = await prisma.notificationPreference.findUnique({
      where: {
        userId,
      },
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        preferences: serializeNotificationPreferences(preferences),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/notification-preferences
 */
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const body = req.body ?? {};

    const updates = {};

    for (const field of NOTIFICATION_PREFERENCE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        if (typeof body[field] !== "boolean") {
          return res.status(400).json({
            success: false,
            message: `${field} must be a boolean`,
          });
        }

        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one notification preference must be provided",
      });
    }

    const preferences =
      await prisma.notificationPreference.upsert({
        where: {
          userId,
        },
        create: {
          userId,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...updates,
        },
        update: updates,
      });

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: {
        preferences: serializeNotificationPreferences(preferences),
      },
    });
  } catch (error) {
    next(error);
  }
};