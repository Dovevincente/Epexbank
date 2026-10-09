import api from "./api.js";

/*
 * ============================================================
 * EPEX BANK — STATEMENT SERVICE
 * ============================================================
 *
 * Centralized API access for account statements.
 *
 * Statements should be generated from authoritative account and
 * transaction records on the backend. This service never creates
 * statement data locally.
 */

/* ============================================================
   HELPERS
============================================================ */

const unwrap = (response) => {
  return response?.data ?? response;
};

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (
          item !== undefined &&
          item !== null &&
          item !== ""
        ) {
          searchParams.append(key, String(item));
        }
      });

      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

const requireId = (value, name) => {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

/* ============================================================
   ERROR HANDLING
============================================================ */

export const getStatementErrorMessage = (
  error,
  fallback = "Unable to load the account statement.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
};

/* ============================================================
   STATEMENTS
============================================================ */

/**
 * GET /api/statements
 *
 * Retrieve statements available to the authenticated customer.
 */
export const getStatements = async (params = {}) => {
  const response = await api.get(
    `/statements${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const listStatements = getStatements;

/**
 * GET /api/statements/:statementId
 */
export const getStatement = async (statementId) => {
  requireId(statementId, "Statement ID");

  const response = await api.get(
    `/statements/${encodeURIComponent(statementId)}`,
  );

  return unwrap(response);
};

/**
 * GET /api/accounts/:accountId/statement
 *
 * Retrieve a statement for one account.
 */
export const getAccountStatement = async (
  accountId,
  params = {},
) => {
  requireId(accountId, "Account ID");

  const response = await api.get(
    `/accounts/${encodeURIComponent(
      accountId,
    )}/statement${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias used by account statement pages.
 */
export const getStatementByAccount = getAccountStatement;

/**
 * GET /api/accounts/:accountId/statement/summary
 */
export const getAccountStatementSummary = async (
  accountId,
  params = {},
) => {
  requireId(accountId, "Account ID");

  const response = await api.get(
    `/accounts/${encodeURIComponent(
      accountId,
    )}/statement/summary${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* ============================================================
   STATEMENT GENERATION / EXPORT
============================================================ */

/**
 * POST /api/statements
 *
 * Request generation of a statement.
 *
 * Example payload:
 * {
 *   accountId,
 *   fromDate,
 *   toDate,
 *   format
 * }
 */
export const generateStatement = async (
  payload,
) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error("Statement data is required.");
  }

  const response = await api.post(
    "/statements",
    payload,
  );

  return unwrap(response);
};

/**
 * POST /api/accounts/:accountId/statement/generate
 */
export const generateAccountStatement = async (
  accountId,
  payload = {},
) => {
  requireId(accountId, "Account ID");

  const response = await api.post(
    `/accounts/${encodeURIComponent(
      accountId,
    )}/statement/generate`,
    payload,
  );

  return unwrap(response);
};

/**
 * GET /api/statements/:statementId/download
 *
 * The backend may return a file, signed URL, or statement
 * metadata depending on the configured document system.
 */
export const downloadStatement = async (
  statementId,
  params = {},
) => {
  requireId(statementId, "Statement ID");

  const response = await api.get(
    `/statements/${encodeURIComponent(
      statementId,
    )}/download${buildQuery(params)}`,
    {
      responseType: "blob",
    },
  );

  return response;
};

/**
 * GET /api/accounts/:accountId/statement/download
 */
export const downloadAccountStatement = async (
  accountId,
  params = {},
) => {
  requireId(accountId, "Account ID");

  const response = await api.get(
    `/accounts/${encodeURIComponent(
      accountId,
    )}/statement/download${buildQuery(params)}`,
    {
      responseType: "blob",
    },
  );

  return response;
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

const statementService = {
  getStatements,
  listStatements,
  getStatement,
  getAccountStatement,
  getStatementByAccount,
  getAccountStatementSummary,
  generateStatement,
  generateAccountStatement,
  downloadStatement,
  downloadAccountStatement,
  getStatementErrorMessage,
};

export default statementService;