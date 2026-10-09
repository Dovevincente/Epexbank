import api from "./api.js";

/*
 * ============================================================
 * EPEX BANK — WALLET SERVICE
 * ============================================================
 *
 * Centralized customer wallet API access.
 *
 * IMPORTANT:
 * The current backend wallet system is separate from the
 * Account/LedgerEntry system. This frontend service therefore
 * never pretends that a wallet mutation is an account-ledger
 * transaction.
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

const requirePayload = (
  payload,
  name = "Wallet data",
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

export const getWalletErrorMessage = (
  error,
  fallback = "Unable to complete the wallet request.",
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
   WALLETS
============================================================ */

/**
 * GET /api/wallets
 *
 * Retrieve wallets belonging to the authenticated user.
 */
export const getWallets = async (params = {}) => {
  const response = await api.get(
    `/wallets${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const listWallets = getWallets;

/**
 * GET /api/wallets/:walletId
 */
export const getWallet = async (walletId) => {
  requireId(walletId, "Wallet ID");

  const response = await api.get(
    `/wallets/${encodeURIComponent(walletId)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const getWalletDetails = getWallet;

/**
 * POST /api/wallets
 *
 * Create a wallet where the backend permits customer wallet
 * creation.
 */
export const createWallet = async (payload) => {
  requirePayload(payload);

  const response = await api.post(
    "/wallets",
    payload,
  );

  return unwrap(response);
};

/* ============================================================
   WALLET STATUS
============================================================ */

/**
 * PATCH /api/wallets/:walletId/status
 */
export const updateWalletStatus = async (
  walletId,
  payload,
) => {
  requireId(walletId, "Wallet ID");
  requirePayload(payload, "Wallet status data");

  const response = await api.patch(
    `/wallets/${encodeURIComponent(
      walletId,
    )}/status`,
    payload,
  );

  return unwrap(response);
};

/**
 * Activate wallet.
 */
export const activateWallet = async (walletId) => {
  requireId(walletId, "Wallet ID");

  return updateWalletStatus(walletId, {
    isActive: true,
  });
};

/**
 * Deactivate wallet.
 */
export const deactivateWallet = async (
  walletId,
) => {
  requireId(walletId, "Wallet ID");

  return updateWalletStatus(walletId, {
    isActive: false,
  });
};

/* ============================================================
   WALLET BALANCE
============================================================ */

/**
 * GET /api/wallets/:walletId/balance
 */
export const getWalletBalance = async (walletId) => {
  requireId(walletId, "Wallet ID");

  const response = await api.get(
    `/wallets/${encodeURIComponent(
      walletId,
    )}/balance`,
  );

  return unwrap(response);
};

/* ============================================================
   WALLET CREDIT
============================================================ */

/**
 * POST /api/wallets/:walletId/credit
 *
 * Credit a wallet only where the authenticated backend endpoint
 * explicitly permits this operation.
 */
export const creditWallet = async (
  walletId,
  payload,
) => {
  requireId(walletId, "Wallet ID");
  requirePayload(payload, "Wallet credit data");

  const response = await api.post(
    `/wallets/${encodeURIComponent(
      walletId,
    )}/credit`,
    payload,
  );

  return unwrap(response);
};

/* ============================================================
   WALLET DEBIT
============================================================ */

/**
 * POST /api/wallets/:walletId/debit
 */
export const debitWallet = async (
  walletId,
  payload,
) => {
  requireId(walletId, "Wallet ID");
  requirePayload(payload, "Wallet debit data");

  const response = await api.post(
    `/wallets/${encodeURIComponent(
      walletId,
    )}/debit`,
    payload,
  );

  return unwrap(response);
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

const walletService = {
  getWallets,
  listWallets,

  getWallet,
  getWalletDetails,

  createWallet,

  updateWalletStatus,
  activateWallet,
  deactivateWallet,

  getWalletBalance,

  creditWallet,
  debitWallet,

  getWalletErrorMessage,
};

export default walletService;