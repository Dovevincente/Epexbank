import api from "./api.js";

/**
 * Epex Bank — Admin API service
 *
 * All methods return response.data so callers receive the
 * backend payload directly.
 *
 * Admin authentication/authorization is handled by the
 * backend. This service never stores admin credentials.
 */

const unwrap = (response) => response?.data ?? response;

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

/* =========================================================
   DASHBOARD / STATISTICS
========================================================= */

export const getAdminStatistics = async () => {
  const response = await api.get("/admin/statistics");

  return unwrap(response);
};

/* =========================================================
   CUSTOMERS
========================================================= */

export const getCustomers = async (params = {}) => {
  const response = await api.get(
    `/admin/customers${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const listCustomers = getCustomers;

export const getCustomer = async (userId) => {
  if (!userId) {
    throw new Error("Customer ID is required.");
  }

  const response = await api.get(
    `/admin/customers/${encodeURIComponent(userId)}`,
  );

  return unwrap(response);
};

export const createCustomer = async (customerData) => {
  if (!customerData || typeof customerData !== "object") {
    throw new Error("Customer information is required.");
  }

  const response = await api.post(
    "/admin/customers",
    customerData,
  );

  return unwrap(response);
};

export const updateCustomerStatus = async (
  userId,
  status,
) => {
  if (!userId) {
    throw new Error("Customer ID is required.");
  }

  if (!status) {
    throw new Error("Customer status is required.");
  }

  const response = await api.patch(
    `/admin/customers/${encodeURIComponent(userId)}/status`,
    { status },
  );

  return unwrap(response);
};

/* =========================================================
   CUSTOMER ACCOUNTS
========================================================= */

export const getCustomerAccounts = async (userId, params = {}) => {
  if (!userId) {
    throw new Error("Customer ID is required.");
  }

  const response = await api.get(
    `/admin/customers/${encodeURIComponent(userId)}/accounts${buildQuery(
      params,
    )}`,
  );

  return unwrap(response);
};

export const getCustomerAccount = async (
  userId,
  accountId,
) => {
  if (!userId) {
    throw new Error("Customer ID is required.");
  }

  if (!accountId) {
    throw new Error("Account ID is required.");
  }

  const response = await api.get(
    `/admin/customers/${encodeURIComponent(
      userId,
    )}/accounts/${encodeURIComponent(accountId)}`,
  );

  return unwrap(response);
};

export const updateAccountStatus = async (
  userId,
  accountId,
  status,
) => {
  if (!userId) {
    throw new Error("Customer ID is required.");
  }

  if (!accountId) {
    throw new Error("Account ID is required.");
  }

  if (!status) {
    throw new Error("Account status is required.");
  }

  const response = await api.patch(
    `/admin/customers/${encodeURIComponent(
      userId,
    )}/accounts/${encodeURIComponent(accountId)}/status`,
    { status },
  );

  return unwrap(response);
};

/* =========================================================
   ACCOUNT CREDIT / DEBIT
========================================================= */

export const creditCustomerAccount = async (
  userId,
  accountId,
  data,
) => {
  if (!userId) {
    throw new Error("Customer ID is required.");
  }

  if (!accountId) {
    throw new Error("Account ID is required.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Credit information is required.");
  }

  const response = await api.post(
    `/admin/customers/${encodeURIComponent(
      userId,
    )}/accounts/${encodeURIComponent(accountId)}/credit`,
    data,
  );

  return unwrap(response);
};

export const debitCustomerAccount = async (
  userId,
  accountId,
  data,
) => {
  if (!userId) {
    throw new Error("Customer ID is required.");
  }

  if (!accountId) {
    throw new Error("Account ID is required.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Debit information is required.");
  }

  const response = await api.post(
    `/admin/customers/${encodeURIComponent(
      userId,
    )}/accounts/${encodeURIComponent(accountId)}/debit`,
    data,
  );

  return unwrap(response);
};

/* =========================================================
   CUSTOMER TRANSACTIONS
========================================================= */

export const getCustomerTransactions = async (
  userId,
  params = {},
) => {
  if (!userId) {
    throw new Error("Customer ID is required.");
  }

  const response = await api.get(
    `/admin/customers/${encodeURIComponent(
      userId,
    )}/transactions${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* =========================================================
   AUDIT LOGS
========================================================= */

export const getAdminAuditLogs = async (params = {}) => {
  const response = await api.get(
    `/admin/audit-logs${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const getAuditLogs = getAdminAuditLogs;

/* =========================================================
   GENERIC ERROR HELPERS
========================================================= */

export const getAdminErrorMessage = (
  error,
  fallback = "Unable to complete the admin request.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getAdminStatistics,
  getCustomers,
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomerStatus,
  getCustomerAccounts,
  getCustomerAccount,
  updateAccountStatus,
  creditCustomerAccount,
  debitCustomerAccount,
  getCustomerTransactions,
  getAdminAuditLogs,
  getAuditLogs,
  getAdminErrorMessage,
};