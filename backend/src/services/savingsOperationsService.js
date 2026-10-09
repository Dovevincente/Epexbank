import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import prisma from "../config/database.js";
import {
  getSavingsProduct,
} from "./savingsProductService.js";

const ZERO = new Prisma.Decimal(0);

const decimal = (value) =>
  value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(value ?? 0);

const nonNegativeAmount = (value, field = "Amount") => {
  const amount = decimal(value);

  if (!amount.isFinite() || amount.lt(ZERO)) {
    const error = new Error(
      `${field} cannot be negative.`,
    );

    error.statusCode = 400;
    throw error;
  }

  return amount;
};
const positiveAmount = (value, field = "Amount") => {
  const amount = decimal(value);

  if (!amount.isFinite() || amount.lte(ZERO)) {
    const error = new Error(
      `${field} must be greater than zero.`,
    );

    error.statusCode = 400;
    throw error;
  }

  return amount;
};

const reference = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const assertUser = (userId) => {
  if (!userId) {
    fail("Authentication required.", 401);
  }
};

const serializeSavings = (row) => {
  if (!row) return null;

  return {
    ...row,
    principal: row.principal?.toString?.() ?? row.principal,
    interestRate:
      row.interestRate?.toString?.() ?? row.interestRate,
    targetAmount:
      row.targetAmount?.toString?.() ?? row.targetAmount,
    balance: row.balance?.toString?.() ?? row.balance,
  };
};

const getFundingAccount = async (
  tx,
  {
    userId,
    accountId,
  },
) => {
  if (!accountId) {
    fail("Funding account is required.");
  }

  const account = await tx.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
    include: {
      currency: true,
    },
  });

  if (!account) {
    fail("Funding account not found.", 404);
  }

  if (account.status !== "ACTIVE") {
    fail(
      `Funding account is ${account.status.toLowerCase()} and cannot be used.`,
    );
  }

  if (!account.currency?.isActive) {
    fail("The funding account currency is inactive.");
  }

  return account;
};

const debitFundingAccount = async (
  tx,
  {
    account,
    amount,
    type,
    description,
    metadata = {},
  },
) => {
  const balanceBefore = decimal(account.balance);
  const availableBefore = decimal(
    account.availableBalance,
  );
  const ledgerBefore = decimal(
    account.ledgerBalance,
  );
  const minimumBalance = decimal(
    account.minimumBalance,
  );

  if (availableBefore.lt(amount)) {
    fail("Insufficient available account balance.");
  }

  const balanceAfter = balanceBefore.sub(amount);
  const availableAfter =
    availableBefore.sub(amount);
  const ledgerAfter = ledgerBefore.sub(amount);

  if (balanceAfter.lt(minimumBalance)) {
    fail(
      "This transaction would reduce the account below its minimum balance.",
    );
  }

  if (availableAfter.lt(minimumBalance)) {
    fail(
      "This transaction would reduce the available balance below its minimum balance.",
    );
  }

  if (ledgerAfter.lt(ZERO)) {
    fail("Insufficient ledger balance.");
  }

  const transaction =
    await tx.transaction.create({
      data: {
        reference: reference("SAV"),
        userId: account.userId,
        accountId: account.id,
        currencyId: account.currencyId,
        type,
        status: "COMPLETED",
        amount,
        fee: ZERO,
        total: amount,
        description,
        metadata,
      },
    });

  const updatedAccount =
    await tx.account.update({
      where: {
        id: account.id,
      },
      data: {
        balance: balanceAfter,
        availableBalance: availableAfter,
        ledgerBalance: ledgerAfter,
      },
      include: {
        currency: true,
      },
    });

  const ledgerEntry =
    await tx.ledgerEntry.create({
      data: {
        accountId: account.id,
        transactionId: transaction.id,
        type: "DEBIT",
        amount,
        balanceBefore,
        balanceAfter,
        description,
      },
    });

  return {
    transaction,
    ledgerEntry,
    account: updatedAccount,
  };
};

const creditFundingAccount = async (
  tx,
  {
    account,
    amount,
    type,
    description,
    metadata = {},
  },
) => {
  const balanceBefore = decimal(account.balance);
  const availableBefore = decimal(
    account.availableBalance,
  );
  const ledgerBefore = decimal(
    account.ledgerBalance,
  );

  const balanceAfter = balanceBefore.add(amount);
  const availableAfter =
    availableBefore.add(amount);
  const ledgerAfter = ledgerBefore.add(amount);

  const transaction =
    await tx.transaction.create({
      data: {
        reference: reference("SAV"),
        userId: account.userId,
        accountId: account.id,
        currencyId: account.currencyId,
        type,
        status: "COMPLETED",
        amount,
        fee: ZERO,
        total: amount,
        description,
        metadata,
      },
    });

  const updatedAccount =
    await tx.account.update({
      where: {
        id: account.id,
      },
      data: {
        balance: balanceAfter,
        availableBalance: availableAfter,
        ledgerBalance: ledgerAfter,
      },
      include: {
        currency: true,
      },
    });

  const ledgerEntry =
    await tx.ledgerEntry.create({
      data: {
        accountId: account.id,
        transactionId: transaction.id,
        type: "CREDIT",
        amount,
        balanceBefore,
        balanceAfter,
        description,
      },
    });

  return {
    transaction,
    ledgerEntry,
    account: updatedAccount,
  };
};

export async function openSavingsAccount({
  userId,
  productId,
  accountId,
  name,
  targetAmount,
  maturityDate,
  initialDeposit = 0,
}) {
  assertUser(userId);

  const product = getSavingsProduct(productId);

  const openingAmount = nonNegativeAmount(initialDeposit, "Opening amount");

  if (
    openingAmount.lt(
      decimal(product.minimumOpeningAmount),
    )
  ) {
    fail(
      `Minimum opening amount is ${product.minimumOpeningAmount} ${product.currencyCode}.`,
    );
  }

  if (!name || !String(name).trim()) {
    fail("Savings account name is required.");
  }

  if (
    product.requiresTargetAmount &&
    (!targetAmount ||
      decimal(targetAmount).lte(ZERO))
  ) {
    fail(
      "Goal savings requires a target amount.",
    );
  }

  if (
    product.requiresMaturityDate &&
    !maturityDate
  ) {
    fail(
      "Fixed savings requires a maturity date.",
    );
  }

  let parsedMaturityDate = null;

  if (maturityDate) {
    parsedMaturityDate = new Date(
      maturityDate,
    );

    if (
      Number.isNaN(
        parsedMaturityDate.getTime(),
      )
    ) {
      fail("Invalid maturity date.");
    }

    if (
      parsedMaturityDate <= new Date()
    ) {
      fail(
        "Maturity date must be in the future.",
      );
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const account =
        await getFundingAccount(tx, {
          userId,
          accountId,
        });

      const currencyCode =
        account.currency?.code?.toUpperCase();

      if (
        currencyCode !==
        product.currencyCode
      ) {
        fail(
          `This savings product requires ${product.currencyCode}.`,
        );
      }

      let debit = null;

      if (openingAmount.gt(ZERO)) {
        debit = await debitFundingAccount(tx, {
          account,
          amount: openingAmount,
          type: "SAVINGS_DEPOSIT",
          description: `Opening deposit for ${product.name}`,
          metadata: {
            operation:
              "SAVINGS_OPENING_DEPOSIT",
            productId: product.id,
          },
        });
      }

      const savings =
        await tx.savingsAccount.create({
          data: {
            reference:
              reference("SAV"),
            userId,
            type: product.type,
            status: "ACTIVE",
            name: String(name).trim(),
            principal: openingAmount,
            interestRate:
              decimal(product.interestRate),
            targetAmount:
              product.requiresTargetAmount
                ? positiveAmount(
                    targetAmount,
                    "Target amount",
                  )
                : null,
            maturityDate:
              parsedMaturityDate,
            balance: openingAmount,
          },
        });

      if (debit?.transaction?.id) {
        await tx.transaction.update({
          where: {
            id: debit.transaction.id,
          },
          data: {
            metadata: {
              operation:
                "SAVINGS_OPENING_DEPOSIT",
              productId: product.id,
              savingsId: savings.id,
              savingsReference:
                savings.reference,
            },
          },
        });
      }

      return {
        savings: serializeSavings(
          savings,
        ),
        fundingTransaction: debit?.transaction ?? null, fundingAccount: debit?.account ?? account,
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}

export async function depositToSavingsAccount({
  userId,
  savingsId,
  accountId,
  amount,
}) {
  assertUser(userId);

  const depositAmount = positiveAmount(
    amount,
  );

  return prisma.$transaction(
    async (tx) => {
      const savings =
        await tx.savingsAccount.findFirst({
          where: {
            id: savingsId,
            userId,
          },
        });

      if (!savings) {
        fail(
          "Savings account not found.",
          404,
        );
      }

      if (
        !["ACTIVE", "MATURED"].includes(
          savings.status,
        )
      ) {
        fail(
          `Savings account is ${savings.status.toLowerCase()} and cannot receive deposits.`,
        );
      }

      const account =
        await getFundingAccount(tx, {
          userId,
          accountId,
        });

      const product = getSavingsProduct(
        savings.type,
      );

      if (
        account.currency.code.toUpperCase() !==
        product.currencyCode
      ) {
        fail(
          `Funding account must use ${product.currencyCode}.`,
        );
      }

      const debit =
        await debitFundingAccount(tx, {
          account,
          amount: depositAmount,
          type: "SAVINGS_DEPOSIT",
          description: `Deposit into ${savings.name}`,
          metadata: {
            operation:
              "SAVINGS_DEPOSIT",
            savingsId,
            savingsReference:
              savings.reference,
          },
        });

      const updated =
        await tx.savingsAccount.update({
          where: {
            id: savings.id,
          },
          data: {
            balance: decimal(
              savings.balance,
            ).add(depositAmount),
            principal: decimal(
              savings.principal,
            ).add(depositAmount),
          },
        });

      await tx.transaction.update({
        where: {
          id: debit.transaction.id,
        },
        data: {
          metadata: {
            operation:
              "SAVINGS_DEPOSIT",
            savingsId,
            savingsReference:
              savings.reference,
          },
        },
      });

      return {
        savings:
          serializeSavings(updated),
        transaction:
          debit.transaction,
        fundingAccount:
          debit.account,
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}

export async function withdrawFromSavingsAccount({
  userId,
  savingsId,
  accountId,
  amount,
}) {
  assertUser(userId);

  const withdrawalAmount =
    positiveAmount(amount);

  return prisma.$transaction(
    async (tx) => {
      const savings =
        await tx.savingsAccount.findFirst({
          where: {
            id: savingsId,
            userId,
          },
        });

      if (!savings) {
        fail(
          "Savings account not found.",
          404,
        );
      }

      if (
        !["ACTIVE", "MATURED"].includes(
          savings.status,
        )
      ) {
        fail(
          `Savings account is ${savings.status.toLowerCase()} and cannot be withdrawn from.`,
        );
      }

      if (savings.type === "FIXED") {
         fail(
          "Fixed savings are automatically paid to your current account on the maturity date.",
          409,
         );
      }

      const savingsBalance =
        decimal(savings.balance);

      if (
        savingsBalance.lt(
          withdrawalAmount,
        )
      ) {
        fail(
          "Insufficient savings balance.",
        );
      }

      const account =
        await getFundingAccount(tx, {
          userId,
          accountId,
        });

      const product = getSavingsProduct(
        savings.type,
      );

      if (
        account.currency.code.toUpperCase() !==
        product.currencyCode
      ) {
        fail(
          `Destination account must use ${product.currencyCode}.`,
        );
      }

      const credit =
        await creditFundingAccount(tx, {
          account,
          amount: withdrawalAmount,
          type: "SAVINGS_WITHDRAWAL",
          description: `Withdrawal from ${savings.name}`,
          metadata: {
            operation:
              "SAVINGS_WITHDRAWAL",
            savingsId,
            savingsReference:
              savings.reference,
          },
        });

      const remaining =
        savingsBalance.sub(
          withdrawalAmount,
        );

      const updated =
        await tx.savingsAccount.update({
          where: {
            id: savings.id,
          },
          data: {
            balance: remaining,
            principal: Prisma.Decimal.max(
              ZERO,
              decimal(savings.principal).sub(
                Prisma.Decimal.min(
                  decimal(savings.principal),
                  withdrawalAmount,
                ),
              ),
            ),
            status:
              remaining.eq(ZERO)
                ? "WITHDRAWN"
                : savings.status,
          },
        });

      await tx.transaction.update({
        where: {
          id: credit.transaction.id,
        },
        data: {
          metadata: {
            operation:
              "SAVINGS_WITHDRAWAL",
            savingsId,
            savingsReference:
              savings.reference,
          },
        },
      });

      return {
        savings:
          serializeSavings(updated),
        transaction:
          credit.transaction,
        fundingAccount:
          credit.account,
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}

export async function applyInterestToSavingsAccount({
  savingsId,
  days = 365,
}) {
  if (!savingsId) {
    fail("Savings account ID is required.");
  }

  const numberOfDays = Number(days);

  if (
    !Number.isFinite(numberOfDays) ||
    numberOfDays <= 0
  ) {
    fail(
      "Interest days must be greater than zero.",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const savings =
        await tx.savingsAccount.findUnique({
          where: {
            id: savingsId,
          },
        });

      if (!savings) {
        fail(
          "Savings account not found.",
          404,
        );
      }

      if (
        !["ACTIVE", "MATURED"].includes(
          savings.status,
        )
      ) {
        fail(
          `Savings account is ${savings.status.toLowerCase()} and cannot earn interest.`,
        );
      }

      const balance =
        decimal(savings.balance);

      const rate =
        decimal(savings.interestRate);

      const interest =
        balance
          .mul(rate)
          .mul(decimal(numberOfDays))
          .div(decimal(36500));

      if (interest.lte(ZERO)) {
        return {
          savings:
            serializeSavings(savings),
          interest: "0.0000",
          transaction: null,
        };
      }

      const product = getSavingsProduct(savings.type);

      const currency =
        await tx.currency.findUnique({
          where: {
            code: product.currencyCode,
          },
          select: {
            id: true,
            code: true,
            isActive: true,
          },
        });

      if (!currency) {
        fail(
          `Currency ${product.currencyCode} is not configured.`,
          500,
        );
      }

      if (!currency.isActive) {
        fail(
          `Currency ${product.currencyCode} is inactive.`,
          400,
        );
      }

      const updated =
        await tx.savingsAccount.update({
          where: {
            id: savings.id,
          },
          data: {
            balance:
              balance.add(interest),
          },
        });

      const transaction =
        await tx.transaction.create({
          data: {
            reference:
              reference("INT"),
            userId:
              savings.userId,
            accountId: null,
            currencyId:
              currency.id,
            type: "INTEREST",
            status: "COMPLETED",
            amount: interest,
            fee: ZERO,
            total: interest,
            description: `Interest credited to ${savings.name}`,
            metadata: {
              operation:
                "SAVINGS_INTEREST",
              savingsId:
                savings.id,
              savingsReference:
                savings.reference,
              days: numberOfDays,
              rate:
                rate.toString(),
            },
          },
        });

      return {
        savings:
          serializeSavings(updated),
        interest:
          interest.toString(),
        transaction,
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}




