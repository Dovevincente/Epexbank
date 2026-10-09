import crypto from "crypto";

import prisma from "../config/database.js";

import {
  hashPassword,
  comparePassword,
} from "../utils/password.js";

import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../utils/jwt.js";

import {
  AUTH,
  ACCOUNT,
} from "../utils/constants.js";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const createServiceError = (
  message,
  statusCode = 400,
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const {
    passwordHash,
    ...safeUser
  } = user;

  return safeUser;
};

const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

const normalizePhone = (phone) => {
  const value = String(phone || "").trim();

  return value || null;
};

const normalizeName = (value) => {
  return String(value || "").trim();
};

/*
 * ============================================================
 * ACCOUNT NUMBER
 * ============================================================
 */

const generateAccountNumber = async (tx) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const accountNumber = crypto
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

  throw createServiceError(
    "Unable to generate a unique account number. Please try again.",
    500,
  );
};

/*
 * ============================================================
 * REFRESH SESSION
 * ============================================================
 */

const createRefreshSession = async ({
  tx,
  userId,
  refreshToken,
  ipAddress,
  userAgent,
}) => {
  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      AUTH.REFRESH_TOKEN_DAYS,
  );

  return tx.securitySession.create({
    data: {
      userId,
      tokenHash:
        hashToken(refreshToken),
      ipAddress:
        ipAddress || null,
      userAgent:
        userAgent || null,
      expiresAt,
    },
  });
};

/*
 * ============================================================
 * REGISTER USER
 * ============================================================
 */

export const registerUser = async ({
  email,
  phone,
  password,
  firstName,
  lastName,
  country,
  ipAddress,
  userAgent,
}) => {
  /*
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  const normalizedEmail =
    normalizeEmail(email);

  const normalizedPhone =
    normalizePhone(phone);

  const normalizedFirstName =
    normalizeName(firstName);

  const normalizedLastName =
    normalizeName(lastName);

  const normalizedCountry =
    String(country || "").trim() || null;

  if (!normalizedEmail) {
    throw createServiceError(
      "Email address is required.",
      400,
    );
  }

  if (!normalizedFirstName) {
    throw createServiceError(
      "First name is required.",
      400,
    );
  }

  if (!normalizedLastName) {
    throw createServiceError(
      "Last name is required.",
      400,
    );
  }

  if (!password) {
    throw createServiceError(
      "Password is required.",
      400,
    );
  }

  if (String(password).length < 8) {
    throw createServiceError(
      "Password must be at least 8 characters long.",
      400,
    );
  }

  /*
   * ----------------------------------------------------------
   * CHECK EMAIL
   * ----------------------------------------------------------
   */

  const existingEmail =
    await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
      },
    });

  if (existingEmail) {
    throw createServiceError(
      "An account with this email address already exists.",
      409,
    );
  }

  /*
   * ----------------------------------------------------------
   * CHECK PHONE
   * ----------------------------------------------------------
   */

  if (normalizedPhone) {
    const existingPhone =
      await prisma.user.findUnique({
        where: {
          phone: normalizedPhone,
        },
        select: {
          id: true,
        },
      });

    if (existingPhone) {
      throw createServiceError(
        "An account with this phone number already exists.",
        409,
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * HASH PASSWORD
   * ----------------------------------------------------------
   */

  const passwordHash =
    await hashPassword(password);

  /*
   * ----------------------------------------------------------
   * REFRESH TOKEN
   * ----------------------------------------------------------
   */

  const refreshToken =
    generateRefreshToken();

  /*
   * ----------------------------------------------------------
   * CREATE EVERYTHING IN ONE TRANSACTION
   * ----------------------------------------------------------
   */

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
           * ------------------------------------------------
           * USER
           * ------------------------------------------------
           */

          const user =
            await tx.user.create({
              data: {
                email:
                  normalizedEmail,

                phone:
                  normalizedPhone,

                passwordHash,

                status: "ACTIVE",

                role: "CUSTOMER",
              },
            });

          /*
           * ------------------------------------------------
           * PROFILE
           * ------------------------------------------------
           */

          await tx.profile.create({
            data: {
              userId: user.id,

              firstName:
                normalizedFirstName,

              lastName:
                normalizedLastName,

              country:
                normalizedCountry,
            },
          });

          /*
           * ------------------------------------------------
           * KYC
           * ------------------------------------------------
           */

          await tx.kyc.create({
            data: {
              userId: user.id,

              status:
                "NOT_STARTED",
            },
          });

          /*
           * ------------------------------------------------
           * DEFAULT CURRENCY
           * ------------------------------------------------
           */

          const currency =
            await tx.currency.upsert({
              where: {
                code:
                  ACCOUNT.DEFAULT_CURRENCY,
              },

              update: {},

              create: {
                code:
                  ACCOUNT.DEFAULT_CURRENCY,

                name:
                  "US Dollar",

                symbol:
                  "$",

                decimals:
                  2,

                isActive:
                  true,
              },
            });

          /*
           * ------------------------------------------------
           * ACCOUNT NUMBER
           * ------------------------------------------------
           */

          const accountNumber =
            await generateAccountNumber(
              tx,
            );

          /*
           * ------------------------------------------------
           * BANK ACCOUNT
           * ------------------------------------------------
           */

          const account =
            await tx.account.create({
              data: {
                accountNumber,

                type:
                  ACCOUNT.DEFAULT_ACCOUNT_TYPE,

                status:
                  "ACTIVE",

                userId:
                  user.id,

                currencyId:
                  currency.id,

                balance:
                  0,

                availableBalance:
                  0,

                ledgerBalance:
                  0,
              },

              include: {
                currency: true,
              },
            });

          /*
           * ------------------------------------------------
           * WALLET
           * ------------------------------------------------
           */

          const wallet =
            await tx.wallet.create({
              data: {
                userId:
                  user.id,

                currencyId:
                  currency.id,

                type:
                  "FIAT",

                balance:
                  0,
              },

              include: {
                currency: true,
              },
            });

          /*
           * ------------------------------------------------
           * INVESTMENT ACCOUNT
           * ------------------------------------------------
           */

          const investmentAccount =
            await tx.investmentAccount.create({
              data: {
                userId:
                  user.id,

                cashBalance:
                  0,

                totalValue:
                  0,

                profitLoss:
                  0,
              },
            });

          /*
           * ------------------------------------------------
           * REFRESH SESSION
           * ------------------------------------------------
           */

          await createRefreshSession({
            tx,

            userId:
              user.id,

            refreshToken,

            ipAddress,

            userAgent,
          });

          /*
           * ------------------------------------------------
           * AUDIT LOG
           * ------------------------------------------------
           */

          await tx.auditLog.create({
            data: {
              userId:
                user.id,

              action:
                "CREATE",

              entity:
                "User",

              entityId:
                user.id,

              description:
                "Customer account created",

              ipAddress:
                ipAddress || null,
            },
          });

          /*
           * ------------------------------------------------
           * RETURN
           * ------------------------------------------------
           */

          return {
            user,

            account,

            wallet,

            investmentAccount,
          };
        },
      );

    /*
     * --------------------------------------------------------
     * ACCESS TOKEN
     * --------------------------------------------------------
     */

    const accessToken =
      generateAccessToken(
        result.user,
      );

    /*
     * --------------------------------------------------------
     * RESPONSE
     * --------------------------------------------------------
     */

    return {
      accessToken,

      refreshToken,

      user:
        sanitizeUser(
          result.user,
        ),

      account:
        result.account,

      wallet:
        result.wallet,
    };
  } catch (error) {
    /*
     * --------------------------------------------------------
     * PRISMA UNIQUE CONSTRAINT
     *
     * Handles a duplicate email/phone race condition where
     * another registration may have created the record after
     * the initial existence check.
     * --------------------------------------------------------
     */

    if (
      error?.code === "P2002"
    ) {
      const target =
        Array.isArray(
          error.meta?.target,
        )
          ? error.meta.target
          : [];

      if (
        target.includes("email")
      ) {
        throw createServiceError(
          "An account with this email address already exists.",
          409,
        );
      }

      if (
        target.includes("phone")
      ) {
        throw createServiceError(
          "An account with this phone number already exists.",
          409,
        );
      }

      if (
        target.includes(
          "accountNumber",
        )
      ) {
        throw createServiceError(
          "Unable to create a unique bank account number. Please try again.",
          500,
        );
      }

      throw createServiceError(
        "Some of the supplied account information is already in use.",
        409,
      );
    }

    /*
     * --------------------------------------------------------
     * PRESERVE KNOWN SERVICE ERRORS
     * --------------------------------------------------------
     */

    if (
      error?.statusCode
    ) {
      throw error;
    }

    /*
     * --------------------------------------------------------
     * DATABASE / UNKNOWN ERROR
     * --------------------------------------------------------
     *
     * Keep the real error available to the server logs while
     * returning a safe message to the API layer.
     * --------------------------------------------------------
     */

    console.error(
      "registerUser transaction failed:",
      error,
    );

    throw createServiceError(
      "Unable to create your account right now. Please try again.",
      500,
    );
  }
};

/*
 * ============================================================
 * LOGIN USER
 * ============================================================
 */

export const loginUser = async ({
  email,
  password,
  ipAddress,
  userAgent,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  if (!normalizedEmail) {
    throw createServiceError(
      "Email address is required.",
      400,
    );
  }

  if (!password) {
    throw createServiceError(
      "Password is required.",
      400,
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        email:
          normalizedEmail,
      },
    });

  if (!user) {
    throw createServiceError(
      "Invalid email or password.",
      401,
    );
  }

  const passwordMatches =
    await comparePassword(
      password,
      user.passwordHash,
    );

  if (!passwordMatches) {
    throw createServiceError(
      "Invalid email or password.",
      401,
    );
  }

  if (
    user.status ===
    "BLOCKED"
  ) {
    throw createServiceError(
      "This account is unavailable.",
      403,
    );
  }

  if (
    user.status ===
    "SUSPENDED"
  ) {
    throw createServiceError(
      "This account is unavailable.",
      403,
    );
  }

  if (
    user.status ===
    "CLOSED"
  ) {
    throw createServiceError(
      "This account is unavailable.",
      403,
    );
  }

  const refreshToken =
    generateRefreshToken();

  const result =
    await prisma.$transaction(
      async (tx) => {
        const updatedUser =
          await tx.user.update({
            where: {
              id:
                user.id,
            },

            data: {
              lastLoginAt:
                new Date(),
            },
          });

        await createRefreshSession({
          tx,

          userId:
            user.id,

          refreshToken,

          ipAddress,

          userAgent,
        });

        await tx.auditLog.create({
          data: {
            userId:
              user.id,

            action:
              "LOGIN",

            entity:
              "User",

            entityId:
              user.id,

            description:
              "Successful customer login",

            ipAddress:
              ipAddress || null,
          },
        });

        return updatedUser;
      },
    );

  const accessToken =
    generateAccessToken(
      result,
    );

  return {
    accessToken,

    refreshToken,

    user:
      sanitizeUser(
        result,
      ),
  };
};

/*
 * ============================================================
 * REFRESH ACCESS TOKEN
 * ============================================================
 */

export const refreshAccessToken =
  async (refreshToken) => {
    if (!refreshToken) {
      throw createServiceError(
        "Refresh token required.",
        401,
      );
    }

    const tokenHash =
      hashToken(
        refreshToken,
      );

    const session =
      await prisma.securitySession.findUnique(
        {
          where: {
            tokenHash,
          },

          include: {
            user: true,
          },
        },
      );

    if (!session) {
      throw createServiceError(
        "Invalid refresh session.",
        401,
      );
    }

    if (session.revokedAt) {
      throw createServiceError(
        "Refresh session has been revoked.",
        401,
      );
    }

    if (
      session.expiresAt <=
      new Date()
    ) {
      throw createServiceError(
        "Refresh session has expired.",
        401,
      );
    }

    if (
      session.user.status !==
      "ACTIVE"
    ) {
      throw createServiceError(
        "Account is not active.",
        403,
      );
    }

    const newRefreshToken =
      generateRefreshToken();

    const newTokenHash =
      hashToken(
        newRefreshToken,
      );

    const result =
      await prisma.$transaction(
        async (tx) => {
          await tx.securitySession.update({
            where: {
              id:
                session.id,
            },

            data: {
              revokedAt:
                new Date(),

              lastUsedAt:
                new Date(),
            },
          });

          await tx.securitySession.create({
            data: {
              userId:
                session.userId,

              tokenHash:
                newTokenHash,

              ipAddress:
                session.ipAddress,

              userAgent:
                session.userAgent,

              expiresAt:
                new Date(
                  Date.now() +
                    AUTH.REFRESH_TOKEN_DAYS *
                      24 *
                      60 *
                      60 *
                      1000,
                ),
            },
          });

          return session.user;
        },
      );

    const accessToken =
      generateAccessToken(
        result,
      );

    return {
      accessToken,

      refreshToken:
        newRefreshToken,

      user:
        sanitizeUser(
          result,
        ),
    };
  };

/*
 * ============================================================
 * LOGOUT USER
 * ============================================================
 */

export const logoutUser =
  async (refreshToken) => {
    if (!refreshToken) {
      return;
    }

    const tokenHash =
      hashToken(
        refreshToken,
      );

    await prisma.securitySession.updateMany(
      {
        where: {
          tokenHash,

          revokedAt:
            null,
        },

        data: {
          revokedAt:
            new Date(),
        },
      },
    );
  };