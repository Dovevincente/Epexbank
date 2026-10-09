// ============================================================
// EPEX BANK - GLOBAL ERROR HANDLER
// ============================================================

import { Prisma } from "@prisma/client";

// ============================================================
// NOT FOUND
// ============================================================

export const notFound = (
  req,
  res,
) => {
  return res.status(404).json({
    success: false,
    message: "Resource not found",
    path: req.originalUrl,
  });
};

// ============================================================
// HELPERS
// ============================================================

const isProduction =
  process.env.NODE_ENV === "production";

const getErrorMessage = (
  error,
) => {
  if (
    error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message.trim();
  }

  return "An unexpected server error occurred.";
};

const getPrismaMeta = (
  error,
) => {
  if (!error?.meta) {
    return null;
  }

  if (
    typeof error.meta !== "object"
  ) {
    return null;
  }

  return error.meta;
};

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

export const errorHandler = (
  error,
  req,
  res,
  next,
) => {
  /*
   * Express requires four parameters for an error middleware.
   * `next` is intentionally kept in the signature.
   */
  void next;

  const timestamp =
    new Date().toISOString();

  console.error(
    `[${timestamp}] ${req.method} ${req.originalUrl}`,
  );

  console.error(error);

  // ==========================================================
  // ALREADY-HANDLED APPLICATION ERROR
  // ==========================================================

  if (
    Number.isInteger(
      error?.statusCode,
    ) &&
    error.statusCode >= 400 &&
    error.statusCode < 600
  ) {
    return res.status(
      error.statusCode,
    ).json({
      success: false,
      message:
        getErrorMessage(error),
      ...(isProduction
        ? {}
        : {
            errorType:
              error?.constructor
                ?.name || "Error",
            code:
              error?.code || null,
          }),
    });
  }

  // ==========================================================
  // PRISMA KNOWN REQUEST ERRORS
  // ==========================================================

  if (
    error instanceof
    Prisma.PrismaClientKnownRequestError
  ) {
    switch (error.code) {
      // ------------------------------------------------------
      // UNIQUE CONSTRAINT
      // ------------------------------------------------------

      case "P2002":
        return res.status(409).json({
          success: false,
          message:
            "A record with the supplied information already exists.",
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // RECORD NOT FOUND
      // ------------------------------------------------------

      case "P2025":
        return res.status(404).json({
          success: false,
          message:
            "The requested record was not found.",
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // FOREIGN KEY
      // ------------------------------------------------------

      case "P2003":
        return res.status(409).json({
          success: false,
          message:
            "The requested operation references a record that does not exist or cannot be changed.",
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // NULL CONSTRAINT
      // ------------------------------------------------------

      case "P2011":
        return res.status(400).json({
          success: false,
          message:
            "A required database value was not supplied.",
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // MISSING REQUIRED VALUE
      // ------------------------------------------------------

      case "P2012":
        return res.status(400).json({
          success: false,
          message:
            "A required value is missing.",
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // REQUIRED ARGUMENT
      // ------------------------------------------------------

      case "P2013":
        return res.status(400).json({
          success: false,
          message:
            "A required database argument is missing.",
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // INVALID INPUT
      // ------------------------------------------------------

      case "P2006":
      case "P2007":
      case "P2019":
      case "P2020":
        return res.status(400).json({
          success: false,
          message:
            isProduction
              ? "The supplied data is invalid."
              : getErrorMessage(error),
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // DATABASE SCHEMA / COLUMN PROBLEMS
      // ------------------------------------------------------

      case "P2021":
      case "P2022":
      case "P2023":
        return res.status(500).json({
          success: false,
          message:
            isProduction
              ? "A database configuration error occurred."
              : getErrorMessage(error),
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // TRANSACTION FAILURE
      // ------------------------------------------------------

      case "P2028":
        return res.status(500).json({
          success: false,
          message:
            isProduction
              ? "The database transaction could not be completed."
              : getErrorMessage(error),
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // WRITE CONFLICT / DEADLOCK
      // ------------------------------------------------------

      case "P2034":
        return res.status(409).json({
          success: false,
          message:
            "The operation conflicted with another database operation. Please retry.",
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });

      // ------------------------------------------------------
      // DEFAULT KNOWN PRISMA ERROR
      // ------------------------------------------------------

      default:
        return res.status(500).json({
          success: false,
          message:
            isProduction
              ? "A database error occurred."
              : getErrorMessage(error),
          ...(isProduction
            ? {}
            : {
                code: error.code,
                meta:
                  getPrismaMeta(error),
              }),
        });
    }
  }

  // ==========================================================
  // PRISMA VALIDATION ERROR
  // ==========================================================

  if (
    error instanceof
    Prisma.PrismaClientValidationError
  ) {
    return res.status(400).json({
      success: false,
      message:
        isProduction
          ? "The supplied data is invalid."
          : getErrorMessage(error),
      ...(isProduction
        ? {}
        : {
            errorType:
              "PrismaClientValidationError",
          }),
    });
  }

  // ==========================================================
  // PRISMA INITIALIZATION ERROR
  // ==========================================================

  if (
    error instanceof
    Prisma.PrismaClientInitializationError
  ) {
    return res.status(503).json({
      success: false,
      message:
        isProduction
          ? "The database service is temporarily unavailable."
          : getErrorMessage(error),
      ...(isProduction
        ? {}
        : {
            errorType:
              "PrismaClientInitializationError",
            errorCode:
              error.errorCode || null,
          }),
    });
  }

  // ==========================================================
  // PRISMA UNKNOWN REQUEST ERROR
  // ==========================================================

  if (
    error instanceof
    Prisma.PrismaClientUnknownRequestError
  ) {
    return res.status(500).json({
      success: false,
      message:
        isProduction
          ? "An unexpected database error occurred."
          : getErrorMessage(error),
      ...(isProduction
        ? {}
        : {
            errorType:
              "PrismaClientUnknownRequestError",
          }),
    });
  }

  // ==========================================================
  // JSON BODY PARSING ERROR
  // ==========================================================

  if (
    error instanceof SyntaxError &&
    error?.status === 400 &&
    error?.type ===
      "entity.parse.failed"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "The request body contains invalid JSON.",
    });
  }

  // ==========================================================
  // GENERIC APPLICATION ERROR
  // ==========================================================

  return res.status(
    Number.isInteger(
      error?.status,
    )
      ? error.status
      : 500,
  ).json({
    success: false,
    message:
      isProduction
        ? "An unexpected server error occurred."
        : getErrorMessage(error),
    ...(isProduction
      ? {}
      : {
          errorType:
            error?.constructor
              ?.name || "Error",
          code:
            error?.code || null,
        }),
  });
};