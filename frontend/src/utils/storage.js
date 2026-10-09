
/**
 * Epex Bank frontend storage utilities.
 *
 * Centralizes browser storage access so components and services do not
 * directly depend on localStorage/sessionStorage.
 *
 * Notes:
 * - Access tokens should preferably remain in secure HttpOnly cookies
 *   when the backend is configured for that architecture.
 * - Do not store passwords, PINs, OTPs, CVVs, recovery codes, or other
 *   sensitive authentication secrets in browser storage.
 */

const STORAGE_PREFIX = "epexbank:";

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const getStorage = (storageType = "local") => {
  if (!isBrowser()) {
    return null;
  }

  try {
    return storageType === "session"
      ? window.sessionStorage
      : window.localStorage;
  } catch {
    return null;
  }
};

const buildKey = (key) => {
  if (typeof key !== "string" || !key.trim()) {
    throw new TypeError("Storage key must be a non-empty string.");
  }

  return `${STORAGE_PREFIX}${key.trim()}`;
};

/**
 * Store a value in localStorage.
 *
 * Objects and arrays are serialized as JSON.
 * Strings, numbers, booleans and null are also safely serialized.
 */
export const setItem = (key, value) => {
  const storage = getStorage("local");

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(buildKey(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/**
 * Read a value from localStorage.
 *
 * Returns the supplied fallback when the key does not exist or the
 * stored value cannot be parsed.
 */
export const getItem = (key, fallback = null) => {
  const storage = getStorage("local");

  if (!storage) {
    return fallback;
  }

  try {
    const rawValue = storage.getItem(buildKey(key));

    if (rawValue === null) {
      return fallback;
    }

    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
};

/**
 * Remove a value from localStorage.
 */
export const removeItem = (key) => {
  const storage = getStorage("local");

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(buildKey(key));
    return true;
  } catch {
    return false;
  }
};

/**
 * Check whether a localStorage key exists.
 */
export const hasItem = (key) => {
  const storage = getStorage("local");

  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(buildKey(key)) !== null;
  } catch {
    return false;
  }
};

/**
 * Remove all Epex Bank localStorage values.
 *
 * This only removes keys created through this utility and does not
 * clear unrelated applications' storage.
 */
export const clear = () => {
  const storage = getStorage("local");

  if (!storage) {
    return false;
  }

  try {
    const keysToRemove = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));

    return true;
  } catch {
    return false;
  }
};

/**
 * Store a value in sessionStorage.
 *
 * Session values disappear when the browser session ends.
 */
export const setSessionItem = (key, value) => {
  const storage = getStorage("session");

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(buildKey(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/**
 * Read a value from sessionStorage.
 */
export const getSessionItem = (key, fallback = null) => {
  const storage = getStorage("session");

  if (!storage) {
    return fallback;
  }

  try {
    const rawValue = storage.getItem(buildKey(key));

    if (rawValue === null) {
      return fallback;
    }

    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
};

/**
 * Remove a sessionStorage value.
 */
export const removeSessionItem = (key) => {
  const storage = getStorage("session");

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(buildKey(key));
    return true;
  } catch {
    return false;
  }
};

/**
 * Check whether a sessionStorage key exists.
 */
export const hasSessionItem = (key) => {
  const storage = getStorage("session");

  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(buildKey(key)) !== null;
  } catch {
    return false;
  }
};

/**
 * Remove all Epex Bank sessionStorage values.
 */
export const clearSession = () => {
  const storage = getStorage("session");

  if (!storage) {
    return false;
  }

  try {
    const keysToRemove = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));

    return true;
  } catch {
    return false;
  }
};

/**
 * Storage keys used by the Epex Bank frontend.
 *
 * Keep these centralized so components do not create inconsistent
 * key names.
 */
export const STORAGE_KEYS = Object.freeze({
  PREFERENCES: "preferences",
  THEME: "theme",
  LANGUAGE: "language",
  CURRENCY: "currency",
  SIDEBAR_STATE: "sidebar-state",
  LAST_ACCOUNT_ID: "last-account-id",
  LAST_WALLET_ID: "last-wallet-id",
  LAST_TRANSACTION_ID: "last-transaction-id",
  LAST_TRANSFER_ID: "last-transfer-id",
  LAST_BENEFICIARY_ID: "last-beneficiary-id",
  LAST_NOTIFICATION_READ_AT: "last-notification-read-at",
});

/**
 * Convenience helpers for common Epex Bank preferences.
 */

export const getPreferences = () =>
  getItem(STORAGE_KEYS.PREFERENCES, {});

export const setPreferences = (preferences) => {
  if (
    !preferences ||
    typeof preferences !== "object" ||
    Array.isArray(preferences)
  ) {
    return false;
  }

  return setItem(STORAGE_KEYS.PREFERENCES, preferences);
};

export const getTheme = () =>
  getItem(STORAGE_KEYS.THEME, "system");

export const setTheme = (theme) =>
  setItem(STORAGE_KEYS.THEME, theme);

export const getLanguage = () =>
  getItem(STORAGE_KEYS.LANGUAGE, "en");

export const setLanguage = (language) =>
  setItem(STORAGE_KEYS.LANGUAGE, language);

export const getCurrency = () =>
  getItem(STORAGE_KEYS.CURRENCY, "USD");

export const setCurrency = (currency) =>
  setItem(STORAGE_KEYS.CURRENCY, currency);

/**
 * Persist the last selected account locally.
 */
export const setLastAccountId = (accountId) =>
  setItem(STORAGE_KEYS.LAST_ACCOUNT_ID, accountId);

export const getLastAccountId = () =>
  getItem(STORAGE_KEYS.LAST_ACCOUNT_ID, null);

/**
 * Persist the last selected wallet locally.
 */
export const setLastWalletId = (walletId) =>
  setItem(STORAGE_KEYS.LAST_WALLET_ID, walletId);

export const getLastWalletId = () =>
  getItem(STORAGE_KEYS.LAST_WALLET_ID, null);

/**
 * Persist navigation context for useful return flows.
 */
export const setLastTransactionId = (transactionId) =>
  setItem(STORAGE_KEYS.LAST_TRANSACTION_ID, transactionId);

export const getLastTransactionId = () =>
  getItem(STORAGE_KEYS.LAST_TRANSACTION_ID, null);

export const setLastTransferId = (transferId) =>
  setItem(STORAGE_KEYS.LAST_TRANSFER_ID, transferId);

export const getLastTransferId = () =>
  getItem(STORAGE_KEYS.LAST_TRANSFER_ID, null);

export const setLastBeneficiaryId = (beneficiaryId) =>
  setItem(STORAGE_KEYS.LAST_BENEFICIARY_ID, beneficiaryId);

export const getLastBeneficiaryId = () =>
  getItem(STORAGE_KEYS.LAST_BENEFICIARY_ID, null);

/**
 * Persist the timestamp of the latest notification read action.
 */
export const setLastNotificationReadAt = (timestamp) =>
  setItem(STORAGE_KEYS.LAST_NOTIFICATION_READ_AT, timestamp);

export const getLastNotificationReadAt = () =>
  getItem(STORAGE_KEYS.LAST_NOTIFICATION_READ_AT, null);

const storage = Object.freeze({
  setItem,
  getItem,
  removeItem,
  hasItem,
  clear,

  setSessionItem,
  getSessionItem,
  removeSessionItem,
  hasSessionItem,
  clearSession,

  getPreferences,
  setPreferences,

  getTheme,
  setTheme,

  getLanguage,
  setLanguage,

  getCurrency,
  setCurrency,

  setLastAccountId,
  getLastAccountId,

  setLastWalletId,
  getLastWalletId,

  setLastTransactionId,
  getLastTransactionId,

  setLastTransferId,
  getLastTransferId,

  setLastBeneficiaryId,
  getLastBeneficiaryId,

  setLastNotificationReadAt,
  getLastNotificationReadAt,

  STORAGE_KEYS,
});

export default storage;