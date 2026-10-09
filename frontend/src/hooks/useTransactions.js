import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api.js";

const extractTransactions = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.transactions)) {
    return payload.transactions;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.transactions)) {
    return payload.data.transactions;
  }

  return [];
};

const extractPagination = (payload) => {
  const pagination =
    payload?.pagination ||
    payload?.data?.pagination ||
    null;

  if (!pagination) {
    return null;
  }

  return {
    page: Number(pagination.page) || 1,
    pageSize:
      Number(pagination.pageSize ?? pagination.limit) || 20,
    total:
      Number(
        pagination.total ??
          pagination.totalItems ??
          pagination.count,
      ) || 0,
    totalPages:
      Number(pagination.totalPages) ||
      Math.max(
        1,
        Math.ceil(
          Number(
            pagination.total ??
              pagination.totalItems ??
              pagination.count,
          ) / Number(pagination.pageSize ?? pagination.limit ?? 20),
        ),
      ),
  };
};

const useTransactions = (options = {}) => {
  const {
    accountId = "",
    autoFetch = true,
    enabled = true,
    page = 1,
    pageSize = 20,
    search = "",
    type = "",
    status = "",
    direction = "",
    fromDate = "",
    toDate = "",
    endpoint = "/transactions",
  } = options;

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page,
    pageSize,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(Boolean(autoFetch && enabled));
  const [error, setError] = useState("");

  const requestControllerRef = useRef(null);

  const fetchTransactions = useCallback(
    async (overrides = {}) => {
      if (!enabled) {
        setTransactions([]);
        setLoading(false);

        return [];
      }

      requestControllerRef.current?.abort();

      const controller = new AbortController();
      requestControllerRef.current = controller;

      setLoading(true);
      setError("");

      const params = {
        page: overrides.page ?? page,
        pageSize: overrides.pageSize ?? pageSize,
      };

      const resolvedAccountId =
        overrides.accountId ?? accountId;

      const resolvedSearch =
        overrides.search ?? search;

      const resolvedType = overrides.type ?? type;
      const resolvedStatus = overrides.status ?? status;
      const resolvedDirection =
        overrides.direction ?? direction;

      const resolvedFromDate =
        overrides.fromDate ?? fromDate;

      const resolvedToDate =
        overrides.toDate ?? toDate;

      if (resolvedAccountId) {
        params.accountId = resolvedAccountId;
      }

      if (resolvedSearch.trim()) {
        params.search = resolvedSearch.trim();
      }

      if (resolvedType) {
        params.type = resolvedType;
      }

      if (resolvedStatus) {
        params.status = resolvedStatus;
      }

      if (resolvedDirection) {
        params.direction = resolvedDirection;
      }

      if (resolvedFromDate) {
        params.fromDate = resolvedFromDate;
      }

      if (resolvedToDate) {
        params.toDate = resolvedToDate;
      }

      try {
        const response = await api.get(endpoint, {
          params,
          signal: controller.signal,
        });

        const payload = response?.data;

        const nextTransactions =
          extractTransactions(payload);

        const nextPagination =
          extractPagination(payload);

        setTransactions(nextTransactions);

        if (nextPagination) {
          setPagination(nextPagination);
        } else {
          setPagination((current) => ({
            ...current,
            page: Number(params.page) || 1,
            pageSize: Number(params.pageSize) || 20,
            total: nextTransactions.length,
            totalPages:
              nextTransactions.length > 0
                ? Math.ceil(
                    nextTransactions.length /
                      Number(params.pageSize || 20),
                  )
                : 1,
          }));
        }

        return nextTransactions;
      } catch (requestError) {
        if (requestError?.code === "ERR_CANCELED") {
          return [];
        }

        if (requestError?.name === "CanceledError") {
          return [];
        }

        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load transactions.";

        setError(message);
        setTransactions([]);

        throw requestError;
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
          setLoading(false);
        }
      }
    },
    [
      enabled,
      endpoint,
      accountId,
      page,
      pageSize,
      search,
      type,
      status,
      direction,
      fromDate,
      toDate,
    ],
  );

  const refresh = useCallback(
    async (overrides = {}) =>
      fetchTransactions({
        ...overrides,
        page: overrides.page ?? 1,
      }),
    [fetchTransactions],
  );

  useEffect(() => {
    if (!autoFetch || !enabled) {
      setLoading(false);
      return undefined;
    }

    fetchTransactions().catch(() => {});

    return () => {
      requestControllerRef.current?.abort();
    };
  }, [autoFetch, enabled, fetchTransactions]);

  const total = pagination.total;

  const hasTransactions = transactions.length > 0;

  const totalCredits = useMemo(
    () =>
      transactions.reduce((sum, transaction) => {
        const value = Number(
          transaction?.creditAmount ??
            transaction?.credit ??
            0,
        );

        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [transactions],
  );

  const totalDebits = useMemo(
    () =>
      transactions.reduce((sum, transaction) => {
        const value = Number(
          transaction?.debitAmount ??
            transaction?.debit ??
            0,
        );

        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [transactions],
  );

  const clear = useCallback(() => {
    requestControllerRef.current?.abort();
    setTransactions([]);
    setError("");
    setPagination({
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
    });
  }, [pageSize]);

  return {
    transactions,
    pagination,

    page: pagination.page,
    pageSize: pagination.pageSize,
    total,

    loading,
    error,

    hasTransactions,
    totalCredits,
    totalDebits,

    fetchTransactions,
    refresh,
    clear,
  };
};

export default useTransactions;