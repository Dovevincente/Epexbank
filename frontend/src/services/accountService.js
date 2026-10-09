import api from "./api.js";

/*
 * ============================================================
 * GET CUSTOMER ACCOUNTS
 * ============================================================
 */

export const getUserAccounts = async () => {
  const response = await api.get("/accounts");

  return response.data;
};

/*
 * ============================================================
 * GET SINGLE ACCOUNT
 * ============================================================
 */

export const getAccount = async (accountId) => {
  if (!accountId) {
    throw new Error("Account ID is required");
  }

  const response = await api.get(
    `/accounts/${encodeURIComponent(accountId)}`,
  );

  return response.data;
};

/*
 * ============================================================
 * GET ACCOUNT BALANCE
 * ============================================================
 */

export const getAccountBalance = async (accountId) => {
  if (!accountId) {
    throw new Error("Account ID is required");
  }

  const response = await api.get(
    `/accounts/${encodeURIComponent(accountId)}/balance`,
  );

  return response.data;
};