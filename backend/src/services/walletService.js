// ============================================================
// EPEX BANK - WALLET SERVICE
// ============================================================
// Handles customer wallet operations.
//
// Prisma Wallet model:
//
// Wallet
// - id
// - userId
// - currencyId
// - type
// - balance
// - isActive
// - createdAt
// - updatedAt
//
// Important:
// Wallets are separate from Account/LedgerEntry in the current
// Prisma schema. This service therefore does not create ledger
// entries for wallets.
//
// Financial values are handled using Prisma Decimal values and
// string/Decimal-safe arithmetic.
// ============================================================

import { Prisma } from "@prisma/client";

import prisma from "../config/database.js";
import {
  toDecimal,
  serializeMoney,
} from "../utils/money.js";
import logger from "../utils/logger.js";

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_WALLET_TYPE = "FIAT";

// ============================================================
// HELPERS
// ============================================================

function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function assertRequired(value, fieldName) {
  const normalized = normalizeString(value);

  if (!normalized) {
    const error = new Error(`${fieldName} is required.`);
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function normalizeWalletType(type) {
  return normalizeString(type).toUpperCase() || DEFAULT_WALLET_TYPE;
}

function assertPositiveAmount(amount) {
  const decimalAmount = toDecimal(amount);

  if (decimalAmount.lte(0)) {
    const error = new Error(
      "Amount must be greater than zero."
    );

    error.statusCode = 400;
    throw error;
  }

  return decimalAmount;
}

function assertNonNegativeAmount(amount) {
  const decimalAmount = toDecimal(amount);

  if (decimalAmount.lt(0)) {
    const error = new Error(
      "Amount cannot be negative."
    );

    error.statusCode = 400;
    throw error;
  }

  return decimalAmount;
}

function serializeWallet(wallet) {
  if (!wallet) {
    return null;
  }

  return {
    id: wallet.id,
    userId: wallet.userId,
    currencyId: wallet.currencyId,
    type: wallet.type,
    balance: serializeMoney(wallet.balance),
    isActive: wallet.isActive,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,

    ...(wallet.currency
      ? {
          currency: {
            id: wallet.currency.id,
            code: wallet.currency.code,
            name: wallet.currency.name,
            symbol: wallet.currency.symbol,
          },
        }
      : {}),
  };
}

async function ensureUserExists(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function ensureCurrencyExists(currencyId) {
  const currency = await prisma.currency.findUnique({
    where: {
      id: currencyId,
    },
  });

  if (!currency) {
    const error = new Error("Currency not found.");
    error.statusCode = 404;
    throw error;
  }

  return currency;
}

async function createAuditLog({
  userId = null,
  adminId = null,
  action,
  entityId,
  description,
  metadata = {},
  ipAddress = null,
  tx = prisma,
}) {
  return tx.auditLog.create({
    data: {
      userId,
      adminId,
      action,
      entity: "Wallet",
      entityId,
      description,
      metadata,
      ipAddress,
    },
  });
}

// ============================================================
// GET WALLET
// ============================================================

export async function getWallet({
  userId,
  currencyId,
  type = DEFAULT_WALLET_TYPE,
}) {
  const normalizedUserId = assertRequired(
    userId,
    "User ID"
  );

  const normalizedCurrencyId = assertRequired(
    currencyId,
    "Currency ID"
  );

  const normalizedType = normalizeWalletType(type);

  const wallet = await prisma.wallet.findUnique({
    where: {
      userId_currencyId_type: {
        userId: normalizedUserId,
        currencyId: normalizedCurrencyId,
        type: normalizedType,
      },
    },
    include: {
      currency: true,
    },
  });

  if (!wallet) {
    const error = new Error(
      "Wallet not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeWallet(wallet);
}

// ============================================================
// GET WALLET BY ID
// ============================================================

export async function getWalletById({
  walletId,
  userId,
}) {
  const normalizedWalletId = assertRequired(
    walletId,
    "Wallet ID"
  );

  const normalizedUserId = assertRequired(
    userId,
    "User ID"
  );

  const wallet = await prisma.wallet.findFirst({
    where: {
      id: normalizedWalletId,
      userId: normalizedUserId,
    },
    include: {
      currency: true,
    },
  });

  if (!wallet) {
    const error = new Error(
      "Wallet not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeWallet(wallet);
}

// ============================================================
// GET USER WALLETS
// ============================================================

export async function getUserWallets({
  userId,
  activeOnly = false,
}) {
  const normalizedUserId = assertRequired(
    userId,
    "User ID"
  );

  const where = {
    userId: normalizedUserId,
  };

  if (activeOnly === true || activeOnly === "true") {
    where.isActive = true;
  }

  const wallets = await prisma.wallet.findMany({
    where,
    include: {
      currency: true,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
  });

  return wallets.map(serializeWallet);
}

// ============================================================
// CREATE WALLET
// ============================================================

export async function createWallet({
  userId,
  currencyId,
  type = DEFAULT_WALLET_TYPE,
  initialBalance = 0,
  ipAddress = null,
}) {
  const normalizedUserId = assertRequired(
    userId,
    "User ID"
  );

  const normalizedCurrencyId = assertRequired(
    currencyId,
    "Currency ID"
  );

  const normalizedType = normalizeWalletType(type);

  const startingBalance =
    assertNonNegativeAmount(initialBalance);

  await ensureUserExists(normalizedUserId);

  await ensureCurrencyExists(normalizedCurrencyId);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const existingWallet =
          await tx.wallet.findUnique({
            where: {
              userId_currencyId_type: {
                userId: normalizedUserId,
                currencyId: normalizedCurrencyId,
                type: normalizedType,
              },
            },
          });

        if (existingWallet) {
          const error = new Error(
            "A wallet already exists for this user, currency and type."
          );

          error.statusCode = 409;
          throw error;
        }

        const wallet = await tx.wallet.create({
          data: {
            userId: normalizedUserId,
            currencyId: normalizedCurrencyId,
            type: normalizedType,
            balance: startingBalance,
            isActive: true,
          },
          include: {
            currency: true,
          },
        });

        await createAuditLog({
          userId: normalizedUserId,
          action: "CREATE",
          entityId: wallet.id,
          description: "Wallet created.",
          metadata: {
            currencyId: normalizedCurrencyId,
            type: normalizedType,
            initialBalance:
              startingBalance.toString(),
          },
          ipAddress,
          tx,
        });

        return wallet;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    logger.info("Wallet created", {
      walletId: result.id,
      userId: normalizedUserId,
      currencyId: normalizedCurrencyId,
      type: normalizedType,
    });

    return serializeWallet(result);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const conflictError = new Error(
        "A wallet already exists for this user, currency and type."
      );

      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  }
}

// ============================================================
// GET OR CREATE WALLET
// ============================================================
// Useful for services that need a wallet without forcing the
// caller to perform a separate existence check.
//
// Existing wallets are returned unchanged.
// New wallets start with zero balance.
// ============================================================

export async function getOrCreateWallet({
  userId,
  currencyId,
  type = DEFAULT_WALLET_TYPE,
  ipAddress = null,
}) {
  const normalizedUserId = assertRequired(
    userId,
    "User ID"
  );

  const normalizedCurrencyId = assertRequired(
    currencyId,
    "Currency ID"
  );

  const normalizedType = normalizeWalletType(type);

  await ensureUserExists(normalizedUserId);

  await ensureCurrencyExists(normalizedCurrencyId);

  const existingWallet =
    await prisma.wallet.findUnique({
      where: {
        userId_currencyId_type: {
          userId: normalizedUserId,
          currencyId: normalizedCurrencyId,
          type: normalizedType,
        },
      },
      include: {
        currency: true,
      },
    });

  if (existingWallet) {
    return serializeWallet(existingWallet);
  }

  try {
    const wallet = await prisma.$transaction(
      async (tx) => {
        const existing =
          await tx.wallet.findUnique({
            where: {
              userId_currencyId_type: {
                userId: normalizedUserId,
                currencyId: normalizedCurrencyId,
                type: normalizedType,
              },
            },
            include: {
              currency: true,
            },
          });

        if (existing) {
          return existing;
        }

        const created = await tx.wallet.create({
          data: {
            userId: normalizedUserId,
            currencyId: normalizedCurrencyId,
            type: normalizedType,
            balance: new Prisma.Decimal(0),
            isActive: true,
          },
          include: {
            currency: true,
          },
        });

        await createAuditLog({
          userId: normalizedUserId,
          action: "CREATE",
          entityId: created.id,
          description:
            "Wallet automatically created.",
          metadata: {
            currencyId: normalizedCurrencyId,
            type: normalizedType,
          },
          ipAddress,
          tx,
        });

        return created;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return serializeWallet(wallet);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const wallet =
        await prisma.wallet.findUnique({
          where: {
            userId_currencyId_type: {
              userId: normalizedUserId,
              currencyId: normalizedCurrencyId,
              type: normalizedType,
            },
          },
          include: {
            currency: true,
          },
        });

      if (wallet) {
        return serializeWallet(wallet);
      }
    }

    throw error;
  }
}

// ============================================================
// GET WALLET BALANCE
// ============================================================

export async function getWalletBalance({
  userId,
  walletId,
}) {
  const normalizedUserId = assertRequired(
    userId,
    "User ID"
  );

  const normalizedWalletId = assertRequired(
    walletId,
    "Wallet ID"
  );

  const wallet = await prisma.wallet.findFirst({
    where: {
      id: normalizedWalletId,
      userId: normalizedUserId,
    },
    select: {
      id: true,
      userId: true,
      currencyId: true,
      type: true,
      balance: true,
      isActive: true,
      currency: {
        select: {
          id: true,
          code: true,
          name: true,
          symbol: true,
        },
      },
    },
  });

  if (!wallet) {
    const error = new Error(
      "Wallet not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return {
    walletId: wallet.id,
    userId: wallet.userId,
    currencyId: wallet.currencyId,
    type: wallet.type,
    balance: serializeMoney(wallet.balance),
    isActive: wallet.isActive,
    currency: wallet.currency,
  };
}

// ============================================================
// CREDIT WALLET
// ============================================================
// This is an internal financial operation.
//
// The caller must already have authorization to credit the
// wallet. This function does not expose itself as an HTTP route.
// ============================================================

export async function creditWallet({
  walletId,
  amount,
  description = "Wallet credit",
  userId = null,
  adminId = null,
  ipAddress = null,
  tx = null,
}) {
  const normalizedWalletId = assertRequired(
    walletId,
    "Wallet ID"
  );

  const creditAmount =
    assertPositiveAmount(amount);

  const execute = async (client) => {
    const wallet = await client.wallet.findUnique({
      where: {
        id: normalizedWalletId,
      },
    });

    if (!wallet) {
      const error = new Error(
        "Wallet not found."
      );

      error.statusCode = 404;
      throw error;
    }

    if (!wallet.isActive) {
      const error = new Error(
        "Wallet is inactive."
      );

      error.statusCode = 403;
      throw error;
    }

    if (
      userId &&
      wallet.userId !== normalizeString(userId)
    ) {
      const error = new Error(
        "You are not authorized to modify this wallet."
      );

      error.statusCode = 403;
      throw error;
    }

    const balanceBefore = toDecimal(
      wallet.balance
    );

    const balanceAfter =
      balanceBefore.add(creditAmount);

    const updatedWallet =
      await client.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: balanceAfter,
        },
        include: {
          currency: true,
        },
      });

    await createAuditLog({
      userId: userId || wallet.userId,
      adminId,
      action: "CREDIT",
      entityId: wallet.id,
      description,
      metadata: {
        amount: creditAmount.toString(),
        balanceBefore:
          balanceBefore.toString(),
        balanceAfter:
          balanceAfter.toString(),
        currencyId: wallet.currencyId,
        walletType: wallet.type,
      },
      ipAddress,
      tx: client,
    });

    return {
      wallet: updatedWallet,
      balanceBefore,
      balanceAfter,
      amount: creditAmount,
    };
  };

  if (tx) {
    const result = await execute(tx);

    logger.info("Wallet credited", {
      walletId: normalizedWalletId,
      amount: creditAmount.toString(),
    });

    return {
      wallet: serializeWallet(result.wallet),
      amount: serializeMoney(result.amount),
      balanceBefore: serializeMoney(
        result.balanceBefore
      ),
      balanceAfter: serializeMoney(
        result.balanceAfter
      ),
    };
  }

  const result = await prisma.$transaction(
    execute,
    {
      isolationLevel: "Serializable",
    }
  );

  logger.info("Wallet credited", {
    walletId: normalizedWalletId,
    amount: creditAmount.toString(),
  });

  return {
    wallet: serializeWallet(result.wallet),
    amount: serializeMoney(result.amount),
    balanceBefore: serializeMoney(
      result.balanceBefore
    ),
    balanceAfter: serializeMoney(
      result.balanceAfter
    ),
  };
}

// ============================================================
// DEBIT WALLET
// ============================================================
// Prevents the wallet from going below zero.
// ============================================================

export async function debitWallet({
  walletId,
  amount,
  description = "Wallet debit",
  userId = null,
  adminId = null,
  ipAddress = null,
  tx = null,
}) {
  const normalizedWalletId = assertRequired(
    walletId,
    "Wallet ID"
  );

  const debitAmount =
    assertPositiveAmount(amount);

  const execute = async (client) => {
    const wallet = await client.wallet.findUnique({
      where: {
        id: normalizedWalletId,
      },
    });

    if (!wallet) {
      const error = new Error(
        "Wallet not found."
      );

      error.statusCode = 404;
      throw error;
    }

    if (!wallet.isActive) {
      const error = new Error(
        "Wallet is inactive."
      );

      error.statusCode = 403;
      throw error;
    }

    if (
      userId &&
      wallet.userId !== normalizeString(userId)
    ) {
      const error = new Error(
        "You are not authorized to modify this wallet."
      );

      error.statusCode = 403;
      throw error;
    }

    const balanceBefore = toDecimal(
      wallet.balance
    );

    if (balanceBefore.lt(debitAmount)) {
      const error = new Error(
        "Insufficient wallet balance."
      );

      error.statusCode = 400;
      throw error;
    }

    const balanceAfter =
      balanceBefore.sub(debitAmount);

    const updatedWallet =
      await client.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: balanceAfter,
        },
        include: {
          currency: true,
        },
      });

    await createAuditLog({
      userId: userId || wallet.userId,
      adminId,
      action: "DEBIT",
      entityId: wallet.id,
      description,
      metadata: {
        amount: debitAmount.toString(),
        balanceBefore:
          balanceBefore.toString(),
        balanceAfter:
          balanceAfter.toString(),
        currencyId: wallet.currencyId,
        walletType: wallet.type,
      },
      ipAddress,
      tx: client,
    });

    return {
      wallet: updatedWallet,
      balanceBefore,
      balanceAfter,
      amount: debitAmount,
    };
  };

  if (tx) {
    const result = await execute(tx);

    logger.info("Wallet debited", {
      walletId: normalizedWalletId,
      amount: debitAmount.toString(),
    });

    return {
      wallet: serializeWallet(result.wallet),
      amount: serializeMoney(result.amount),
      balanceBefore: serializeMoney(
        result.balanceBefore
      ),
      balanceAfter: serializeMoney(
        result.balanceAfter
      ),
    };
  }

  const result = await prisma.$transaction(
    execute,
    {
      isolationLevel: "Serializable",
    }
  );

  logger.info("Wallet debited", {
    walletId: normalizedWalletId,
    amount: debitAmount.toString(),
  });

  return {
    wallet: serializeWallet(result.wallet),
    amount: serializeMoney(result.amount),
    balanceBefore: serializeMoney(
      result.balanceBefore
    ),
    balanceAfter: serializeMoney(
      result.balanceAfter
    ),
  };
}

// ============================================================
// ACTIVATE WALLET
// ============================================================

export async function activateWallet({
  walletId,
  adminId = null,
  userId = null,
  ipAddress = null,
}) {
  const normalizedWalletId = assertRequired(
    walletId,
    "Wallet ID"
  );

  const wallet = await prisma.wallet.findUnique({
    where: {
      id: normalizedWalletId,
    },
  });

  if (!wallet) {
    const error = new Error(
      "Wallet not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (
    userId &&
    wallet.userId !== normalizeString(userId)
  ) {
    const error = new Error(
      "You are not authorized to modify this wallet."
    );

    error.statusCode = 403;
    throw error;
  }

  if (wallet.isActive) {
    return serializeWallet(
      await prisma.wallet.findUnique({
        where: {
          id: wallet.id,
        },
        include: {
          currency: true,
        },
      })
    );
  }

  const updatedWallet =
    await prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.wallet.update({
            where: {
              id: wallet.id,
            },
            data: {
              isActive: true,
            },
            include: {
              currency: true,
            },
          });

        await createAuditLog({
          userId: userId || wallet.userId,
          adminId,
          action: "ACTIVATE",
          entityId: wallet.id,
          description: "Wallet activated.",
          metadata: {},
          ipAddress,
          tx,
        });

        return updated;
      }
    );

  return serializeWallet(updatedWallet);
}

// ============================================================
// DEACTIVATE WALLET
// ============================================================

export async function deactivateWallet({
  walletId,
  adminId = null,
  userId = null,
  ipAddress = null,
}) {
  const normalizedWalletId = assertRequired(
    walletId,
    "Wallet ID"
  );

  const wallet = await prisma.wallet.findUnique({
    where: {
      id: normalizedWalletId,
    },
  });

  if (!wallet) {
    const error = new Error(
      "Wallet not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (
    userId &&
    wallet.userId !== normalizeString(userId)
  ) {
    const error = new Error(
      "You are not authorized to modify this wallet."
    );

    error.statusCode = 403;
    throw error;
  }

  if (!wallet.isActive) {
    return serializeWallet(
      await prisma.wallet.findUnique({
        where: {
          id: wallet.id,
        },
        include: {
          currency: true,
        },
      })
    );
  }

  const balance = toDecimal(wallet.balance);

  if (balance.gt(0)) {
    const error = new Error(
      "A wallet with a positive balance cannot be deactivated."
    );

    error.statusCode = 400;
    throw error;
  }

  const updatedWallet =
    await prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.wallet.update({
            where: {
              id: wallet.id,
            },
            data: {
              isActive: false,
            },
            include: {
              currency: true,
            },
          });

        await createAuditLog({
          userId: userId || wallet.userId,
          adminId,
          action: "DEACTIVATE",
          entityId: wallet.id,
          description:
            "Wallet deactivated.",
          metadata: {},
          ipAddress,
          tx,
        });

        return updated;
      }
    );

  return serializeWallet(updatedWallet);
}

// ============================================================
// ADMIN WALLET BALANCE ADJUSTMENT
// ============================================================
// This is intentionally explicit. Administrative credit/debit
// operations should identify the administrator performing them.
// ============================================================

export async function adminAdjustWallet({
  walletId,
  adminId,
  amount,
  operation,
  description,
  ipAddress = null,
}) {
  const normalizedWalletId = assertRequired(
    walletId,
    "Wallet ID"
  );

  const normalizedAdminId = assertRequired(
    adminId,
    "Admin ID"
  );

  const normalizedOperation =
    normalizeString(operation).toUpperCase();

  if (
    !["CREDIT", "DEBIT"].includes(
      normalizedOperation
    )
  ) {
    const error = new Error(
      "Operation must be CREDIT or DEBIT."
    );

    error.statusCode = 400;
    throw error;
  }

  const admin = await prisma.user.findUnique({
    where: {
      id: normalizedAdminId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!admin) {
    const error = new Error(
      "Administrator not found."
    );

    error.statusCode = 404;
    throw error;
  }

  const creditDebitDescription =
    assertRequired(
      description,
      "Description"
    );

  if (normalizedOperation === "CREDIT") {
    return creditWallet({
      walletId: normalizedWalletId,
      amount,
      description: creditDebitDescription,
      adminId: normalizedAdminId,
      ipAddress,
    });
  }

  return debitWallet({
    walletId: normalizedWalletId,
    amount,
    description: creditDebitDescription,
    adminId: normalizedAdminId,
    ipAddress,
  });
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  getWallet,
  getWalletById,
  getUserWallets,
  createWallet,
  getOrCreateWallet,
  getWalletBalance,
  creditWallet,
  debitWallet,
  activateWallet,
  deactivateWallet,
  adminAdjustWallet,
};