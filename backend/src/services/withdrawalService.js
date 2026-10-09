// ============================================================
// EPEX BANK - WITHDRAWAL SERVICE
// ============================================================
// Handles withdrawal request creation and lifecycle management.
//
// Prisma Withdrawal model:
//
// Withdrawal
// - id
// - reference
// - userId
// - amount
// - fee
// - currencyCode
// - method
// - status
// - destination
// - metadata
// - createdAt
// - updatedAt
//
// Important:
// The current Withdrawal model has no accountId/walletId and no
// direct ledger relation. This service therefore manages the
// withdrawal request lifecycle without falsely debiting a bank
// account.
//
// Actual settlement/debit should be performed by a dedicated
// financial transaction service once the account relationship is
// explicitly established.
// ============================================================

import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import {
  toDecimal,
  serializeMoney,
} from "../utils/money.js";
import {
  generateReference,
} from "../utils/reference.js";

// ============================================================
// CONSTANTS
// ============================================================

const WITHDRAWAL_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

const DEFAULT_FEE = "0";

const MIN_WITHDRAWAL_AMOUNT = new PrismaDecimal("0.01");

// ============================================================
// DECIMAL HELPER
// ============================================================
// We intentionally avoid importing Prisma.Decimal directly just
// for this constant. The actual amount conversion is delegated
// to utils/money.js.
// ============================================================

function PrismaDecimal(value) {
  return toDecimal(value);
}

// ============================================================
// BASIC HELPERS
// ============================================================

function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeStatus(value) {
  return normalizeString(value).toUpperCase();
}

function normalizeMethod(value) {
  return normalizeString(value).toUpperCase();
}

function assertRequired(value, fieldName) {
  const normalized = normalizeString(value);

  if (!normalized) {
    const error = new Error(
      `${fieldName} is required.`
    );

    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function assertPositiveAmount(value, fieldName = "Amount") {
  const amount = toDecimal(value);

  if (amount.lte(0)) {
    const error = new Error(
      `${fieldName} must be greater than zero.`
    );

    error.statusCode = 400;
    throw error;
  }

  return amount;
}

function assertValidStatus(status) {
  if (!WITHDRAWAL_STATUSES.includes(status)) {
    const error = new Error(
      `Invalid withdrawal status. Allowed values: ${WITHDRAWAL_STATUSES.join(
        ", "
      )}`
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertDestination(destination) {
  if (
    destination === undefined ||
    destination === null
  ) {
    const error = new Error(
      "Withdrawal destination is required."
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    typeof destination !== "object" ||
    Array.isArray(destination)
  ) {
    const error = new Error(
      "Withdrawal destination must be a JSON object."
    );

    error.statusCode = 400;
    throw error;
  }

  if (Object.keys(destination).length === 0) {
    const error = new Error(
      "Withdrawal destination cannot be empty."
    );

    error.statusCode = 400;
    throw error;
  }

  return destination;
}

function assertMetadata(metadata) {
  if (
    metadata === undefined ||
    metadata === null
  ) {
    return {};
  }

  if (
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    const error = new Error(
      "Withdrawal metadata must be a JSON object."
    );

    error.statusCode = 400;
    throw error;
  }

  return metadata;
}

function serializeWithdrawal(withdrawal) {
  if (!withdrawal) {
    return null;
  }

  return {
    id: withdrawal.id,
    reference: withdrawal.reference,
    userId: withdrawal.userId,
    amount: serializeMoney(withdrawal.amount),
    fee: serializeMoney(withdrawal.fee),
    currencyCode: withdrawal.currencyCode,
    method: withdrawal.method,
    status: withdrawal.status,
    destination: withdrawal.destination,
    metadata: withdrawal.metadata,
    createdAt: withdrawal.createdAt,
    updatedAt: withdrawal.updatedAt,
  };
}

function buildPagination({
  page,
  limit,
  total,
}) {
  const totalPages = Math.ceil(
    total / limit
  );

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function getPagination({
  page,
  limit,
}) {
  const normalizedPage = Math.max(
    1,
    Number.parseInt(page, 10) || 1
  );

  const requestedLimit =
    Number.parseInt(limit, 10) || 20;

  const normalizedLimit = Math.min(
    Math.max(requestedLimit, 1),
    100
  );

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip:
      (normalizedPage - 1) *
      normalizedLimit,
  };
}

async function createAuditLog({
  userId = null,
  adminId = null,
  action,
  entityId,
  description,
  metadata = {},
  ipAddress = null,
  tx = prisma,
}) {
  return tx.auditLog.create({
    data: {
      userId,
      adminId,
      action,
      entity: "Withdrawal",
      entityId,
      description,
      metadata,
      ipAddress,
    },
  });
}

// ============================================================
// CREATE WITHDRAWAL
// ============================================================

export async function createWithdrawal({
  userId,
  amount,
  fee = DEFAULT_FEE,
  currencyCode,
  method,
  destination,
  metadata = {},
  ipAddress = null,
}) {
  const normalizedUserId = assertRequired(
    userId,
    "User ID"
  );

  const withdrawalAmount =
    assertPositiveAmount(amount);

  const withdrawalFee =
    toDecimal(fee);

  if (withdrawalFee.lt(0)) {
    const error = new Error(
      "Withdrawal fee cannot be negative."
    );

    error.statusCode = 400;
    throw error;
  }

  const normalizedCurrencyCode =
    assertRequired(
      currencyCode,
      "Currency code"
    ).toUpperCase();

  const normalizedMethod =
    assertRequired(
      method,
      "Withdrawal method"
    );

  const normalizedDestination =
    assertDestination(destination);

  const normalizedMetadata =
    assertMetadata(metadata);

  const minimumAmount =
    MIN_WITHDRAWAL_AMOUNT;

  if (
    withdrawalAmount.lt(
      minimumAmount
    )
  ) {
    const error = new Error(
      "Withdrawal amount is below the minimum allowed amount."
    );

    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: normalizedUserId,
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

  const totalAmount =
    withdrawalAmount.add(
      withdrawalFee
    );

  const reference =
    generateReference("WDR");

  const withdrawal =
    await prisma.$transaction(
      async (tx) => {
        const created =
          await tx.withdrawal.create({
            data: {
              reference,
              userId: normalizedUserId,
              amount: withdrawalAmount,
              fee: withdrawalFee,
              currencyCode:
                normalizedCurrencyCode,
              method: normalizedMethod,
              status: "PENDING",
              destination:
                normalizedDestination,
              metadata: {
                ...normalizedMetadata,
                requestedTotal:
                  totalAmount.toString(),
              },
            },
          });

        await createAuditLog({
          userId: normalizedUserId,
          action: "CREATE",
          entityId: created.id,
          description:
            "Customer created a withdrawal request.",
          metadata: {
            reference:
              created.reference,
            amount:
              withdrawalAmount.toString(),
            fee:
              withdrawalFee.toString(),
            currencyCode:
              normalizedCurrencyCode,
            method:
              normalizedMethod,
          },
          ipAddress,
          tx,
        });

        return created;
      }
    );

  logger.info(
    "Withdrawal request created",
    {
      withdrawalId: withdrawal.id,
      reference:
        withdrawal.reference,
      userId:
        normalizedUserId,
      amount:
        withdrawalAmount.toString(),
      currencyCode:
        normalizedCurrencyCode,
    }
  );

  return serializeWithdrawal(
    withdrawal
  );
}

// ============================================================
// GET CUSTOMER WITHDRAWAL
// ============================================================

export async function getWithdrawal({
  withdrawalId,
  userId,
}) {
  const normalizedWithdrawalId =
    assertRequired(
      withdrawalId,
      "Withdrawal ID"
    );

  const normalizedUserId =
    assertRequired(
      userId,
      "User ID"
    );

  const withdrawal =
    await prisma.withdrawal.findFirst({
      where: {
        id: normalizedWithdrawalId,
        userId:
          normalizedUserId,
      },
    });

  if (!withdrawal) {
    const error = new Error(
      "Withdrawal not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeWithdrawal(
    withdrawal
  );
}

// ============================================================
// GET WITHDRAWAL BY REFERENCE
// ============================================================

export async function getWithdrawalByReference({
  reference,
  userId = null,
}) {
  const normalizedReference =
    assertRequired(
      reference,
      "Withdrawal reference"
    );

  const where = {
    reference:
      normalizedReference,
  };

  if (userId) {
    where.userId =
      normalizeString(userId);
  }

  const withdrawal =
    await prisma.withdrawal.findFirst({
      where,
    });

  if (!withdrawal) {
    const error = new Error(
      "Withdrawal not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeWithdrawal(
    withdrawal
  );
}

// ============================================================
// GET USER WITHDRAWALS
// ============================================================

export async function getUserWithdrawals({
  userId,
  page,
  limit,
  status,
  method,
  currencyCode,
}) {
  const normalizedUserId =
    assertRequired(
      userId,
      "User ID"
    );

  const pagination =
    getPagination({
      page,
      limit,
    });

  const where = {
    userId:
      normalizedUserId,
  };

  if (status) {
    const normalizedStatus =
      normalizeStatus(status);

    assertValidStatus(
      normalizedStatus
    );

    where.status =
      normalizedStatus;
  }

  if (method) {
    where.method =
      normalizeMethod(method);
  }

  if (currencyCode) {
    where.currencyCode =
      normalizeString(
        currencyCode
      ).toUpperCase();
  }

  const [
    withdrawals,
    total,
  ] = await prisma.$transaction([
    prisma.withdrawal.findMany({
      where,
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
      skip:
        pagination.skip,
      take:
        pagination.limit,
    }),

    prisma.withdrawal.count({
      where,
    }),
  ]);

  return {
    withdrawals:
      withdrawals.map(
        serializeWithdrawal
      ),

    pagination:
      buildPagination({
        page:
          pagination.page,
        limit:
          pagination.limit,
        total,
      }),
  };
}

// ============================================================
// ADMIN - GET WITHDRAWAL
// ============================================================

export async function getWithdrawalById({
  withdrawalId,
}) {
  const normalizedWithdrawalId =
    assertRequired(
      withdrawalId,
      "Withdrawal ID"
    );

  const withdrawal =
    await prisma.withdrawal.findUnique({
      where: {
        id:
          normalizedWithdrawalId,
      },
    });

  if (!withdrawal) {
    const error = new Error(
      "Withdrawal not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeWithdrawal(
    withdrawal
  );
}

// ============================================================
// ADMIN - LIST WITHDRAWALS
// ============================================================

export async function getAllWithdrawals({
  page,
  limit,
  status,
  method,
  currencyCode,
  userId,
}) {
  const pagination =
    getPagination({
      page,
      limit,
    });

  const where = {};

  if (status) {
    const normalizedStatus =
      normalizeStatus(status);

    assertValidStatus(
      normalizedStatus
    );

    where.status =
      normalizedStatus;
  }

  if (method) {
    where.method =
      normalizeMethod(method);
  }

  if (currencyCode) {
    where.currencyCode =
      normalizeString(
        currencyCode
      ).toUpperCase();
  }

  if (userId) {
    where.userId =
      normalizeString(userId);
  }

  const [
    withdrawals,
    total,
  ] = await prisma.$transaction([
    prisma.withdrawal.findMany({
      where,
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
      skip:
        pagination.skip,
      take:
        pagination.limit,
    }),

    prisma.withdrawal.count({
      where,
    }),
  ]);

  return {
    withdrawals:
      withdrawals.map(
        serializeWithdrawal
      ),

    pagination:
      buildPagination({
        page:
          pagination.page,
        limit:
          pagination.limit,
        total,
      }),
  };
}

// ============================================================
// ADMIN - START PROCESSING
// ============================================================

export async function processWithdrawal({
  withdrawalId,
  adminId,
  metadata = {},
  ipAddress = null,
}) {
  return updateWithdrawalStatus({
    withdrawalId,
    adminId,
    status: "PROCESSING",
    metadata,
    ipAddress,
  });
}

// ============================================================
// ADMIN - COMPLETE WITHDRAWAL
// ============================================================
// Completing the request only marks the withdrawal as settled
// in the current lifecycle model. It does not perform an account
// debit because Withdrawal has no account relation.
// ============================================================

export async function completeWithdrawal({
  withdrawalId,
  adminId,
  metadata = {},
  ipAddress = null,
}) {
  return updateWithdrawalStatus({
    withdrawalId,
    adminId,
    status: "COMPLETED",
    metadata,
    ipAddress,
  });
}

// ============================================================
// ADMIN - FAIL WITHDRAWAL
// ============================================================

export async function failWithdrawal({
  withdrawalId,
  adminId,
  reason,
  metadata = {},
  ipAddress = null,
}) {
  const normalizedReason =
    assertRequired(
      reason,
      "Failure reason"
    );

  return updateWithdrawalStatus({
    withdrawalId,
    adminId,
    status: "FAILED",
    metadata: {
      ...metadata,
      failureReason:
        normalizedReason,
    },
    ipAddress,
  });
}

// ============================================================
// CANCEL CUSTOMER WITHDRAWAL
// ============================================================
// Customers can cancel only PENDING withdrawals.
//
// A withdrawal already being processed must not be silently
// cancelled by the customer.
// ============================================================

export async function cancelWithdrawal({
  withdrawalId,
  userId,
  reason = "Customer cancelled withdrawal.",
  ipAddress = null,
}) {
  const normalizedWithdrawalId =
    assertRequired(
      withdrawalId,
      "Withdrawal ID"
    );

  const normalizedUserId =
    assertRequired(
      userId,
      "User ID"
    );

  const withdrawal =
    await prisma.withdrawal.findFirst({
      where: {
        id:
          normalizedWithdrawalId,
        userId:
          normalizedUserId,
      },
    });

  if (!withdrawal) {
    const error = new Error(
      "Withdrawal not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (
    withdrawal.status !==
    "PENDING"
  ) {
    const error = new Error(
      "Only pending withdrawals can be cancelled by the customer."
    );

    error.statusCode = 400;
    throw error;
  }

  const normalizedReason =
    normalizeString(reason) ||
    "Customer cancelled withdrawal.";

  const cancelled =
    await prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.withdrawal.update({
            where: {
              id:
                withdrawal.id,
            },
            data: {
              status:
                "CANCELLED",

              metadata: {
                ...(withdrawal.metadata &&
                typeof withdrawal.metadata ===
                  "object" &&
                !Array.isArray(
                  withdrawal.metadata
                )
                  ? withdrawal.metadata
                  : {}),

                cancellationReason:
                  normalizedReason,
              },
            },
          });

        await createAuditLog({
          userId:
            normalizedUserId,
          action:
            "CANCEL",
          entityId:
            withdrawal.id,
          description:
            "Customer cancelled a withdrawal request.",
          metadata: {
            reference:
              withdrawal.reference,
            reason:
              normalizedReason,
          },
          ipAddress,
          tx,
        });

        return updated;
      }
    );

  logger.info(
    "Withdrawal cancelled by customer",
    {
      withdrawalId:
        withdrawal.id,
      reference:
        withdrawal.reference,
      userId:
        normalizedUserId,
    }
  );

  return serializeWithdrawal(
    cancelled
  );
}

// ============================================================
// ADMIN - CANCEL WITHDRAWAL
// ============================================================

export async function adminCancelWithdrawal({
  withdrawalId,
  adminId,
  reason,
  ipAddress = null,
}) {
  const normalizedWithdrawalId =
    assertRequired(
      withdrawalId,
      "Withdrawal ID"
    );

  const normalizedAdminId =
    assertRequired(
      adminId,
      "Admin ID"
    );

  const normalizedReason =
    assertRequired(
      reason,
      "Cancellation reason"
    );

  const withdrawal =
    await prisma.withdrawal.findUnique({
      where: {
        id:
          normalizedWithdrawalId,
      },
    });

  if (!withdrawal) {
    const error = new Error(
      "Withdrawal not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (
    ["COMPLETED", "FAILED", "CANCELLED"].includes(
      withdrawal.status
    )
  ) {
    const error = new Error(
      `Withdrawal cannot be cancelled from ${withdrawal.status} status.`
    );

    error.statusCode = 400;
    throw error;
  }

  const cancelled =
    await prisma.$transaction(
      async (tx) => {
        const existingMetadata =
          withdrawal.metadata &&
          typeof withdrawal.metadata ===
            "object" &&
          !Array.isArray(
            withdrawal.metadata
          )
            ? withdrawal.metadata
            : {};

        const updated =
          await tx.withdrawal.update({
            where: {
              id:
                withdrawal.id,
            },
            data: {
              status:
                "CANCELLED",

              metadata: {
                ...existingMetadata,

                cancellationReason:
                  normalizedReason,

                cancelledBy:
                  "ADMIN",
              },
            },
          });

        await createAuditLog({
          adminId:
            normalizedAdminId,
          userId:
            withdrawal.userId,
          action:
            "CANCEL",
          entityId:
            withdrawal.id,
          description:
            "Administrator cancelled a withdrawal request.",
          metadata: {
            reference:
              withdrawal.reference,
            reason:
              normalizedReason,
          },
          ipAddress,
          tx,
        });

        return updated;
      }
    );

  logger.warn(
    "Withdrawal cancelled by administrator",
    {
      withdrawalId:
        withdrawal.id,
      reference:
        withdrawal.reference,
      adminId:
        normalizedAdminId,
    }
  );

  return serializeWithdrawal(
    cancelled
  );
}

// ============================================================
// UPDATE WITHDRAWAL STATUS
// ============================================================

export async function updateWithdrawalStatus({
  withdrawalId,
  adminId,
  status,
  metadata = {},
  ipAddress = null,
}) {
  const normalizedWithdrawalId =
    assertRequired(
      withdrawalId,
      "Withdrawal ID"
    );

  const normalizedAdminId =
    assertRequired(
      adminId,
      "Admin ID"
    );

  const normalizedStatus =
    normalizeStatus(status);

  assertValidStatus(
    normalizedStatus
  );

  const normalizedMetadata =
    assertMetadata(metadata);

  const withdrawal =
    await prisma.withdrawal.findUnique({
      where: {
        id:
          normalizedWithdrawalId,
      },
    });

  if (!withdrawal) {
    const error = new Error(
      "Withdrawal not found."
    );

    error.statusCode = 404;
    throw error;
  }

  const currentStatus =
    withdrawal.status;

  if (
    currentStatus ===
    normalizedStatus
  ) {
    return serializeWithdrawal(
      withdrawal
    );
  }

  // ----------------------------------------------------------
  // VALID STATE TRANSITIONS
  // ----------------------------------------------------------

  const allowedTransitions = {
    PENDING: [
      "PROCESSING",
      "CANCELLED",
      "FAILED",
    ],

    PROCESSING: [
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ],

    COMPLETED: [],

    FAILED: [],

    CANCELLED: [],
  };

  const allowed =
    allowedTransitions[
      currentStatus
    ] || [];

  if (
    !allowed.includes(
      normalizedStatus
    )
  ) {
    const error = new Error(
      `Invalid withdrawal status transition: ${currentStatus} -> ${normalizedStatus}.`
    );

    error.statusCode = 400;
    throw error;
  }

  const existingMetadata =
    withdrawal.metadata &&
    typeof withdrawal.metadata ===
      "object" &&
    !Array.isArray(
      withdrawal.metadata
    )
      ? withdrawal.metadata
      : {};

  const updatedMetadata = {
    ...existingMetadata,
    ...normalizedMetadata,
  };

  const updatedWithdrawal =
    await prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.withdrawal.update({
            where: {
              id:
                withdrawal.id,
            },

            data: {
              status:
                normalizedStatus,

              metadata:
                updatedMetadata,
            },
          });

        await createAuditLog({
          adminId:
            normalizedAdminId,
          userId:
            withdrawal.userId,
          action:
            "UPDATE",
          entityId:
            withdrawal.id,
          description:
            "Administrator updated withdrawal status.",
          metadata: {
            reference:
              withdrawal.reference,

            previousStatus:
              currentStatus,

            newStatus:
              normalizedStatus,

            additionalMetadata:
              normalizedMetadata,
          },
          ipAddress,
          tx,
        });

        return updated;
      }
    );

  logger.info(
    "Withdrawal status updated",
    {
      withdrawalId:
        withdrawal.id,

      reference:
        withdrawal.reference,

      adminId:
        normalizedAdminId,

      previousStatus:
        currentStatus,

      newStatus:
        normalizedStatus,
    }
  );

  return serializeWithdrawal(
    updatedWithdrawal
  );
}

// ============================================================
// WITHDRAWAL STATISTICS
// ============================================================

export async function getWithdrawalStatistics() {
  const [
    total,
    pending,
    processing,
    completed,
    failed,
    cancelled,
  ] = await prisma.$transaction([
    prisma.withdrawal.count(),

    prisma.withdrawal.count({
      where: {
        status:
          "PENDING",
      },
    }),

    prisma.withdrawal.count({
      where: {
        status:
          "PROCESSING",
      },
    }),

    prisma.withdrawal.count({
      where: {
        status:
          "COMPLETED",
      },
    }),

    prisma.withdrawal.count({
      where: {
        status:
          "FAILED",
      },
    }),

    prisma.withdrawal.count({
      where: {
        status:
          "CANCELLED",
      },
    }),
  ]);

  return {
    total,
    pending,
    processing,
    completed,
    failed,
    cancelled,
  };
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  createWithdrawal,
  getWithdrawal,
  getWithdrawalByReference,
  getUserWithdrawals,
  getWithdrawalById,
  getAllWithdrawals,
  processWithdrawal,
  completeWithdrawal,
  failWithdrawal,
  cancelWithdrawal,
  adminCancelWithdrawal,
  updateWithdrawalStatus,
  getWithdrawalStatistics,
};