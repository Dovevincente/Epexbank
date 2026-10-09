import rateLimit from "express-rate-limit";

/*
 * ============================================================
 * STANDARD API RATE LIMITER
 * ============================================================
 *
 * Suitable for ordinary authenticated API operations.
 */

export const standardRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 120,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      success: false,
      message:
        "Too many requests. Please try again later.",
    },
  });

/*
 * ============================================================
 * AUTHENTICATION RATE LIMITER
 * ============================================================
 *
 * Protects login, registration and other authentication
 * endpoints against automated abuse.
 */

export const authRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 10,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    message: {
      success: false,
      message:
        "Too many authentication attempts. Please try again later.",
    },
  });

/*
 * ============================================================
 * FINANCIAL OPERATION RATE LIMITER
 * ============================================================
 *
 * Used for operations that can move or reserve money.
 */

export const financialRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 30,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      success: false,
      message:
        "Too many financial requests. Please try again later.",
    },
  });

/*
 * ============================================================
 * ADMIN OPERATION RATE LIMITER
 * ============================================================
 *
 * Adds another layer around sensitive administrative actions.
 */

export const adminRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 60,

    standardHeaders:
      "draft-7",

    legacyHeaders:
      false,

    message: {
      success: false,
      message:
        "Too many administrative requests. Please try again later.",
    },
  });

/*
 * ============================================================
 * EXPORT ALIASES
 * ============================================================
 */

export const apiRateLimiter =
  standardRateLimiter;

export const generalRateLimiter =
  standardRateLimiter;

export const transferRateLimiter =
  financialRateLimiter;

export const paymentRateLimiter =
  financialRateLimiter;

export const depositRateLimiter =
  financialRateLimiter;

export const withdrawalRateLimiter =
  financialRateLimiter;

export const loginRateLimiter =
  authRateLimiter;