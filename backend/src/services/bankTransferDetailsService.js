import prisma from "../config/database.js";

/*
 * ============================================================
 * SERIALIZATION HELPERS
 * ============================================================
 */

const serializeDecimal = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }

  return String(value);
};

const serializeDate = (value) => {
  if (!value) {
    return null;
  }

  return value instanceof Date
    ? value.toISOString()
    : String(value);
};

const serializeLedgerEntry = (entry) => {
  if (!entry) {
    return null;
  }

  return {
    id: entry.id,
    transactionId: entry.transactionId,
    accountId: entry.accountId,
    type: entry.type,
    amount: serializeDecimal(entry.amount),
    balanceBefore: serializeDecimal(entry.balanceBefore),
    balanceAfter: serializeDecimal(entry.balanceAfter),
    description: entry.description,
    createdAt: serializeDate(entry.createdAt),
  };
};

const serializeTransaction = (transaction) => {
  if (!transaction) {
    return null;
  }

  return {
    id: transaction.id,
    userId: transaction.userId,
    type: transaction.type,
    status: transaction.status,
    amount: serializeDecimal(transaction.amount),
    fee: serializeDecimal(transaction.fee),
    total: serializeDecimal(transaction.total),
    reference: transaction.reference,
    description: transaction.description,
    metadata: transaction.metadata ?? null,
    accountId: transaction.accountId,
    currencyId: transaction.currencyId,

    currency: transaction.currency
      ? {
          id: transaction.currency.id,
          code: transaction.currency.code,
          name: transaction.currency.name,
        }
      : null,

    ledgerEntries: Array.isArray(transaction.ledgerEntries)
      ? transaction.ledgerEntries.map(serializeLedgerEntry)
      : [],

    createdAt: serializeDate(transaction.createdAt),
    updatedAt: serializeDate(transaction.updatedAt),
  };
};

const serializeBeneficiary = (beneficiary) => {
  if (!beneficiary) {
    return null;
  }

  return {
    id: beneficiary.id,
    name: beneficiary.name,
    accountName: beneficiary.accountName,
    accountNumber: beneficiary.accountNumber,
    bankName: beneficiary.bankName,
    bankCode: beneficiary.bankCode,
    country: beneficiary.country,
    currencyCode: beneficiary.currencyCode,
    isActive: beneficiary.isActive,
    createdAt: serializeDate(beneficiary.createdAt),
    updatedAt: serializeDate(beneficiary.updatedAt),
  };
};

const serializeTransfer = (transfer) => {
  if (!transfer) {
    return null;
  }

  return {
    id: transfer.id,
    reference: transfer.reference,
    type: transfer.type,
    status: transfer.status,
    amount: serializeDecimal(transfer.amount),
    fee: serializeDecimal(transfer.fee),
    total: serializeDecimal(transfer.total),
    currencyCode: transfer.currencyCode,
    description: transfer.description,

    senderId: transfer.senderId,
    beneficiaryId: transfer.beneficiaryId,

    sender: transfer.sender
      ? {
          id: transfer.sender.id,
          email: transfer.sender.email,
          role: transfer.sender.role,
          status: transfer.sender.status,
        }
      : null,

    beneficiary: serializeBeneficiary(
      transfer.beneficiary,
    ),

    transaction: serializeTransaction(
      transfer.transaction,
    ),

    reversalTransaction: serializeTransaction(
      transfer.reversalTransaction,
    ),

    metadata: transfer.metadata ?? null,

    createdAt: serializeDate(transfer.createdAt),
    updatedAt: serializeDate(transfer.updatedAt),
  };
};

/*
 * ============================================================
 * ERROR HELPER
 * ============================================================
 */

const createError = (
  message,
  statusCode = 400,
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/*
 * ============================================================
 * GET CUSTOMER BANK TRANSFER DETAILS
 * ============================================================
 */

export const getUserBankTransferById = async ({
  userId,
  transferId,
}) => {
  if (!userId) {
    throw createError(
      "Authenticated user is required",
      401,
    );
  }

  if (!transferId) {
    throw createError(
      "Transfer ID is required",
      400,
    );
  }

  /*
   * ==========================================================
   * FIND TRANSFER
   * ==========================================================
   *
   * senderId is intentionally included here.
   *
   * A customer can only retrieve a transfer that belongs
   * to their own account.
   */

  const transfer = await prisma.transfer.findFirst({
    where: {
      id: transferId,
      senderId: userId,
      type: "BANK",
    },

    select: {
      id: true,
      reference: true,
      type: true,
      status: true,
      amount: true,
      fee: true,
      total: true,
      currencyCode: true,
      description: true,
      senderId: true,
      beneficiaryId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,

      sender: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      },

      beneficiary: {
        select: {
          id: true,
          name: true,
          accountName: true,
          accountNumber: true,
          bankName: true,
          bankCode: true,
          country: true,
          currencyCode: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!transfer) {
    throw createError(
      "Bank transfer was not found",
      404,
    );
  }

  /*
   * ==========================================================
   * FIND CUSTOMER TRANSACTION
   * ==========================================================
   */

  const transaction = await prisma.transaction.findFirst({
    where: {
      userId,
      type: "TRANSFER",

      metadata: {
        path: ["transferId"],
        equals: transfer.id,
      },
    },

    select: {
      id: true,
      userId: true,
      type: true,
      status: true,
      amount: true,
      fee: true,
      total: true,
      reference: true,
      description: true,
      metadata: true,
      accountId: true,
      currencyId: true,

      currency: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },

      createdAt: true,
      updatedAt: true,

      ledgerEntries: {
        select: {
          id: true,
          transactionId: true,
          accountId: true,
          type: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          description: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  /*
   * ==========================================================
   * FIND REVERSAL TRANSACTION
   * ==========================================================
   *
   * Failed/cancelled bank transfers may have a refund/reversal
   * transaction linked through metadata.
   */

  let reversalTransaction = null;

  if (transaction?.metadata?.reversalTransactionId) {
    reversalTransaction =
      await prisma.transaction.findFirst({
        where: {
          id: String(
            transaction.metadata.reversalTransactionId,
          ),
          userId,
        },

        select: {
          id: true,
          userId: true,
          type: true,
          status: true,
          amount: true,
          fee: true,
          total: true,
          reference: true,
          description: true,
          metadata: true,
          accountId: true,
          currencyId: true,

          currency: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },

          createdAt: true,
          updatedAt: true,

          ledgerEntries: {
            select: {
              id: true,
              transactionId: true,
              accountId: true,
              type: true,
              amount: true,
              balanceBefore: true,
              balanceAfter: true,
              description: true,
              createdAt: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
  }

  /*
   * ==========================================================
   * TIMELINE
   * ==========================================================
   */

  const timeline = [
    {
      status: "PENDING",
      label: "Transfer submitted",
      timestamp: transfer.createdAt,
    },
  ];

  if (
    transfer.status === "PROCESSING" ||
    transfer.status === "COMPLETED"
  ) {
    timeline.push({
      status: "PROCESSING",
      label: "Transfer is being processed",
      timestamp: transfer.updatedAt,
    });
  }

  if (transfer.status === "COMPLETED") {
    timeline.push({
      status: "COMPLETED",
      label: "Transfer completed",
      timestamp: transfer.updatedAt,
    });
  }

  if (transfer.status === "FAILED") {
    timeline.push({
      status: "FAILED",
      label: "Transfer failed",
      timestamp: transfer.updatedAt,
    });
  }

  if (transfer.status === "CANCELLED") {
    timeline.push({
      status: "CANCELLED",
      label: "Transfer cancelled",
      timestamp: transfer.updatedAt,
    });
  }

  return {
    transfer: serializeTransfer({
      ...transfer,
      transaction,
      reversalTransaction,
    }),

    transaction: serializeTransaction(
      transaction,
    ),

    reversalTransaction: serializeTransaction(
      reversalTransaction,
    ),

    timeline,
  };
};
