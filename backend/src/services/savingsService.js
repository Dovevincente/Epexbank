import prisma from "../config/database.js";
import {
  toDecimal,
  serializeMoney,
} from "../utils/money.js";
import { generateReference } from "../utils/reference.js";
import logger from "../utils/logger.js";

/* =========================================================
   CONSTANTS
========================================================= */

const SAVINGS_TYPE = Object.freeze({
  REGULAR: "REGULAR",
  FIXED: "FIXED",
  GOAL: "GOAL",
});

const SAVINGS_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  MATURED: "MATURED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  WITHDRAWN: "WITHDRAWN",
});

const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 1_000_000_000;
const MAX_INTEREST_RATE = 100;

/* =========================================================
   VALIDATION
========================================================= */

function assertUserId(userId) {
  if (!userId || typeof userId !== "string") {
    const error = new Error(
      "A valid user ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertSavingsId(savingsId) {
  if (
    !savingsId ||
    typeof savingsId !== "string"
  ) {
    const error = new Error(
      "A valid savings account ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertPositiveAmount(amount) {
  const value = Number(amount);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    const error = new Error(
      "Amount must be greater than zero."
    );

    error.statusCode = 400;
    throw error;
  }

  if (value < MIN_AMOUNT) {
    const error = new Error(
      `Amount must be at least ${MIN_AMOUNT}.`
    );

    error.statusCode = 400;
    throw error;
  }

  if (value > MAX_AMOUNT) {
    const error = new Error(
      `Amount cannot exceed ${MAX_AMOUNT}.`
    );

    error.statusCode = 400;
    throw error;
  }

  return value;
}

function assertInterestRate(rate) {
  const value = Number(rate);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_INTEREST_RATE
  ) {
    const error = new Error(
      `Interest rate must be between 0% and ${MAX_INTEREST_RATE}%.`
    );

    error.statusCode = 400;
    throw error;
  }

  return value;
}

function normalizeString(
  value,
  fieldName,
  maxLength = 200
) {
  if (
    value === undefined ||
    value === null
  ) {
    const error = new Error(
      `${fieldName} is required.`
    );

    error.statusCode = 400;
    throw error;
  }

  const normalized =
    String(value).trim();

  if (!normalized) {
    const error = new Error(
      `${fieldName} is required.`
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    normalized.length >
    maxLength
  ) {
    const error = new Error(
      `${fieldName} cannot exceed ${maxLength} characters.`
    );

    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function normalizeOptionalDate(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    const error = new Error(
      "Invalid date supplied."
    );

    error.statusCode = 400;
    throw error;
  }

  return date;
}

/* =========================================================
   SERIALIZATION
========================================================= */

function serializeSavingsAccount(
  account
) {
  if (!account) {
    return null;
  }

  return {
    ...account,

    principal:
      serializeMoney(
        account.principal
      ),

    interestRate:
      serializeMoney(
        account.interestRate
      ),

    targetAmount:
      account.targetAmount !== null &&
      account.targetAmount !== undefined
        ? serializeMoney(
            account.targetAmount
          )
        : null,

    balance:
      serializeMoney(
        account.balance
      ),
  };
}

/* =========================================================
   INTEREST CALCULATION
========================================================= */

/**
 * Calculate simple annual interest for a savings balance.
 *
 * rate is an annual percentage.
 *
 * interest =
 * principal × rate × days / 365
 */
export function calculateSavingsInterest({
  principal,
  annualInterestRate,
  days,
}) {
  const amount =
    toDecimal(principal);

  const rate =
    assertInterestRate(
      annualInterestRate
    );

  const numberOfDays =
    Number(days);

  if (
    !Number.isFinite(
      numberOfDays
    ) ||
    numberOfDays < 0
  ) {
    const error = new Error(
      "Days must be a non-negative number."
    );

    error.statusCode = 400;
    throw error;
  }

  const interest =
    amount
      .mul(
        toDecimal(rate)
      )
      .mul(
        toDecimal(numberOfDays)
      )
      .div(
        toDecimal(36500)
      );

  return interest;
}

/**
 * Calculate interest for a complete savings year.
 */
export function calculateAnnualInterest({
  principal,
  annualInterestRate,
}) {
  return calculateSavingsInterest({
    principal,
    annualInterestRate,
    days: 365,
  });
}

/* =========================================================
   CREATE SAVINGS ACCOUNT
========================================================= */

export async function createSavingsAccount({
  userId,
  type,
  name,
  interestRate,
  targetAmount,
  maturityDate,
  initialDeposit = 0,
}) {
  assertUserId(userId);

  const savingsType =
    normalizeString(
      type,
      "Savings type",
      50
    );

  if (
    !Object.values(
      SAVINGS_TYPE
    ).includes(
      savingsType
    )
  ) {
    const error = new Error(
      `Invalid savings type: ${savingsType}.`
    );

    error.statusCode = 400;
    throw error;
  }

  const savingsName =
    normalizeString(
      name,
      "Savings name",
      200
    );

  const rate =
    assertInterestRate(
      interestRate
    );

  const parsedTarget =
    targetAmount !== undefined &&
    targetAmount !== null
      ? assertPositiveAmount(
          targetAmount
        )
      : null;

  const parsedInitialDeposit =
    Number(initialDeposit) > 0
      ? assertPositiveAmount(
          initialDeposit
        )
      : 0;

  const parsedMaturityDate =
    normalizeOptionalDate(
      maturityDate
    );

  if (
    savingsType ===
      SAVINGS_TYPE.GOAL &&
    !parsedTarget
  ) {
    const error = new Error(
      "Goal savings requires a target amount."
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    savingsType ===
      SAVINGS_TYPE.FIXED &&
    !parsedMaturityDate
  ) {
    const error = new Error(
      "Fixed savings requires a maturity date."
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    parsedMaturityDate &&
    parsedMaturityDate <=
      new Date()
  ) {
    const error = new Error(
      "Maturity date must be in the future."
    );

    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const user =
        await tx.user.findUnique({
          where: {
            id: userId,
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

      const reference =
        await generateSavingsReference(
          tx
        );

      const initialBalance =
        toDecimal(
          parsedInitialDeposit
        );

      const account =
        await tx.savingsAccount.create({
          data: {
            reference,

            userId,

            type:
              savingsType,

            status:
              SAVINGS_STATUS.ACTIVE,

            name:
              savingsName,

            principal:
              initialBalance,

            interestRate:
              toDecimal(rate),

            targetAmount:
              parsedTarget !== null
                ? toDecimal(
                    parsedTarget
                  )
                : null,

            maturityDate:
              parsedMaturityDate,

            balance:
              initialBalance,
          },
        });

      logger.info(
        "Savings account created",
        {
          userId,
          savingsAccountId:
            account.id,
          reference:
            account.reference,
          type:
            account.type,
        }
      );

      return serializeSavingsAccount(
        account
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   CUSTOMER SAVINGS QUERIES
========================================================= */

export async function getUserSavingsAccounts({
  userId,
  status,
  type,
  page = 1,
  limit = 20,
}) {
  assertUserId(userId);

  const parsedPage =
    Math.max(
      Number(page) || 1,
      1
    );

  const parsedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

  const where = {
    userId,
  };

  if (status) {
    where.status =
      status;
  }

  if (type) {
    where.type =
      type;
  }

  const [
    accounts,
    total,
  ] = await prisma.$transaction([
    prisma.savingsAccount.findMany({
      where,

      orderBy: {
        createdAt:
          "desc",
      },

      skip:
        (parsedPage - 1) *
        parsedLimit,

      take:
        parsedLimit,
    }),

    prisma.savingsAccount.count({
      where,
    }),
  ]);

  return {
    items:
      accounts.map(
        serializeSavingsAccount
      ),

    pagination: {
      page:
        parsedPage,

      limit:
        parsedLimit,

      total,

      totalPages:
        Math.ceil(
          total /
            parsedLimit
        ),
    },
  };
}

export async function getUserSavingsAccount({
  userId,
  savingsId,
}) {
  assertUserId(userId);
  assertSavingsId(
    savingsId
  );

  const account =
    await prisma.savingsAccount.findFirst({
      where: {
        id:
          savingsId,

        userId,
      },
    });

  if (!account) {
    const error = new Error(
      "Savings account not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeSavingsAccount(
    account
  );
}

/* =========================================================
   DEPOSIT
========================================================= */

/**
 * Add funds to a savings account.
 *
 * Actual debit from the customer's primary bank account
 * should be performed by the core banking transaction layer.
 */
export async function depositToSavings({
  userId,
  savingsId,
  amount,
}) {
  assertUserId(userId);
  assertSavingsId(
    savingsId
  );

  const depositAmount =
    assertPositiveAmount(
      amount
    );

  return prisma.$transaction(
    async (tx) => {
      const savings =
        await tx.savingsAccount.findFirst({
          where: {
            id:
              savingsId,

            userId,
          },
        });

      if (!savings) {
        const error = new Error(
          "Savings account not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        savings.status !==
        SAVINGS_STATUS.ACTIVE
      ) {
        const error = new Error(
          `Funds cannot be deposited while savings account is ${savings.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const currentBalance =
        toDecimal(
          savings.balance
        );

      const currentPrincipal =
        toDecimal(
          savings.principal
        );

      const amountDecimal =
        toDecimal(
          depositAmount
        );

      const newBalance =
        currentBalance.add(
          amountDecimal
        );

      const newPrincipal =
        currentPrincipal.add(
          amountDecimal
        );

      const updated =
        await tx.savingsAccount.update({
          where: {
            id:
              savings.id,
          },

          data: {
            balance:
              newBalance,

            principal:
              newPrincipal,
          },
        });

      logger.info(
        "Savings deposit recorded",
        {
          userId,
          savingsId:
            savings.id,
          amount:
            serializeMoney(
              amountDecimal
            ),
        }
      );

      return serializeSavingsAccount(
        updated
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   WITHDRAWAL
========================================================= */

/**
 * Withdraw from savings.
 *
 * The actual destination-account credit should be handled by
 * the core banking transaction layer.
 */
export async function withdrawFromSavings({
  userId,
  savingsId,
  amount,
}) {
  assertUserId(userId);
  assertSavingsId(
    savingsId
  );

  const withdrawalAmount =
    assertPositiveAmount(
      amount
    );

  return prisma.$transaction(
    async (tx) => {
      const savings =
        await tx.savingsAccount.findFirst({
          where: {
            id:
              savingsId,

            userId,
          },
        });

      if (!savings) {
        const error = new Error(
          "Savings account not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        savings.status !==
        SAVINGS_STATUS.ACTIVE &&
        savings.status !==
          SAVINGS_STATUS.MATURED
      ) {
        const error = new Error(
          `Funds cannot be withdrawn while savings account is ${savings.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      if (
        savings.type ===
          SAVINGS_TYPE.FIXED &&
        savings.status !==
          SAVINGS_STATUS.MATURED
      ) {
        const error = new Error(
          "Fixed savings cannot be withdrawn before maturity."
        );

        error.statusCode = 409;
        throw error;
      }

      const currentBalance =
        toDecimal(
          savings.balance
        );

      const amountDecimal =
        toDecimal(
          withdrawalAmount
        );

      if (
        currentBalance.lt(
          amountDecimal
        )
      ) {
        const error = new Error(
          "Insufficient savings balance."
        );

        error.statusCode = 400;
        throw error;
      }

      const newBalance =
        currentBalance.sub(
          amountDecimal
        );

      const currentPrincipal =
        toDecimal(
          savings.principal
        );

      /*
       * Principal is reduced only up to the amount of the
       * withdrawal. This prevents principal from becoming
       * negative when withdrawing earned interest.
       */
      const principalReduction =
        amountDecimal.gt(
          currentPrincipal
        )
          ? currentPrincipal
          : amountDecimal;

      const newPrincipal =
        currentPrincipal.sub(
          principalReduction
        );

      const updated =
        await tx.savingsAccount.update({
          where: {
            id:
              savings.id,
          },

          data: {
            balance:
              newBalance,

            principal:
              newPrincipal,

            status:
              newBalance.isZero()
                ? SAVINGS_STATUS.WITHDRAWN
                : savings.status,
          },
        });

      logger.info(
        "Savings withdrawal recorded",
        {
          userId,
          savingsId:
            savings.id,
          amount:
            serializeMoney(
              amountDecimal
            ),
        }
      );

      return serializeSavingsAccount(
        updated
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   INTEREST
========================================================= */

/**
 * Apply simple accrued interest to a savings account.
 *
 * This is intended for a controlled scheduled job or admin
 * settlement process.
 */
export async function applySavingsInterest({
  savingsId,
  days = 365,
}) {
  assertSavingsId(
    savingsId
  );

  const numberOfDays =
    Number(days);

  if (
    !Number.isFinite(
      numberOfDays
    ) ||
    numberOfDays <= 0
  ) {
    const error = new Error(
      "Days must be greater than zero."
    );

    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const savings =
        await tx.savingsAccount.findUnique({
          where: {
            id:
              savingsId,
          },
        });

      if (!savings) {
        const error = new Error(
          "Savings account not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        ![
          SAVINGS_STATUS.ACTIVE,
          SAVINGS_STATUS.MATURED,
        ].includes(
          savings.status
        )
      ) {
        const error = new Error(
          `Interest cannot be applied to a ${savings.status} savings account.`
        );

        error.statusCode = 409;
        throw error;
      }

      const balance =
        toDecimal(
          savings.balance
        );

      const interestRate =
        toDecimal(
          savings.interestRate
        );

      const interest =
        balance
          .mul(
            interestRate
          )
          .mul(
            toDecimal(
              numberOfDays
            )
          )
          .div(
            toDecimal(
              36500
            )
          );

      if (
        interest.lte(
          toDecimal(0)
        )
      ) {
        return serializeSavingsAccount(
          savings
        );
      }

      const newBalance =
        balance.add(
          interest
        );

      const updated =
        await tx.savingsAccount.update({
          where: {
            id:
              savings.id,
          },

          data: {
            balance:
              newBalance,
          },
        });

      logger.info(
        "Savings interest applied",
        {
          savingsId:
            savings.id,
          days:
            numberOfDays,
          interest:
            serializeMoney(
              interest
            ),
        }
      );

      return serializeSavingsAccount(
        updated
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   MATURITY
========================================================= */

/**
 * Mark savings accounts whose maturity date has passed
 * as MATURED.
 */
export async function matureSavingsAccounts() {
  const now =
    new Date();

  const result =
    await prisma.savingsAccount.updateMany({
      where: {
        status:
          SAVINGS_STATUS.ACTIVE,

        maturityDate: {
          lte: now,
        },
      },

      data: {
        status:
          SAVINGS_STATUS.MATURED,
      },
    });

  logger.info(
    "Savings accounts matured",
    {
      count:
        result.count,
    }
  );

  return {
    updated:
      result.count,
  };
}

/* =========================================================
   COMPLETE SAVINGS
========================================================= */

/**
 * Mark a savings account as completed.
 *
 * This is intended for controlled internal/admin workflows.
 */
export async function completeSavingsAccount({
  userId,
  savingsId,
}) {
  assertUserId(userId);
  assertSavingsId(
    savingsId
  );

  return prisma.$transaction(
    async (tx) => {
      const savings =
        await tx.savingsAccount.findFirst({
          where: {
            id:
              savingsId,

            userId,
          },
        });

      if (!savings) {
        const error = new Error(
          "Savings account not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        ![
          SAVINGS_STATUS.ACTIVE,
          SAVINGS_STATUS.MATURED,
        ].includes(
          savings.status
        )
      ) {
        const error = new Error(
          `Savings account cannot be completed from ${savings.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const updated =
        await tx.savingsAccount.update({
          where: {
            id:
              savings.id,
          },

          data: {
            status:
              SAVINGS_STATUS.COMPLETED,
          },
        });

      logger.info(
        "Savings account completed",
        {
          userId,
          savingsId:
            savings.id,
        }
      );

      return serializeSavingsAccount(
        updated
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   CANCEL SAVINGS
========================================================= */

/**
 * Cancel an active savings account.
 */
export async function cancelSavingsAccount({
  userId,
  savingsId,
}) {
  assertUserId(userId);
  assertSavingsId(
    savingsId
  );

  return prisma.$transaction(
    async (tx) => {
      const savings =
        await tx.savingsAccount.findFirst({
          where: {
            id:
              savingsId,

            userId,
          },
        });

      if (!savings) {
        const error = new Error(
          "Savings account not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        savings.status !==
        SAVINGS_STATUS.ACTIVE
      ) {
        const error = new Error(
          `Only active savings accounts can be cancelled. Current status: ${savings.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const updated =
        await tx.savingsAccount.update({
          where: {
            id:
              savings.id,
          },

          data: {
            status:
              SAVINGS_STATUS.CANCELLED,
          },
        });

      logger.info(
        "Savings account cancelled",
        {
          userId,
          savingsId:
            savings.id,
        }
      );

      return serializeSavingsAccount(
        updated
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   GOAL PROGRESS
========================================================= */

export async function getSavingsGoalProgress({
  userId,
  savingsId,
}) {
  assertUserId(userId);
  assertSavingsId(
    savingsId
  );

  const savings =
    await prisma.savingsAccount.findFirst({
      where: {
        id:
          savingsId,

        userId,
      },
    });

  if (!savings) {
    const error = new Error(
      "Savings account not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (
    savings.type !==
    SAVINGS_TYPE.GOAL
  ) {
    const error = new Error(
      "Goal progress is only available for GOAL savings."
    );

    error.statusCode = 400;
    throw error;
  }

  const balance =
    toDecimal(
      savings.balance
    );

  const target =
    toDecimal(
      savings.targetAmount
    );

  const percentage =
    target.gt(0)
      ? Math.min(
          100,
          (
            Number(
              balance
            ) /
            Number(
              target
            )
          ) *
            100
        )
      : 0;

  return {
    savingsId:
      savings.id,

    reference:
      savings.reference,

    name:
      savings.name,

    balance:
      serializeMoney(
        balance
      ),

    targetAmount:
      serializeMoney(
        target
      ),

    percentage:
      Number(
        percentage.toFixed(2)
      ),

    remaining:
      serializeMoney(
        target.gt(balance)
          ? target.sub(
              balance
            )
          : 0
      ),

    completed:
      balance.gte(
        target
      ),
  };
}

/* =========================================================
   REFERENCE GENERATOR
========================================================= */

async function generateSavingsReference(
  tx
) {
  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const reference =
      generateReference(
        "SAV"
      );

    const existing =
      await tx.savingsAccount.findUnique({
        where: {
          reference,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      return reference;
    }
  }

  const error = new Error(
    "Unable to generate a unique savings reference."
  );

  error.statusCode = 500;

  throw error;
}

/* =========================================================
   EXPORT
========================================================= */

const savingsService = {
  calculateSavingsInterest,
  calculateAnnualInterest,

  createSavingsAccount,

  getUserSavingsAccounts,
  getUserSavingsAccount,

  depositToSavings,
  withdrawFromSavings,

  applySavingsInterest,

  matureSavingsAccounts,

  completeSavingsAccount,
  cancelSavingsAccount,

  getSavingsGoalProgress,
};

export default savingsService;