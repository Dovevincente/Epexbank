/*
 * ============================================================
 * EPEX BANK LOGGER
 * ============================================================
 *
 * Centralized application logging utility.
 *
 * The logger intentionally uses the Node.js console APIs so it
 * has no additional runtime dependency and works consistently
 * in local development, Render, Docker, VPS environments, and
 * other Node.js hosting platforms.
 *
 * Do NOT log:
 * - Passwords
 * - OTP codes
 * - JWT tokens
 * - Card PINs
 * - Full card numbers
 * - Database passwords
 * - API secrets
 * - Private authentication credentials
 */

const normalizeError = (
  error,
) => {
  if (!error) {
    return null;
  }

  if (
    error instanceof Error
  ) {
    return {
      name:
        error.name,
      message:
        error.message,
      code:
        error.code,
      statusCode:
        error.statusCode,
      stack:
        process.env.NODE_ENV ===
        "development"
          ? error.stack
          : undefined,
    };
  }

  if (
    typeof error ===
    "object"
  ) {
    return {
      name:
        error.name,
      message:
        error.message,
      code:
        error.code,
      statusCode:
        error.statusCode,
    };
  }

  return {
    message:
      String(error),
  };
};

/*
 * ============================================================
 * SAFE SERIALIZATION
 * ============================================================
 */

const sanitizeMetadata = (
  metadata,
) => {
  if (
    metadata === null ||
    metadata === undefined
  ) {
    return undefined;
  }

  if (
    typeof metadata !==
    "object"
  ) {
    return metadata;
  }

  const sensitiveKeys =
    new Set([
      "password",
      "currentPassword",
      "newPassword",
      "confirmPassword",
      "token",
      "accessToken",
      "refreshToken",
      "jwt",
      "secret",
      "apiKey",
      "api_key",
      "authorization",
      "cookie",
      "otp",
      "otpCode",
      "verificationCode",
      "pin",
      "cardPin",
      "cvv",
      "cvc",
      "cardNumber",
      "fullCardNumber",
      "databaseUrl",
      "DATABASE_URL",
    ]);

  const sanitize = (
    value,
  ) => {
    if (
      Array.isArray(
        value,
      )
    ) {
      return value.map(
        sanitize,
      );
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {
      const result =
        {};

      for (const [
        key,
        childValue,
      ] of Object.entries(
        value,
      )) {
        if (
          sensitiveKeys.has(
            key,
          )
        ) {
          result[key] =
            "[REDACTED]";
          continue;
        }

        result[key] =
          sanitize(
            childValue,
          );
      }

      return result;
    }

    return value;
  };

  return sanitize(
    metadata,
  );
};

/*
 * ============================================================
 * BASE LOG
 * ============================================================
 */

const writeLog = (
  level,
  message,
  metadata,
) => {
  const timestamp =
    new Date().toISOString();

  const entry = {
    timestamp,
    level,
    service:
      "epex-bank-api",
    message,
  };

  const safeMetadata =
    sanitizeMetadata(
      metadata,
    );

  if (
    safeMetadata !==
    undefined
  ) {
    entry.metadata =
      safeMetadata;
  }

  if (
    process.env.NODE_ENV ===
    "development"
  ) {
    const prefix =
      `[${timestamp}] [${level.toUpperCase()}]`;

    if (
      safeMetadata !==
      undefined
    ) {
      console.log(
        prefix,
        message,
        safeMetadata,
      );
    } else {
      console.log(
        prefix,
        message,
      );
    }

    return;
  }

  console.log(
    JSON.stringify(
      entry,
    ),
  );
};

/*
 * ============================================================
 * INFO
 * ============================================================
 */

export const info = (
  message,
  metadata,
) => {
  writeLog(
    "info",
    message,
    metadata,
  );
};

/*
 * ============================================================
 * WARN
 * ============================================================
 */

export const warn = (
  message,
  metadata,
) => {
  writeLog(
    "warn",
    message,
    metadata,
  );
};

/*
 * ============================================================
 * DEBUG
 * ============================================================
 */

export const debug = (
  message,
  metadata,
) => {
  if (
    process.env.NODE_ENV !==
    "development"
  ) {
    return;
  }

  writeLog(
    "debug",
    message,
    metadata,
  );
};

/*
 * ============================================================
 * ERROR
 * ============================================================
 */

export const error = (
  message,
  exception,
  metadata,
) => {
  const normalizedError =
    normalizeError(
      exception,
    );

  const combinedMetadata =
    {
      ...(metadata || {}),
      ...(normalizedError
        ? {
            error:
              normalizedError,
          }
        : {}),
    };

  writeLog(
    "error",
    message,
    combinedMetadata,
  );
};

/*
 * ============================================================
 * SECURITY EVENT
 * ============================================================
 *
 * Used for security-sensitive events such as:
 * - Failed authentication
 * - Suspicious activity
 * - Account access events
 * - Permission failures
 *
 * Sensitive values are automatically redacted.
 */

export const security = (
  message,
  metadata,
) => {
  writeLog(
    "security",
    message,
    metadata,
  );
};

/*
 * ============================================================
 * AUDIT EVENT
 * ============================================================
 *
 * Application-level audit logging helper.
 *
 * This does not replace the database AuditLog model. It is
 * intended for operational logs while the database audit log
 * remains the authoritative persistent audit record.
 */

export const audit = (
  action,
  metadata,
) => {
  writeLog(
    "audit",
    action,
    metadata,
  );
};

/*
 * ============================================================
 * REQUEST LOGGING
 * ============================================================
 */

export const request = (
  req,
  metadata = {},
) => {
  if (!req) {
    return;
  }

  writeLog(
    "request",
    `${req.method} ${req.originalUrl || req.url}`,
    {
      requestId:
        req.id ||
        req.headers?.[
          "x-request-id"
        ],
      ip:
        req.ip,
      userId:
        req.user?.id,
      ...metadata,
    },
  );
};

/*
 * ============================================================
 * LOGGER OBJECT
 * ============================================================
 *
 * Allows either:
 *
 * import logger from "../utils/logger.js";
 *
 * or named imports:
 *
 * import { info, error } from "../utils/logger.js";
 */

const logger = {
  info,
  warn,
  debug,
  error,
  security,
  audit,
  request,
};

export default logger;