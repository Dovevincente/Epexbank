import { Prisma } from "@prisma/client";

import prisma from "../config/database.js";

import {
  assertPositiveMoney,
  serializeMoney,
  toDecimal,
} from "../utils/money.js";

import { generateReference } from "../utils/reference.js";

import { normalizeIdempotencyKey } from "../utils/transfer.js";

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
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/*
 * ============================================================
 * NORMALIZE COMPLIANCE CODE
 * ============================================================
 */

const normalizeComplianceCode = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

/*
 * ============================================================
 * SERIALIZE TRANSFER
 * ============================================================
 */

const serializeTransfer = (transfer) => {
  if (!transfer) {
    return null;
  }

  return {
    ...transfer,

    amount: serializeMoney(transfer.amount),
    fee: serializeMoney(transfer.fee),
    total: serializeMoney(transfer.total),

    createdAt:
      transfer.createdAt?.toISOString?.() ??
      transfer.createdAt,

    updatedAt:
      transfer.updatedAt?.toISOString?.() ??
      transfer.updatedAt,

    complianceReviewedAt:
      transfer.complianceReviewedAt?.toISOString?.() ??
      transfer.complianceReviewedAt,

    sender: transfer.sender
      ? {
          id: transfer.sender.id,
          email: transfer.sender.email,
        }
      : null,

    beneficiary: transfer.beneficiary
      ? {
          id: transfer.beneficiary.id,
          name: transfer.beneficiary.name,
          accountName: transfer.beneficiary.accountName,
          accountNumber: transfer.beneficiary.accountNumber,
          bankName: transfer.beneficiary.bankName,
          bankCode: transfer.beneficiary.bankCode,
          country: transfer.beneficiary.country,
          currencyCode: transfer.beneficiary.currencyCode,
          isActive: transfer.beneficiary.isActive,
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
 * VERIFY ONE COMPLIANCE CODE
 *
 * FLOW:
 *
 * TIN
 *  ↓
 * AML
 *  ↓
 * CFT
 *
 * The frontend should call this endpoint one code at a time.
 *
 * The backend also enforces the order:
 *
 * AML cannot be verified before TIN.
 * CFT cannot be verified before AML.
 * ============================================================
 */

export const verifyTransferComplianceCode = async ({
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

  const normalizedType = String(
    codeType ?? "",
  )
    .trim()
    .toUpperCase();

  const allowedTypes = [
    "TIN",
    "TAX",
    "TAX_CODE",
    "AML",
    "CFT",
  ];

  if (!allowedTypes.includes(normalizedType)) {
    throw createError(
      "Invalid compliance code type",
      400,
    );
  }

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

  const normalizedCode =
    normalizeComplianceCode(code);

  if (!normalizedCode) {
    throw createError(
      `${label} is required`,
      400,
    );
  }

  /*
   * ----------------------------------------------------------
   * ADMIN SETTINGS
   * ----------------------------------------------------------
   */

  const settings =
    await prisma.complianceSettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

  const enabled =
    type === "TIN"
      ? Boolean(settings?.tinCheckEnabled)
      : type === "AML"
        ? Boolean(settings?.amlCheckEnabled)
        : Boolean(settings?.cftCheckEnabled);

  /*
   * If this check is disabled by admin,
   * it is automatically considered not required.
   */

  if (!enabled) {
    return {
      verified: true,
      codeType: type,
      status: "NOT_REQUIRED",
      message:
        `${label} compliance check is not enabled.`,
    };
  }

  /*
   * ----------------------------------------------------------
   * LOAD KYC
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   * AML/CFT MUST be included here.
   */

  const kyc =
    await prisma.kyc.findUnique({
      where: {
        userId,
      },

      select: {
        status: true,

        taxIdentificationNumber: true,
        taxCodeVerified: true,

        amlCode: true,
        amlCodeVerified: true,

        cftCode: true,
        cftCodeVerified: true,
      },
    });

  if (!kyc) {
    throw createError(
      "KYC information was not found",
      403,
    );
  }

  /*
   * ----------------------------------------------------------
   * TIN
   * ----------------------------------------------------------
   */

  if (type === "TIN") {
    const storedTin =
      normalizeComplianceCode(
        kyc.taxIdentificationNumber,
      );

    if (!storedTin || !kyc.taxCodeVerified) {
      throw createError(
        "Your TIN / Tax Code has not been verified by the bank",
        403,
      );
    }

    if (normalizedCode !== storedTin) {
      throw createError(
        "Invalid TIN / Tax Code",
        403,
      );
    }

    return {
      verified: true,
      codeType: "TIN",
      status: "PASSED",
      message:
        "TIN / Tax Code verified successfully.",
      nextStep:
        settings?.amlCheckEnabled
          ? "AML"
          : settings?.cftCheckEnabled
            ? "CFT"
            : "COMPLETE",
    };
  }

  /*
   * ----------------------------------------------------------
   * AML
   *
   * AML requires TIN to have already been verified.
   * ----------------------------------------------------------
   */

  if (type === "AML") {
    if (
      settings?.tinCheckEnabled &&
      (!kyc.taxIdentificationNumber ||
        !kyc.taxCodeVerified)
    ) {
      throw createError(
        "Please verify your TIN / Tax Code first",
        403,
      );
    }

    const storedAml =
      normalizeComplianceCode(
        kyc.amlCode,
      );

    if (
      !storedAml ||
      !kyc.amlCodeVerified
    ) {
      throw createError(
        "Your AML Code has not been verified by the bank",
        403,
      );
    }

    if (normalizedCode !== storedAml) {
      throw createError(
        "Invalid AML Code",
        403,
      );
    }

    return {
      verified: true,
      codeType: "AML",
      status: "PASSED",
      message:
        "AML Code verified successfully.",
      nextStep:
        settings?.cftCheckEnabled
          ? "CFT"
          : "COMPLETE",
    };
  }

  /*
   * ----------------------------------------------------------
   * CFT
   *
   * CFT requires AML to have already been verified.
   * ----------------------------------------------------------
   */

  if (type === "CFT") {
    if (
      settings?.tinCheckEnabled &&
      (!kyc.taxIdentificationNumber ||
        !kyc.taxCodeVerified)
    ) {
      throw createError(
        "Please verify your TIN / Tax Code first",
        403,
      );
    }

    if (
      settings?.amlCheckEnabled &&
      (!kyc.amlCode ||
        !kyc.amlCodeVerified)
    ) {
      throw createError(
        "Please verify your AML Code first",
        403,
      );
    }

    const storedCft =
      normalizeComplianceCode(
        kyc.cftCode,
      );

    if (
      !storedCft ||
      !kyc.cftCodeVerified
    ) {
      throw createError(
        "Your CFT Code has not been verified by the bank",
        403,
      );
    }

    if (normalizedCode !== storedCft) {
      throw createError(
        "Invalid CFT Code",
        403,
      );
    }

    return {
      verified: true,
      codeType: "CFT",
      status: "PASSED",
      message:
        "CFT Code verified successfully.",
      nextStep: "COMPLETE",
    };
  }

  throw createError(
    "Unable to verify compliance code",
    400,
  );
};

/*
 * ============================================================
 * RUN COMPLETE TRANSFER COMPLIANCE CHECK
 *
 * This is the FINAL server-side check before money is moved.
 *
 * ============================================================
 */

const runTransferComplianceChecks = async ({
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

  /*
   * ----------------------------------------------------------
   * LOAD ALL KYC COMPLIANCE VALUES
   * ----------------------------------------------------------
   */

  const kyc =
    await tx.kyc.findUnique({
      where: {
        userId,
      },

      select: {
        status: true,

        taxIdentificationNumber: true,
        taxCodeVerified: true,

        amlCode: true,
        amlCodeVerified: true,

        cftCode: true,
        cftCodeVerified: true,
      },
    });

  if (!kyc) {
    return {
      complianceStatus: "BLOCKED",

      tinCheckStatus:
        tinEnabled
          ? "FAILED"
          : "NOT_REQUIRED",

      amlCheckStatus:
        amlEnabled
          ? "FAILED"
          : "NOT_REQUIRED",

      cftCheckStatus:
        cftEnabled
          ? "FAILED"
          : "NOT_REQUIRED",

      complianceReason:
        "KYC information was not found",
    };
  }

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

  /*
   * ----------------------------------------------------------
   * TIN CHECK
   * ----------------------------------------------------------
   */

  if (tinEnabled) {
    const submittedTin =
      normalizeComplianceCode(
        tinCode,
      );

    const storedTin =
      normalizeComplianceCode(
        kyc.taxIdentificationNumber,
      );

    if (!submittedTin) {
      reasons.push(
        "TIN / Tax Code is required",
      );
    } else if (
      !storedTin ||
      !kyc.taxCodeVerified
    ) {
      reasons.push(
        "Your TIN / Tax Code has not been verified by the bank",
      );
    } else if (
      submittedTin !== storedTin
    ) {
      reasons.push(
        "Invalid TIN / Tax Code",
      );
    } else {
      tinCheckStatus = "PASSED";
    }
  }

  /*
   * ----------------------------------------------------------
   * AML CHECK
   * ----------------------------------------------------------
   */

  if (amlEnabled) {
    const submittedAml =
      normalizeComplianceCode(
        amlCode,
      );

    const storedAml =
      normalizeComplianceCode(
        kyc.amlCode,
      );

    if (!submittedAml) {
      reasons.push(
        "AML Code is required",
      );
    } else if (
      !storedAml ||
      !kyc.amlCodeVerified
    ) {
      reasons.push(
        "Your AML Code has not been verified by the bank",
      );
    } else if (
      submittedAml !== storedAml
    ) {
      reasons.push(
        "Invalid AML Code",
      );
    } else {
      amlCheckStatus = "PASSED";
    }
  }

  /*
   * ----------------------------------------------------------
   * CFT CHECK
   * ----------------------------------------------------------
   */

  if (cftEnabled) {
    const submittedCft =
      normalizeComplianceCode(
        cftCode,
      );

    const storedCft =
      normalizeComplianceCode(
        kyc.cftCode,
      );

    if (!submittedCft) {
      reasons.push(
        "CFT Code is required",
      );
    } else if (
      !storedCft ||
      !kyc.cftCodeVerified
    ) {
      reasons.push(
        "Your CFT Code has not been verified by the bank",
      );
    } else if (
      submittedCft !== storedCft
    ) {
      reasons.push(
        "Invalid CFT Code",
      );
    } else {
      cftCheckStatus = "PASSED";
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
      reasons.length
        ? reasons.join("; ")
        : null,
  };
};

/*
 * ============================================================
 * CREATE BANK TRANSFER
 * ============================================================
 */

export const createBankTransfer = async ({
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

  /*
   * ----------------------------------------------------------
   * IDEMPOTENCY
   * ----------------------------------------------------------
   */

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
      existing.senderId === userId
    ) {
      return {
        ...serializeTransfer(
          existing,
        ),

        alreadyExists: true,
      };
    }

    if (existing) {
      throw createError(
        "The supplied idempotency key has already been used",
        409,
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * TRANSACTION
   * ----------------------------------------------------------
   */

  const result =
    await prisma.$transaction(
      async (tx) => {
        /*
         * LOCK ACCOUNT
         */

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

        /*
         * BENEFICIARY
         */

        const beneficiary =
          await tx.beneficiary.findFirst({
            where: {
              id: beneficiaryId,
              userId,
              isActive: true,
            },
          });

        if (!beneficiary) {
          throw createError(
            "Beneficiary was not found or is inactive",
            404,
          );
        }

        /*
         * ------------------------------------------------------
         * FINAL COMPLIANCE CHECK
         *
         * This happens BEFORE:
         * - debit
         * - transaction
         * - transfer creation
         * ------------------------------------------------------
         */

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

        /*
         * BALANCES
         */

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
          new Prisma.Decimal("0");

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
            400,
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
            400,
          );
        }

        /*
         * CURRENCY
         */

        const currency =
          await tx.currency.findUnique({
            where: {
              id: account.currencyId,
            },
          });

        if (!currency) {
          throw createError(
            "Account currency was not found",
            500,
          );
        }

        /*
         * REFERENCE
         */

        const reference =
          await generateReference(
            "TRF",
          );

        /*
         * UPDATE ACCOUNT
         */

        const updatedAccount =
          await tx.account.update({
            where: {
              id: account.id,
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
         * CREATE TRANSFER
         */

        const createdTransfer =
          await tx.transfer.create({
            data: {
              reference,

              senderId:
                userId,

              accountId:
                account.id,

              beneficiaryId,

              type:
                "BANK",

              amount:
                transferAmount,

              fee:
                transferFee,

              total:
                totalDebit,

              currencyId:
                account.currencyId,

              currencyCode:
                currency.code,

              description:
                description?.trim() ||
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
            },

            include:
              transferInclude,
          });

        /*
         * LEDGER TRANSACTION
         */

        await tx.transaction.create({
          data: {
            accountId:
              account.id,

            userId,

            type:
              "TRANSFER",

            direction:
              "DEBIT",

            amount:
              transferAmount,

            fee:
              transferFee,

            total:
              totalDebit,

            balanceBefore:
              currentBalance,

            balanceAfter:
              remainingBalance,

            currencyId:
              account.currencyId,

            reference,

            description:
              description?.trim() ||
              `Bank transfer to ${
                beneficiary.accountName ||
                beneficiary.name
              }`,

            status:
              "COMPLETED",

            metadata: {
              transferId:
                createdTransfer.id,

              beneficiaryId,

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
            },
          },
        });

        /*
         * AUDIT
         */

        await tx.auditLog.create({
          data: {
            userId,

            action:
              "BANK_TRANSFER_CREATED",

            entityType:
              "Transfer",

            entityId:
              createdTransfer.id,

            metadata: {
              reference,

              accountId:
                account.id,

              beneficiaryId,

              amount:
                transferAmount.toString(),

              fee:
                transferFee.toString(),

              total:
                totalDebit.toString(),

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

              balanceBefore:
                currentBalance.toString(),

              balanceAfter:
                remainingBalance.toString(),
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
        result.account.accountNumber,

      balance:
        serializeMoney(
          result.account.balance,
        ),

      availableBalance:
        serializeMoney(
          result.account.availableBalance,
        ),

      ledgerBalance:
        serializeMoney(
          result.account.ledgerBalance,
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
          id: transferId,
          senderId: userId,
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
 * LIST USER TRANSFERS
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
      senderId: userId,
    };

    if (
      status &&
      typeof status === "string"
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
 * CANCEL TRANSFER
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

          const lockedAccounts =
            await tx.$queryRaw`
              SELECT
                id,
                balance,
                "availableBalance",
                "ledgerBalance"
              FROM "Account"
              WHERE id = ${transfer.accountId}
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

          await tx.transaction.create({
            data: {
              accountId:
                account.id,

              userId,

              type:
                "TRANSFER_REVERSAL",

              direction:
                "CREDIT",

              amount:
                transfer.amount,

              fee:
                ZERO,

              total:
                transfer.total,

              balanceBefore:
                balance,

              balanceAfter:
                updatedBalance,

              currencyId:
                transfer.currencyId,

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

          await tx.auditLog.create({
            data: {
              userId,

              action:
                "BANK_TRANSFER_CANCELLED",

              entityType:
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
 * ADMIN GET TRANSFER
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
 * ADMIN LIST TRANSFERS
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
      typeof status === "string"
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
      typeof search === "string"
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
 * ADMIN APPROVE TRANSFER
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
                "BANK_TRANSFER_APPROVED",

              entityType:
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
 * ADMIN REJECT TRANSFER
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

          const lockedAccounts =
            await tx.$queryRaw`
              SELECT
                id,
                balance,
                "availableBalance",
                "ledgerBalance"
              FROM "Account"
              WHERE id = ${transfer.accountId}
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
                  "REJECTED",

                complianceReason:
                  transfer.complianceReason ||
                  rejectionReason,
              },

              include:
                transferInclude,
            });

          await tx.transaction.create({
            data: {
              accountId:
                account.id,

              userId:
                transfer.senderId,

              type:
                "TRANSFER_REVERSAL",

              direction:
                "CREDIT",

              amount:
                transfer.amount,

              fee:
                ZERO,

              total:
                transfer.total,

              balanceBefore:
                balance,

              balanceAfter:
                restoredBalance,

              currencyId:
                transfer.currencyId,

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

          await tx.auditLog.create({
            data: {
              userId:
                adminUserId,

              action:
                "BANK_TRANSFER_REJECTED",

              entityType:
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
 * ADMIN BLOCK TRANSFER
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

    const updated =
      await prisma.transfer.update({
        where: {
          id:
            transferId,
        },

        data: {
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
          "BANK_TRANSFER_BLOCKED",

        entityType:
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