import prisma from "../config/database.js";

const DEFAULT_PREFERENCES = {
  currency: "USD",
  language: "English",
};

const ALLOWED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
];

const ALLOWED_LANGUAGES = [
  "English",
];

const getAuthenticatedUserId = (req) => {
  if (!req.user?.id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return req.user.id;
};

const serializePreferences = (preferences) => ({
  id: preferences?.id ?? null,

  currency:
    preferences?.currency ??
    DEFAULT_PREFERENCES.currency,

  language:
    preferences?.language ??
    DEFAULT_PREFERENCES.language,

  createdAt:
    preferences?.createdAt ?? null,

  updatedAt:
    preferences?.updatedAt ?? null,
});

/**
 * GET /api/users/preferences
 */
export const getUserPreferences = async (
  req,
  res,
  next,
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    let preferences =
      await prisma.userPreference.findUnique({
        where: {
          userId,
        },
      });

    if (!preferences) {
      preferences =
        await prisma.userPreference.create({
          data: {
            userId,
            ...DEFAULT_PREFERENCES,
          },
        });
    }

    return res.status(200).json({
      success: true,
      data: {
        preferences:
          serializePreferences(
            preferences,
          ),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/preferences
 */
export const updateUserPreferences =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      const body =
        req.body ?? {};

      const updates = {};

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "currency",
        )
      ) {
        const currency =
          String(
            body.currency ?? "",
          )
            .trim()
            .toUpperCase();

        if (
          !ALLOWED_CURRENCIES.includes(
            currency,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid currency preference.",
          });
        }

        updates.currency =
          currency;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "language",
        )
      ) {
        const language =
          String(
            body.language ?? "",
          ).trim();

        if (
          !ALLOWED_LANGUAGES.includes(
            language,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid language preference.",
          });
        }

        updates.language =
          language;
      }

      if (
        Object.keys(updates).length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one preference must be provided.",
        });
      }

      const preferences =
        await prisma.userPreference.upsert({
          where: {
            userId,
          },

          create: {
            userId,

            ...DEFAULT_PREFERENCES,

            ...updates,
          },

          update: updates,
        });

      return res.status(200).json({
        success: true,

        message:
          "Preferences updated successfully.",

        data: {
          preferences:
            serializePreferences(
              preferences,
            ),
        },
      });
    } catch (error) {
      next(error);
    }
  };