import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../services/api.js";

const useAccounts = (options = {}) => {
  const {
    autoFetch = true,
    enabled = true,
  } = options;

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(Boolean(autoFetch && enabled));
  const [error, setError] = useState("");

  const fetchAccounts = useCallback(async () => {
    if (!enabled) {
      setAccounts([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/accounts");

      const data = response?.data;

      let nextAccounts = [];

      if (Array.isArray(data)) {
        nextAccounts = data;
      } else if (Array.isArray(data?.accounts)) {
        nextAccounts = data.accounts;
      } else if (Array.isArray(data?.data)) {
        nextAccounts = data.data;
      } else if (Array.isArray(data?.data?.accounts)) {
        nextAccounts = data.data.accounts;
      }

      setAccounts(nextAccounts);

      return nextAccounts;
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Unable to load your accounts.";

      setError(message);
      setAccounts([]);

      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const refresh = useCallback(async () => {
    return fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!autoFetch || !enabled) {
      setLoading(false);
      return;
    }

    fetchAccounts().catch(() => {
      // The error is already stored in state.
    });
  }, [autoFetch, enabled, fetchAccounts]);

  const primaryAccount = useMemo(() => {
    if (!accounts.length) {
      return null;
    }

    return (
      accounts.find(
        (account) =>
          String(account?.status ?? "").toUpperCase() === "ACTIVE",
      ) || accounts[0]
    );
  }, [accounts]);

  const totalAvailableBalance = useMemo(() => {
    return accounts.reduce((total, account) => {
      const balance = Number(account?.availableBalance ?? 0);

      return total + (Number.isFinite(balance) ? balance : 0);
    }, 0);
  }, [accounts]);

  const totalLedgerBalance = useMemo(() => {
    return accounts.reduce((total, account) => {
      const balance = Number(account?.ledgerBalance ?? 0);

      return total + (Number.isFinite(balance) ? balance : 0);
    }, 0);
  }, [accounts]);

  const getAccountById = useCallback(
    (accountId) => {
      if (!accountId) {
        return null;
      }

      return (
        accounts.find(
          (account) => String(account?.id) === String(accountId),
        ) || null
      );
    },
    [accounts],
  );

  const getAccountByNumber = useCallback(
    (accountNumber) => {
      if (!accountNumber) {
        return null;
      }

      return (
        accounts.find(
          (account) =>
            String(account?.accountNumber) === String(accountNumber),
        ) || null
      );
    },
    [accounts],
  );

  const clearAccounts = useCallback(() => {
    setAccounts([]);
    setError("");
  }, []);

  return {
    accounts,
    primaryAccount,

    loading,
    error,

    totalAvailableBalance,
    totalLedgerBalance,

    fetchAccounts,
    refresh,

    getAccountById,
    getAccountByNumber,

    clearAccounts,

    hasAccounts: accounts.length > 0,
  };
};

export default useAccounts;