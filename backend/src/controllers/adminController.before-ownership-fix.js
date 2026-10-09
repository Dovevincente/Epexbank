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

const assertCustomerOwnsAccount = async (
  tx,
  customerId,
  accountId,
) => {
  const customer = await tx.user.findFirst({
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

  const account = await tx.account.findFirst({
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
        req.params.customerId,
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
              isActive: true,

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
              transactions: true,
              loans: true,
              savings: true,
              cards: true,
              payments: true,
              withdrawals: true,
              deposits: true,
              supportTickets: true,
            },
          },
        },
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE CUSTOMER
// ============================================================
// Administrative customer creation.
//
// Creates:
// User
// Profile
// KYC
// Account
// Wallet
// InvestmentAccount
//
// No authentication tokens are generated because this is an
// administrative operation.
// ============================================================

export const createCustomer = async (
  req,
  res,
  next,
) => {
  try {
    const {
      email,
      phone,
      password,
      firstName,
      middleName,
      lastName,
      country,
      state,
      city,
      address,
      postalCode,
      currencyCode = "USD",
      accountType = "CURRENT",
    } = req.body;

    const normalizedEmail =
      normalizeEmail(email);

    const normalizedPhone =
      normalizePhone(phone);

    const normalizedFirstName =
      assertRequired(
        firstName,
        "First name",
      );

    const normalizedLastName =
      assertRequired(
        lastName,
        "Last name",
      );

    const normalizedPassword =
      assertRequired(
        password,
        "Password",
      );

    if (
      normalizedPassword.length <
      8
    ) {
      const error = new Error(
        "Password must contain at least 8 characters.",
      );

      error.statusCode = 400;

      throw error;
    }

    if (!normalizedEmail) {
      const error = new Error(
        "Email is required.",
      );

      error.statusCode = 400;

      throw error;
    }

    const normalizedCurrencyCode =
      assertRequired(
        currencyCode,
        "Currency code",
      ).toUpperCase();

    const normalizedAccountType =
      assertRequired(
        accountType,
        "Account type",
      ).toUpperCase();

    const existingEmail =
      await prisma.user.findUnique({
        where: {
          email:
            normalizedEmail,
        },

        select: {
          id: true,
        },
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "A customer with this email already exists.",
      });
    }

    if (normalizedPhone) {
      const existingPhone =
        await prisma.user.findUnique({
          where: {
            phone:
              normalizedPhone,
          },

          select: {
            id: true,
          },
        });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message:
            "A customer with this phone number already exists.",
        });
      }
    }

    const passwordHash =
      await hashPassword(
        normalizedPassword,
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          const currency =
            await tx.currency.upsert({
              where: {
                code:
                  normalizedCurrencyCode,
              },

              update: {},

              create: {
                code:
                  normalizedCurrencyCode,

                name:
                  normalizedCurrencyCode ===
                  "USD"
                    ? "US Dollar"
                    : normalizedCurrencyCode,

                symbol:
                  normalizedCurrencyCode ===
                  "USD"
                    ? "$"
                    : normalizedCurrencyCode,

                decimals: 2,

                isActive: true,
              },
            });

          if (!currency.isActive) {
            const error = new Error(
              "The selected currency is not active.",
            );

            error.statusCode = 400;

            throw error;
          }

          const user =
            await tx.user.create({
              data: {
                email:
                  normalizedEmail,

                phone:
                  normalizedPhone,

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

              firstName:
                normalizedFirstName,

              middleName:
                normalizeString(
                  middleName,
                ) || null,

              lastName:
                normalizedLastName,

              country:
                normalizeString(
                  country,
                ) || null,

              state:
                normalizeString(
                  state,
                ) || null,

              city:
                normalizeString(
                  city,
                ) || null,

              address:
                normalizeString(
                  address,
                ) || null,

              postalCode:
                normalizeString(
                  postalCode,
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

          const account =
            await tx.account.create({
              data: {
                accountNumber,

                type:
                  normalizedAccountType,

                status:
                  "ACTIVE",

                userId:
                  user.id,

                currencyId:
                  currency.id,

                balance: 0,

                availableBalance: 0,

                ledgerBalance: 0,
              },

              include: {
                currency: true,
              },
            });

          const wallet =
            await tx.wallet.create({
              data: {
                userId:
                  user.id,

                currencyId:
                  currency.id,

                type:
                  "FIAT",

                balance: 0,

                isActive: true,
              },
            });

          const investmentAccount =
            await tx.investmentAccount.create({
              data: {
                userId:
                  user.id,

                cashBalance: 0,

                totalValue: 0,

                profitLoss: 0,
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
              "Administrator created a customer account.",

            metadata: {
              email:
                normalizedEmail,

              accountId:
                account.id,

              accountNumber:
                account.accountNumber,

              currencyCode:
                normalizedCurrencyCode,
            },

            ipAddress:
              req.ip,
          });

          return {
            user,

            account,

            wallet,

            investmentAccount,
          };
        },
        {
          isolationLevel:
            "Serializable",
        },
      );

    logger.info(
      "Administrator created customer",
      {
        adminId:
          req.user.id,

        userId:
          result.user.id,

        accountId:
          result.account.id,
      },
    );

    return res.status(201).json({
      success: true,

      message:
        "Customer created successfully.",

      data: {
        customer:
          sanitizeUser(
            result.user,
          ),

        account:
          serializeAccount(
            result.account,
          ),

        wallet: {
          id:
            result.wallet.id,

          balance:
            serializeMoney(
              result.wallet.balance,
            ),

          currencyId:
            result.wallet.currencyId,

          type:
            result.wallet.type,
        },

        investmentAccount: {
          id:
            result.investmentAccount.id,

          cashBalance:
            serializeMoney(
              result.investmentAccount.cashBalance,
            ),

          totalValue:
            serializeMoney(
              result.investmentAccount.totalValue,
            ),

          profitLoss:
            serializeMoney(
              result.investmentAccount.profitLoss,
            ),
        },
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
          req.params.customerId,
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
          },
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found.",
        });
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
            createdAt: "asc",
          },
        });

      return res.status(200).json({
        success: true,

        data: {
          customer,

          accounts:
            accounts.map(
              serializeAccount,
            ),

          count:
            accounts.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// GET SINGLE CUSTOMER ACCOUNT
// ============================================================

export const getCustomerAccount =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const accountId =
        assertRequired(
          req.params.accountId,
          "Account ID",
        );

      const account =
        await prisma.account.findUnique({
          where: {
            id: accountId,
          },

          include: {
            currency: true,

            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                status: true,

                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

      if (!account) {
        return res.status(404).json({
          success: false,
          message:
            "Account not found.",
        });
      }

      return res.status(200).json({
        success: true,

        data: {
          account:
            serializeAccount(
              account,
            ),

          customer:
            account.user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// CREDIT CUSTOMER ACCOUNT
// ============================================================
// Creates:
// - ADJUSTMENT Transaction
// - CREDIT LedgerEntry
// - balance update
// - availableBalance update
// - ledgerBalance update
// - AuditLog
//
// All operations occur in one database transaction.
// ============================================================

export const creditCustomerAccount =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const accountId =
        assertRequired(
          req.params.accountId,
          "Account ID",
        );

      const amount =
        assertPositiveAmount(
          req.body.amount,
        );

      const description =
        normalizeString(
          req.body.description,
        ) ||
        "Administrative account credit.";

      const result =
        await prisma.$transaction(
          async (tx) => {
            const account =
              await tx.account.findUnique({
                where: {
                  id: accountId,
                },
              });

            if (!account) {
              const error = new Error(
                "Account not found.",
              );

              error.statusCode = 404;

              throw error;
            }

            if (
              account.status !==
              "ACTIVE"
            ) {
              const error = new Error(
                "Only active accounts can be credited.",
              );

              error.statusCode = 400;

              throw error;
            }

            const balanceBefore =
              toDecimal(
                account.balance,
              );

            const availableBefore =
              toDecimal(
                account.availableBalance,
              );

            const ledgerBefore =
              toDecimal(
                account.ledgerBalance,
              );

            const balanceAfter =
              balanceBefore.add(
                amount,
              );

            const availableAfter =
              availableBefore.add(
                amount,
              );

            const ledgerAfter =
              ledgerBefore.add(
                amount,
              );

            const transaction =
              await tx.transaction.create({
                data: {
                  reference:
                    generateReference(
                      "ADJ",
                    ),

                  userId:
                    account.userId,

                  accountId:
                    account.id,

                  currencyId:
                    account.currencyId,

                  type:
                    "ADJUSTMENT",

                  status:
                    "COMPLETED",

                  amount,

                  fee: 0,

                  total:
                    amount,

                  description,

                  metadata: {
                    source:
                      "ADMIN",

                    operation:
                      "CREDIT",

                    adminId:
                      req.user.id,

                    accountId:
                      account.id,
                  },
                },
              });

            const ledgerEntry =
              await tx.ledgerEntry.create({
                data: {
                  accountId:
                    account.id,

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

            const updatedAccount =
              await tx.account.update({
                where: {
                  id:
                    account.id,
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
                  currency: true,
                },
              });

            await createAuditLog({
              tx,

              adminId:
                req.user.id,

              userId:
                account.userId,

              action:
                "DEPOSIT",

              entity:
                "Account",

              entityId:
                account.id,

              description:
                "Administrator credited customer account.",

              metadata: {
                transactionId:
                  transaction.id,

                transactionReference:
                  transaction.reference,

                ledgerEntryId:
                  ledgerEntry.id,

                amount:
                  amount.toString(),

                balanceBefore:
                  balanceBefore.toString(),

                balanceAfter:
                  balanceAfter.toString(),
              },

              ipAddress:
                req.ip,
            });

            return {
              account:
                updatedAccount,

              transaction,

              ledgerEntry,
            };
          },
          {
            isolationLevel:
              "Serializable",
          },
        );

      logger.info(
        "Customer account credited by administrator",
        {
          adminId:
            req.user.id,

          accountId,

          amount:
            amount.toString(),

          transactionId:
            result.transaction.id,
        },
      );

      return res.status(200).json({
        success: true,

        message:
          "Customer account credited successfully.",

        data: {
          account:
            serializeAccount(
              result.account,
            ),

          transaction: {
            id:
              result.transaction.id,

            reference:
              result.transaction.reference,

            type:
              result.transaction.type,

            status:
              result.transaction.status,

            amount:
              serializeMoney(
                result.transaction.amount,
              ),

            total:
              serializeMoney(
                result.transaction.total,
              ),

            createdAt:
              result.transaction.createdAt,
          },

          ledgerEntry: {
            id:
              result.ledgerEntry.id,

            type:
              result.ledgerEntry.type,

            amount:
              serializeMoney(
                result.ledgerEntry.amount,
              ),

            balanceBefore:
              serializeMoney(
                result.ledgerEntry.balanceBefore,
              ),

            balanceAfter:
              serializeMoney(
                result.ledgerEntry.balanceAfter,
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
// Enforces:
// available funds
// minimum balance
// active account
//
// Creates:
// - ADJUSTMENT Transaction
// - DEBIT LedgerEntry
// - account balance update
// - AuditLog
// ============================================================

export const debitCustomerAccount =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const accountId =
        assertRequired(
          req.params.accountId,
          "Account ID",
        );

      const amount =
        assertPositiveAmount(
          req.body.amount,
        );

      const description =
        normalizeString(
          req.body.description,
        ) ||
        "Administrative account debit.";

      const result =
        await prisma.$transaction(
          async (tx) => {
            const account =
              await tx.account.findUnique({
                where: {
                  id: accountId,
                },
              });

            if (!account) {
              const error = new Error(
                "Account not found.",
              );

              error.statusCode = 404;

              throw error;
            }

            if (
              account.status !==
              "ACTIVE"
            ) {
              const error = new Error(
                "Only active accounts can be debited.",
              );

              error.statusCode = 400;

              throw error;
            }

            const balanceBefore =
              toDecimal(
                account.balance,
              );

            const availableBefore =
              toDecimal(
                account.availableBalance,
              );

            const ledgerBefore =
              toDecimal(
                account.ledgerBalance,
              );

            const minimumBalance =
              toDecimal(
                account.minimumBalance,
              );

            if (
              availableBefore.lt(
                amount,
              )
            ) {
              const error = new Error(
                "Insufficient available account balance.",
              );

              error.statusCode = 400;

              throw error;
            }

            const balanceAfter =
              balanceBefore.sub(
                amount,
              );

            const availableAfter =
              availableBefore.sub(
                amount,
              );

            const ledgerAfter =
              ledgerBefore.sub(
                amount,
              );

            if (
              balanceAfter.lt(
                minimumBalance,
              )
            ) {
              const error = new Error(
                "Debit would reduce the account below its minimum balance requirement.",
              );

              error.statusCode = 400;

              throw error;
            }

            if (
              availableAfter.lt(
                minimumBalance,
              )
            ) {
              const error = new Error(
                "Debit would reduce the available balance below the minimum balance requirement.",
              );

              error.statusCode = 400;

              throw error;
            }

            if (
              ledgerAfter.lt(0)
            ) {
              const error = new Error(
                "Ledger balance cannot become negative.",
              );

              error.statusCode = 400;

              throw error;
            }

            const transaction =
              await tx.transaction.create({
                data: {
                  reference:
                    generateReference(
                      "ADJ",
                    ),

                  userId:
                    account.userId,

                  accountId:
                    account.id,

                  currencyId:
                    account.currencyId,

                  type:
                    "ADJUSTMENT",

                  status:
                    "COMPLETED",

                  amount,

                  fee: 0,

                  total:
                    amount,

                  description,

                  metadata: {
                    source:
                      "ADMIN",

                    operation:
                      "DEBIT",

                    adminId:
                      req.user.id,

                    accountId:
                      account.id,
                  },
                },
              });

            const ledgerEntry =
              await tx.ledgerEntry.create({
                data: {
                  accountId:
                    account.id,

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

            const updatedAccount =
              await tx.account.update({
                where: {
                  id:
                    account.id,
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
                  currency: true,
                },
              });

            await createAuditLog({
              tx,

              adminId:
                req.user.id,

              userId:
                account.userId,

              action:
                "WITHDRAWAL",

              entity:
                "Account",

              entityId:
                account.id,

              description:
                "Administrator debited customer account.",

              metadata: {
                transactionId:
                  transaction.id,

                transactionReference:
                  transaction.reference,

                ledgerEntryId:
                  ledgerEntry.id,

                amount:
                  amount.toString(),

                balanceBefore:
                  balanceBefore.toString(),

                balanceAfter:
                  balanceAfter.toString(),
              },

              ipAddress:
                req.ip,
            });

            return {
              account:
                updatedAccount,

              transaction,

              ledgerEntry,
            };
          },
          {
            isolationLevel:
              "Serializable",
          },
        );

      logger.info(
        "Customer account debited by administrator",
        {
          adminId:
            req.user.id,

          accountId,

          amount:
            amount.toString(),

          transactionId:
            result.transaction.id,
        },
      );

      return res.status(200).json({
        success: true,

        message:
          "Customer account debited successfully.",

        data: {
          account:
            serializeAccount(
              result.account,
            ),

          transaction: {
            id:
              result.transaction.id,

            reference:
              result.transaction.reference,

            type:
              result.transaction.type,

            status:
              result.transaction.status,

            amount:
              serializeMoney(
                result.transaction.amount,
              ),

            total:
              serializeMoney(
                result.transaction.total,
              ),

            createdAt:
              result.transaction.createdAt,
          },

          ledgerEntry: {
            id:
              result.ledgerEntry.id,

            type:
              result.ledgerEntry.type,

            amount:
              serializeMoney(
                result.ledgerEntry.amount,
              ),

            balanceBefore:
              serializeMoney(
                result.ledgerEntry.balanceBefore,
              ),

            balanceAfter:
              serializeMoney(
                result.ledgerEntry.balanceAfter,
              ),
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
          req.params.customerId,
          "Customer ID",
        );

      const status =
        normalizeString(
          req.body.status,
        ).toUpperCase();

      assertValidUserStatus(
        status,
      );

      const customer =
        await prisma.user.findFirst({
          where: {
            id:
              customerId,

            role:
              "CUSTOMER",
          },
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found.",
        });
      }

      if (
        customer.status ===
        status
      ) {
        return res.status(200).json({
          success: true,

          data: {
            customer:
              sanitizeUser(
                customer,
              ),
          },
        });
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const updatedUser =
              await tx.user.update({
                where: {
                  id:
                    customer.id,
                },

                data: {
                  status,
                },
              });

            await createAuditLog({
              tx,

              adminId:
                req.user.id,

              userId:
                customer.id,

              action:
                status ===
                "SUSPENDED"
                  ? "SUSPEND"
                  : status ===
                      "BLOCKED"
                    ? "BLOCK"
                    : status ===
                        "ACTIVE"
                      ? "UNBLOCK"
                      : "UPDATE",

              entity:
                "User",

              entityId:
                customer.id,

              description:
                "Administrator changed customer account status.",

              metadata: {
                previousStatus:
                  customer.status,

                newStatus:
                  status,
              },

              ipAddress:
                req.ip,
            });

            return updatedUser;
          },
        );

      logger.info(
        "Customer status updated by administrator",
        {
          adminId:
            req.user.id,

          customerId:
            customer.id,

          previousStatus:
            customer.status,

          newStatus:
            status,
        },
      );

      return res.status(200).json({
        success: true,

        message:
          "Customer status updated successfully.",

        data: {
          customer:
            sanitizeUser(
              result,
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
      const accountId =
        assertRequired(
          req.params.accountId,
          "Account ID",
        );

      const status =
        normalizeString(
          req.body.status,
        ).toUpperCase();

      assertValidAccountStatus(
        status,
      );

      const account =
        await prisma.account.findUnique({
          where: {
            id:
              accountId,
          },
        });

      if (!account) {
        return res.status(404).json({
          success: false,
          message:
            "Account not found.",
        });
      }

      if (
        account.status ===
        status
      ) {
        return res.status(200).json({
          success: true,

          data: {
            account:
              serializeAccount(
                await prisma.account.findUnique({
                  where: {
                    id:
                      account.id,
                  },

                  include: {
                    currency: true,
                  },
                }),
              ),
          },
        });
      }

      if (
        status ===
          "CLOSED" &&
        toDecimal(
          account.balance,
        ).gt(0)
      ) {
        const error = new Error(
          "An account with a positive balance cannot be closed.",
        );

        error.statusCode = 400;

        throw error;
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const updated =
              await tx.account.update({
                where: {
                  id:
                    account.id,
                },

                data: {
                  status,
                },

                include: {
                  currency: true,
                },
              });

            await createAuditLog({
              tx,

              adminId:
                req.user.id,

              userId:
                account.userId,

              action:
                status ===
                "FROZEN"
                  ? "BLOCK"
                  : status ===
                      "ACTIVE"
                    ? "UNBLOCK"
                    : "UPDATE",

              entity:
                "Account",

              entityId:
                account.id,

              description:
                "Administrator changed customer account status.",

              metadata: {
                previousStatus:
                  account.status,

                newStatus:
                  status,
              },

              ipAddress:
                req.ip,
            });

            return updated;
          },
        );

      logger.info(
        "Customer account status updated",
        {
          adminId:
            req.user.id,

          accountId:
            account.id,

          previousStatus:
            account.status,

          newStatus:
            status,
        },
      );

      return res.status(200).json({
        success: true,

        message:
          "Account status updated successfully.",

        data: {
          account:
            serializeAccount(
              result,
            ),
        },
      });
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// GET ADMIN DASHBOARD STATISTICS
// ============================================================

export const getAdminStatistics =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const [
        totalCustomers,
        activeCustomers,
        suspendedCustomers,
        blockedCustomers,
        totalAccounts,
        activeAccounts,
        frozenAccounts,
        pendingKyc,
        verifiedKyc,
        pendingWithdrawals,
        pendingDeposits,
        pendingLoans,
        openSupportTickets,
      ] =
        await prisma.$transaction([
          prisma.user.count({
            where: {
              role:
                "CUSTOMER",
            },
          }),

          prisma.user.count({
            where: {
              role:
                "CUSTOMER",

              status:
                "ACTIVE",
            },
          }),

          prisma.user.count({
            where: {
              role:
                "CUSTOMER",

              status:
                "SUSPENDED",
            },
          }),

          prisma.user.count({
            where: {
              role:
                "CUSTOMER",

              status:
                "BLOCKED",
            },
          }),

          prisma.account.count(),

          prisma.account.count({
            where: {
              status:
                "ACTIVE",
            },
          }),

          prisma.account.count({
            where: {
              status:
                "FROZEN",
            },
          }),

          prisma.kyc.count({
            where: {
              status:
                "PENDING",
            },
          }),

          prisma.kyc.count({
            where: {
              status:
                "VERIFIED",
            },
          }),

          prisma.withdrawal.count({
            where: {
              status:
                "PENDING",
            },
          }),

          prisma.deposit.count({
            where: {
              status:
                "PENDING",
            },
          }),

          prisma.loan.count({
            where: {
              status:
                "PENDING",
            },
          }),

          prisma.supportTicket.count({
            where: {
              status:
                "OPEN",
            },
          }),
        ]);

      return res.status(200).json({
        success: true,

        data: {
          customers: {
            total:
              totalCustomers,

            active:
              activeCustomers,

            suspended:
              suspendedCustomers,

            blocked:
              blockedCustomers,
          },

          accounts: {
            total:
              totalAccounts,

            active:
              activeAccounts,

            frozen:
              frozenAccounts,
          },

          kyc: {
            pending:
              pendingKyc,

            verified:
              verifiedKyc,
          },

          withdrawals: {
            pending:
              pendingWithdrawals,
          },

          deposits: {
            pending:
              pendingDeposits,
          },

          loans: {
            pending:
              pendingLoans,
          },

          support: {
            open:
              openSupportTickets,
          },
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
          req.params.customerId,
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

      const customer =
        await prisma.user.findFirst({
          where: {
            id:
              customerId,

            role:
              "CUSTOMER",
          },

          select: {
            id: true,
            email: true,
          },
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found.",
        });
      }

      const skip =
        (page - 1) *
        limit;

      const [
        transactions,
        total,
      ] =
        await prisma.$transaction([
          prisma.transaction.findMany({
            where: {
              userId:
                customerId,
            },

            orderBy: {
              createdAt:
                "desc",
            },

            skip,

            take: limit,

            include: {
              account: {
                select: {
                  id: true,
                  accountNumber:
                    true,
                },
              },

              currency: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  symbol: true,
                  decimals:
                    true,
                },
              },
            },
          }),

          prisma.transaction.count({
            where: {
              userId:
                customerId,
            },
          }),
        ]);

      const totalPages =
        Math.ceil(
          total / limit,
        );

      return res.status(200).json({
        success: true,

        data: {
          customer,

          transactions:
            transactions.map(
              (transaction) => ({
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
                  transaction.description,

                metadata:
                  transaction.metadata,

                account:
                  transaction.account,

                currency:
                  transaction.currency,

                createdAt:
                  transaction.createdAt,

                updatedAt:
                  transaction.updatedAt,
              }),
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
// GET ADMIN AUDIT LOGS
// ============================================================

export const getAdminAuditLogs =
  async (
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
        ) || 50;

      const limit = Math.min(
        Math.max(
          requestedLimit,
          1,
        ),
        100,
      );

      const skip =
        (page - 1) *
        limit;

      const [
        logs,
        total,
      ] =
        await prisma.$transaction([
          prisma.auditLog.findMany({
            where: {
              adminId: {
                not: null,
              },
            },

            orderBy: {
              createdAt:
                "desc",
            },

            skip,

            take: limit,

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
            },
          }),

          prisma.auditLog.count({
            where: {
              adminId: {
                not: null,
              },
            },
          }),
        ]);

      const totalPages =
        Math.ceil(
          total / limit,
        );

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
// EXPORT DEFAULT
// ============================================================

export default {
  listCustomers,
  getCustomer,
  createCustomer,
  getCustomerAccounts,
  getCustomerAccount,
  creditCustomerAccount,
  debitCustomerAccount,
  updateCustomerStatus,
  updateAccountStatus,
  getAdminStatistics,
  getCustomerTransactions,
  getAdminAuditLogs,
};
