import { Prisma } from "@prisma/client";

import prisma from "../config/database.js";

import {
  assertPositiveMoney,
  serializeMoney,
  toDecimal,
} from "../utils/money.js";

import {
  generateReference,
} from "../utils/reference.js";

import {
  normalizeIdempotencyKey,
} from "../utils/transfer.js";

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const MAX_TRANSFER_AMOUNT =
  new Prisma.Decimal("1000000000");

const ZERO =
  new Prisma.Decimal("0");

/*
 * ============================================================
 * ERROR HELPER
 * ============================================================
 */

const createError = (
  message,
  statusCode = 400,
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

/*
 * ============================================================
 * COMPLIANCE CODE NORMALIZER
 * ============================================================
 */

const normalizeComplianceCode = (
  value,
) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

/*
 * ============================================================
 * SERIALIZER
 * ============================================================
 */

const serializeTransfer = (
  transfer,
) => {
  if (!transfer) {
    return null;
  }

  return {
    ...transfer,

    amount:
      serializeMoney(
        transfer.amount,
      ),

    fee:
      serializeMoney(
        transfer.fee,
      ),

    total:
      serializeMoney(
        transfer.total,
      ),

    createdAt:
      transfer.createdAt
        ?.toISOString?.() ??
      transfer.createdAt,

    updatedAt:
      transfer.updatedAt
        ?.toISOString?.() ??
      transfer.updatedAt,

    complianceReviewedAt:
      transfer.complianceReviewedAt
        ?.toISOString?.() ??
      transfer.complianceReviewedAt,

    sender:
      transfer.sender
        ? {
            id:
              transfer.sender.id,

            email:
              transfer.sender.email,
          }
        : null,

    beneficiary:
      transfer.beneficiary
        ? {
            id:
              transfer.beneficiary.id,

            name:
              transfer.beneficiary.name,

            accountName:
              transfer.beneficiary
                .accountName,

            accountNumber:
              transfer.beneficiary
                .accountNumber,

            bankName:
              transfer.beneficiary
                .bankName,

            bankCode:
              transfer.beneficiary
                .bankCode,

            country:
              transfer.beneficiary
                .country,

            currencyCode:
              transfer.beneficiary
                .currencyCode,

            isActive:
              transfer.beneficiary
                .isActive,
          }
        : null,
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
      name: true,
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
 * VERIFY ONE TRANSFER COMPLIANCE CODE
 * ============================================================
 */

export const verifyTransferComplianceCode =
  async ({
    userId,
    codeType,
    code,
  }) => {
    if (!userId) {
      throw createError(
        "Authenticated user is required",
        401,
      );
    }

    const normalizedType =
      String(codeType ?? "")
        .trim()
        .toUpperCase();

    const allowedTypes = [
      "TIN",
      "TAX",
      "TAX_CODE",
      "AML",
      "CFT",
    ];

    if (
      !allowedTypes.includes(
        normalizedType,
      )
    ) {
      throw createError(
        "Invalid compliance code type",
        400,
      );
    }

    const normalizedCode =
      normalizeComplianceCode(
        code,
      );

    const type =
      normalizedType === "TAX" ||
      normalizedType === "TAX_CODE"
        ? "TIN"
        : normalizedType;

    const label =
      type === "TIN"
        ? "TIN / Tax Code"
        : type === "AML"
          ? "AML Code"
          : "CFT Code";

    if (!normalizedCode) {
      throw createError(
        `${label} is required`,
        400,
      );
    }

    const settings =
      await prisma.complianceSettings.findFirst({
        orderBy: {
          createdAt: "asc",
        },
      });

    const enabled =
      type === "TIN"
        ? Boolean(
            settings?.tinCheckEnabled,
          )
        : type === "AML"
          ? Boolean(
              settings?.amlCheckEnabled,
            )
          : Boolean(
              settings?.cftCheckEnabled,
            );

    if (!enabled) {
      return {
        verified: true,
        codeType: type,
        status: "NOT_REQUIRED",
        message:
          `${label} compliance check is not enabled.`,
      };
    }

    const kyc =
      await prisma.kyc.findUnique({
        where: {
          userId,
        },

        select: {
          status: true,

          taxIdentificationNumber:
            true,

          taxCodeVerified:
            true,

          amlCode:
            true,

          amlCodeVerified:
            true,

          cftCode:
            true,

          cftCodeVerified:
            true,
        },
      });

    if (!kyc) {
      throw createError(
        "KYC information was not found",
        403,
      );
    }

    let storedCode = "";

    let verified = false;

    if (type === "TIN") {
      storedCode =
        normalizeComplianceCode(
          kyc.taxIdentificationNumber,
        );

      verified =
        Boolean(
          kyc.taxCodeVerified,
        );
    }

    if (type === "AML") {
      storedCode =
        normalizeComplianceCode(
          kyc.amlCode,
        );

      verified =
        Boolean(
          kyc.amlCodeVerified,
        );
    }

    if (type === "CFT") {
      storedCode =
        normalizeComplianceCode(
          kyc.cftCode,
        );

      verified =
        Boolean(
          kyc.cftCodeVerified,
        );
    }

    if (
      !storedCode ||
      !verified
    ) {
      throw createError(
        `Your ${label} has not been verified`,
        403,
      );
    }

    if (
      normalizedCode !==
      storedCode
    ) {
      throw createError(
        `Invalid ${label}`,
        403,
      );
    }

    return {
      verified: true,

      codeType:
        type,

      status:
        "PASSED",

      message:
        `${label} verified successfully.`,
    };
  };

/*
 * ============================================================
 * RUN TRANSFER COMPLIANCE CHECKS
 * ============================================================
 */

const runTransferComplianceChecks =
  async ({
    tx,
    userId,
    tinCode,
    amlCode,
    cftCode,
  }) => {
    const settings =
      await tx.complianceSettings.findFirst({
        orderBy: {
          createdAt: "asc",
        },
      });

    const tinEnabled =
      Boolean(
        settings?.tinCheckEnabled,
      );

    const amlEnabled =
      Boolean(
        settings?.amlCheckEnabled,
      );

    const cftEnabled =
      Boolean(
        settings?.cftCheckEnabled,
      );

    const anyCheckEnabled =
      tinEnabled ||
      amlEnabled ||
      cftEnabled;

    if (!anyCheckEnabled) {
      return {
        complianceStatus:
          "NOT_REQUIRED",

        tinCheckStatus:
          "NOT_REQUIRED",

        amlCheckStatus:
          "NOT_REQUIRED",

        cftCheckStatus:
          "NOT_REQUIRED",

        complianceReason:
          null,
      };
    }

    const kyc =
      await tx.kyc.findUnique({
        where: {
          userId,
        },

        select: {
          status: true,

          taxIdentificationNumber:
            true,

          taxCodeVerified:
            true,

          amlCode:
            true,

          amlCodeVerified:
            true,

          cftCode:
            true,

          cftCodeVerified:
            true,
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
      const submittedTin =
        normalizeComplianceCode(
          tinCode,
        );

      const storedTin =
        normalizeComplianceCode(
          kyc?.taxIdentificationNumber,
        );

      const tinVerified =
        Boolean(
          kyc?.taxCodeVerified,
        );

      if (!submittedTin) {
        reasons.push(
          "TIN / Tax Code is required",
        );
      } else if (
        !storedTin ||
        !tinVerified
      ) {
        reasons.push(
          "Your TIN / Tax Code has not been verified by the bank",
        );
      } else if (
        submittedTin !==
        storedTin
      ) {
        reasons.push(
          "Invalid TIN / Tax Code",
        );
      } else {
        tinCheckStatus =
          "PASSED";
      }
    }

    if (amlEnabled) {
      const submittedAml =
        normalizeComplianceCode(
          amlCode,
        );

      const storedAml =
        normalizeComplianceCode(
          kyc?.amlCode,
        );

      const amlVerified =
        Boolean(
          kyc?.amlCodeVerified,
        );

      if (!submittedAml) {
        reasons.push(
          "AML Code is required",
        );
      } else if (
        !storedAml ||
        !amlVerified
      ) {
        reasons.push(
          "Your AML Code has not been verified by the bank",
        );
      } else if (
        submittedAml !==
        storedAml
      ) {
        reasons.push(
          "Invalid AML Code",
        );
      } else {
        amlCheckStatus =
          "PASSED";
      }
    }

    if (cftEnabled) {
      const submittedCft =
        normalizeComplianceCode(
          cftCode,
        );

      const storedCft =
        normalizeComplianceCode(
          kyc?.cftCode,
        );

      const cftVerified =
        Boolean(
          kyc?.cftCodeVerified,
        );

      if (!submittedCft) {
        reasons.push(
          "CFT Code is required",
        );
      } else if (
        !storedCft ||
        !cftVerified
      ) {
        reasons.push(
          "Your CFT Code has not been verified by the bank",
        );
      } else if (
        submittedCft !==
        storedCft
      ) {
        reasons.push(
          "Invalid CFT Code",
        );
      } else {
        cftCheckStatus =
          "PASSED";
      }
    }

    const failed =
      tinCheckStatus ===
        "FAILED" ||
      amlCheckStatus ===
        "FAILED" ||
      cftCheckStatus ===
        "FAILED";

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

/*
 * ============================================================
 * CREATE EXTERNAL BANK TRANSFER
 * ============================================================
 */

export const createBankTransfer =
  async ({
    userId,
    accountId,
    beneficiaryId,
    amount,
    tinCode,
    amlCode,
    cftCode,
    description,
    idempotencyKey,
  }) => {
    if (!userId) {
      throw createError(
        "Authenticated user is required",
        401,
      );
    }

    if (!accountId) {
      throw createError(
        "Source account is required",
      );
    }

    if (!beneficiaryId) {
      throw createError(
        "Beneficiary is required",
      );
    }

    const transferAmount =
      assertPositiveMoney(
        amount,
        "Transfer amount",
      );

    if (
      transferAmount.greaterThan(
        MAX_TRANSFER_AMOUNT,
      )
    ) {
      throw createError(
        "Transfer amount exceeds the permitted limit",
      );
    }

    const normalizedIdempotencyKey =
      normalizeIdempotencyKey(
        idempotencyKey,
      );

    if (normalizedIdempotencyKey) {
      const existing =
        await prisma.transfer.findUnique({
          where: {
            idempotencyKey:
              normalizedIdempotencyKey,
          },

          include:
            transferInclude,
        });

      if (
        existing &&
        existing.senderId ===
          userId
      ) {
        return {
          ...serializeTransfer(
            existing,
          ),

          alreadyExists:
            true,
        };
      }

      if (existing) {
        throw createError(
          "The supplied idempotency key has already been used",
          409,
        );
      }
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const lockedAccounts =
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
                AND "userId" = ${userId}
              FOR UPDATE

            `;

          const account =
            lockedAccounts[0];

          if (!account) {
            throw createError(
              "Source account was not found",
              404,
            );
          }

          if (
            account.status !==
            "ACTIVE"
          ) {
            throw createError(
              "The source account is not active",
            );
          }

          const beneficiary =
            await tx.beneficiary.findFirst({
              where: {
                id:
                  beneficiaryId,

                userId,

                isActive:
                  true,
              },
            });

          if (!beneficiary) {
            throw createError(
              "Beneficiary was not found or is inactive",
              404,
            );
          }

          const compliance =
            await runTransferComplianceChecks({
              tx,
              userId,
              tinCode,
              amlCode,
              cftCode,
            });

          if (
            compliance.complianceStatus ===
            "BLOCKED"
          ) {
            throw createError(
              compliance.complianceReason ||
                "Transfer blocked by compliance checks",
              403,
            );
          }

          const currentBalance =
            toDecimal(
              account.balance,
            );

          const currentAvailableBalance =
            toDecimal(
              account.availableBalance,
            );

          const currentLedgerBalance =
            toDecimal(
              account.ledgerBalance,
            );

          const minimumBalance =
            toDecimal(
              account.minimumBalance,
            );

          const transferFee =
            new Prisma.Decimal(
              "0",
            );

          const totalDebit =
            transferAmount.add(
              transferFee,
            );

          if (
            currentAvailableBalance.lessThan(
              totalDebit,
            )
          ) {
            throw createError(
              "Insufficient available balance",
            );
          }

          const remainingBalance =
            currentBalance.sub(
              totalDebit,
            );

          if (
            remainingBalance.lessThan(
              minimumBalance,
            )
          ) {
            throw createError(
              "Transfer would reduce the account below its minimum balance",
            );
          }

          const currency =
            await tx.currency.findUnique({
              where: {
                id:
                  account.currencyId,
              },
            });

          if (!currency) {
            throw createError(
              "Account currency was not found",
              500,
            );
          }

          const reference =
            await generateReference(
              "TRF",
            );

          const updatedAccount =
            await tx.account.update({
              where: {
                id:
                  account.id,
              },

              data: {
                balance:
                  remainingBalance,

                availableBalance:
                  currentAvailableBalance.sub(
                    totalDebit,
                  ),

                ledgerBalance:
                  currentLedgerBalance.sub(
                    totalDebit,
                  ),
              },
            });

          /*
           * IMPORTANT:
           *
           * Transfer has NO accountId field.
           * Transfer has NO currencyId field.
           *
           * The source account is stored in metadata.
           * The transfer currency is stored using currencyCode.
           */

          const createdTransfer =
            await tx.transfer.create({
              data: {
                reference,

                senderId:
                  userId,

                beneficiaryId,

                type:
                  "BANK",

                amount:
                  transferAmount,

                fee:
                  transferFee,

                total:
                  totalDebit,

                currencyCode:
                  currency.code,

                description:
                  description
                    ?.trim() ||
                  null,

                status:
                  "PENDING",

                idempotencyKey:
                  normalizedIdempotencyKey ||
                  null,

                complianceStatus:
                  compliance.complianceStatus,

                tinCheckStatus:
                  compliance.tinCheckStatus,

                amlCheckStatus:
                  compliance.amlCheckStatus,

                cftCheckStatus:
                  compliance.cftCheckStatus,

                complianceReason:
                  compliance.complianceReason,

                complianceReviewedAt:
                  new Date(),

                metadata: {
                  accountId:
                    account.id,

                  accountNumber:
                    account.accountNumber,

                  beneficiaryId,

                  sourceCurrencyCode:
                    currency.code,
                },
              },

              include:
                transferInclude,
            });

          const transaction =
            
await tx.transaction.create({
  data: {
    accountId: account.id,
    userId,

    type: "TRANSFER",

    amount: transferAmount,
    fee: transferFee,
    total: totalDebit,

    currencyId: account.currencyId,
    reference,

    description:
      description?.trim() ||
      `Bank transfer to ${
        beneficiary.accountName || beneficiary.name
      }`,

    status: "PENDING",

    metadata: {
      transferId: createdTransfer.id,
      transferType: "BANK",
      sourceAccountId: account.id,
      beneficiaryId,

      complianceStatus: compliance.complianceStatus,
      tinCheckStatus: compliance.tinCheckStatus,
      amlCheckStatus: compliance.amlCheckStatus,
      cftCheckStatus: compliance.cftCheckStatus,
      complianceReason: compliance.complianceReason,
    },
  },
});


          await tx.ledgerEntry.create({
            data: {
              accountId:
                account.id,

              transactionId:
                transaction.id,

              type:
                "DEBIT",

              amount:
                transferAmount,

              balanceBefore:
                currentBalance,

              balanceAfter:
                remainingBalance,

              description:
                description?.trim() ||
                `Bank transfer to ${
                  beneficiary.accountName ||
                  beneficiary.name
                }`,
            },
          });

          
await tx.auditLog.create({
  data: {
    userId,
    action: "TRANSFER",
    entity: "Transfer",
    entityId: createdTransfer.id,

    description: `Bank transfer ${reference} created and awaiting admin processing`,

    metadata: {
      reference,
      accountId: account.id,
      beneficiaryId,

      amount: transferAmount.toString(),
      fee: transferFee.toString(),
      total: totalDebit.toString(),

      complianceStatus: compliance.complianceStatus,
      tinCheckStatus: compliance.tinCheckStatus,
      amlCheckStatus: compliance.amlCheckStatus,
      cftCheckStatus: compliance.cftCheckStatus,
      complianceReason: compliance.complianceReason,

      balanceBefore: currentBalance.toString(),
      balanceAfter: remainingBalance.toString(),
    },
  },
});


          return {
            transfer:
              createdTransfer,

            account:
              updatedAccount,

            compliance,
          };
        },
      );

    return {
      ...serializeTransfer(
        result.transfer,
      ),

      complianceStatus:
        result.compliance
          .complianceStatus,

      tinCheckStatus:
        result.compliance
          .tinCheckStatus,

      amlCheckStatus:
        result.compliance
          .amlCheckStatus,

      cftCheckStatus:
        result.compliance
          .cftCheckStatus,

      complianceReason:
        result.compliance
          .complianceReason,

      account: {
        id:
          result.account.id,

        accountNumber:
          result.account
            .accountNumber,

        balance:
          serializeMoney(
            result.account
              .balance,
          ),

        availableBalance:
          serializeMoney(
            result.account
              .availableBalance,
          ),

        ledgerBalance:
          serializeMoney(
            result.account
              .ledgerBalance,
          ),
      },
    };
  };

/*
 * ============================================================
 * GET TRANSFER BY ID
 * ============================================================
 */

export const getBankTransferById =
  async ({
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
      );
    }

    const transfer =
      await prisma.transfer.findFirst({
        where: {
          id:
            transferId,

          senderId:
            userId,
        },

        include:
          transferInclude,
      });

    if (!transfer) {
      throw createError(
        "Transfer was not found",
        404,
      );
    }

    return serializeTransfer(
      transfer,
    );
  };

/*
 * ============================================================
 * GET TRANSFER BY REFERENCE
 * ============================================================
 */

export const getBankTransferByReference =
  async ({
    userId,
    reference,
  }) => {
    if (!userId) {
      throw createError(
        "Authenticated user is required",
        401,
      );
    }

    if (!reference) {
      throw createError(
        "Transfer reference is required",
      );
    }

    const transfer =
      await prisma.transfer.findFirst({
        where: {
          reference:
            reference.trim(),

          senderId:
            userId,
        },

        include:
          transferInclude,
      });

    if (!transfer) {
      throw createError(
        "Transfer was not found",
        404,
      );
    }

    return serializeTransfer(
      transfer,
    );
  };

/*
 * ============================================================
 * LIST USER BANK TRANSFERS
 * ============================================================
 */

export const listBankTransfers =
  async ({
    userId,
    page = 1,
    limit = 20,
    status,
  }) => {
    if (!userId) {
      throw createError(
        "Authenticated user is required",
        401,
      );
    }

    const safePage =
      Math.max(
        Number(page) || 1,
        1,
      );

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1,
        ),
        100,
      );

    const skip =
      (safePage - 1) *
      safeLimit;

    const where = {
      senderId:
        userId,
    };

    if (
      status &&
      typeof status ===
        "string"
    ) {
      where.status =
        status.trim();
    }

    const [
      transfers,
      total,
    ] =
      await Promise.all([
        prisma.transfer.findMany({
          where,

          include:
            transferInclude,

          orderBy: {
            createdAt:
              "desc",
          },

          skip,

          take:
            safeLimit,
        }),

        prisma.transfer.count({
          where,
        }),
      ]);

    return {
      data:
        transfers.map(
          serializeTransfer,
        ),

      pagination: {
        page:
          safePage,

        limit:
          safeLimit,

        total,

        totalPages:
          Math.ceil(
            total /
              safeLimit,
          ),
      },
    };
  };

/*
 * ============================================================
 * CANCEL BANK TRANSFER
 * ============================================================
 */

export const cancelBankTransfer =
  async ({
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
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const transfer =
            await tx.transfer.findFirst({
              where: {
                id:
                  transferId,

                senderId:
                  userId,
              },
            });

          if (!transfer) {
            throw createError(
              "Transfer was not found",
              404,
            );
          }

          if (
            transfer.status !==
            "PENDING"
          ) {
            throw createError(
              "Only pending transfers can be cancelled",
            );
          }

          const metadata =
            transfer.metadata &&
            typeof transfer.metadata ===
              "object"
              ? transfer.metadata
              : {};

          const sourceAccountId =
            typeof metadata.accountId ===
              "string"
              ? metadata.accountId
              : null;

          if (!sourceAccountId) {
            throw createError(
              "Source account information is missing from the transfer",
              500,
            );
          }

          const lockedAccounts =
            await tx.$queryRaw`

              SELECT
                id,
                "currencyId",
                balance,
                "availableBalance",
                "ledgerBalance"
              FROM "Account"
              WHERE id = ${sourceAccountId}
                AND "userId" = ${userId}
              FOR UPDATE

            `;

          const account =
            lockedAccounts[0];

          if (!account) {
            throw createError(
              "Source account was not found",
              404,
            );
          }

          const balance =
            toDecimal(
              account.balance,
            );

          const availableBalance =
            toDecimal(
              account.availableBalance,
            );

          const ledgerBalance =
            toDecimal(
              account.ledgerBalance,
            );

          const updatedBalance =
            balance.add(
              transfer.total,
            );

          const updatedAvailableBalance =
            availableBalance.add(
              transfer.total,
            );

          const updatedLedgerBalance =
            ledgerBalance.add(
              transfer.total,
            );

          await tx.account.update({
            where: {
              id:
                account.id,
            },

            data: {
              balance:
                updatedBalance,

              availableBalance:
                updatedAvailableBalance,

              ledgerBalance:
                updatedLedgerBalance,
            },
          });

          const cancelled =
            await tx.transfer.update({
              where: {
                id:
                  transfer.id,
              },

              data: {
                status:
                  "CANCELLED",
              },

              include:
                transferInclude,
            });

          const transaction =
            await tx.transaction.create({
              data: {
                accountId:
                  account.id,

                userId,

                type:
                  "REFUND",

                amount:
                  transfer.amount,

                fee:
                  ZERO,

                total:
                  transfer.total,

                currencyId:
                  account.currencyId,

                reference:
                  `REV-${transfer.reference}`,

                description:
                  `Reversal for cancelled transfer ${transfer.reference}`,

                status:
                  "COMPLETED",

                metadata: {
                  transferId:
                    transfer.id,

                  originalReference:
                    transfer.reference,
                },
              },
            });

          await tx.ledgerEntry.create({
            data: {
              accountId:
                account.id,

              transactionId:
                transaction.id,

              type:
                "CREDIT",

              amount:
                transfer.total,

              balanceBefore:
                balance,

              balanceAfter:
                updatedBalance,

              description:
                `Reversal for cancelled transfer ${transfer.reference}`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId,

              action:
                "TRANSFER",

              entity:
                "Transfer",

              entityId:
                transfer.id,

              metadata: {
                reference:
                  transfer.reference,

                amount:
                  transfer.amount.toString(),

                total:
                  transfer.total.toString(),

                reversalAmount:
                  transfer.total.toString(),
              },
            },
          });

          return cancelled;
        },
      );

    return serializeTransfer(
      result,
    );
  };

/*
 * ============================================================
 * ADMIN: GET TRANSFER
 * ============================================================
 */

export const getTransferForAdmin =
  async ({
    transferId,
  }) => {
    if (!transferId) {
      throw createError(
        "Transfer ID is required",
      );
    }

    const transfer =
      await prisma.transfer.findUnique({
        where: {
          id:
            transferId,
        },

        include:
          transferInclude,
      });

    if (!transfer) {
      throw createError(
        "Transfer was not found",
        404,
      );
    }

    return serializeTransfer(
      transfer,
    );
  };

/*
 * ============================================================
 * ADMIN: LIST TRANSFERS
 * ============================================================
 */

export const listTransfersForAdmin =
  async ({
    page = 1,
    limit = 50,
    status,
    complianceStatus,
    search,
  }) => {
    const safePage =
      Math.max(
        Number(page) || 1,
        1,
      );

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1,
        ),
        100,
      );

    const skip =
      (safePage - 1) *
      safeLimit;

    const where = {};

    if (
      status &&
      typeof status ===
        "string"
    ) {
      where.status =
        status.trim();
    }

    if (
      complianceStatus &&
      typeof complianceStatus ===
        "string"
    ) {
      where.complianceStatus =
        complianceStatus.trim();
    }

    if (
      search &&
      typeof search ===
        "string"
    ) {
      const value =
        search.trim();

      if (value) {
        where.OR = [
          {
            reference: {
              contains:
                value,

              mode:
                "insensitive",
            },
          },

          {
            description: {
              contains:
                value,

              mode:
                "insensitive",
            },
          },
        ];
      }
    }

    const [
      transfers,
      total,
    ] =
      await Promise.all([
        prisma.transfer.findMany({
          where,

          include:
            transferInclude,

          orderBy: {
            createdAt:
              "desc",
          },

          skip,

          take:
            safeLimit,
        }),

        prisma.transfer.count({
          where,
        }),
      ]);

    return {
      data:
        transfers.map(
          serializeTransfer,
        ),

      pagination: {
        page:
          safePage,

        limit:
          safeLimit,

        total,

        totalPages:
          Math.ceil(
            total /
              safeLimit,
          ),
      },
    };
  };

/*
 * ============================================================
 * ADMIN: APPROVE TRANSFER
 * ============================================================
 */

export const approveBankTransfer =
  async ({
    transferId,
    adminUserId,
  }) => {
    if (!transferId) {
      throw createError(
        "Transfer ID is required",
      );
    }

    if (!adminUserId) {
      throw createError(
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
                id:
                  transferId,
              },
            });

          if (!transfer) {
            throw createError(
              "Transfer was not found",
              404,
            );
          }

          if (
            transfer.complianceStatus ===
            "BLOCKED"
          ) {
            throw createError(
              transfer.complianceReason ||
                "Transfer is blocked by compliance checks",
              403,
            );
          }

          if (
            transfer.status !==
            "PENDING"
          ) {
            throw createError(
              `Transfer cannot be approved from ${transfer.status} status`,
            );
          }

          const updated =
            await tx.transfer.update({
              where: {
                id:
                  transfer.id,
              },

              data: {
                status:
                  "COMPLETED",
              },

              include:
                transferInclude,
            });

          await tx.auditLog.create({
            data: {
              userId:
                adminUserId,

              action:
                "TRANSFER",

              entity:
                "Transfer",

              entityId:
                transfer.id,

              metadata: {
                reference:
                  transfer.reference,

                complianceStatus:
                  transfer.complianceStatus,

                tinCheckStatus:
                  transfer.tinCheckStatus,

                amlCheckStatus:
                  transfer.amlCheckStatus,

                cftCheckStatus:
                  transfer.cftCheckStatus,
              },
            },
          });

          return updated;
        },
      );

    return serializeTransfer(
      result,
    );
  };

/*
 * ============================================================
 * ADMIN: REJECT TRANSFER
 * ============================================================
 */

export const rejectBankTransfer =
  async ({
    transferId,
    adminUserId,
    reason,
  }) => {
    if (!transferId) {
      throw createError(
        "Transfer ID is required",
      );
    }

    if (!adminUserId) {
      throw createError(
        "Administrator identity is required",
        401,
      );
    }

    const rejectionReason =
      String(
        reason ?? "",
      ).trim();

    if (!rejectionReason) {
      throw createError(
        "Rejection reason is required",
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const transfer =
            await tx.transfer.findUnique({
              where: {
                id:
                  transferId,
              },
            });

          if (!transfer) {
            throw createError(
              "Transfer was not found",
              404,
            );
          }

          if (
            transfer.status !==
            "PENDING"
          ) {
            throw createError(
              `Transfer cannot be rejected from ${transfer.status} status`,
            );
          }

          const metadata =
            transfer.metadata &&
            typeof transfer.metadata ===
              "object"
              ? transfer.metadata
              : {};

          const sourceAccountId =
            typeof metadata.accountId ===
              "string"
              ? metadata.accountId
              : null;

          if (!sourceAccountId) {
            throw createError(
              "Source account information is missing from the transfer",
              500,
            );
          }

          const lockedAccounts =
            await tx.$queryRaw`

              SELECT
                id,
                "currencyId",
                balance,
                "availableBalance",
                "ledgerBalance"
              FROM "Account"
              WHERE id = ${sourceAccountId}
                AND "userId" = ${transfer.senderId}
              FOR UPDATE

            `;

          const account =
            lockedAccounts[0];

          if (!account) {
            throw createError(
              "Source account was not found",
              404,
            );
          }

          const balance =
            toDecimal(
              account.balance,
            );

          const availableBalance =
            toDecimal(
              account.availableBalance,
            );

          const ledgerBalance =
            toDecimal(
              account.ledgerBalance,
            );

          const restoredBalance =
            balance.add(
              transfer.total,
            );

          const restoredAvailableBalance =
            availableBalance.add(
              transfer.total,
            );

          const restoredLedgerBalance =
            ledgerBalance.add(
              transfer.total,
            );

          await tx.account.update({
            where: {
              id:
                account.id,
            },

            data: {
              balance:
                restoredBalance,

              availableBalance:
                restoredAvailableBalance,

              ledgerBalance:
                restoredLedgerBalance,
            },
          });

          const rejected =
            await tx.transfer.update({
              where: {
                id:
                  transfer.id,
              },

              data: {
                status:
                  "CANCELLED",

                complianceReason:
                  transfer.complianceReason ||
                  rejectionReason,
              },

              include:
                transferInclude,
            });

          const transaction =
            await tx.transaction.create({
              data: {
                accountId:
                  account.id,

                userId:
                  transfer.senderId,

                type:
                  "REFUND",

                amount:
                  transfer.amount,

                fee:
                  ZERO,

                total:
                  transfer.total,

                currencyId:
                  account.currencyId,

                reference:
                  `REJ-${transfer.reference}`,

                description:
                  `Reversal for rejected transfer ${transfer.reference}`,

                status:
                  "COMPLETED",

                metadata: {
                  transferId:
                    transfer.id,

                  originalReference:
                    transfer.reference,

                  rejectionReason,
                },
              },
            });

          await tx.ledgerEntry.create({
            data: {
              accountId:
                account.id,

              transactionId:
                transaction.id,

              type:
                "CREDIT",

              amount:
                transfer.total,

              balanceBefore:
                balance,

              balanceAfter:
                restoredBalance,

              description:
                `Reversal for rejected transfer ${transfer.reference}`,
            },
          });

          await tx.auditLog.create({
            data: {
              userId:
                adminUserId,

              action:
                "TRANSFER",

              entity:
                "Transfer",

              entityId:
                transfer.id,

              metadata: {
                reference:
                  transfer.reference,

                rejectionReason,

                complianceStatus:
                  transfer.complianceStatus,

                tinCheckStatus:
                  transfer.tinCheckStatus,

                amlCheckStatus:
                  transfer.amlCheckStatus,

                cftCheckStatus:
                  transfer.cftCheckStatus,
              },
            },
          });

          return rejected;
        },
      );

    return serializeTransfer(
      result,
    );
  };

/*
 * ============================================================
 * ADMIN: BLOCK TRANSFER
 * ============================================================
 */

export const blockBankTransfer =
  async ({
    transferId,
    adminUserId,
    reason,
  }) => {
    if (!transferId) {
      throw createError(
        "Transfer ID is required",
      );
    }

    if (!adminUserId) {
      throw createError(
        "Administrator identity is required",
        401,
      );
    }

    const blockReason =
      String(
        reason ?? "",
      ).trim();

    if (!blockReason) {
      throw createError(
        "Blocking reason is required",
      );
    }

    const transfer =
      await prisma.transfer.findUnique({
        where: {
          id:
            transferId,
        },
      });

    if (!transfer) {
      throw createError(
        "Transfer was not found",
        404,
      );
    }

    if (
      transfer.status !==
      "PENDING"
    ) {
      throw createError(
        `Transfer cannot be blocked from ${transfer.status} status`,
      );
    }

    const updated =
      await prisma.transfer.update({
        where: {
          id:
            transferId,
        },

        data: {
          status:
            "FAILED",

          complianceStatus:
            "BLOCKED",

          complianceReason:
            blockReason,

          complianceReviewedAt:
            new Date(),
        },

        include:
          transferInclude,
      });

    await prisma.auditLog.create({
      data: {
        userId:
          adminUserId,

        action:
          "TRANSFER",

        entity:
          "Transfer",

        entityId:
          transfer.id,

        metadata: {
          reference:
            transfer.reference,

          reason:
            blockReason,
        },
      },
    });

    return serializeTransfer(
      updated,
    );
  };