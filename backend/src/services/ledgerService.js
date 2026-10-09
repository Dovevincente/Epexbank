import { Prisma } from "@prisma/client";

import {
  ZERO,
  toDecimal,
  addMoney,
  subtractMoney,
  assertPositiveMoney,
} from "../utils/money.js";

const assertActiveAccount = (account) => {
  if (!account) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  if (account.status !== "ACTIVE") {
    const error = new Error(
      `Account is ${account.status.toLowerCase()} and cannot process financial transactions`,
    );

    error.statusCode = 403;
    throw error;
  }
};

const assertCurrencyMatch = (
  account,
  currencyId,
) => {
  if (account.currencyId !== currencyId) {
    const error = new Error(
      "Account currency does not match transaction currency",
    );

    error.statusCode = 400;
    throw error;
  }
};

export const debitAccount = async ({
  tx,
  accountId,
  amount,
  currencyId,
  description,
  transactionId,
}) => {
  if (!tx) {
    throw new Error(
      "A Prisma transaction client is required",
    );
  }

  const debitAmount = assertPositiveMoney(
    amount,
    "Debit amount",
  );

  /*
   * PostgreSQL row-level locking is used here so concurrent
   * financial requests cannot safely modify the same account
   * based on the same stale balance.
   */
  const lockedAccounts = await tx.$queryRaw`
    SELECT
      id,
      "currencyId",
      status,
      balance,
      "availableBalance",
      "ledgerBalance"
    FROM "Account"
    WHERE id = ${accountId}
    FOR UPDATE
  `;

  const account = lockedAccounts[0];

  assertActiveAccount(account);
  assertCurrencyMatch(account, currencyId);

  const currentAvailable = toDecimal(
    account.availableBalance,
  );

  const currentBalance = toDecimal(
    account.balance,
  );

  const currentLedgerBalance = toDecimal(
    account.ledgerBalance,
  );

  if (currentAvailable.lessThan(debitAmount)) {
    const error = new Error(
      "Insufficient available balance",
    );

    error.statusCode = 400;
    throw error;
  }

  const balanceAfter = subtractMoney(
    currentBalance,
    debitAmount,
  );

  const availableAfter = subtractMoney(
    currentAvailable,
    debitAmount,
  );

  const ledgerAfter = subtractMoney(
    currentLedgerBalance,
    debitAmount,
  );

  if (
    balanceAfter.lessThan(ZERO) ||
    availableAfter.lessThan(ZERO) ||
    ledgerAfter.lessThan(ZERO)
  ) {
    const error = new Error(
      "Transaction would result in an invalid negative balance",
    );

    error.statusCode = 400;
    throw error;
  }

  await tx.account.update({
    where: {
      id: accountId,
    },
    data: {
      balance: balanceAfter,
      availableBalance: availableAfter,
      ledgerBalance: ledgerAfter,
    },
  });

  const ledgerEntry = await tx.ledgerEntry.create({
    data: {
      accountId,
      transactionId,
      type: "DEBIT",
      amount: debitAmount,
      balanceBefore: currentBalance,
      balanceAfter,
      description:
        description || "Account debit",
    },
  });

  return {
    accountId,
    amount: debitAmount,
    balanceBefore: currentBalance,
    balanceAfter,
    availableBalanceBefore: currentAvailable,
    availableBalanceAfter: availableAfter,
    ledgerBalanceBefore: currentLedgerBalance,
    ledgerBalanceAfter: ledgerAfter,
    ledgerEntry,
  };
};

export const creditAccount = async ({
  tx,
  accountId,
  amount,
  currencyId,
  description,
  transactionId,
}) => {
  if (!tx) {
    throw new Error(
      "A Prisma transaction client is required",
    );
  }

  const creditAmount = assertPositiveMoney(
    amount,
    "Credit amount",
  );

  const lockedAccounts = await tx.$queryRaw`
    SELECT
      id,
      "currencyId",
      status,
      balance,
      "availableBalance",
      "ledgerBalance"
    FROM "Account"
    WHERE id = ${accountId}
    FOR UPDATE
  `;

  const account = lockedAccounts[0];

  assertActiveAccount(account);
  assertCurrencyMatch(account, currencyId);

  const currentBalance = toDecimal(
    account.balance,
  );

  const currentAvailable = toDecimal(
    account.availableBalance,
  );

  const currentLedgerBalance = toDecimal(
    account.ledgerBalance,
  );

  const balanceAfter = addMoney(
    currentBalance,
    creditAmount,
  );

  const availableAfter = addMoney(
    currentAvailable,
    creditAmount,
  );

  const ledgerAfter = addMoney(
    currentLedgerBalance,
    creditAmount,
  );

  await tx.account.update({
    where: {
      id: accountId,
    },
    data: {
      balance: balanceAfter,
      availableBalance: availableAfter,
      ledgerBalance: ledgerAfter,
    },
  });

  const ledgerEntry = await tx.ledgerEntry.create({
    data: {
      accountId,
      transactionId,
      type: "CREDIT",
      amount: creditAmount,
      balanceBefore: currentBalance,
      balanceAfter,
      description:
        description || "Account credit",
    },
  });

  return {
    accountId,
    amount: creditAmount,
    balanceBefore: currentBalance,
    balanceAfter,
    availableBalanceBefore: currentAvailable,
    availableBalanceAfter: availableAfter,
    ledgerBalanceBefore: currentLedgerBalance,
    ledgerBalanceAfter: ledgerAfter,
    ledgerEntry,
  };
};

export const getAccountLedger = async ({
  tx,
  accountId,
  limit = 50,
  cursor,
}) => {
  const client = tx || null;

  if (!client) {
    throw new Error(
      "A Prisma transaction client or Prisma client is required",
    );
  }

  return client.ledgerEntry.findMany({
    where: {
      accountId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: {
            id: cursor,
          },
          skip: 1,
        }
      : {}),
    include: {
      transaction: {
        select: {
          id: true,
          reference: true,
          type: true,
          status: true,
          amount: true,
          fee: true,
          total: true,
          description: true,
          createdAt: true,
        },
      },
    },
  });
};