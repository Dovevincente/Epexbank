import prisma from "../config/database.js";

import {
  serializeMoney,
  toDecimal,
} from "../utils/money.js";

import { generateReference } from "../utils/reference.js";

const serializeTransaction = (
  transaction,
) => {
  return {
    id: transaction.id,
    reference: transaction.reference,
    type: transaction.type,
    status: transaction.status,

    amount: serializeMoney(transaction.amount),
    fee: serializeMoney(transaction.fee),
    total: serializeMoney(transaction.total),

    description: transaction.description || null,
    metadata: transaction.metadata || null,

    account: transaction.account
      ? {
          id: transaction.account.id,
          accountNumber:
            transaction.account.accountNumber,
          type: transaction.account.type,
        }
      : null,

    currency: transaction.currency
      ? {
          id: transaction.currency.id,
          code: transaction.currency.code,
          name: transaction.currency.name,
          symbol: transaction.currency.symbol,
          decimals: transaction.currency.decimals,
        }
      : null,

    ledgerEntries:
      transaction.ledgerEntries?.map(
        (entry) => ({
          id: entry.id,
          type: entry.type,
          amount: serializeMoney(entry.amount),
          balanceBefore: serializeMoney(
            entry.balanceBefore,
          ),
          balanceAfter: serializeMoney(
            entry.balanceAfter,
          ),
          description:
            entry.description || null,
          createdAt: entry.createdAt,
        }),
      ) || [],

    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
};

const transactionInclude = {
  account: {
    select: {
      id: true,
      accountNumber: true,
      type: true,
    },
  },

  currency: {
    select: {
      id: true,
      code: true,
      name: true,
      symbol: true,
      decimals: true,
    },
  },

  ledgerEntries: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      type: true,
      amount: true,
      balanceBefore: true,
      balanceAfter: true,
      description: true,
      createdAt: true,
    },
  },
};

export const createTransaction = async ({
  tx,
  userId,
  accountId,
  currencyId,
  type,
  amount,
  fee = "0",
  description,
  metadata = null,
  idempotencyKey = null,
  referencePrefix = "TXN",
  status = "COMPLETED",
}) => {
  if (!tx) {
    throw new Error(
      "A Prisma transaction client is required",
    );
  }

  const transactionAmount =
    toDecimal(amount);

  const transactionFee = toDecimal(fee);

  if (!transactionAmount.isFinite()) {
    const error = new Error(
      "Invalid transaction amount",
    );

    error.statusCode = 400;
    throw error;
  }

  if (transactionAmount.lessThanOrEqualTo(0)) {
    const error = new Error(
      "Transaction amount must be greater than zero",
    );

    error.statusCode = 400;
    throw error;
  }

  if (transactionFee.lessThan(0)) {
    const error = new Error(
      "Transaction fee cannot be negative",
    );

    error.statusCode = 400;
    throw error;
  }

  const total = transactionAmount.plus(
    transactionFee,
  );

  if (idempotencyKey) {
    const existing =
      await tx.transaction.findUnique({
        where: {
          idempotencyKey,
        },
        include: transactionInclude,
      });

    if (existing) {
      return {
        transaction: existing,
        alreadyProcessed: true,
      };
    }
  }

  const transaction =
    await tx.transaction.create({
      data: {
        reference:
          generateReference(referencePrefix),

        idempotencyKey:
          idempotencyKey || null,

        userId,
        accountId: accountId || null,
        currencyId,

        type,
        status,

        amount: transactionAmount,
        fee: transactionFee,
        total,

        description:
          description || null,

        metadata,
      },

      include: transactionInclude,
    });

  return {
    transaction,
    alreadyProcessed: false,
  };
};

export const getUserTransactions = async ({
  userId,
  accountId,
  type,
  status,
  limit = 50,
  cursor,
}) => {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 50, 1),
    100,
  );

  const where = {
    userId,

    ...(accountId
      ? {
          accountId,
        }
      : {}),

    ...(type
      ? {
          type,
        }
      : {}),

    ...(status
      ? {
          status,
        }
      : {}),
  };

  const rows =
    await prisma.transaction.findMany({
      where,

      include: transactionInclude,

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
    rows.length > safeLimit;

  const transactions = hasMore
    ? rows.slice(0, safeLimit)
    : rows;

  return {
    transactions:
      transactions.map(serializeTransaction),

    nextCursor: hasMore
      ? transactions[
          transactions.length - 1
        ]?.id || null
      : null,

    hasMore,
  };
};

export const getUserTransactionById = async ({
  userId,
  transactionId,
}) => {
  const transaction =
    await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },

      include: transactionInclude,
    });

  if (!transaction) {
    const error = new Error(
      "Transaction not found",
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeTransaction(
    transaction,
  );
};

export const getAccountTransactions = async ({
  userId,
  accountId,
  type,
  status,
  limit,
  cursor,
}) => {
  const account =
    await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },

      select: {
        id: true,
      },
    });

  if (!account) {
    const error = new Error(
      "Account not found",
    );

    error.statusCode = 404;
    throw error;
  }

  return getUserTransactions({
    userId,
    accountId,
    type,
    status,
    limit,
    cursor,
  });
};