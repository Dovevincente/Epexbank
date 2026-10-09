import prisma from "../config/database.js";

/**
 * Serialize compliance settings safely for the API.
 */
const serializeComplianceSettings = (settings) => ({
  id: settings.id,

  tinCheckEnabled:
    Boolean(settings.tinCheckEnabled),

  amlCheckEnabled:
    Boolean(settings.amlCheckEnabled),

  cftCheckEnabled:
    Boolean(settings.cftCheckEnabled),

  emailDebitAlertsEnabled:
    Boolean(settings.emailDebitAlertsEnabled),

  smsDebitAlertsEnabled:
    Boolean(settings.smsDebitAlertsEnabled),

  inAppDebitAlertsEnabled:
    Boolean(settings.inAppDebitAlertsEnabled),

  createdAt: settings.createdAt,
  updatedAt: settings.updatedAt,
});

/**
 * Get the global compliance settings.
 *
 * GET /api/admin/compliance/settings
 */
export const getComplianceSettings = async (
  req,
  res,
  next,
) => {
  try {
    let settings =
      await prisma.complianceSettings.findFirst({
        orderBy: {
          createdAt: "asc",
        },
      });

    /**
     * Create the default configuration automatically
     * if this is the first time the settings are requested.
     */
    if (!settings) {
      settings =
        await prisma.complianceSettings.create({
          data: {
            tinCheckEnabled: false,
            amlCheckEnabled: false,
            cftCheckEnabled: false,

            emailDebitAlertsEnabled: true,
            smsDebitAlertsEnabled: true,
            inAppDebitAlertsEnabled: true,
          },
        });
    }

    return res.status(200).json({
      success: true,
      data: {
        settings:
          serializeComplianceSettings(
            settings,
          ),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update the global compliance settings.
 *
 * PUT /api/admin/compliance/settings
 */
export const updateComplianceSettings =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const body = req.body || {};

      /**
       * Only accept boolean values.
       * Undefined values mean "leave the existing
       * setting unchanged".
       */
      const booleanFields = [
        "tinCheckEnabled",
        "amlCheckEnabled",
        "cftCheckEnabled",
        "emailDebitAlertsEnabled",
        "smsDebitAlertsEnabled",
        "inAppDebitAlertsEnabled",
      ];

      const data = {};

      for (const field of booleanFields) {
        if (
          body[field] !== undefined
        ) {
          if (
            typeof body[field] !==
            "boolean"
          ) {
            return res.status(400).json({
              success: false,
              message:
                `${field} must be a boolean value`,
            });
          }

          data[field] = body[field];
        }
      }

      if (
        Object.keys(data).length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one compliance or alert setting must be provided",
        });
      }

      let settings =
        await prisma.complianceSettings.findFirst(
          {
            orderBy: {
              createdAt: "asc",
            },
          },
        );

      /**
       * Create the singleton settings row
       * if it does not exist yet.
       */
      if (!settings) {
        settings =
          await prisma.complianceSettings.create(
            {
              data: {
                tinCheckEnabled:
                  data.tinCheckEnabled ??
                  false,

                amlCheckEnabled:
                  data.amlCheckEnabled ??
                  false,

                cftCheckEnabled:
                  data.cftCheckEnabled ??
                  false,

                emailDebitAlertsEnabled:
                  data.emailDebitAlertsEnabled ??
                  true,

                smsDebitAlertsEnabled:
                  data.smsDebitAlertsEnabled ??
                  true,

                inAppDebitAlertsEnabled:
                  data.inAppDebitAlertsEnabled ??
                  true,
              },
            },
          );
      } else {
        settings =
          await prisma.complianceSettings.update(
            {
              where: {
                id: settings.id,
              },
              data,
            },
          );
      }

      /**
       * Record the administrator action.
       */
      await prisma.auditLog.create({
        data: {
          adminId: req.user.id,
          action: "UPDATE",
          entity: "ComplianceSettings",
          entityId: settings.id,
          description:
            "Updated transfer compliance and debit alert settings",
          metadata: {
            changes: data,
          },
          ipAddress:
            req.ip || null,
        },
      });

      return res.status(200).json({
        success: true,
        message:
          "Compliance settings updated successfully",
        data: {
          settings:
            serializeComplianceSettings(
              settings,
            ),
        },
      });
    } catch (error) {
      next(error);
    }
  };
