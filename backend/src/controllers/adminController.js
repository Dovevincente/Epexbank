// ============================================================
// EPEX BANK - ADMIN CONTROLLER
// ============================================================
// Administrative customer and account management.
//
// Responsibilities:
// - Customer management
// - Customer account lookup
// - Account credit/debit
// - Customer status management
// - Account status management
// - Administrative audit logging
//
// IMPORTANT:
// Financial account adjustments are recorded as:
//
// Transaction
//      +
// LedgerEntry
//      +
// Account balance update
//
// This prevents an admin adjustment from becoming an invisible
// balance change.
//
// Passwords are never returned to the client.
// ============================================================

import crypto from "crypto";

import prisma from "../config/database.js";

import {
  hashPassword,
} from "../utils/password.js";

import {
  generateReference,
} from "../utils/reference.js";

import {
  toDecimal,
  serializeMoney,
} from "../utils/money.js";

import logger from "../utils/logger.js";
import {
  approveInternalTransfer,
  cancelInternalTransfer,
} from "../services/transferService.js";
import {
  markBankTransferProcessing,
  completeBankTransfer,
  failBankTransfer,
  cancelBankTransfer,
} from "../services/bankTransferProcessingService.js";

// ============================================================
// CONSTANTS
// ============================================================

const CUSTOMER_ROLES = [
  "CUSTOMER",
];

const USER_STATUSES = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "BLOCKED",
  "CLOSED",
];

const ACCOUNT_STATUSES = [
  "ACTIVE",
  "FROZEN",
  "SUSPENDED",
  "CLOSED",
];

// ============================================================
// HELPERS
// ============================================================

const normalizeString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
};

const normalizeEmail = (email) => {
  return normalizeString(email).toLowerCase();
};

const normalizePhone = (phone) => {
  const value = normalizeString(phone);

  return value || null;
};

const assertRequired = (
  value,
  fieldName,
) => {
  const normalized =
    normalizeString(value);

  if (!normalized) {
    const error = new Error(
      `${fieldName} is required.`,
    );

    error.statusCode = 400;

    throw error;
  }

  return normalized;
};

const assertPositiveAmount = (
  value,
) => {
  const amount = toDecimal(value);

  if (amount.lte(0)) {
    const error = new Error(
      "Amount must be greater than zero.",
    );

    error.statusCode = 400;

    throw error;
  }

  return amount;
};

const assertValidUserStatus = (
  status,
) => {
  if (
    !USER_STATUSES.includes(status)
  ) {
    const error = new Error(
      `Invalid user status. Allowed values: ${USER_STATUSES.join(
        ", ",
      )}`,
    );

    error.statusCode = 400;

    throw error;
  }
};

const assertValidAccountStatus = (
  status,
) => {
  if (
    !ACCOUNT_STATUSES.includes(status)
  ) {
    const error = new Error(
      `Invalid account status. Allowed values: ${ACCOUNT_STATUSES.join(
        ", ",
      )}`,
    );

    error.statusCode = 400;

    throw error;
  }
};

const generateAccountNumber = async (
  tx,
) => {
  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const accountNumber =
      crypto
        .randomInt(
          100000000000,
          999999999999,
        )
        .toString();

    const existing =
      await tx.account.findUnique({
        where: {
          accountNumber,
        },
        select: {
          id: true,
        },
      });

    if (!existing) {
      return accountNumber;
    }
  }

  const error = new Error(
    "Unable to generate a unique account number.",
  );

  error.statusCode = 500;

  throw error;
};

const sanitizeUser = (
  user,
) => {
  if (!user) {
    return null;
  }

  const {
    passwordHash,
    ...safeUser
  } = user;

  return safeUser;
};

const serializeAccount = (
  account,
) => {
  if (!account) {
    return null;
  }

  return {
    id: account.id,

    accountNumber:
      account.accountNumber,

    type: account.type,

    status: account.status,

    balance:
      serializeMoney(
        account.balance,
      ),

    availableBalance:
      serializeMoney(
        account.availableBalance,
      ),

    ledgerBalance:
      serializeMoney(
        account.ledgerBalance,
      ),

    minimumBalance:
      serializeMoney(
        account.minimumBalance,
      ),

    currency:
      account.currency
        ? {
            id:
              account.currency.id,

            code:
              account.currency.code,

            name:
              account.currency.name,

            symbol:
              account.currency.symbol,

            decimals:
              account.currency.decimals,
          }
        : null,

    createdAt:
      account.createdAt,

    updatedAt:
      account.updatedAt,
  };
};

const serializeTransaction = (
  transaction,
) => {
  if (!transaction) {
    return null;
  }

  return {
    id:
      transaction.id,

    reference:
      transaction.reference,

    type:
      transaction.type,

    status:
      transaction.status,

    amount:
      serializeMoney(
        transaction.amount,
      ),

    fee:
      serializeMoney(
        transaction.fee,
      ),

    total:
      serializeMoney(
        transaction.total,
      ),

    description:
      transaction.description ??
      null,

    metadata:
      transaction.metadata ??
      null,

    account:
      transaction.account
        ? {
            id:
              transaction.account.id,

            accountNumber:
              transaction.account
                .accountNumber,
          }
        : null,

    currency:
      transaction.currency
        ? {
            id:
              transaction.currency.id,

            code:
              transaction.currency.code,

            name:
              transaction.currency.name,

            symbol:
              transaction.currency.symbol,

            decimals:
              transaction.currency
                .decimals,
          }
        : null,

    createdAt:
      transaction.createdAt,

    updatedAt:
      transaction.updatedAt,
  };
};

const assertCustomerOwnsAccount =
  async (
    tx,
    customerId,
    accountId,
  ) => {
    const customer =
      await tx.user.findFirst({
        where: {
          id: customerId,
          role: "CUSTOMER",
        },

        select: {
          id: true,
        },
      });

    if (!customer) {
      const error = new Error(
        "Customer not found.",
      );

      error.statusCode = 404;

      throw error;
    }

    const account =
      await tx.account.findFirst({
        where: {
          id: accountId,
          userId: customerId,
        },
      });

    if (!account) {
      const error = new Error(
        "Account not found for this customer.",
      );

      error.statusCode = 404;

      throw error;
    }

    return account;
  };

const createAuditLog = async ({
  tx,
  adminId,
  userId = null,
  action,
  entity,
  entityId,
  description,
  metadata = {},
  ipAddress = null,
}) => {
  return tx.auditLog.create({
    data: {
      adminId:
        adminId || null,

      userId:
        userId || null,

      action,

      entity:
        entity || null,

      entityId:
        entityId || null,

      description:
        description || null,

      metadata,

      ipAddress:
        ipAddress || null,
    },
  });
};

// ============================================================
// GET CUSTOMERS
// ============================================================

export const listCustomers = async (
  req,
  res,
  next,
) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(
        req.query.page,
        10,
      ) || 1,
    );

    const requestedLimit =
      Number.parseInt(
        req.query.limit,
        10,
      ) || 20;

    const limit = Math.min(
      Math.max(
        requestedLimit,
        1,
      ),
      100,
    );

    const search =
      normalizeString(
        req.query.search,
      );

    const status =
      normalizeString(
        req.query.status,
      ).toUpperCase();

    if (status) {
      assertValidUserStatus(
        status,
      );
    }

    const where = {
      role: "CUSTOMER",
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          email: {
            contains:
              search,
            mode: "insensitive",
          },
        },

        {
          phone: {
            contains:
              search,
            mode: "insensitive",
          },
        },

        {
          profile: {
            is: {
              OR: [
                {
                  firstName: {
                    contains:
                      search,
                    mode: "insensitive",
                  },
                },

                {
                  lastName: {
                    contains:
                      search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const skip =
      (page - 1) *
      limit;

    const [
      customers,
      total,
    ] = await prisma.$transaction([
      prisma.user.findMany({
        where,

        skip,

        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,

          email: true,

          phone: true,

          role: true,

          status: true,

          emailVerified: true,

          phoneVerified: true,

          twoFactorEnabled: true,

          createdAt: true,

          updatedAt: true,

          lastLoginAt: true,

          profile: {
            select: {
              firstName: true,

              middleName: true,

              lastName: true,

              country: true,

              state: true,

              city: true,

              profileImage: true,
            },
          },

          kyc: {
            select: {
              status: true,

              verifiedAt: true,
            },
          },

          _count: {
            select: {
              accounts: true,

              transactions: true,

              loans: true,

              cards: true,
            },
          },
        },
      }),

      prisma.user.count({
        where,
      }),
    ]);

    const totalPages =
      Math.ceil(
        total / limit,
      );

    return res.status(200).json({
      success: true,

      data: {
        customers,

        pagination: {
          page,

          limit,

          total,

          totalPages,

          hasNextPage:
            page <
            totalPages,

          hasPreviousPage:
            page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CUSTOMER
// ============================================================

export const getCustomer = async (
  req,
  res,
  next,
) => {
  try {
    const customerId =
      assertRequired(
        req.params.userId,
        "Customer ID",
      );

    const customer =
      await prisma.user.findFirst({
        where: {
          id: customerId,

          role: "CUSTOMER",
        },

        select: {
          id: true,

          email: true,

          phone: true,

          role: true,

          status: true,

          emailVerified: true,

          phoneVerified: true,

          twoFactorEnabled: true,

          createdAt: true,

          updatedAt: true,

          lastLoginAt: true,

          profile: {
            select: {
              firstName: true,

              middleName: true,

              lastName: true,

              dateOfBirth: true,

              nationality: true,

              country: true,

              state: true,

              city: true,

              address: true,

              postalCode: true,

              profileImage: true,
            },
          },

          kyc: {
            select: {
              id: true,

              status: true,

              documentType: true,

              documentNumber: true,

              rejectionReason: true,

              reviewedAt: true,

              verifiedAt: true,

              createdAt: true,

              updatedAt: true,
            },
          },

          accounts: {
            select: {
              id: true,

              accountNumber: true,

              type: true,

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

              createdAt: true,

              updatedAt: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          },

          wallets: {
            select: {
              id: true,

              type: true,

              balance: true,

              currency: {
                select: {
                  id: true,

                  code: true,

                  name: true,

                  symbol: true,

                  decimals: true,
                },
              },

              createdAt: true,

              updatedAt: true,
            },
          },

          investmentAccount: {
  select: {
    id: true,
    cashBalance: true,
    totalValue: true,
    profitLoss: true,
  },
},

          _count: {
            select: {
              accounts: true,

              transactions: true,

              loans: true,

              cards: true,

              beneficiaries: true,
            },
          },
        },
      });

    if (!customer) {
      const error = new Error(
        "Customer not found.",
      );

      error.statusCode = 404;

      throw error;
    }

    const serializedCustomer = {
      ...sanitizeUser(
        customer,
      ),

      accounts:
        customer.accounts.map(
          serializeAccount,
        ),

      wallets:
        customer.wallets.map(
          (wallet) => ({
            ...wallet,

            balance:
              serializeMoney(
                wallet.balance,
              ),
          }),
        ),

      investmentAccount:
        customer.investmentAccount
          ? {
              ...customer.investmentAccount,

              cashBalance:
                serializeMoney(
                  customer.investmentAccount.cashBalance,
                ),

              totalValue:
                serializeMoney(
                  customer.investmentAccount.totalValue,
                ),

              profitLoss:
                serializeMoney(
                  customer.investmentAccount.profitLoss,
                ),
            }
          : null,
    };

    return res.status(200).json({
      success: true,

      data: {
        customer:
          serializedCustomer,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CUSTOMER ACCOUNTS
// ============================================================

export const getCustomerAccounts =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const customerId =
        assertRequired(
          req.params.userId,
          "Customer ID",
        );

      const customer =
        await prisma.user.findFirst({
          where: {
            id: customerId,

            role: "CUSTOMER",
          },

          select: {
            id: true,
          },
        });

      if (!customer) {
        const error = new Error(
          "Customer not found.",
        );

        error.statusCode = 404;

        throw error;
      }

      const accounts =
        await prisma.account.findMany({
          where: {
            userId:
              customerId,
          },

          include: {
            currency: true,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        });

      return res.status(200).json({
        success: true,

        data: {
          accounts:
            accounts.map(
              serializeAccount,
            ),
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// GET CUSTOMER ACCOUNT
// ============================================================

export const getCustomerAccount =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const customerId =
        assertRequired(
          req.params.userId,
          "Customer ID",
        );

      const accountId =
        assertRequired(
          req.params.accountId,
          "Account ID",
        );

      const account =
        await assertCustomerOwnsAccount(
          prisma,
          customerId,
          accountId,
        );

      const accountWithDetails =
        await prisma.account.findUnique({
          where: {
            id: account.id,
          },

          include: {
            currency: true,

            transactions: {
              orderBy: {
                createdAt:
                  "desc",
              },

              take: 50,

              include: {
                currency: true,

                account: {
                  select: {
                    id: true,

                    accountNumber:
                      true,
                  },
                },
              },
            },
          },
        });

      return res.status(200).json({
        success: true,

        data: {
          account:
            serializeAccount(
              accountWithDetails,
            ),

          transactions:
            accountWithDetails.transactions.map(
              serializeTransaction,
            ),
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// GET CUSTOMER TRANSACTIONS
// ============================================================

export const getCustomerTransactions =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const customerId =
        assertRequired(
          req.params.userId,
          "Customer ID",
        );

      const page = Math.max(
        1,
        Number.parseInt(
          req.query.page,
          10,
        ) || 1,
      );

      const requestedLimit =
        Number.parseInt(
          req.query.limit,
          10,
        ) || 20;

      const limit = Math.min(
        Math.max(
          requestedLimit,
          1,
        ),
        100,
      );

      const status =
        normalizeString(
          req.query.status,
        ).toUpperCase();

      const type =
        normalizeString(
          req.query.type,
        ).toUpperCase();

      if (status) {
        const allowedStatuses = [
          "PENDING",
          "PROCESSING",
          "COMPLETED",
          "FAILED",
          "REVERSED",
          "CANCELLED",
        ];

        if (
          !allowedStatuses.includes(
            status,
          )
        ) {
          const error =
            new Error(
              "Invalid transaction status.",
            );

          error.statusCode = 400;

          throw error;
        }
      }

      const allowedTypes = [
        "DEPOSIT",
        "WITHDRAWAL",
        "TRANSFER",
        "PAYMENT",
        "FEE",
        "REFUND",
        "LOAN_DISBURSEMENT",
        "LOAN_REPAYMENT",
        "SAVINGS_DEPOSIT",
        "SAVINGS_WITHDRAWAL",
        "INVESTMENT_BUY",
        "INVESTMENT_SELL",
        "DIVIDEND",
        "INTEREST",
        "ADJUSTMENT",
      ];

      if (
        type &&
        !allowedTypes.includes(
          type,
        )
      ) {
        const error =
          new Error(
            "Invalid transaction type.",
          );

        error.statusCode = 400;

        throw error;
      }

      const customer =
        await prisma.user.findFirst({
          where: {
            id: customerId,

            role: "CUSTOMER",
          },

          select: {
            id: true,
          },
        });

      if (!customer) {
        const error = new Error(
          "Customer not found.",
        );

        error.statusCode = 404;

        throw error;
      }

      const where = {
        userId:
          customerId,
      };

      if (status) {
        where.status =
          status;
      }

      if (type) {
        where.type =
          type;
      }

      if (
        req.query.accountId
      ) {
        where.accountId =
          normalizeString(
            req.query.accountId,
          );
      }

      const skip =
        (page - 1) *
        limit;

      const [
        transactions,
        total,
      ] = await prisma.$transaction([
        prisma.transaction.findMany({
          where,

          skip,

          take: limit,

          orderBy: {
            createdAt:
              "desc",
          },

          include: {
            account: {
              select: {
                id: true,

                accountNumber:
                  true,
              },
            },

            currency: true,
          },
        }),

        prisma.transaction.count({
          where,
        }),
      ]);

      const totalPages =
        Math.ceil(
          total / limit,
        );

      return res.status(200).json({
        success: true,

        data: {
          transactions:
            transactions.map(
              serializeTransaction,
            ),

          pagination: {
            page,

            limit,

            total,

            totalPages,

            hasNextPage:
              page <
              totalPages,

            hasPreviousPage:
              page > 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// UPDATE CUSTOMER STATUS
// ============================================================

export const updateCustomerStatus =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const customerId =
        assertRequired(
          req.params.userId,
          "Customer ID",
        );

      const status =
        normalizeString(
          req.body?.status,
        ).toUpperCase();

      assertValidUserStatus(
        status,
      );

      if (
        status === "ACTIVE" &&
        !req.body
      ) {
        const error =
          new Error(
            "Invalid request.",
          );

        error.statusCode =
          400;

        throw error;
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const customer =
              await tx.user.findFirst({
                where: {
                  id: customerId,

                  role: "CUSTOMER",
                },

                select: {
                  id: true,

                  email: true,

                  status: true,
                },
              });

            if (!customer) {
              const error =
                new Error(
                  "Customer not found.",
                );

              error.statusCode =
                404;

              throw error;
            }

            const updatedCustomer =
              await tx.user.update({
                where: {
                  id:
                    customerId,
                },

                data: {
                  status,
                },

                select: {
                  id: true,

                  email: true,

                  phone: true,

                  role: true,

                  status: true,

                  emailVerified:
                    true,

                  phoneVerified:
                    true,

                  twoFactorEnabled:
                    true,

                  createdAt:
                    true,

                  updatedAt:
                    true,
                },
              });

            let auditAction =
              "UPDATE";

            if (
              status ===
              "SUSPENDED"
            ) {
              auditAction =
                "SUSPEND";
            }

            if (
              status ===
              "BLOCKED"
            ) {
              auditAction =
                "BLOCK";
            }

            if (
              status ===
              "ACTIVE"
            ) {
              auditAction =
                "UNBLOCK";
            }

            await createAuditLog({
              tx,

              adminId:
                req.user.id,

              userId:
                customerId,

              action:
                auditAction,

              entity:
                "User",

              entityId:
                customerId,

              description:
                `Customer status changed from ${customer.status} to ${status}.`,

              metadata: {
                previousStatus:
                  customer.status,

                newStatus:
                  status,
              },

              ipAddress:
                req.ip,
            });

            return updatedCustomer;
          },
        );

      return res.status(200).json({
        success: true,

        message:
          "Customer status updated successfully.",

        data: {
          customer:
            result,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// CREATE CUSTOMER
// ============================================================

export const createCustomer = async (
  req,
  res,
  next,
) => {
  try {
    const email =
      normalizeEmail(
        assertRequired(
          req.body?.email,
          "Email",
        ),
      );

    const password =
      assertRequired(
        req.body?.password,
        "Password",
      );

    if (password.length < 8) {
      const error = new Error(
        "Password must contain at least 8 characters.",
      );

      error.statusCode = 400;

      throw error;
    }

    const phone =
      normalizePhone(
        req.body?.phone,
      );

    const firstName =
      assertRequired(
        req.body?.firstName,
        "First name",
      );

    const lastName =
      assertRequired(
        req.body?.lastName,
        "Last name",
      );

    const currencyCode =
      normalizeString(
        req.body?.currencyCode ||
          "USD",
      ).toUpperCase();

    const accountType =
      normalizeString(
        req.body?.accountType ||
          "CURRENT",
      ).toUpperCase();

    const allowedAccountTypes = [
      "CURRENT",
      "SAVINGS",
      "BUSINESS",
      "INVESTMENT",
    ];

    if (
      !allowedAccountTypes.includes(
        accountType,
      )
    ) {
      const error = new Error(
        `Invalid account type. Allowed values: ${allowedAccountTypes.join(
          ", ",
        )}`,
      );

      error.statusCode = 400;

      throw error;
    }

    const existingUser =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              email,
            },

            ...(phone
              ? [
                  {
                    phone,
                  },
                ]
              : []),
          ],
        },

        select: {
          id: true,

          email: true,

          phone: true,
        },
      });

    if (existingUser) {
      const error = new Error(
        existingUser.email ===
          email
          ? "A customer with this email already exists."
          : "A customer with this phone number already exists.",
      );

      error.statusCode = 409;

      throw error;
    }

    const passwordHash =
      await hashPassword(
        password,
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          const currency =
            await tx.currency.upsert({
              where: {
                code:
                  currencyCode,
              },

              update: {},

              create: {
                code:
                  currencyCode,

                name:
                  currencyCode ===
                  "USD"
                    ? "US Dollar"
                    : currencyCode,

                symbol:
                  currencyCode ===
                  "USD"
                    ? "$"
                    : currencyCode,

                decimals: 2,

                isActive: true,
              },
            });

          const user =
            await tx.user.create({
              data: {
                email,

                phone,

                passwordHash,

                role:
                  "CUSTOMER",

                status:
                  "ACTIVE",
              },
            });

          await tx.profile.create({
            data: {
              userId:
                user.id,

              firstName,

              middleName:
                normalizeString(
                  req.body?.middleName,
                ) || null,

              lastName,

              dateOfBirth:
                req.body?.dateOfBirth
                  ? new Date(
                      req.body.dateOfBirth,
                    )
                  : null,

              nationality:
                normalizeString(
                  req.body?.nationality,
                ) || null,

              country:
                normalizeString(
                  req.body?.country,
                ) || null,

              state:
                normalizeString(
                  req.body?.state,
                ) || null,

              city:
                normalizeString(
                  req.body?.city,
                ) || null,

              address:
                normalizeString(
                  req.body?.address,
                ) || null,

              postalCode:
                normalizeString(
                  req.body?.postalCode,
                ) || null,
            },
          });

          await tx.kyc.create({
            data: {
              userId:
                user.id,

              status:
                "NOT_STARTED",
            },
          });

          const accountNumber =
            await generateAccountNumber(
              tx,
            );

          const zero =
            toDecimal(0);

          const account =
            await tx.account.create({
              data: {
                accountNumber,

                type:
                  accountType,

                status:
                  "ACTIVE",

                userId:
                  user.id,

                currencyId:
                  currency.id,

                balance:
                  zero,

                availableBalance:
                  zero,

                ledgerBalance:
                  zero,

                minimumBalance:
                  zero,
              },

              include: {
                currency:
                  true,
              },
            });

          /*
           * Create the customer's primary wallet when the
           * Wallet model is available in the current schema.
           */
          await tx.wallet.create({
            data: {
              userId:
                user.id,

              currencyId:
                currency.id,

              balance:
                zero,
            },
          });

          /*
           * Investment account is created with zero balances
           * so investment features can be activated later.
           */
          await tx.investmentAccount.create({
            data: {
              userId:
                user.id,

              totalValue:
                zero,

              totalInvested:
                zero,

              availableCash:
                zero,
            },
          });

          await createAuditLog({
            tx,

            adminId:
              req.user.id,

            userId:
              user.id,

            action:
              "CREATE",

            entity:
              "User",

            entityId:
              user.id,

            description:
              "Customer account created by administrator.",

            metadata: {
              email,

              phone,

              accountId:
                account.id,

              accountNumber,

              accountType,

              currency:
                currency.code,
            },

            ipAddress:
              req.ip,
          });

          return {
            user,

            account,
          };
        },
      );

    return res.status(201).json({
      success: true,

      message:
        "Customer created successfully.",

      data: {
        user:
          sanitizeUser(
            result.user,
          ),

        account:
          serializeAccount(
            result.account,
          ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE ACCOUNT STATUS
// ============================================================

export const updateAccountStatus =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const customerId =
        assertRequired(
          req.params.userId,
          "Customer ID",
        );

      const accountId =
        assertRequired(
          req.params.accountId,
          "Account ID",
        );

      const status =
        normalizeString(
          req.body?.status,
        ).toUpperCase();

      assertValidAccountStatus(
        status,
      );

      const result =
        await prisma.$transaction(
          async (tx) => {
            const account =
              await assertCustomerOwnsAccount(
                tx,
                customerId,
                accountId,
              );

            const previousStatus =
              account.status;

            if (
              previousStatus ===
              status
            ) {
              return {
                account,
                changed: false,
              };
            }

            /*
             * A CLOSED account cannot be reopened through
             * the standard status endpoint.
             */
            if (
              previousStatus ===
                "CLOSED" &&
              status !== "CLOSED"
            ) {
              const error =
                new Error(
                  "A closed account cannot be reopened through this operation.",
                );

              error.statusCode =
                400;

              throw error;
            }

            const updatedAccount =
              await tx.account.update({
                where: {
                  id:
                    accountId,
                },

                data: {
                  status,
                },

                include: {
                  currency:
                    true,
                },
              });

            let auditAction =
              "UPDATE";

            if (
              status ===
              "FROZEN"
            ) {
              auditAction =
                "SUSPEND";
            }

            if (
              status ===
              "ACTIVE"
            ) {
              auditAction =
                "UNBLOCK";
            }

            await createAuditLog({
              tx,

              adminId:
                req.user.id,

              userId:
                customerId,

              action:
                auditAction,

              entity:
                "Account",

              entityId:
                accountId,

              description:
                `Account status changed from ${previousStatus} to ${status}.`,

              metadata: {
                previousStatus,

                newStatus:
                  status,

                accountNumber:
                  account.accountNumber,
              },

              ipAddress:
                req.ip,
            });

            return {
              account:
                updatedAccount,

              changed: true,
            };
          },
        );

      return res.status(200).json({
        success: true,

        message:
          result.changed
            ? "Account status updated successfully."
            : "Account status was already set to the requested status.",

        data: {
          account:
            serializeAccount(
              result.account,
            ),
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// CREDIT CUSTOMER ACCOUNT
// ============================================================

export const creditCustomerAccount =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const customerId =
        assertRequired(
          req.params.userId,
          "Customer ID",
        );

      const accountId =
        assertRequired(
          req.params.accountId,
          "Account ID",
        );

      const amount =
        assertPositiveAmount(
          req.body?.amount,
        );

      const description =
        normalizeString(
          req.body?.description,
        ) ||
        "Administrative account credit";

      const result =
        await prisma.$transaction(
          async (tx) => {
            const account =
              await assertCustomerOwnsAccount(
                tx,
                customerId,
                accountId,
              );

            if (
              account.status !==
              "ACTIVE"
            ) {
              const error =
                new Error(
                  `Cannot credit an account with status ${account.status}.`,
                );

              error.statusCode =
                400;

              throw error;
            }

            const balanceBefore =
              toDecimal(
                account.balance,
              );

            const balanceAfter =
              balanceBefore.add(
                amount,
              );

            const availableBefore =
              toDecimal(
                account.availableBalance,
              );

            const availableAfter =
              availableBefore.add(
                amount,
              );

            const ledgerBefore =
              toDecimal(
                account.ledgerBalance,
              );

            const ledgerAfter =
              ledgerBefore.add(
                amount,
              );

            const reference =
              await generateReference(
                "ADJ",
              );

            const transaction =
              await tx.transaction.create({
                data: {
                  reference,

                  userId:
                    customerId,

                  accountId:
                    accountId,

                  currencyId:
                    account.currencyId,

                  type:
                    "ADJUSTMENT",

                  status:
                    "COMPLETED",

                  amount,

                  fee:
                    toDecimal(0),

                  total:
                    amount,

                  description,

                  metadata: {
                    operation:
                      "ADMIN_CREDIT",

                    adminId:
                      req.user.id,
                  },
                },

                include: {
                  account: {
                    select: {
                      id: true,

                      accountNumber:
                        true,
                    },
                  },

                  currency:
                    true,
                },
              });

            const updatedAccount =
              await tx.account.update({
                where: {
                  id:
                    accountId,
                },

                data: {
                  balance:
                    balanceAfter,

                  availableBalance:
                    availableAfter,

                  ledgerBalance:
                    ledgerAfter,
                },

                include: {
                  currency:
                    true,
                },
              });

            await tx.ledgerEntry.create({
              data: {
                accountId:
                  accountId,

                transactionId:
                  transaction.id,

                type:
                  "CREDIT",

                amount,

                balanceBefore,

                balanceAfter,

                description,
              },
            });

            await createAuditLog({
              tx,

              adminId:
                req.user.id,

              userId:
                customerId,

              action:
                "DEPOSIT",

              entity:
                "Account",

              entityId:
                accountId,

              description:
                `Administrator credited ${amount.toString()} ${account.currency?.code || ""} to account ${account.accountNumber}.`,

              metadata: {
                operation:
                  "ADMIN_CREDIT",

                transactionId:
                  transaction.id,

                reference,

                amount:
                  amount.toString(),

                accountNumber:
                  account.accountNumber,
              },

              ipAddress:
                req.ip,
            });

            return {
              transaction,

              account:
                updatedAccount,

              balanceBefore,

              balanceAfter,
            };
          },
        );

      return res.status(200).json({
        success: true,

        message:
          "Customer account credited successfully.",

        data: {
          transaction:
            serializeTransaction(
              result.transaction,
            ),

          account:
            serializeAccount(
              result.account,
            ),

          balance: {
            before:
              serializeMoney(
                result.balanceBefore,
              ),

            after:
              serializeMoney(
                result.balanceAfter,
              ),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// DEBIT CUSTOMER ACCOUNT
// ============================================================

export const debitCustomerAccount =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const customerId =
        assertRequired(
          req.params.userId,
          "Customer ID",
        );

      const accountId =
        assertRequired(
          req.params.accountId,
          "Account ID",
        );

      const amount =
        assertPositiveAmount(
          req.body?.amount,
        );

      const description =
        normalizeString(
          req.body?.description,
        ) ||
        "Administrative account debit";

      const result =
        await prisma.$transaction(
          async (tx) => {
            const account =
              await assertCustomerOwnsAccount(
                tx,
                customerId,
                accountId,
              );

            if (
              account.status !==
              "ACTIVE"
            ) {
              const error =
                new Error(
                  `Cannot debit an account with status ${account.status}.`,
                );

              error.statusCode =
                400;

              throw error;
            }

            const balanceBefore =
              toDecimal(
                account.balance,
              );

            if (
              balanceBefore.lt(
                amount,
              )
            ) {
              const error =
                new Error(
                  "Insufficient account balance.",
                );

              error.statusCode =
                400;

              throw error;
            }

            const balanceAfter =
              balanceBefore.sub(
                amount,
              );

            const availableBefore =
              toDecimal(
                account.availableBalance,
              );

            if (
              availableBefore.lt(
                amount,
              )
            ) {
              const error =
                new Error(
                  "Insufficient available balance.",
                );

              error.statusCode =
                400;

              throw error;
            }

            const availableAfter =
              availableBefore.sub(
                amount,
              );

            const ledgerBefore =
              toDecimal(
                account.ledgerBalance,
              );

            if (
              ledgerBefore.lt(
                amount,
              )
            ) {
              const error =
                new Error(
                  "Insufficient ledger balance.",
                );

              error.statusCode =
                400;

              throw error;
            }

            const ledgerAfter =
              ledgerBefore.sub(
                amount,
              );

            const reference =
              await generateReference(
                "ADJ",
              );

            const transaction =
              await tx.transaction.create({
                data: {
                  reference,

                  userId:
                    customerId,

                  accountId:
                    accountId,

                  currencyId:
                    account.currencyId,

                  type:
                    "ADJUSTMENT",

                  status:
                    "COMPLETED",

                  amount,

                  fee:
                    toDecimal(0),

                  total:
                    amount,

                  description,

                  metadata: {
                    operation:
                      "ADMIN_DEBIT",

                    adminId:
                      req.user.id,
                  },
                },

                include: {
                  account: {
                    select: {
                      id: true,

                      accountNumber:
                        true,
                    },
                  },

                  currency:
                    true,
                },
              });

            const updatedAccount =
              await tx.account.update({
                where: {
                  id:
                    accountId,
                },

                data: {
                  balance:
                    balanceAfter,

                  availableBalance:
                    availableAfter,

                  ledgerBalance:
                    ledgerAfter,
                },

                include: {
                  currency:
                    true,
                },
              });

            await tx.ledgerEntry.create({
              data: {
                accountId:
                  accountId,

                transactionId:
                  transaction.id,

                type:
                  "DEBIT",

                amount,

                balanceBefore,

                balanceAfter,

                description,
              },
            });

            await createAuditLog({
              tx,

              adminId:
                req.user.id,

              userId:
                customerId,

              action:
                "WITHDRAWAL",

              entity:
                "Account",

              entityId:
                accountId,

              description:
                `Administrator debited ${amount.toString()} ${account.currency?.code || ""} from account ${account.accountNumber}.`,

              metadata: {
                operation:
                  "ADMIN_DEBIT",

                transactionId:
                  transaction.id,

                reference,

                amount:
                  amount.toString(),

                accountNumber:
                  account.accountNumber,
              },

              ipAddress:
                req.ip,
            });

            return {
              transaction,

              account:
                updatedAccount,

              balanceBefore,

              balanceAfter,
            };
          },
        );

      return res.status(200).json({
        success: true,

        message:
          "Customer account debited successfully.",

        data: {
          transaction:
            serializeTransaction(
              result.transaction,
            ),

          account:
            serializeAccount(
              result.account,
            ),

          balance: {
            before:
              serializeMoney(
                result.balanceBefore,
              ),

            after:
              serializeMoney(
                result.balanceAfter,
              ),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /*
// ============================================================
// ADMIN STATISTICS
// ============================================================
*/

export const getAdminStatistics = async (
  req,
  res,
  next,
) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      activeCustomers,
      suspendedCustomers,
      blockedCustomers,

      totalAccounts,
      activeAccounts,
      frozenAccounts,
      suspendedAccounts,

      pendingKyc,
      underReviewKyc,
      verifiedKyc,
      rejectedKyc,

      totalTransactions,
      pendingTransactions,
      processingTransactions,
      completedTransactions,
      failedTransactions,
      reversedTransactions,
      todayTransactions,

      totalTransfers,
      pendingTransfers,
      processingTransfers,
      completedTransfers,
      failedTransfers,
      todayTransfers,

      totalDeposits,
      pendingDeposits,
      processingDeposits,
      completedDeposits,
      failedDeposits,
      todayDeposits,

      totalWithdrawals,
      pendingWithdrawals,
      processingWithdrawals,
      completedWithdrawals,
      failedWithdrawals,
      todayWithdrawals,

      totalLoans,
      pendingLoans,
      underReviewLoans,
      approvedLoans,
      activeLoans,
      defaultedLoans,
      completedLoans,

      totalCards,
      activeCards,
      blockedCards,
      frozenCards,

      totalPayments,
      pendingPayments,
      completedPayments,
      failedPayments,

      totalInvestmentOrders,
      pendingInvestmentOrders,
      processingInvestmentOrders,
      completedInvestmentOrders,

      totalShareOrders,
      pendingShareOrders,
      processingShareOrders,
      completedShareOrders,

      openSupportTickets,
      inProgressSupportTickets,
      resolvedSupportTickets,

      totalSavingsAccounts,
    ] = await prisma.$transaction([
      // CUSTOMERS
      prisma.user.count({
        where: {
          role: "CUSTOMER",
        },
      }),

      prisma.user.count({
        where: {
          role: "CUSTOMER",
          status: "ACTIVE",
        },
      }),

      prisma.user.count({
        where: {
          role: "CUSTOMER",
          status: "SUSPENDED",
        },
      }),

      prisma.user.count({
        where: {
          role: "CUSTOMER",
          status: "BLOCKED",
        },
      }),

      // ACCOUNTS
      prisma.account.count(),

      prisma.account.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.account.count({
        where: {
          status: "FROZEN",
        },
      }),

      prisma.account.count({
        where: {
          status: "SUSPENDED",
        },
      }),

      // KYC
      prisma.kyc.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.kyc.count({
        where: {
          status: "UNDER_REVIEW",
        },
      }),

      prisma.kyc.count({
        where: {
          status: "VERIFIED",
        },
      }),

      prisma.kyc.count({
        where: {
          status: "REJECTED",
        },
      }),

      // TRANSACTIONS
      prisma.transaction.count(),

      prisma.transaction.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.transaction.count({
        where: {
          status: "PROCESSING",
        },
      }),

      prisma.transaction.count({
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.transaction.count({
        where: {
          status: "FAILED",
        },
      }),

      prisma.transaction.count({
        where: {
          status: "REVERSED",
        },
      }),

      prisma.transaction.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // TRANSFERS
      prisma.transfer.count(),

      prisma.transfer.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.transfer.count({
        where: {
          status: "PROCESSING",
        },
      }),

      prisma.transfer.count({
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.transfer.count({
        where: {
          status: "FAILED",
        },
      }),

      prisma.transfer.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // DEPOSITS
      prisma.deposit.count(),

      prisma.deposit.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.deposit.count({
        where: {
          status: "PROCESSING",
        },
      }),

      prisma.deposit.count({
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.deposit.count({
        where: {
          status: "FAILED",
        },
      }),

      prisma.deposit.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // WITHDRAWALS
      prisma.withdrawal.count(),

      prisma.withdrawal.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.withdrawal.count({
        where: {
          status: "PROCESSING",
        },
      }),

      prisma.withdrawal.count({
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.withdrawal.count({
        where: {
          status: "FAILED",
        },
      }),

      prisma.withdrawal.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // LOANS
      prisma.loan.count(),

      prisma.loan.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.loan.count({
        where: {
          status: "UNDER_REVIEW",
        },
      }),

      prisma.loan.count({
        where: {
          status: "APPROVED",
        },
      }),

      prisma.loan.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.loan.count({
        where: {
          status: "DEFAULTED",
        },
      }),

      prisma.loan.count({
        where: {
          status: "COMPLETED",
        },
      }),

      // CARDS
      prisma.card.count(),

      prisma.card.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.card.count({
        where: {
          status: "BLOCKED",
        },
      }),

      prisma.card.count({
        where: {
          status: "FROZEN",
        },
      }),

      // PAYMENTS
      prisma.payment.count(),

      prisma.payment.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.payment.count({
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.payment.count({
        where: {
          status: "FAILED",
        },
      }),

      // INVESTMENT ORDERS
      prisma.investmentOrder.count(),

      prisma.investmentOrder.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.investmentOrder.count({
        where: {
          status: "PROCESSING",
        },
      }),

      prisma.investmentOrder.count({
        where: {
          status: "COMPLETED",
        },
      }),

      // SHARE ORDERS
      prisma.shareOrder.count(),

      prisma.shareOrder.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.shareOrder.count({
        where: {
          status: "PROCESSING",
        },
      }),

      prisma.shareOrder.count({
        where: {
          status: "COMPLETED",
        },
      }),

      // SUPPORT
      prisma.supportTicket.count({
        where: {
          status: "OPEN",
        },
      }),

      prisma.supportTicket.count({
        where: {
          status: "IN_PROGRESS",
        },
      }),

      prisma.supportTicket.count({
        where: {
          status: "RESOLVED",
        },
      }),

      // SAVINGS
      prisma.savingsAccount.count(),
    ]);

    const pendingItems =
      pendingTransactions +
      pendingTransfers +
      pendingDeposits +
      pendingWithdrawals +
      pendingLoans +
      pendingKyc +
      pendingPayments +
      pendingInvestmentOrders +
      pendingShareOrders +
      openSupportTickets;

    return res.status(200).json({
      success: true,

      data: {
        customers: {
          total: totalCustomers,
          active: activeCustomers,
          suspended: suspendedCustomers,
          blocked: blockedCustomers,
        },

        accounts: {
          total: totalAccounts,
          active: activeAccounts,
          frozen: frozenAccounts,
          suspended: suspendedAccounts,
          restricted:
            frozenAccounts + suspendedAccounts,
        },

        kyc: {
          pending: pendingKyc,
          underReview: underReviewKyc,
          verified: verifiedKyc,
          rejected: rejectedKyc,
        },

        transactions: {
          total: totalTransactions,
          pending: pendingTransactions,
          processing: processingTransactions,
          completed: completedTransactions,
          failed: failedTransactions,
          reversed: reversedTransactions,
          today: todayTransactions,
        },

        transfers: {
          total: totalTransfers,
          pending: pendingTransfers,
          processing: processingTransfers,
          completed: completedTransfers,
          failed: failedTransfers,
          today: todayTransfers,
        },

        deposits: {
          total: totalDeposits,
          pending: pendingDeposits,
          processing: processingDeposits,
          completed: completedDeposits,
          failed: failedDeposits,
          today: todayDeposits,
        },

        withdrawals: {
          total: totalWithdrawals,
          pending: pendingWithdrawals,
          processing: processingWithdrawals,
          completed: completedWithdrawals,
          failed: failedWithdrawals,
          today: todayWithdrawals,
        },

        loans: {
          total: totalLoans,
          pending: pendingLoans,
          underReview: underReviewLoans,
          approved: approvedLoans,
          active: activeLoans,
          defaulted: defaultedLoans,
          completed: completedLoans,
        },

        cards: {
          total: totalCards,
          active: activeCards,
          blocked: blockedCards,
          frozen: frozenCards,
        },

        payments: {
          total: totalPayments,
          pending: pendingPayments,
          completed: completedPayments,
          failed: failedPayments,
        },

        investments: {
          totalOrders: totalInvestmentOrders,
          pending: pendingInvestmentOrders,
          processing: processingInvestmentOrders,
          completed: completedInvestmentOrders,
        },

        shares: {
          totalOrders: totalShareOrders,
          pending: pendingShareOrders,
          processing: processingShareOrders,
          completed: completedShareOrders,
        },

        support: {
          open: openSupportTickets,
          inProgress: inProgressSupportTickets,
          resolved: resolvedSupportTickets,
        },

        savings: {
          totalAccounts: totalSavingsAccounts,
        },

        pendingItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminTransactions = async (
  req,
  res,
  next,
) => {
  try {
    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1,
    );

    const requestedLimit =
      Number.parseInt(req.query.limit, 10) || 50;

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      100,
    );

    const skip = (page - 1) * limit;

    const status =
      normalizeString(
        req.query.status,
      ).toUpperCase();

    const type =
      normalizeString(
        req.query.type,
      ).toUpperCase();

    const search =
      normalizeString(
        req.query.search,
      );

    const customerId =
      normalizeString(
        req.query.customerId,
      );

    const accountId =
      normalizeString(
        req.query.accountId,
      );

    const validStatuses = [
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "REVERSED",
      "CANCELLED",
    ];

    const validTypes = [
      "DEPOSIT",
      "WITHDRAWAL",
      "TRANSFER",
      "PAYMENT",
      "FEE",
      "REFUND",
      "LOAN_DISBURSEMENT",
      "LOAN_REPAYMENT",
      "SAVINGS_DEPOSIT",
      "SAVINGS_WITHDRAWAL",
      "INVESTMENT_BUY",
      "INVESTMENT_SELL",
      "DIVIDEND",
      "INTEREST",
      "ADJUSTMENT",
    ];

    if (
      status &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid transaction status.",
      });
    }

    if (
      type &&
      !validTypes.includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid transaction type.",
      });
    }

    const where = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (customerId) {
      where.userId = customerId;
    }

    if (accountId) {
      where.accountId = accountId;
    }

    if (search) {
      where.OR = [
        {
          reference: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          user: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },

        {
          account: {
            accountNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [
      transactions,
      total,
    ] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,

        skip,

        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,

              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },

          account: {
            select: {
              id: true,
              accountNumber: true,
              status: true,
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
        },
      }),

      prisma.transaction.count({
        where,
      }),
    ]);

    const totalPages =
      Math.ceil(total / limit);

    return res.status(200).json({
      success: true,

      data: {
        transactions:
          transactions.map(
            serializeTransaction,
          ),

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasNextPage:
            page < totalPages,

          hasPreviousPage:
            page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
// ============================================================
// UPDATE ADMIN TRANSACTION STATUS
// ============================================================
*/

export const updateAdminTransactionStatus =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const transactionId =
        assertRequired(
          req.params.transactionId,
          "Transaction ID",
        );

      const requestedStatus =
        normalizeString(
          req.body?.status,
        ).toUpperCase();

      const reason =
        normalizeString(
          req.body?.reason,
        ) ||
        "Administrative transaction status update.";

      const allowedStatuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "REVERSED",
        "CANCELLED",
      ];

      if (
        !allowedStatuses.includes(
          requestedStatus,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid transaction status.",
        });
      }

      /*
       * ----------------------------------------------------------
       * LOAD TRANSACTION
       * ----------------------------------------------------------
       */

      const transaction =
        await prisma.transaction.findUnique({
          where: {
            id: transactionId,
          },

          include: {
            account: {
              select: {
                id: true,
                accountNumber: true,
                status: true,
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
          },
        });

      if (!transaction) {
        const error =
          new Error(
            "Transaction not found.",
          );

        error.statusCode = 404;

        throw error;
      }

      const previousStatus =
        transaction.status;

      /*
       * No work is required when the requested status
       * is already the current status.
       */

      if (
        previousStatus ===
        requestedStatus
      ) {
        return res.status(200).json({
          success: true,
          message:
            "Transaction status is already set to the requested status.",
          data: {
            transaction:
              serializeTransaction(
                transaction,
              ),
            previousStatus,
            changed: false,
          },
        });
      }

      /*
       * A completed transaction cannot be moved
       * backwards into pending or processing.
       */

      if (
        previousStatus ===
          "COMPLETED" &&
        [
          "PENDING",
          "PROCESSING",
        ].includes(
          requestedStatus,
        )
      ) {
        const error =
          new Error(
            "A completed transaction cannot be moved back to pending or processing.",
          );

        error.statusCode = 400;

        throw error;
      }

      /*
       * Reversal is deliberately not implemented as
       * a simple status change.
       */

      if (
        requestedStatus ===
          "REVERSED"
      ) {
        const error =
          new Error(
            "Transaction reversal requires a dedicated reversal workflow and cannot be performed by a simple status update.",
          );

        error.statusCode = 400;

        throw error;
      }

      /*
       * ----------------------------------------------------------
       * DETECT TRANSFER
       * ----------------------------------------------------------
       */

      const metadata =
        transaction.metadata &&
        typeof transaction.metadata ===
          "object"
          ? transaction.metadata
          : {};

      const transferId =
        metadata.transferId ||
        null;

      const transferType =
        String(
          metadata.transferType ||
            "",
        ).toUpperCase();

      /*
       * ----------------------------------------------------------
       * INTERNAL TRANSFER
       * ----------------------------------------------------------
       *
       * INTERNAL transfers are processed through
       * transferService.js.
       *
       * Never use the generic transaction updater for
       * these because the service performs the account
       * balance and ledger operations.
       */

      if (
        transaction.type ===
          "TRANSFER" &&
        transferId &&
        transferType !==
          "BANK"
      ) {
        if (
          requestedStatus ===
          "COMPLETED"
        ) {
          await approveInternalTransfer({
            transferId,
            adminUserId:
              req.user.id,
          });
        }
        else if (
          requestedStatus ===
            "FAILED" ||
          requestedStatus ===
            "CANCELLED"
        ) {
          await cancelInternalTransfer({
            transferId,
            adminUserId:
              req.user.id,
            reason,
          });
        }
        else if (
          requestedStatus ===
          "PROCESSING"
        ) {
          const error =
            new Error(
              "Internal transfers cannot be manually moved to PROCESSING.",
            );

          error.statusCode = 400;

          throw error;
        }
        else if (
          requestedStatus ===
          "PENDING"
        ) {
          const error =
            new Error(
              "Internal transfer is already controlled by its transfer workflow.",
            );

          error.statusCode = 400;

          throw error;
        }

        const updatedInternal =
          await prisma.transaction.findUnique({
            where: {
              id: transactionId,
            },

            include: {
              account: {
                select: {
                  id: true,
                  accountNumber: true,
                  status: true,
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
            },
          });

        return res.status(200).json({
          success: true,
          message:
            "Internal transfer status updated successfully.",
          data: {
            transaction:
              serializeTransaction(
                updatedInternal,
              ),
            previousStatus,
            changed: true,
          },
        });
      }

      /*
       * ----------------------------------------------------------
       * EXTERNAL BANK TRANSFER
       * ----------------------------------------------------------
       *
       * BANK transfers use the dedicated bank-transfer
       * processing service.
       *
       * IMPORTANT:
       * Completing a BANK transfer does NOT debit the
       * account again.
       */

      if (
        transaction.type ===
          "TRANSFER" &&
        transferId &&
        transferType ===
          "BANK"
      ) {
        if (
          requestedStatus ===
          "PROCESSING"
        ) {
          await markBankTransferProcessing({
            transferId,
            adminId:
              req.user.id,
            ipAddress:
              req.ip,
          });
        }
        else if (
          requestedStatus ===
          "COMPLETED"
        ) {
          await completeBankTransfer({
            transferId,
            adminId:
              req.user.id,
            ipAddress:
              req.ip,
            externalReference:
              normalizeString(
                req.body?.externalReference,
              ) || null,
          });
        }
        else if (
          requestedStatus ===
          "FAILED"
        ) {
          await failBankTransfer({
            transferId,
            reason,
            adminId:
              req.user.id,
            ipAddress:
              req.ip,
          });
        }
        else if (
          requestedStatus ===
          "CANCELLED"
        ) {
          await cancelBankTransfer({
            transferId,
            reason,
            adminId:
              req.user.id,
            ipAddress:
              req.ip,
          });
        }
        else if (
          requestedStatus ===
          "PENDING"
        ) {
          const error =
            new Error(
              "A bank transfer cannot be moved back to PENDING from its current processing state.",
            );

          error.statusCode = 400;

          throw error;
        }

        const updatedBank =
          await prisma.transaction.findUnique({
            where: {
              id: transactionId,
            },

            include: {
              account: {
                select: {
                  id: true,
                  accountNumber: true,
                  status: true,
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
            },
          });

        return res.status(200).json({
          success: true,
          message:
            "Bank transfer status updated successfully.",
          data: {
            transaction:
              serializeTransaction(
                updatedBank,
              ),
            previousStatus,
            changed: true,
          },
        });
      }

      /*
       * ----------------------------------------------------------
       * NORMAL NON-TRANSFER TRANSACTION
       * ----------------------------------------------------------
       *
       * Only transactions that are not controlled by a
       * dedicated transfer workflow reach this section.
       */

      const updated =
        await prisma.transaction.update({
          where: {
            id: transactionId,
          },

          data: {
            status:
              requestedStatus,
          },

          include: {
            account: {
              select: {
                id: true,
                accountNumber: true,
                status: true,
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
          },
        });

      let auditAction =
        "UPDATE";

      if (
        requestedStatus ===
        "COMPLETED"
      ) {
        auditAction =
          "APPROVE";
      }

      if (
        requestedStatus ===
          "FAILED" ||
        requestedStatus ===
          "CANCELLED"
      ) {
        auditAction =
          "REJECT";
      }

      await prisma.auditLog.create({
        data: {
          adminId:
            req.user.id,

          userId:
            transaction.userId,

          action:
            auditAction,

          entity:
            "Transaction",

          entityId:
            transaction.id,

          description:
            reason,

          metadata: {
            reference:
              transaction.reference,

            previousStatus,

            newStatus:
              requestedStatus,

            transactionType:
              transaction.type,

            amount:
              transaction.amount.toString(),
          },

          ipAddress:
            req.ip,
        },
      });

      return res.status(200).json({
        success: true,

        message:
          "Transaction status updated successfully.",

        data: {
          transaction:
            serializeTransaction(
              updated,
            ),

          previousStatus,

          changed: true,
        },
      });
    }
    catch (error) {
      next(error);
    }
  };
// ============================================================
// ADMIN AUDIT LOGS
// ============================================================

export const getAdminAuditLogs = async (
  req,
  res,
  next,
) => {
  try {
    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) || 25,
        1,
      ),
      100,
    );

    const skip = (page - 1) * limit;

    const action =
      normalizeString(req.query.action).toUpperCase();

    const entity =
      normalizeString(req.query.entity);

    const entityId =
      normalizeString(req.query.entityId);

    const where = {
      adminId: {
        not: null,
      },

      ...(action
        ? { action }
        : {}),

      ...(entity
        ? {
            entity: {
              contains: entity,
              mode: "insensitive",
            },
          }
        : {}),

      ...(entityId
        ? { entityId }
        : {}),
    };

    const [logs, total] =
      await prisma.$transaction([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,

          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            userId: true,
            adminId: true,
            action: true,
            entity: true,
            entityId: true,
            description: true,
            metadata: true,
            ipAddress: true,
            createdAt: true,

            admin: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },

            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        }),

        prisma.auditLog.count({
          where,
        }),
      ]);

    const totalPages =
      Math.ceil(total / limit);

    return res.status(200).json({
      success: true,

      data: {
        logs,

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasNextPage:
            page < totalPages,

          hasPreviousPage:
            page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CONTROLLER EXPORTS
// ============================================================

export default {
  listCustomers,
  getCustomer,
  createCustomer,
  getCustomerAccounts,
  getCustomerAccount,
  getCustomerTransactions,
  updateCustomerStatus,
  updateAccountStatus,
  creditCustomerAccount,
  debitCustomerAccount,
  getAdminAuditLogs,
};









