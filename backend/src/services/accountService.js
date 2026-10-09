import prisma from "../config/database.js";

/*
 * Financial values are returned as strings.
 *
 * Do not convert Prisma Decimal values to JavaScript Number.
 * JavaScript Number can introduce floating-point precision
 * problems with financial amounts.
 */
const serializeMoney = (value) => {
  if (value === null || value === undefined) {
    return "0.0000";
  }

  return value.toString();
};

/*
 * Serialize a complete account for the customer API.
 */
const serializeAccount = (account) => {
  return {
    id: account.id,

    accountNumber: account.accountNumber,
    type: account.type,
    status: account.status,

    balance: serializeMoney(account.balance),
    availableBalance: serializeMoney(
      account.availableBalance,
    ),
    ledgerBalance: serializeMoney(
      account.ledgerBalance,
    ),
    minimumBalance: serializeMoney(
      account.minimumBalance,
    ),

    currency: account.currency
      ? {
          id: account.currency.id,
          code: account.currency.code,
          name: account.currency.name,
          symbol: account.currency.symbol,
          decimals: account.currency.decimals,
        }
      : null,

    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
};

/*
 * Get every account belonging to the authenticated user.
 *
 * userId comes from the authentication middleware.
 *
 * This means the frontend cannot request another
 * customer's accounts simply by changing a URL.
 */
export const getUserAccounts = async (userId) => {
  if (!userId) {
    const error = new Error(
      "Authenticated user is required",
    );

    error.statusCode = 401;

    throw error;
  }

  const accounts = await prisma.account.findMany({
    where: {
      userId,
    },

    select: {
      id: true,

      accountNumber: true,
      type: true,
      status: true,

      balance: true,
      availableBalance: true,
      ledgerBalance: true,
      minimumBalance: true,

      createdAt: true,
      updatedAt: true,

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

    orderBy: {
      createdAt: "asc",
    },
  });

  return accounts.map(serializeAccount);
};

/*
 * Get one account belonging to the authenticated user.
 *
 * Ownership is checked inside the database query.
 */
export const getUserAccountById = async (
  userId,
  accountId,
) => {
  if (!userId) {
    const error = new Error(
      "Authenticated user is required",
    );

    error.statusCode = 401;

    throw error;
  }

  if (!accountId) {
    const error = new Error(
      "Account ID is required",
    );

    error.statusCode = 400;

    throw error;
  }

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },

    select: {
      id: true,

      accountNumber: true,
      type: true,
      status: true,

      balance: true,
      availableBalance: true,
      ledgerBalance: true,
      minimumBalance: true,

      createdAt: true,
      updatedAt: true,

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

  if (!account) {
    const error = new Error(
      "Account not found",
    );

    error.statusCode = 404;

    throw error;
  }

  return serializeAccount(account);
};

/*
 * Get only the balance information for an account.
 *
 * This endpoint is useful for dashboard balance
 * refreshes without loading the complete account object.
 */
export const getUserAccountBalance = async (
  userId,
  accountId,
) => {
  if (!userId) {
    const error = new Error(
      "Authenticated user is required",
    );

    error.statusCode = 401;

    throw error;
  }

  if (!accountId) {
    const error = new Error(
      "Account ID is required",
    );

    error.statusCode = 400;

    throw error;
  }

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },

    select: {
      id: true,

      accountNumber: true,
      status: true,

      balance: true,
      availableBalance: true,
      ledgerBalance: true,
      minimumBalance: true,

      updatedAt: true,

      currency: {
        select: {
          code: true,
          name: true,
          symbol: true,
          decimals: true,
        },
      },
    },
  });

  if (!account) {
    const error = new Error(
      "Account not found",
    );

    error.statusCode = 404;

    throw error;
  }

  return {
    id: account.id,

    accountNumber: account.accountNumber,
    status: account.status,

    balance: serializeMoney(account.balance),
    availableBalance: serializeMoney(
      account.availableBalance,
    ),
    ledgerBalance: serializeMoney(
      account.ledgerBalance,
    ),
    minimumBalance: serializeMoney(
      account.minimumBalance,
    ),

    currency: account.currency
      ? {
          code: account.currency.code,
          name: account.currency.name,
          symbol: account.currency.symbol,
          decimals: account.currency.decimals,
        }
      : null,

    updatedAt: account.updatedAt,
  };
};