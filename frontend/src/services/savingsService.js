import api from "./api.js";

/*
 * ============================================================
 * SAVINGS SERVICE
 * ============================================================
 *
 * Centralized API access for Epex Bank savings functionality.
 *
 * No balances are fabricated or changed locally. All financial
 * mutations must be confirmed by the backend.
 */

/* ============================================================
   INTERNAL HELPERS
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

const requirePayload = (
  payload,
  name = "Savings data",
) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(`${name} is required.`);
  }

  return payload;
};

/* ============================================================
   ERROR HANDLING
============================================================ */

export const getSavingsErrorMessage = (
  error,
  fallback = "Unable to complete the savings request.",
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
   SAVINGS ACCOUNTS
============================================================ */

/**
 * GET /api/savings
 *
 * List savings accounts/products belonging to the customer.
 */
export const getSavings = async (params = {}) => {
  const response = await api.get(
    `/savings${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const listSavings = getSavings;

/**
 * GET /api/savings/:savingsId
 */
export const getSavingsAccount = async (
  savingsId,
) => {
  requireId(savingsId, "Savings ID");

  const response = await api.get(
    `/savings/${encodeURIComponent(savingsId)}`,
  );

  return unwrap(response);
};

/**
 * Alias used by detail pages.
 */
export const getSavingsDetails = getSavingsAccount;

/**
 * POST /api/savings
 *
 * Open/create a savings product.
 */
export const createSavings = async (payload) => {
  requirePayload(payload);

  const response = await api.post(
    "/savings",
    payload,
  );

  return unwrap(response);
};

/**
 * Alias for savings application pages.
 */
export const openSavings = createSavings;

/**
 * PATCH /api/savings/:savingsId
 *
 * Update eligible savings settings.
 */
export const updateSavings = async (
  savingsId,
  payload,
) => {
  requireId(savingsId, "Savings ID");
  requirePayload(payload);

  const response = await api.patch(
    `/savings/${encodeURIComponent(savingsId)}`,
    payload,
  );

  return unwrap(response);
};

/* ============================================================
   SAVINGS CONTRIBUTIONS
============================================================ */

/**
 * POST /api/savings/:savingsId/deposit
 *
 * Add funds to an eligible savings product.
 */
export const depositToSavings = async (
  savingsId,
  payload,
) => {
  requireId(savingsId, "Savings ID");
  requirePayload(payload, "Savings deposit data");

  const response = await api.post(
    `/savings/${encodeURIComponent(savingsId)}/deposit`,
    payload,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const fundSavings = depositToSavings;

/**
 * POST /api/savings/:savingsId/withdraw
 *
 * Withdraw from an eligible savings product.
 */
export const withdrawFromSavings = async (
  savingsId,
  payload,
) => {
  requireId(savingsId, "Savings ID");
  requirePayload(payload, "Savings withdrawal data");

  const response = await api.post(
    `/savings/${encodeURIComponent(savingsId)}/withdraw`,
    payload,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const withdrawSavings = withdrawFromSavings;

/* ============================================================
   SAVINGS HISTORY
============================================================ */

/**
 * GET /api/savings/:savingsId/history
 */
export const getSavingsHistory = async (
  savingsId,
  params = {},
) => {
  requireId(savingsId, "Savings ID");

  const response = await api.get(
    `/savings/${encodeURIComponent(savingsId)}/history${buildQuery(
      params,
    )}`,
  );

  return unwrap(response);
};

/**
 * GET /api/savings/:savingsId/transactions
 */
export const getSavingsTransactions = async (
  savingsId,
  params = {},
) => {
  requireId(savingsId, "Savings ID");

  const response = await api.get(
    `/savings/${encodeURIComponent(
      savingsId,
    )}/transactions${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * GET /api/savings/:savingsId/interest
 *
 * Retrieve interest information calculated by the backend.
 */
export const getSavingsInterest = async (
  savingsId,
  params = {},
) => {
  requireId(savingsId, "Savings ID");

  const response = await api.get(
    `/savings/${encodeURIComponent(
      savingsId,
    )}/interest${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* ============================================================
   SAVINGS ACTIONS
============================================================ */

/**
 * POST /api/savings/:savingsId/close
 */
export const closeSavings = async (savingsId) => {
  requireId(savingsId, "Savings ID");

  const response = await api.post(
    `/savings/${encodeURIComponent(savingsId)}/close`,
  );

  return unwrap(response);
};

/**
 * POST /api/savings/:savingsId/freeze
 */
export const freezeSavings = async (savingsId) => {
  requireId(savingsId, "Savings ID");

  const response = await api.post(
    `/savings/${encodeURIComponent(savingsId)}/freeze`,
  );

  return unwrap(response);
};

/**
 * POST /api/savings/:savingsId/unfreeze
 */
export const unfreezeSavings = async (savingsId) => {
  requireId(savingsId, "Savings ID");

  const response = await api.post(
    `/savings/${encodeURIComponent(savingsId)}/unfreeze`,
  );

  return unwrap(response);
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

const savingsService = {
  getSavings,
  listSavings,
  getSavingsAccount,
  getSavingsDetails,
  createSavings,
  openSavings,
  updateSavings,
  depositToSavings,
  fundSavings,
  withdrawFromSavings,
  withdrawSavings,
  getSavingsHistory,
  getSavingsTransactions,
  getSavingsInterest,
  closeSavings,
  freezeSavings,
  unfreezeSavings,
  getSavingsErrorMessage,
};

export default savingsService;