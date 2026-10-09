import prisma from "../config/database.js";

import {
  serializeMoney,
  toDecimal,
} from "../utils/money.js";

/* ============================================================
   CONSTANTS
============================================================ */

const BTC = "BTC";

const PAYMENT_STATUSES = Object.freeze({
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
});

const INVESTMENT_STATUSES = Object.freeze({
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_SUBMITTED: "PAYMENT_SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACTIVE: "ACTIVE",
  MATURED: "MATURED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
});

/* ============================================================
   ERROR HELPER
============================================================ */

const createError = (
  message,
  statusCode = 400,
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

/* ============================================================
   NORMALIZATION
============================================================ */

const normalizeString = (
  value,
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
};

/* ============================================================
   SERIALIZATION
============================================================ */

const serializeInvestment = (
  investment,
) => {
  if (!investment) {
    return null;
  }

  return {
    id:
      investment.id,

    reference:
      investment.reference,

    userId:
      investment.userId,

    planId:
      investment.planId,

    principal:
      serializeMoney(
        investment.principal,
      ),

    expectedReturn:
      serializeMoney(
        investment.expectedReturn,
      ),

    totalMaturityValue:
      serializeMoney(
        investment.totalMaturityValue,
      ),

    currencyCode:
      investment.currencyCode,

    fundingMethod:
      investment.fundingMethod,

    status:
      investment.status,

    paymentStatus:
      investment.paymentStatus,

    btcAddress:
      investment.btcAddress ||
      null,

    btcAmount:
      investment.btcAmount !== null &&
      investment.btcAmount !== undefined
        ? serializeMoney(
            investment.btcAmount,
          )
        : null,

    btcRate:
      investment.btcRate !== null &&
      investment.btcRate !== undefined
        ? serializeMoney(
            investment.btcRate,
          )
        : null,

    transactionHash:
      investment.transactionHash ||
      null,

    /* ========================================================
       PAYMENT PROOF
    ======================================================== */

    paymentProofUrl:
      investment.paymentProofUrl ||
      null,

    paymentProofName:
      investment.paymentProofName ||
      null,

    paymentProofMimeType:
      investment.paymentProofMimeType ||
      null,

    paymentProofSize:
      investment.paymentProofSize !== null &&
      investment.paymentProofSize !== undefined
        ? investment.paymentProofSize
        : null,

    paymentSubmittedAt:
      investment.paymentSubmittedAt ||
      null,

    paymentVerifiedAt:
      investment.paymentVerifiedAt ||
      null,

    startDate:
      investment.startDate ||
      null,

    maturityDate:
      investment.maturityDate ||
      null,

    rejectionReason:
      investment.rejectionReason ||
      null,

    createdAt:
      investment.createdAt,

    updatedAt:
      investment.updatedAt,

    user:
      investment.user
        ? {
            id:
              investment.user.id,

            email:
              investment.user.email,

            phone:
              investment.user.phone ||
              null,

            role:
              investment.user.role,

            status:
              investment.user.status,
          }
        : null,

    plan:
      investment.plan
        ? {
            id:
              investment.plan.id,

            name:
              investment.plan.name,

            description:
              investment.plan.description ||
              null,

            currencyCode:
              investment.plan.currencyCode,

            minimumAmount:
              serializeMoney(
                investment.plan.minimumAmount,
              ),

            maximumAmount:
              investment.plan.maximumAmount !==
                null &&
              investment.plan.maximumAmount !==
                undefined
                ? serializeMoney(
                    investment.plan.maximumAmount,
                  )
                : null,

            returnRate:
              serializeMoney(
                investment.plan.returnRate,
              ),

            durationDays:
              investment.plan.durationDays,

            isActive:
              investment.plan.isActive,
          }
        : null,
  };
};

/* ============================================================
   PRISMA INCLUDE
============================================================ */

const investmentInclude = {
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  },

  plan: {
    select: {
      id: true,
      name: true,
      description: true,
      currencyCode: true,
      minimumAmount: true,
      maximumAmount: true,
      returnRate: true,
      durationDays: true,
      isActive: true,
    },
  },
};

/* ============================================================
   LIST ADMIN INVESTMENTS
   GET /api/admin/investments
============================================================ */

export const listAdminInvestments =
  async ({
    page = 1,
    limit = 25,
    search = "",
    status = "",
    paymentStatus = "",
    fundingMethod = "",
  } = {}) => {
    const safePage = Math.max(
      Number.parseInt(
        page,
        10,
      ) || 1,
      1,
    );

    const safeLimit = Math.min(
      Math.max(
        Number.parseInt(
          limit,
          10,
        ) || 25,
        1,
      ),
      100,
    );

    const skip =
      (safePage - 1) *
      safeLimit;

    const normalizedSearch =
      normalizeString(
        search,
      );

    const normalizedStatus =
      normalizeString(
        status,
      ).toUpperCase();

    const normalizedPaymentStatus =
      normalizeString(
        paymentStatus,
      ).toUpperCase();

    const normalizedFundingMethod =
      normalizeString(
        fundingMethod,
      ).toUpperCase();

    const where = {};

    if (normalizedStatus) {
      if (
        !Object.values(
          INVESTMENT_STATUSES,
        ).includes(
          normalizedStatus,
        )
      ) {
        throw createError(
          `Invalid investment status: ${normalizedStatus}.`,
          400,
        );
      }

      where.status =
        normalizedStatus;
    }

    if (normalizedPaymentStatus) {
      if (
        !Object.values(
          PAYMENT_STATUSES,
        ).includes(
          normalizedPaymentStatus,
        )
      ) {
        throw createError(
          `Invalid payment status: ${normalizedPaymentStatus}.`,
          400,
        );
      }

      where.paymentStatus =
        normalizedPaymentStatus;
    }

    if (normalizedFundingMethod) {
      if (
        normalizedFundingMethod !==
        BTC
      ) {
        throw createError(
          `Invalid investment funding method: ${normalizedFundingMethod}.`,
          400,
        );
      }

      where.fundingMethod =
        normalizedFundingMethod;
    }

    if (normalizedSearch) {
      where.OR = [
        {
          reference: {
            contains:
              normalizedSearch,

            mode:
              "insensitive",
          },
        },

        {
          transactionHash: {
            contains:
              normalizedSearch,

            mode:
              "insensitive",
          },
        },

        {
          user: {
            is: {
              email: {
                contains:
                  normalizedSearch,

                mode:
                  "insensitive",
              },
            },
          },
        },

        {
          user: {
            is: {
              phone: {
                contains:
                  normalizedSearch,

                mode:
                  "insensitive",
              },
            },
          },
        },

        {
          plan: {
            is: {
              name: {
                contains:
                  normalizedSearch,

                mode:
                  "insensitive",
              },
            },
          },
        },
      ];
    }

    const [
      investments,
      total,
    ] = await prisma.$transaction([
      prisma.investment.findMany({
        where,

        skip,

        take:
          safeLimit,

        orderBy: [
          {
            createdAt:
              "desc",
          },

          {
            id:
              "desc",
          },
        ],

        include:
          investmentInclude,
      }),

      prisma.investment.count({
        where,
      }),
    ]);

    const totalPages =
      Math.ceil(
        total /
          safeLimit,
      );

    return {
      investments:
        investments.map(
          serializeInvestment,
        ),

      pagination: {
        page:
          safePage,

        limit:
          safeLimit,

        total,

        totalPages,

        hasNextPage:
          safePage <
          totalPages,

        hasPreviousPage:
          safePage >
          1,
      },
    };
  };

/* ============================================================
   GET ADMIN INVESTMENT
   GET /api/admin/investments/:investmentId
============================================================ */

export const getAdminInvestment =
  async (
    investmentId,
  ) => {
    const id =
      normalizeString(
        investmentId,
      );

    if (!id) {
      throw createError(
        "Investment ID is required.",
        400,
      );
    }

    const investment =
      await prisma.investment.findUnique(
        {
          where: {
            id,
          },

          include:
            investmentInclude,
        },
      );

    if (!investment) {
      throw createError(
        "Investment not found.",
        404,
      );
    }

    return serializeInvestment(
      investment,
    );
  };

/* ============================================================
   MARK INVESTMENT UNDER REVIEW
   PATCH /api/admin/investments/:investmentId/review
============================================================ */

export const markInvestmentUnderReview =
  async ({
    investmentId,
    adminId,
    ipAddress = null,
  }) => {
    const id =
      normalizeString(
        investmentId,
      );

    if (!id) {
      throw createError(
        "Investment ID is required.",
        400,
      );
    }

    if (!adminId) {
      throw createError(
        "Authenticated administrator is required.",
        401,
      );
    }

    return prisma.$transaction(
      async (
        tx,
      ) => {
        const investment =
          await tx.investment.findUnique(
            {
              where: {
                id,
              },

              include:
                investmentInclude,
            },
          );

        if (!investment) {
          throw createError(
            "Investment not found.",
            404,
          );
        }

        if (
          investment.fundingMethod !==
          BTC
        ) {
          throw createError(
            "Only BTC investments are supported by this review workflow.",
            400,
          );
        }

        if (
          investment.paymentStatus !==
            PAYMENT_STATUSES.SUBMITTED &&
          investment.status !==
            INVESTMENT_STATUSES.PAYMENT_SUBMITTED
        ) {
          throw createError(
            "This investment does not have a submitted payment awaiting review.",
            400,
          );
        }

        const updated =
          await tx.investment.update(
            {
              where: {
                id,
              },

              data: {
                status:
                  INVESTMENT_STATUSES.UNDER_REVIEW,
              },

              include:
                investmentInclude,
            },
          );

        await tx.auditLog.create({
          data: {
            adminId,

            userId:
              investment.userId,

            action:
              "REVIEW",

            entity:
              "Investment",

            entityId:
              investment.id,

            description:
              "BTC investment payment moved to administrative review.",

            metadata: {
              reference:
                investment.reference,

              previousStatus:
                investment.status,

              paymentStatus:
                investment.paymentStatus,

              transactionHash:
                investment.transactionHash ||
                null,
            },

            ipAddress:
              ipAddress ||
              null,
          },
        });

        return serializeInvestment(
          updated,
        );
      },
    );
  };

/* ============================================================
   VERIFY BTC PAYMENT
   POST /api/admin/investments/:investmentId/verify
============================================================ */

/*
 * IMPORTANT:
 *
 * This function does NOT verify a Bitcoin transaction
 * against the blockchain automatically.
 *
 * The administrator is expected to independently verify
 * the transaction externally before calling this operation.
 */

export const verifyBtcInvestmentPayment =
  async ({
    investmentId,
    adminId,
    ipAddress = null,
  }) => {
    const id =
      normalizeString(
        investmentId,
      );

    if (!id) {
      throw createError(
        "Investment ID is required.",
        400,
      );
    }

    if (!adminId) {
      throw createError(
        "Authenticated administrator is required.",
        401,
      );
    }

    return prisma.$transaction(
      async (
        tx,
      ) => {
        const investment =
          await tx.investment.findUnique(
            {
              where: {
                id,
              },

              include:
                investmentInclude,
            },
          );

        if (!investment) {
          throw createError(
            "Investment not found.",
            404,
          );
        }

        if (
          investment.fundingMethod !==
          BTC
        ) {
          throw createError(
            "This investment is not funded by BTC.",
            400,
          );
        }

        if (
          !investment.transactionHash
        ) {
          throw createError(
            "No Bitcoin transaction hash has been submitted.",
            400,
          );
        }

        if (
          investment.paymentStatus ===
          PAYMENT_STATUSES.VERIFIED
        ) {
          throw createError(
            "This Bitcoin payment has already been verified.",
            400,
          );
        }

        if (
          investment.paymentStatus !==
          PAYMENT_STATUSES.SUBMITTED
        ) {
          throw createError(
            "Only submitted BTC payments can be verified.",
            400,
          );
        }

        const now =
          new Date();

        const startDate =
          now;

        const durationDays =
          investment.plan
            ?.durationDays;

        if (
          !Number.isInteger(
            durationDays,
          ) ||
          durationDays <= 0
        ) {
          throw createError(
            "Investment plan duration is invalid.",
            500,
          );
        }

        const maturityDate =
          new Date(
            startDate.getTime() +
              durationDays *
                24 *
                60 *
                60 *
                1000,
          );

        const updated =
          await tx.investment.update(
            {
              where: {
                id,
              },

              data: {
                paymentStatus:
                  PAYMENT_STATUSES.VERIFIED,

                status:
                  INVESTMENT_STATUSES.ACTIVE,

                paymentVerifiedAt:
                  now,

                startDate,

                maturityDate,

                rejectionReason:
                  null,
              },

              include:
                investmentInclude,
            },
          );

        await tx.auditLog.create({
          data: {
            adminId,

            userId:
              investment.userId,

            action:
              "APPROVE",

            entity:
              "Investment",

            entityId:
              investment.id,

            description:
              "BTC investment payment independently verified by administrator and investment activated.",

            metadata: {
              reference:
                investment.reference,

              transactionHash:
                investment.transactionHash,

              previousStatus:
                investment.status,

              previousPaymentStatus:
                investment.paymentStatus,

              newStatus:
                INVESTMENT_STATUSES.ACTIVE,

              newPaymentStatus:
                PAYMENT_STATUSES.VERIFIED,

              verifiedAt:
                now.toISOString(),
            },

            ipAddress:
              ipAddress ||
              null,
          },
        });

        return serializeInvestment(
          updated,
        );
      },
    );
  };

/* ============================================================
   REJECT BTC PAYMENT
   POST /api/admin/investments/:investmentId/reject
============================================================ */

export const rejectBtcInvestmentPayment =
  async ({
    investmentId,
    adminId,
    reason,
    ipAddress = null,
  }) => {
    const id =
      normalizeString(
        investmentId,
      );

    const rejectionReason =
      normalizeString(
        reason,
      );

    if (!id) {
      throw createError(
        "Investment ID is required.",
        400,
      );
    }

    if (!adminId) {
      throw createError(
        "Authenticated administrator is required.",
        401,
      );
    }

    if (!rejectionReason) {
      throw createError(
        "A rejection reason is required.",
        400,
      );
    }

    if (
      rejectionReason.length >
      1000
    ) {
      throw createError(
        "Rejection reason cannot exceed 1000 characters.",
        400,
      );
    }

    return prisma.$transaction(
      async (
        tx,
      ) => {
        const investment =
          await tx.investment.findUnique(
            {
              where: {
                id,
              },

              include:
                investmentInclude,
            },
          );

        if (!investment) {
          throw createError(
            "Investment not found.",
            404,
          );
        }

        if (
          investment.fundingMethod !==
          BTC
        ) {
          throw createError(
            "This investment is not funded by BTC.",
            400,
          );
        }

        if (
          investment.paymentStatus ===
          PAYMENT_STATUSES.VERIFIED
        ) {
          throw createError(
            "A verified BTC payment cannot be rejected.",
            400,
          );
        }

        if (
          investment.paymentStatus !==
            PAYMENT_STATUSES.SUBMITTED &&
          investment.status !==
            INVESTMENT_STATUSES.UNDER_REVIEW &&
          investment.status !==
            INVESTMENT_STATUSES.PAYMENT_SUBMITTED
        ) {
          throw createError(
            "This investment is not awaiting BTC payment review.",
            400,
          );
        }

        const updated =
          await tx.investment.update(
            {
              where: {
                id,
              },

              data: {
                paymentStatus:
                  PAYMENT_STATUSES.REJECTED,

                status:
                  INVESTMENT_STATUSES.REJECTED,

                rejectionReason,
              },

              include:
                investmentInclude,
            },
          );

        await tx.auditLog.create({
          data: {
            adminId,

            userId:
              investment.userId,

            action:
              "REJECT",

            entity:
              "Investment",

            entityId:
              investment.id,

            description:
              "BTC investment payment rejected by administrator.",

            metadata: {
              reference:
                investment.reference,

              transactionHash:
                investment.transactionHash ||
                null,

              previousStatus:
                investment.status,

              previousPaymentStatus:
                investment.paymentStatus,

              rejectionReason,
            },

            ipAddress:
              ipAddress ||
              null,
          },
        });

        return serializeInvestment(
          updated,
        );
      },
    );
  };

/* ============================================================
   GET BTC PAYMENT CONFIGURATION
   GET /api/admin/investments/btc/payment-config
============================================================ */

export const getAdminBitcoinPaymentConfig =
  async () => {
    const config =
      await prisma.investmentPaymentConfig.findFirst(
        {
          where: {
            fundingMethod:
              BTC,

            isActive:
              true,
          },

          orderBy: {
            createdAt:
              "desc",
          },
        },
      );

    if (!config) {
      return {
        configured:
          false,

        config:
          null,
      };
    }

    return {
      configured:
        Boolean(
          config.btcAddress &&
            config.btcRate !==
              null &&
            config.btcRate !==
              undefined,
        ),

      config: {
        id:
          config.id,

        fundingMethod:
          config.fundingMethod,

        btcAddress:
          config.btcAddress ||
          "",

        btcRate:
          config.btcRate !==
              null &&
          config.btcRate !==
              undefined
            ? serializeMoney(
                config.btcRate,
              )
            : "",

        instructions:
          config.instructions ||
          "",

        isActive:
          config.isActive,

        createdAt:
          config.createdAt,

        updatedAt:
          config.updatedAt,
      },
    };
  };

/* ============================================================
   UPDATE BTC PAYMENT CONFIGURATION
   PUT /api/admin/investments/btc/payment-config
============================================================ */

export const upsertAdminBitcoinPaymentConfig =
  async ({
    btcAddress,
    btcRate,
    instructions = "",
    isActive = true,
    adminId,
    ipAddress = null,
  }) => {
    if (!adminId) {
      throw createError(
        "Authenticated administrator is required.",
        401,
      );
    }

    const normalizedAddress =
      normalizeString(
        btcAddress,
      );

    const normalizedInstructions =
      normalizeString(
        instructions,
      );

    const enabled =
      isActive !== false;

    if (
      enabled &&
      !normalizedAddress
    ) {
      throw createError(
        "Bitcoin receiving address is required when BTC payments are enabled.",
        400,
      );
    }

    let rateDecimal =
      null;

    if (
      btcRate !==
        null &&
      btcRate !==
        undefined &&
      normalizeString(
        btcRate,
      ) !== ""
    ) {
      try {
        rateDecimal =
          toDecimal(
            btcRate,
          );
      } catch {
        throw createError(
          "Bitcoin exchange rate must be a valid number.",
          400,
        );
      }

      if (
        !rateDecimal.isFinite() ||
        rateDecimal.lte(0)
      ) {
        throw createError(
          "Bitcoin exchange rate must be greater than zero.",
          400,
        );
      }
    }

    if (
      enabled &&
      !rateDecimal
    ) {
      throw createError(
        "Bitcoin exchange rate is required when BTC payments are enabled.",
        400,
      );
    }

    if (
      normalizedAddress.length >
      255
    ) {
      throw createError(
        "Bitcoin receiving address is too long.",
        400,
      );
    }

    if (
      normalizedInstructions.length >
      5000
    ) {
      throw createError(
        "Bitcoin payment instructions cannot exceed 5000 characters.",
        400,
      );
    }

    return prisma.$transaction(
      async (
        tx,
      ) => {
        /*
         * There is intentionally no unique constraint on
         * fundingMethod in InvestmentPaymentConfig because
         * previous configurations can be retained as history.
         *
         * Only one BTC configuration is allowed to be active.
         */

        await tx.investmentPaymentConfig.updateMany(
          {
            where: {
              fundingMethod:
                BTC,

              isActive:
                true,
            },

            data: {
              isActive:
                false,
            },
          },
        );

        let config =
          null;

        if (enabled) {
          config =
            await tx.investmentPaymentConfig.create(
              {
                data: {
                  fundingMethod:
                    BTC,

                  btcAddress:
                    normalizedAddress,

                  btcRate:
                    rateDecimal,

                  instructions:
                    normalizedInstructions ||
                    null,

                  isActive:
                    true,
                },
              },
            );
        }

        await tx.auditLog.create({
          data: {
            adminId,

            userId:
              null,

            action:
              "UPDATE",

            entity:
              "InvestmentPaymentConfig",

            entityId:
              config?.id ||
              null,

            description:
              enabled
                ? "Bitcoin investment payment configuration updated and activated."
                : "Bitcoin investment payments disabled by administrator.",

            metadata: {
              fundingMethod:
                BTC,

              enabled,

              btcAddress:
                enabled
                  ? normalizedAddress
                  : null,

              btcRate:
                enabled &&
                rateDecimal
                  ? serializeMoney(
                      rateDecimal,
                    )
                  : null,

              instructionsConfigured:
                Boolean(
                  normalizedInstructions,
                ),
            },

            ipAddress:
              ipAddress ||
              null,
          },
        });

        return {
          configured:
            Boolean(
              config,
            ),

          config:
            config
              ? {
                  id:
                    config.id,

                  fundingMethod:
                    config.fundingMethod,

                  btcAddress:
                    config.btcAddress,

                  btcRate:
                    serializeMoney(
                      config.btcRate,
                    ),

                  instructions:
                    config.instructions ||
                    "",

                  isActive:
                    config.isActive,

                  createdAt:
                    config.createdAt,

                  updatedAt:
                    config.updatedAt,
                }
              : null,
        };
      },
    );
  };