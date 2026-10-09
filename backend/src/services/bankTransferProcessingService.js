import { Prisma } from "@prisma/client";

import prisma from "../config/database.js";

import {
  serializeMoney,
  toDecimal,
} from "../utils/money.js";

import {
  generateReference,
} from "../utils/reference.js";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const ZERO = new Prisma.Decimal("0");

const createError = (
  message,
  statusCode = 400,
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

const serializeTransfer = (
  transfer,
) => {
  if (!transfer) {
    return null;
  }

  return {
    ...transfer,

    amount: serializeMoney(
      transfer.amount,
    ),

    fee: serializeMoney(
      transfer.fee,
    ),

    total: serializeMoney(
      transfer.total,
    ),

    createdAt:
      transfer.createdAt?.toISOString?.() ??
      transfer.createdAt,

    updatedAt:
      transfer.updatedAt?.toISOString?.() ??
      transfer.updatedAt,
  };
};

/*
 * ============================================================
 * TRANSFER INCLUDE
 * ============================================================
 */

const transferInclude = {
  sender: {
    select: {
      id: true,
      email: true,
    },
  },

  beneficiary: {
    select: {
      id: true,
      accountName: true,
      accountNumber: true,
      bankName: true,
      bankCode: true,
      country: true,
      currencyCode: true,
      isActive: true,
    },
  },
};

/*
 * ============================================================
 * GET TRANSFER
 * ============================================================
 */

const getTransferForUpdate = async (
  tx,
  transferId,
) => {
  const rows =
    await tx.$queryRaw`
      SELECT
        id,
        reference,
        "idempotencyKey",
        "senderId",
        "receiverId",
        "beneficiaryId",
        type,
        status,
        amount,
        fee,
        total,
        "currencyCode",
        description,
        metadata,
        "createdAt",
        "updatedAt"
      FROM "Transfer"
      WHERE id = ${transferId}
      FOR UPDATE
    `;

  return rows[0] || null;
};

/*
 * ============================================================
 * GET SOURCE ACCOUNT
 * ============================================================
 */

const getAccountForUpdate = async (
  tx,
  accountId,
) => {
  const rows =
    await tx.$queryRaw`
      SELECT
        id,
        "accountNumber",
        "userId",
        "currencyId",
        status,
        balance,
        "availableBalance",
        "ledgerBalance",
        "minimumBalance"
      FROM "Account"
      WHERE id = ${accountId}
      FOR UPDATE
    `;

  return rows[0] || null;
};

/*
 * ============================================================
 * FIND ORIGINAL TRANSACTION
 * ============================================================
 */

const findTransferTransaction =
  async (
    tx,
    transfer,
  ) => {
    const transaction =
      await tx.transaction.findFirst({
        where: {
          userId:
            transfer.senderId,

          type: "TRANSFER",

          metadata: {
            path: [
              "transferId",
            ],

            equals:
              transfer.id,
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return transaction;
  };

/*
 * ============================================================
 * MARK TRANSFER PROCESSING
 * ============================================================
 */

export const markBankTransferProcessing =
  async ({
    transferId,
    adminId = null,
    ipAddress = null,
  }) => {
    if (!transferId) {
      throw createError(
        "Transfer ID is required",
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const transfer =
            await getTransferForUpdate(
              tx,
              transferId,
            );

          if (!transfer) {
            throw createError(
              "Bank transfer not found",
              404,
            );
          }

          if (
            transfer.type !== "BANK"
          ) {
            throw createError(
              "The selected transfer is not an external bank transfer",
            );
          }

          if (
            transfer.status ===
            "PROCESSING"
          ) {
            return transfer;
          }

          if (
            transfer.status !==
            "PENDING"
          ) {
            throw createError(
              `Transfer cannot enter processing from ${transfer.status}`,
            );
          }

          const updated =
            await tx.transfer.update({
              where: {
                id: transfer.id,
              },

              data: {
                status:
                  "PROCESSING",
              },
            });

          const transaction =
            await findTransferTransaction(
              tx,
              transfer,
            );

          if (transaction) {
            await tx.transaction.update({
              where: {
                id:
                  transaction.id,
              },

              data: {
                status:
                  "PROCESSING",
              },
            });
          }

          await tx.auditLog.create({
            data: {
              userId:
                transfer.senderId,

              adminId,

              action:
                "UPDATE",

              entity:
                "Transfer",

              entityId:
                transfer.id,

              description:
                `Bank transfer ${transfer.reference} moved to processing`,

              metadata: {
                reference:
                  transfer.reference,

                previousStatus:
                  "PENDING",

                newStatus:
                  "PROCESSING",
              },

              ipAddress,
            },
          });

          return updated;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,

          maxWait: 5000,

          timeout: 15000,
        },
      );

    const complete =
      await prisma.transfer.findUnique({
        where: {
          id: result.id,
        },

        include:
          transferInclude,
      });

    return serializeTransfer(
      complete,
    );
  };

/*
 * ============================================================
 * COMPLETE BANK TRANSFER
 * ============================================================
 */

export const completeBankTransfer =
  async ({
    transferId,
    adminId = null,
    ipAddress = null,
    externalReference = null,
  }) => {
    if (!transferId) {
      throw createError(
        "Transfer ID is required",
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const transfer =
            await getTransferForUpdate(
              tx,
              transferId,
            );

          if (!transfer) {
            throw createError(
              "Bank transfer not found",
              404,
            );
          }

          if (
            transfer.type !== "BANK"
          ) {
            throw createError(
              "The selected transfer is not an external bank transfer",
            );
          }

          if (
            transfer.status ===
            "COMPLETED"
          ) {
            return transfer;
          }

          if (
            transfer.status !==
              "PROCESSING" &&
            transfer.status !==
              "PENDING"
          ) {
            throw createError(
              `Transfer cannot be completed from ${transfer.status}`,
            );
          }

          const updated =
            await tx.transfer.update({
              where: {
                id: transfer.id,
              },

              data: {
                status:
                  "COMPLETED",

                metadata: {
                  ...(transfer.metadata &&
                  typeof transfer.metadata ===
                    "object"
                    ? transfer.metadata
                    : {}),

                  externalReference,

                  completedAt:
                    new Date().toISOString(),
                },
              },
            });

          const transaction =
            await findTransferTransaction(
              tx,
              transfer,
            );

          if (transaction) {
            await tx.transaction.update({
              where: {
                id:
                  transaction.id,
              },

              data: {
                status:
                  "COMPLETED",

                metadata: {
                  ...(transaction.metadata &&
                  typeof transaction.metadata ===
                    "object"
                    ? transaction.metadata
                    : {}),

                  externalReference,

                  completedAt:
                    new Date().toISOString(),
                },
              },
            });
          }

          await tx.auditLog.create({
            data: {
              userId:
                transfer.senderId,

              adminId,

              action:
                "UPDATE",

              entity:
                "Transfer",

              entityId:
                transfer.id,

              description:
                `Bank transfer ${transfer.reference} completed`,

              metadata: {
                reference:
                  transfer.reference,

                newStatus:
                  "COMPLETED",

                externalReference,
              },

              ipAddress,
            },
          });

          return updated;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,

          maxWait: 5000,

          timeout: 15000,
        },
      );

    const complete =
      await prisma.transfer.findUnique({
        where: {
          id: result.id,
        },

        include:
          transferInclude,
      });

    return serializeTransfer(
      complete,
    );
  };

/*
 * ============================================================
 * FAIL + RESTORE FUNDS
 * ============================================================
 */

export const failBankTransfer =
  async ({
    transferId,
    reason,
    adminId = null,
    ipAddress = null,
  }) => {
    if (!transferId) {
      throw createError(
        "Transfer ID is required",
      );
    }

    const failureReason =
      String(
        reason ||
          "External bank transfer could not be completed",
      ).trim();

    if (!failureReason) {
      throw createError(
        "Failure reason is required",
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const transfer =
            await getTransferForUpdate(
              tx,
              transferId,
            );

          if (!transfer) {
            throw createError(
              "Bank transfer not found",
              404,
            );
          }

          if (
            transfer.type !== "BANK"
          ) {
            throw createError(
              "The selected transfer is not an external bank transfer",
            );
          }

          if (
            transfer.status ===
            "FAILED"
          ) {
            return transfer;
          }

          if (
            transfer.status ===
              "COMPLETED" ||
            transfer.status ===
              "CANCELLED" ||
            transfer.status ===
              "REVERSED"
          ) {
            throw createError(
              `Transfer cannot be failed from ${transfer.status}`,
            );
          }

          const metadata =
            transfer.metadata &&
            typeof transfer.metadata ===
              "object"
              ? transfer.metadata
              : {};

          const sourceAccountId =
            metadata.sourceAccountId;

          if (!sourceAccountId) {
            throw createError(
              "Transfer source account could not be identified",
              500,
            );
          }

          const account =
            await getAccountForUpdate(
              tx,
              sourceAccountId,
            );

          if (!account) {
            throw createError(
              "Source account no longer exists",
              500,
            );
          }

          const transaction =
            await findTransferTransaction(
              tx,
              transfer,
            );

          /*
           * ----------------------------------------------------
           * PROTECT AGAINST DOUBLE REVERSAL
           * ----------------------------------------------------
           */

          if (
            transaction?.metadata &&
            typeof transaction.metadata ===
              "object" &&
            transaction.metadata
              .fundsRestored === true
          ) {
            throw createError(
              "Funds for this transfer have already been restored",
              409,
            );
          }

          const transferTotal =
            toDecimal(
              transfer.total,
            );

          const balanceBefore =
            toDecimal(
              account.balance,
            );

          const availableBefore =
            toDecimal(
              account.availableBalance,
            );

          const ledgerBefore =
            toDecimal(
              account.ledgerBalance,
            );

          const balanceAfter =
            balanceBefore.plus(
              transferTotal,
            );

          const availableAfter =
            availableBefore.plus(
              transferTotal,
            );

          const ledgerAfter =
            ledgerBefore.plus(
              transferTotal,
            );

          /*
           * ----------------------------------------------------
           * RESTORE ACCOUNT FUNDS
           * ----------------------------------------------------
           */

          await tx.account.update({
            where: {
              id: account.id,
            },

            data: {
              balance:
                balanceAfter,

              availableBalance:
                availableAfter,

              ledgerBalance:
                ledgerAfter,
            },
          });

          /*
           * ----------------------------------------------------
           * CREATE REVERSAL TRANSACTION
           * ----------------------------------------------------
           */

          const reversalReference =
            generateReference(
              "REV",
            );

          const reversalTransaction =
            await tx.transaction.create({
              data: {
                reference:
                  reversalReference,

                userId:
                  transfer.senderId,

                accountId:
                  account.id,

                currencyId:
                  account.currencyId,

                type:
                  "REFUND",

                status:
                  "COMPLETED",

                amount:
                  transferTotal,

                fee:
                  ZERO,

                total:
                  transferTotal,

                description:
                  `Funds restored for failed bank transfer ${transfer.reference}`,

                metadata: {
                  transferId:
                    transfer.id,

                  transferReference:
                    transfer.reference,

                  originalTransactionId:
                    transaction?.id ||
                    null,

                  reversalType:
                    "BANK_TRANSFER_FAILURE",

                  fundsRestored:
                    true,

                  failureReason,

                  restoredAt:
                    new Date().toISOString(),
                },
              },
            });

          /*
           * ----------------------------------------------------
           * CREDIT LEDGER ENTRY
           * ----------------------------------------------------
           */

          await tx.ledgerEntry.create({
            data: {
              accountId:
                account.id,

              transactionId:
                reversalTransaction.id,

              type:
                "CREDIT",

              amount:
                transferTotal,

              balanceBefore:
                balanceBefore,

              balanceAfter:
                balanceAfter,

              description:
                `Funds restored after failed bank transfer ${transfer.reference}`,
            },
          });

          /*
           * ----------------------------------------------------
           * MARK ORIGINAL TRANSACTION FAILED
           * ----------------------------------------------------
           */

          if (transaction) {
            await tx.transaction.update({
              where: {
                id:
                  transaction.id,
              },

              data: {
                status:
                  "FAILED",

                metadata: {
                  ...(transaction.metadata &&
                  typeof transaction.metadata ===
                    "object"
                    ? transaction.metadata
                    : {}),

                  failureReason,

                  fundsRestored:
                    true,

                  reversalTransactionId:
                    reversalTransaction.id,

                  failedAt:
                    new Date().toISOString(),
                },
              },
            });
          }

          /*
           * ----------------------------------------------------
           * MARK TRANSFER FAILED
           * ----------------------------------------------------
           */

          const updated =
            await tx.transfer.update({
              where: {
                id: transfer.id,
              },

              data: {
                status:
                  "FAILED",

                metadata: {
                  ...metadata,

                  failureReason,

                  fundsRestored:
                    true,

                  reversalTransactionId:
                    reversalTransaction.id,

                  failedAt:
                    new Date().toISOString(),
                },
              },
            });

          /*
           * ----------------------------------------------------
           * AUDIT
           * ----------------------------------------------------
           */

          await tx.auditLog.create({
            data: {
              userId:
                transfer.senderId,

              adminId,

              action:
                "UPDATE",

              entity:
                "Transfer",

              entityId:
                transfer.id,

              description:
                `Bank transfer ${transfer.reference} failed and funds were restored`,

              metadata: {
                reference:
                  transfer.reference,

                failureReason,

                restoredAmount:
                  transferTotal.toFixed(
                    4,
                  ),

                reversalTransactionId:
                  reversalTransaction.id,

                newStatus:
                  "FAILED",
              },

              ipAddress,
            },
          });

          return updated;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,

          maxWait: 5000,

          timeout: 15000,
        },
      );

    const complete =
      await prisma.transfer.findUnique({
        where: {
          id: result.id,
        },

        include:
          transferInclude,
      });

    return serializeTransfer(
      complete,
    );
  };

/*
 * ============================================================
 * CANCEL + RESTORE FUNDS
 * ============================================================
 */

export const cancelBankTransfer =
  async ({
    transferId,
    reason,
    adminId = null,
    ipAddress = null,
  }) => {
    if (!transferId) {
      throw createError(
        "Transfer ID is required",
      );
    }

    const cancellationReason =
      String(
        reason ||
          "Bank transfer cancelled",
      ).trim();

    const result =
      await prisma.$transaction(
        async (tx) => {
          const transfer =
            await getTransferForUpdate(
              tx,
              transferId,
            );

          if (!transfer) {
            throw createError(
              "Bank transfer not found",
              404,
            );
          }

          if (
            transfer.type !== "BANK"
          ) {
            throw createError(
              "The selected transfer is not an external bank transfer",
            );
          }

          if (
            transfer.status ===
            "CANCELLED"
          ) {
            return transfer;
          }

          if (
            transfer.status ===
              "COMPLETED" ||
            transfer.status ===
              "FAILED" ||
            transfer.status ===
              "REVERSED"
          ) {
            throw createError(
              `Transfer cannot be cancelled from ${transfer.status}`,
            );
          }

          const metadata =
            transfer.metadata &&
            typeof transfer.metadata ===
              "object"
              ? transfer.metadata
              : {};

          const sourceAccountId =
            metadata.sourceAccountId;

          if (!sourceAccountId) {
            throw createError(
              "Transfer source account could not be identified",
              500,
            );
          }

          const account =
            await getAccountForUpdate(
              tx,
              sourceAccountId,
            );

          if (!account) {
            throw createError(
              "Source account no longer exists",
              500,
            );
          }

          const transaction =
            await findTransferTransaction(
              tx,
              transfer,
            );

          if (
            transaction?.metadata &&
            typeof transaction.metadata ===
              "object" &&
            transaction.metadata
              .fundsRestored === true
          ) {
            throw createError(
              "Funds for this transfer have already been restored",
              409,
            );
          }

          const transferTotal =
            toDecimal(
              transfer.total,
            );

          const balanceBefore =
            toDecimal(
              account.balance,
            );

          const availableBefore =
            toDecimal(
              account.availableBalance,
            );

          const ledgerBefore =
            toDecimal(
              account.ledgerBalance,
            );

          const balanceAfter =
            balanceBefore.plus(
              transferTotal,
            );

          const availableAfter =
            availableBefore.plus(
              transferTotal,
            );

          const ledgerAfter =
            ledgerBefore.plus(
              transferTotal,
            );

          await tx.account.update({
            where: {
              id: account.id,
            },

            data: {
              balance:
                balanceAfter,

              availableBalance:
                availableAfter,

              ledgerBalance:
                ledgerAfter,
            },
          });

          const reversalReference =
            generateReference(
              "REV",
            );

          const reversalTransaction =
            await tx.transaction.create({
              data: {
                reference:
                  reversalReference,

                userId:
                  transfer.senderId,

                accountId:
                  account.id,

                currencyId:
                  account.currencyId,

                type:
                  "REFUND",

                status:
                  "COMPLETED",

                amount:
                  transferTotal,

                fee:
                  ZERO,

                total:
                  transferTotal,

                description:
                  `Funds restored for cancelled bank transfer ${transfer.reference}`,

                metadata: {
                  transferId:
                    transfer.id,

                  transferReference:
                    transfer.reference,

                  originalTransactionId:
                    transaction?.id ||
                    null,

                  reversalType:
                    "BANK_TRANSFER_CANCELLATION",

                  fundsRestored:
                    true,

                  cancellationReason,

                  restoredAt:
                    new Date().toISOString(),
                },
              },
            });

          await tx.ledgerEntry.create({
            data: {
              accountId:
                account.id,

              transactionId:
                reversalTransaction.id,

              type:
                "CREDIT",

              amount:
                transferTotal,

              balanceBefore:
                balanceBefore,

              balanceAfter:
                balanceAfter,

              description:
                `Funds restored after cancelled bank transfer ${transfer.reference}`,
            },
          });

          if (transaction) {
            await tx.transaction.update({
              where: {
                id:
                  transaction.id,
              },

              data: {
                status:
                  "CANCELLED",

                metadata: {
                  ...(transaction.metadata &&
                  typeof transaction.metadata ===
                    "object"
                    ? transaction.metadata
                    : {}),

                  cancellationReason,

                  fundsRestored:
                    true,

                  reversalTransactionId:
                    reversalTransaction.id,

                  cancelledAt:
                    new Date().toISOString(),
                },
              },
            });
          }

          const updated =
            await tx.transfer.update({
              where: {
                id: transfer.id,
              },

              data: {
                status:
                  "CANCELLED",

                metadata: {
                  ...metadata,

                  cancellationReason,

                  fundsRestored:
                    true,

                  reversalTransactionId:
                    reversalTransaction.id,

                  cancelledAt:
                    new Date().toISOString(),
                },
              },
            });

          await tx.auditLog.create({
            data: {
              userId:
                transfer.senderId,

              adminId,

              action:
                "UPDATE",

              entity:
                "Transfer",

              entityId:
                transfer.id,

              description:
                `Bank transfer ${transfer.reference} cancelled and funds restored`,

              metadata: {
                reference:
                  transfer.reference,

                cancellationReason,

                restoredAmount:
                  transferTotal.toFixed(
                    4,
                  ),

                reversalTransactionId:
                  reversalTransaction.id,

                newStatus:
                  "CANCELLED",
              },

              ipAddress,
            },
          });

          return updated;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,

          maxWait: 5000,

          timeout: 15000,
        },
      );

    const complete =
      await prisma.transfer.findUnique({
        where: {
          id: result.id,
        },

        include:
          transferInclude,
      });

    return serializeTransfer(
      complete,
    );
  };
