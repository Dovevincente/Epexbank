import prisma from "../config/database.js";

import {
  Prisma,
} from "@prisma/client";

import {
  addMoney,
  serializeMoney,
  toDecimal,
} from "../utils/money.js";

import {
  generateReference,
} from "../utils/reference.js";

import {
  normalizeAccountNumber,
  normalizeIdempotencyKey,
  validateInternalTransfer,
} from "../utils/transfer.js";

/* -------------------------------------------------------------------------- */
/* Serialization                                                              */
/* -------------------------------------------------------------------------- */

const serializeTransfer = (transfer) => {
  return {
    id: transfer.id,
    reference: transfer.reference,
    type: transfer.type,
    status: transfer.status,

    complianceStatus:
      transfer.complianceStatus || "NOT_REQUIRED",

    tinCheckStatus:
      transfer.tinCheckStatus || "NOT_REQUIRED",

    amlCheckStatus:
      transfer.amlCheckStatus || "NOT_REQUIRED",

    cftCheckStatus:
      transfer.cftCheckStatus || "NOT_REQUIRED",

    complianceReason:
      transfer.complianceReason || null,

    complianceReviewedAt:
      transfer.complianceReviewedAt || null,

    amount: serializeMoney(transfer.amount),

    fee: serializeMoney(transfer.fee),

    total: serializeMoney(transfer.total),

    currencyCode: transfer.currencyCode,

    description: transfer.description || null,

    sender: transfer.sender
      ? {
          id: transfer.sender.id,
          email: transfer.sender.email,
        }
      : null,

    receiver: transfer.receiver
      ? {
          id: transfer.receiver.id,
          email: transfer.receiver.email,
        }
      : null,

    createdAt: transfer.createdAt,
    updatedAt: transfer.updatedAt,
  };
};

/* -------------------------------------------------------------------------- */
/* Prisma includes                                                            */
/* -------------------------------------------------------------------------- */

const transferInclude = {
  sender: {
    select: {
      id: true,
      email: true,
    },
  },

  receiver: {
    select: {
      id: true,
      email: true,
    },
  },
};

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

const createServiceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/* -------------------------------------------------------------------------- */
/* Audit logging                                                              */
/* -------------------------------------------------------------------------- */

const createAuditLog = async ({
  tx,
  userId,
  action,
  entityId,
  metadata,
}) => {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      entityId,
      metadata,
    },
  });
};

/* -------------------------------------------------------------------------- */
/* Transfer compliance                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Run the internal transfer compliance gates.
 *
 * These checks are controlled by the administrator through
 * ComplianceSettings.
 *
 * IMPORTANT:
 * - TIN verification checks the customer's stored TIN/Tax Code
 *   and whether it has been verified.
 * - AML/CFT currently use verified KYC as the internal gate.
 * - This is NOT an external AML/CFT sanctions or PEP screening
 *   service. An external screening provider can be integrated later.
 */
const runTransferComplianceChecks = async ({
  tx,
  userId,
}) => {
  const settings =
    await tx.complianceSettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

  const tinEnabled =
    Boolean(settings?.tinCheckEnabled);

  const amlEnabled =
    Boolean(settings?.amlCheckEnabled);

  const cftEnabled =
    Boolean(settings?.cftCheckEnabled);

  const anyCheckEnabled =
    tinEnabled ||
    amlEnabled ||
    cftEnabled;

  if (!anyCheckEnabled) {
    return {
      complianceStatus: "NOT_REQUIRED",
      tinCheckStatus: "NOT_REQUIRED",
      amlCheckStatus: "NOT_REQUIRED",
      cftCheckStatus: "NOT_REQUIRED",
      complianceReason: null,
    };
  }

  const kyc =
    await tx.kyc.findUnique({
      where: {
        userId,
      },
      select: {
        status: true,
        taxIdentificationNumber: true,
        taxCodeVerified: true,
      },
    });

  let tinCheckStatus =
    tinEnabled
      ? "FAILED"
      : "NOT_REQUIRED";

  let amlCheckStatus =
    amlEnabled
      ? "FAILED"
      : "NOT_REQUIRED";

  let cftCheckStatus =
    cftEnabled
      ? "FAILED"
      : "NOT_REQUIRED";

  const reasons = [];

  if (tinEnabled) {
    const hasValidTin =
      Boolean(
        kyc?.taxIdentificationNumber
          ?.trim(),
      );

    const tinVerified =
      Boolean(
        kyc?.taxCodeVerified,
      );

    if (
      hasValidTin &&
      tinVerified
    ) {
      tinCheckStatus = "PASSED";
    } else {
      reasons.push(
        "A verified TIN/Tax Code is required",
      );
    }
  }

  if (amlEnabled) {
    if (
      kyc?.status ===
      "VERIFIED"
    ) {
      amlCheckStatus = "PASSED";
    } else {
      reasons.push(
        "Verified KYC is required for the AML compliance gate",
      );
    }
  }

  if (cftEnabled) {
    if (
      kyc?.status ===
      "VERIFIED"
    ) {
      cftCheckStatus = "PASSED";
    } else {
      reasons.push(
        "Verified KYC is required for the CFT compliance gate",
      );
    }
  }

  const failed =
    tinCheckStatus === "FAILED" ||
    amlCheckStatus === "FAILED" ||
    cftCheckStatus === "FAILED";

  return {
    complianceStatus:
      failed
        ? "BLOCKED"
        : "CLEARED",

    tinCheckStatus,
    amlCheckStatus,
    cftCheckStatus,

    complianceReason:
      reasons.length > 0
        ? reasons.join("; ")
        : null,
  };
};

/* -------------------------------------------------------------------------- */
/* Account locking                                                            */
/* -------------------------------------------------------------------------- */

const lockAccounts = async (tx, accountIdA, accountIdB) => {
  const firstLockId =
    accountIdA < accountIdB
      ? accountIdA
      : accountIdB;

  const secondLockId =
    accountIdA < accountIdB
      ? accountIdB
      : accountIdA;

  await tx.$queryRaw`
    SELECT id
    FROM "Account"
    WHERE id = ${firstLockId}
    FOR UPDATE
  `;

  await tx.$queryRaw`
    SELECT id
    FROM "Account"
    WHERE id = ${secondLockId}
    FOR UPDATE
  `;
};

/* -------------------------------------------------------------------------- */
/* Create internal transfer                                                   */
/* -------------------------------------------------------------------------- */

export const createInternalTransfer = async ({
  userId,
  senderAccountNumber,
  receiverAccountNumber,
  amount,
  description,
  idempotencyKey,
}) => {
  if (!userId) {
    throw createServiceError(
      "Authenticated user is required",
      401,
    );
  }

  const normalizedSender =
    normalizeAccountNumber(
      senderAccountNumber,
    );

  const normalizedReceiver =
    normalizeAccountNumber(
      receiverAccountNumber,
    );

  const normalizedKey =
    normalizeIdempotencyKey(
      idempotencyKey,
    );

  const transferAmount =
    validateInternalTransfer({
      senderAccountNumber:
        normalizedSender,

      receiverAccountNumber:
        normalizedReceiver,

      amount,
    });

  const result =
    await prisma.$transaction(
      async (tx) => {
        /* ------------------------------------------------------------------ */
        /* Idempotency                                                         */
        /* ------------------------------------------------------------------ */

        if (normalizedKey) {
          const existingTransfer =
            await tx.transfer.findUnique({
              where: {
                idempotencyKey:
                  normalizedKey,
              },

              include:
                transferInclude,
            });

          if (existingTransfer) {
            return {
              transfer:
                existingTransfer,

              alreadyProcessed: true,
            };
          }
        }

        /* ------------------------------------------------------------------ */
        /* Sender account                                                      */
        /* ------------------------------------------------------------------ */

        const senderAccount =
          await tx.account.findFirst({
            where: {
              accountNumber:
                normalizedSender,

              userId,
            },

            select: {
              id: true,
              accountNumber: true,
              userId: true,
              currencyId: true,
              status: true,
              balance: true,
              availableBalance: true,
              ledgerBalance: true,
              minimumBalance: true,

              currency: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  symbol: true,
                  decimals: true,
                },
              },
            },
          });

        if (!senderAccount) {
          throw createServiceError(
            "Sender account not found",
            404,
          );
        }

        if (
          senderAccount.status !==
          "ACTIVE"
        ) {
          throw createServiceError(
            "Sender account cannot perform transfers",
            403,
          );
        }

        /* ------------------------------------------------------------------ */
        /* Receiver account                                                    */
        /* ------------------------------------------------------------------ */

        const receiverAccount =
          await tx.account.findUnique({
            where: {
              accountNumber:
                normalizedReceiver,
            },

            select: {
              id: true,
              accountNumber: true,
              userId: true,
              currencyId: true,
              status: true,
              balance: true,
              availableBalance: true,
              ledgerBalance: true,
              minimumBalance: true,

              currency: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  symbol: true,
                  decimals: true,
                },
              },
            },
          });

        if (!receiverAccount) {
          throw createServiceError(
            "Recipient account not found",
            404,
          );
        }

        if (
          receiverAccount.userId ===
          senderAccount.userId
        ) {
          throw createServiceError(
            "The sender and recipient must be different accounts owned by different customers for this transfer type",
            400,
          );
        }

        if (
          receiverAccount.status !==
          "ACTIVE"
        ) {
          throw createServiceError(
            "Recipient account cannot receive transfers",
            403,
          );
        }

        if (
          senderAccount.currencyId !==
          receiverAccount.currencyId
        ) {
          throw createServiceError(
            "Sender and recipient accounts must use the same currency",
            400,
          );
        }

        const currencyCode =
          senderAccount.currency.code;

        /* ------------------------------------------------------------------ */
        /* Transfer compliance                                                 */
        /* ------------------------------------------------------------------ */

        const complianceResult =
          await runTransferComplianceChecks({
            tx,
            userId,
          });

        if (
          complianceResult.complianceStatus ===
          "BLOCKED"
        ) {
          throw createServiceError(
            complianceResult.complianceReason ||
              "Transfer blocked by compliance checks",
            403,
          );
        }

        /* ------------------------------------------------------------------ */
        /* Lock both accounts                                                  */
        /* ------------------------------------------------------------------ */

        await lockAccounts(
          tx,
          senderAccount.id,
          receiverAccount.id,
        );

        /* ------------------------------------------------------------------ */
        /* Re-read locked accounts                                             */
        /* ------------------------------------------------------------------ */

        const lockedSender =
          await tx.account.findUnique({
            where: {
              id: senderAccount.id,
            },

            select: {
              id: true,
              accountNumber: true,
              userId: true,
              currencyId: true,
              status: true,
              balance: true,
              availableBalance: true,
              ledgerBalance: true,
              minimumBalance: true,
            },
          });

        const lockedReceiver =
          await tx.account.findUnique({
            where: {
              id: receiverAccount.id,
            },

            select: {
              id: true,
              accountNumber: true,
              userId: true,
              currencyId: true,
              status: true,
              balance: true,
              availableBalance: true,
              ledgerBalance: true,
              minimumBalance: true,
            },
          });

        if (
          !lockedSender ||
          !lockedReceiver
        ) {
          throw createServiceError(
            "One of the accounts is no longer available",
            409,
          );
        }

        if (
          lockedSender.status !==
          "ACTIVE"
        ) {
          throw createServiceError(
            "Sender account is no longer active",
            403,
          );
        }

        if (
          lockedReceiver.status !==
          "ACTIVE"
        ) {
          throw createServiceError(
            "Recipient account is no longer active",
            403,
          );
        }

        /* ------------------------------------------------------------------ */
        /* Validate available balance                                          */
        /* ------------------------------------------------------------------ */

        const senderAvailable =
          toDecimal(
            lockedSender.availableBalance,
          );

        const senderBalance =
          toDecimal(
            lockedSender.balance,
          );

        const senderLedger =
          toDecimal(
            lockedSender.ledgerBalance,
          );

        if (
          senderAvailable.lessThan(
            transferAmount,
          )
        ) {
          throw createServiceError(
            "Insufficient available balance",
            400,
          );
        }

        /*
         * We reserve the amount by reducing availableBalance only.
         *
         * balance:
         *   remains unchanged until admin approval.
         *
         * availableBalance:
         *   is reduced now so the customer cannot spend the
         *   same money twice while the transfer is pending.
         *
         * ledgerBalance:
         *   remains unchanged until the transfer is approved.
         */

        const reservedAvailableBalance =
          senderAvailable.minus(
            transferAmount,
          );

        /* ------------------------------------------------------------------ */
        /* Create transfer as PENDING                                          */
        /* ------------------------------------------------------------------ */

        const transfer =
          await tx.transfer.create({
            data: {
              reference:
                generateReference("TRF"),

              idempotencyKey:
                normalizedKey,

              senderId:
                senderAccount.userId,

              receiverId:
                receiverAccount.userId,

              type: "INTERNAL",

              status: "PENDING",

              complianceStatus:
                complianceResult.complianceStatus,

              tinCheckStatus:
                complianceResult.tinCheckStatus,

              amlCheckStatus:
                complianceResult.amlCheckStatus,

              cftCheckStatus:
                complianceResult.cftCheckStatus,

              complianceReason:
                complianceResult.complianceReason,

              complianceReviewedAt:
                complianceResult.complianceStatus ===
                "CLEARED"
                  ? new Date()
                  : null,

              amount:
                transferAmount,

              fee: "0",

              total:
                transferAmount,

              currencyCode,

              description:
                description?.trim() ||
                null,

              metadata: {
                senderAccountId:
                  senderAccount.id,

                receiverAccountId:
                  receiverAccount.id,

                senderAccountNumber:
                  senderAccount.accountNumber,

                receiverAccountNumber:
                  receiverAccount.accountNumber,

                reservationStatus:
                  "RESERVED",

                approvalRequired:
                  true,

                complianceStatus:
                  complianceResult.complianceStatus,

                tinCheckStatus:
                  complianceResult.tinCheckStatus,

                amlCheckStatus:
                  complianceResult.amlCheckStatus,

                cftCheckStatus:
                  complianceResult.cftCheckStatus,

                complianceReason:
                  complianceResult.complianceReason,
              },
            },
          });

        /* ------------------------------------------------------------------ */
        /* Sender transaction                                                  */
        /* ------------------------------------------------------------------ */

        const senderTransaction =
          await tx.transaction.create({
            data: {
              reference:
                generateReference("TXN"),

              userId:
                senderAccount.userId,

              accountId:
                senderAccount.id,

              currencyId:
                senderAccount.currencyId,

              type: "TRANSFER",

              status: "PENDING",

              amount:
                transferAmount,

              fee: "0",

              total:
                transferAmount,

              description:
                description?.trim() ||
                "Internal transfer pending approval",

              metadata: {
                transferId:
                  transfer.id,

                transferReference:
                  transfer.reference,

                direction:
                  "DEBIT",

                recipientAccountNumber:
                  receiverAccount.accountNumber,

                approvalRequired:
                  true,

                reservationStatus:
                  "RESERVED",
              },
            },
          });

        /* ------------------------------------------------------------------ */
        /* Receiver transaction                                                */
        /* ------------------------------------------------------------------ */

        const receiverTransaction =
          await tx.transaction.create({
            data: {
              reference:
                generateReference("TXN"),

              userId:
                receiverAccount.userId,

              accountId:
                receiverAccount.id,

              currencyId:
                receiverAccount.currencyId,

              type: "TRANSFER",

              status: "PENDING",

              amount:
                transferAmount,

              fee: "0",

              total:
                transferAmount,

              description:
                description?.trim() ||
                "Internal transfer awaiting approval",

              metadata: {
                transferId:
                  transfer.id,

                transferReference:
                  transfer.reference,

                direction:
                  "CREDIT",

                senderAccountNumber:
                  senderAccount.accountNumber,

                approvalRequired:
                  true,
              },
            },
          });

        /* ------------------------------------------------------------------ */
        /* Reserve sender funds                                                */
        /* ------------------------------------------------------------------ */

        await tx.account.update({
          where: {
            id: senderAccount.id,
          },

          data: {
            availableBalance:
              reservedAvailableBalance,
          },
        });

        /* ------------------------------------------------------------------ */
        /* Audit record                                                         */
        /* ------------------------------------------------------------------ */

        await createAuditLog({
          tx,

          userId,

          action:
            "TRANSFER",

          entityId:
            transfer.id,

          metadata: {
            transferId:
              transfer.id,

            reference:
              transfer.reference,

            senderAccountId:
              senderAccount.id,

            receiverAccountId:
              receiverAccount.id,

            amount:
              serializeMoney(
                transferAmount,
              ),

            currency:
              currencyCode,

            status:
              "PENDING",

            approvalRequired:
              true,

            complianceStatus:
              complianceResult.complianceStatus,

            tinCheckStatus:
              complianceResult.tinCheckStatus,

            amlCheckStatus:
              complianceResult.amlCheckStatus,

            cftCheckStatus:
              complianceResult.cftCheckStatus,

            complianceReason:
              complianceResult.complianceReason,

            fundsReserved:
              true,
          },
        });

        /*
         * Return the pending transfer.
         *
         * Financial settlement deliberately does NOT happen here.
         */

        return {
          transfer:
            await tx.transfer.findUnique({
              where: {
                id: transfer.id,
              },

              include:
                transferInclude,
            }),

          senderTransactionId:
            senderTransaction.id,

          receiverTransactionId:
            receiverTransaction.id,

          alreadyProcessed: false,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,

        maxWait: 5000,

        timeout: 15000,
      },
    );

  return {
    transfer: serializeTransfer(
      result.transfer,
    ),

    alreadyProcessed:
      result.alreadyProcessed,
  };
};

/* -------------------------------------------------------------------------- */
/* Approve internal transfer                                                  */
/* -------------------------------------------------------------------------- */

export const approveInternalTransfer = async ({
  transferId,
  adminUserId,
}) => {
  if (!transferId) {
    throw createServiceError(
      "Transfer ID is required",
      400,
    );
  }

  if (!adminUserId) {
    throw createServiceError(
      "Administrator identity is required",
      401,
    );
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const transfer =
          await tx.transfer.findUnique({
            where: {
              id: transferId,
            },
          });

        if (!transfer) {
          throw createServiceError(
            "Transfer not found",
            404,
          );
        }

        if (
          transfer.type !==
          "INTERNAL"
        ) {
          throw createServiceError(
            "This service can only approve internal transfers",
            400,
          );
        }

        if (
          transfer.status ===
          "COMPLETED"
        ) {
          return {
            transfer:
              await tx.transfer.findUnique({
                where: {
                  id: transfer.id,
                },

                include:
                  transferInclude,
              }),

            alreadyCompleted: true,
          };
        }

        if (
          transfer.status !==
          "PENDING"
        ) {
          throw createServiceError(
            `Transfer cannot be approved from ${transfer.status} status`,
            409,
          );
        }

        const metadata =
          transfer.metadata &&
          typeof transfer.metadata ===
            "object"
            ? transfer.metadata
            : {};

        const senderAccountId =
          metadata.senderAccountId;

        const receiverAccountId =
          metadata.receiverAccountId;

        if (
          !senderAccountId ||
          !receiverAccountId
        ) {
          throw createServiceError(
            "Transfer account information is missing",
            409,
          );
        }

        await lockAccounts(
          tx,
          senderAccountId,
          receiverAccountId,
        );

        const senderAccount =
          await tx.account.findUnique({
            where: {
              id: senderAccountId,
            },

            select: {
              id: true,
              accountNumber: true,
              userId: true,
              currencyId: true,
              status: true,
              balance: true,
              availableBalance: true,
              ledgerBalance: true,
              minimumBalance: true,
            },
          });

        const receiverAccount =
          await tx.account.findUnique({
            where: {
              id: receiverAccountId,
            },

            select: {
              id: true,
              accountNumber: true,
              userId: true,
              currencyId: true,
              status: true,
              balance: true,
              availableBalance: true,
              ledgerBalance: true,
              minimumBalance: true,
            },
          });

        if (
          !senderAccount ||
          !receiverAccount
        ) {
          throw createServiceError(
            "One or more transfer accounts no longer exist",
            409,
          );
        }

        if (
          senderAccount.status !==
          "ACTIVE"
        ) {
          throw createServiceError(
            "Sender account is not active",
            403,
          );
        }

        if (
          receiverAccount.status !==
          "ACTIVE"
        ) {
          throw createServiceError(
            "Recipient account is not active",
            403,
          );
        }

        /*
         * A transfer must not be approved when compliance
         * has explicitly blocked it.
         */

        if (
          transfer.complianceStatus ===
          "BLOCKED"
        ) {
          throw createServiceError(
            transfer.complianceReason ||
              "Transfer is blocked by compliance checks",
            403,
          );
        }

        const amount =
          toDecimal(
            transfer.amount,
          );

        const senderBalance =
          toDecimal(
            senderAccount.balance,
          );

        const senderAvailable =
          toDecimal(
            senderAccount.availableBalance,
          );

        const senderLedger =
          toDecimal(
            senderAccount.ledgerBalance,
          );

        const receiverBalance =
          toDecimal(
            receiverAccount.balance,
          );

        const receiverAvailable =
          toDecimal(
            receiverAccount.availableBalance,
          );

        const receiverLedger =
          toDecimal(
            receiverAccount.ledgerBalance,
          );

        /*
         * The amount was reserved when the transfer
         * was created, so availableBalance should already
         * exclude it.
         *
         * We nevertheless verify that the account balance
         * still contains enough money before settlement.
         */

        if (
          senderBalance.lessThan(
            amount,
          )
        ) {
          throw createServiceError(
            "Sender no longer has sufficient balance to settle this transfer",
            409,
          );
        }

        const senderBalanceAfter =
          senderBalance.minus(
            amount,
          );

        /*
         * Because the amount was already reserved,
         * availableBalance does not get reduced again.
         */

        const senderAvailableAfter =
          senderAvailable;

        const senderLedgerAfter =
          senderLedger.minus(
            amount,
          );

        const receiverBalanceAfter =
          addMoney(
            receiverBalance,
            amount,
          );

        const receiverAvailableAfter =
          addMoney(
            receiverAvailable,
            amount,
          );

        const receiverLedgerAfter =
          addMoney(
            receiverLedger,
            amount,
          );

        /* ------------------------------------------------------------------ */
        /* Update accounts                                                     */
        /* ------------------------------------------------------------------ */

        await tx.account.update({
          where: {
            id: senderAccount.id,
          },

          data: {
            balance:
              senderBalanceAfter,

            availableBalance:
              senderAvailableAfter,

            ledgerBalance:
              senderLedgerAfter,
          },
        });

        await tx.account.update({
          where: {
            id: receiverAccount.id,
          },

          data: {
            balance:
              receiverBalanceAfter,

            availableBalance:
              receiverAvailableAfter,

            ledgerBalance:
              receiverLedgerAfter,
          },
        });

        /* ------------------------------------------------------------------ */
        /* Locate transaction records                                          */
        /* ------------------------------------------------------------------ */

        const senderTransaction =
          await tx.transaction.findFirst({
            where: {
              accountId:
                senderAccount.id,

              metadata: {
                path: [
                  "transferId",
                ],

                equals:
                  transfer.id,
              },
            },
          });

        const receiverTransaction =
          await tx.transaction.findFirst({
            where: {
              accountId:
                receiverAccount.id,

              metadata: {
                path: [
                  "transferId",
                ],

                equals:
                  transfer.id,
              },
            },
          });

        if (
          !senderTransaction ||
          !receiverTransaction
        ) {
          throw createServiceError(
            "Transfer transaction records are missing",
            409,
          );
        }

        /* ------------------------------------------------------------------ */
        /* Ledger entries                                                      */
        /* ------------------------------------------------------------------ */

        await tx.ledgerEntry.create({
          data: {
            accountId:
              senderAccount.id,

            transactionId:
              senderTransaction.id,

            type:
              "DEBIT",

            amount,

            balanceBefore:
              senderBalance,

            balanceAfter:
              senderBalanceAfter,

            description:
              transfer.description ||
              `Transfer to ${receiverAccount.accountNumber}`,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            accountId:
              receiverAccount.id,

            transactionId:
              receiverTransaction.id,

            type:
              "CREDIT",

            amount,

            balanceBefore:
              receiverBalance,

            balanceAfter:
              receiverBalanceAfter,

            description:
              transfer.description ||
              `Transfer from ${senderAccount.accountNumber}`,
          },
        });

        /* ------------------------------------------------------------------ */
        /* Complete transaction records                                        */
        /* ------------------------------------------------------------------ */

        await tx.transaction.update({
          where: {
            id:
              senderTransaction.id,
          },

          data: {
            status:
              "COMPLETED",

            metadata: {
              ...(senderTransaction.metadata &&
              typeof senderTransaction.metadata ===
                "object"
                ? senderTransaction.metadata
                : {}),

              approvalStatus:
                "APPROVED",

              approvedBy:
                adminUserId,

              approvedAt:
                new Date().toISOString(),

              reservationStatus:
                "SETTLED",
            },
          },
        });

        await tx.transaction.update({
          where: {
            id:
              receiverTransaction.id,
          },

          data: {
            status:
              "COMPLETED",

            metadata: {
              ...(receiverTransaction.metadata &&
              typeof receiverTransaction.metadata ===
                "object"
                ? receiverTransaction.metadata
                : {}),

              approvalStatus:
                "APPROVED",

              approvedBy:
                adminUserId,

              approvedAt:
                new Date().toISOString(),
            },
          },
        });

        /* ------------------------------------------------------------------ */
        /* Complete transfer                                                   */
        /* ------------------------------------------------------------------ */

        const completedTransfer =
          await tx.transfer.update({
            where: {
              id:
                transfer.id,
            },

            data: {
              status:
                "COMPLETED",

              complianceReviewedAt:
                transfer.complianceReviewedAt ||
                new Date(),

              metadata: {
                ...metadata,

                approvalStatus:
                  "APPROVED",

                approvedBy:
                  adminUserId,

                approvedAt:
                  new Date().toISOString(),

                reservationStatus:
                  "SETTLED",
              },
            },

            include:
              transferInclude,
          });

        /* ------------------------------------------------------------------ */
        /* Audit                                                                */
        /* ------------------------------------------------------------------ */

        await createAuditLog({
          tx,

          userId:
            adminUserId,

          action:
            "APPROVE",

          entityId:
            transfer.id,

          metadata: {
            transferId:
              transfer.id,

            reference:
              transfer.reference,

            amount:
              serializeMoney(
                amount,
              ),

            currency:
              transfer.currencyCode,

            senderAccountId:
              senderAccount.id,

            receiverAccountId:
              receiverAccount.id,

            complianceStatus:
              transfer.complianceStatus,

            tinCheckStatus:
              transfer.tinCheckStatus,

            amlCheckStatus:
              transfer.amlCheckStatus,

            cftCheckStatus:
              transfer.cftCheckStatus,

            status:
              "COMPLETED",
          },
        });

        return {
          transfer:
            completedTransfer,

          alreadyCompleted:
            false,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,

        maxWait: 5000,

        timeout: 15000,
      },
    );

  return {
    transfer:
      serializeTransfer(
        result.transfer,
      ),

    alreadyCompleted:
      result.alreadyCompleted,
  };
};

/* -------------------------------------------------------------------------- */
/* Cancel / block internal transfer                                          */
/* -------------------------------------------------------------------------- */

export const cancelInternalTransfer = async ({
  transferId,
  adminUserId,
  reason,
}) => {
  if (!transferId) {
    throw createServiceError(
      "Transfer ID is required",
      400,
    );
  }

  if (!adminUserId) {
    throw createServiceError(
      "Administrator identity is required",
      401,
    );
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const transfer =
          await tx.transfer.findUnique({
            where: {
              id: transferId,
            },
          });

        if (!transfer) {
          throw createServiceError(
            "Transfer not found",
            404,
          );
        }

        if (
          transfer.type !==
          "INTERNAL"
        ) {
          throw createServiceError(
            "This service can only cancel internal transfers",
            400,
          );
        }

        if (
          transfer.status ===
          "COMPLETED"
        ) {
          throw createServiceError(
            "A completed transfer cannot be cancelled using this operation",
            409,
          );
        }

        if (
          transfer.status ===
            "CANCELLED" ||
          transfer.status ===
            "FAILED"
        ) {
          return {
            transfer:
              await tx.transfer.findUnique({
                where: {
                  id:
                    transfer.id,
                },

                include:
                  transferInclude,
              }),

            alreadyCancelled:
              true,
          };
        }

        if (
          transfer.status !==
          "PENDING"
        ) {
          throw createServiceError(
            `Transfer cannot be cancelled from ${transfer.status} status`,
            409,
          );
        }

        const metadata =
          transfer.metadata &&
          typeof transfer.metadata ===
            "object"
            ? transfer.metadata
            : {};

        const senderAccountId =
          metadata.senderAccountId;

        if (!senderAccountId) {
          throw createServiceError(
            "Sender account information is missing",
            409,
          );
        }

        /*
         * Lock the sender because the pending transfer
         * reserved funds from its available balance.
         */

        await tx.$queryRaw`
          SELECT id
          FROM "Account"
          WHERE id = ${senderAccountId}
          FOR UPDATE
        `;

        const senderAccount =
          await tx.account.findUnique({
            where: {
              id:
                senderAccountId,
            },

            select: {
              id: true,
              availableBalance: true,
            },
          });

        if (!senderAccount) {
          throw createServiceError(
            "Sender account no longer exists",
            409,
          );
        }

        const amount =
          toDecimal(
            transfer.amount,
          );

        const availableBalance =
          toDecimal(
            senderAccount.availableBalance,
          );

        /*
         * Release the reserved amount.
         */

        const availableBalanceAfter =
          addMoney(
            availableBalance,
            amount,
          );

        await tx.account.update({
          where: {
            id:
              senderAccount.id,
          },

          data: {
            availableBalance:
              availableBalanceAfter,
          },
        });

        /* ------------------------------------------------------------------ */
        /* Find transaction records                                            */
        /* ------------------------------------------------------------------ */

        const transactions =
          await tx.transaction.findMany({
            where: {
              metadata: {
                path: [
                  "transferId",
                ],

                equals:
                  transfer.id,
              },
            },

            select: {
              id: true,
              metadata: true,
            },
          });

        /* ------------------------------------------------------------------ */
        /* Cancel transactions                                                 */
        /* ------------------------------------------------------------------ */

        for (const transaction of transactions) {
          const transactionMetadata =
            transaction.metadata &&
            typeof transaction.metadata ===
              "object"
              ? transaction.metadata
              : {};

          await tx.transaction.update({
            where: {
              id:
                transaction.id,
            },

            data: {
              status:
                "CANCELLED",

              metadata: {
                ...transactionMetadata,

                approvalStatus:
                  "REJECTED",

                rejectedBy:
                  adminUserId,

                rejectedAt:
                  new Date().toISOString(),

                rejectionReason:
                  reason?.trim() ||
                  "Transfer rejected by administrator",

                reservationStatus:
                  "RELEASED",
              },
            },
          });
        }

        /* ------------------------------------------------------------------ */
        /* Cancel transfer                                                     */
        /* ------------------------------------------------------------------ */

        const cancelledTransfer =
          await tx.transfer.update({
            where: {
              id:
                transfer.id,
            },

            data: {
              status:
                "CANCELLED",

              metadata: {
                ...metadata,

                approvalStatus:
                  "REJECTED",

                rejectedBy:
                  adminUserId,

                rejectedAt:
                  new Date().toISOString(),

                rejectionReason:
                  reason?.trim() ||
                  "Transfer rejected by administrator",

                reservationStatus:
                  "RELEASED",
              },
            },

            include:
              transferInclude,
          });

        /* ------------------------------------------------------------------ */
        /* Audit                                                                */
        /* ------------------------------------------------------------------ */

        await createAuditLog({
          tx,

          userId:
            adminUserId,

          action:
            "REJECT",

          entityId:
            transfer.id,

          metadata: {
            transferId:
              transfer.id,

            reference:
              transfer.reference,

            amount:
              serializeMoney(
                amount,
              ),

            currency:
              transfer.currencyCode,

            reason:
              reason?.trim() ||
              "Transfer rejected by administrator",

            complianceStatus:
              transfer.complianceStatus,

            tinCheckStatus:
              transfer.tinCheckStatus,

            amlCheckStatus:
              transfer.amlCheckStatus,

            cftCheckStatus:
              transfer.cftCheckStatus,

            status:
              "CANCELLED",

            fundsReleased:
              true,
          },
        });

        return {
          transfer:
            cancelledTransfer,

          alreadyCancelled:
            false,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,

        maxWait: 5000,

        timeout: 15000,
      },
    );

  return {
    transfer:
      serializeTransfer(
        result.transfer,
      ),

    alreadyCancelled:
      result.alreadyCancelled,
  };
};

/* -------------------------------------------------------------------------- */
/* User transfer history                                                      */
/* -------------------------------------------------------------------------- */

export const getUserTransfers = async ({
  userId,
  status,
  limit = 50,
  cursor,
}) => {
  const safeLimit = Math.min(
    Math.max(
      Number(limit) || 50,
      1,
    ),
    100,
  );

  const transfers = await prisma.transfer.findMany({
    where: {
      OR: [
        {
          senderId: userId,
        },
        {
          receiverId: userId,
        },
      ],

      ...(status
        ? {
            status,
          }
        : {}),
    },

    include: transferInclude,

    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],

    take: safeLimit + 1,

    ...(cursor
      ? {
          cursor: {
            id: cursor,
          },
          skip: 1,
        }
      : {}),
  });

  const hasMore =
    transfers.length > safeLimit;

  const rows = hasMore
    ? transfers.slice(0, safeLimit)
    : transfers;

  return {
    transfers: rows.map(serializeTransfer),

    nextCursor: hasMore
      ? rows[rows.length - 1]?.id || null
      : null,

    hasMore,
  };
};

export const getUserTransferById = async ({
  userId,
  transferId,
}) => {
  const transfer =
    await prisma.transfer.findFirst({
      where: {
        id:
          transferId,

        OR: [
          {
            senderId:
              userId,
          },
          {
            receiverId:
              userId,
          },
        ],
      },

      include:
        transferInclude,
    });

  if (!transfer) {
    throw createServiceError(
      "Transfer not found",
      404,
    );
  }

  return serializeTransfer(
    transfer,
  );
};