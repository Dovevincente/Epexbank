import { useCallback, useEffect, useRef, useState } from "react";
import {
  getTransfer,
  getTransfers,
} from "../services/transferService.js";

const extractTransfers = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.transfers)) {
    return payload.transfers;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.transfers)) {
    return payload.data.transfers;
  }

  return [];
};

const useTransfers = (options = {}) => {
  const {
    autoFetch = true,
    enabled = true,
    page = 1,
    pageSize = 20,
    status = "",
    type = "",
    search = "",
  } = options;

  const [transfers, setTransfers] = useState([]);
  const [pagination, setPagination] = useState({
    page,
    pageSize,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(
    Boolean(autoFetch && enabled),
  );

  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  const fetchTransfers = useCallback(
    async (overrides = {}) => {
      if (!enabled) {
        setTransfers([]);
        setLoading(false);
        return [];
      }

      const requestId = ++requestIdRef.current;

      setLoading(true);
      setError("");

      const params = {
        page: overrides.page ?? page,
        pageSize: overrides.pageSize ?? pageSize,
      };

      const resolvedStatus =
        overrides.status ?? status;

      const resolvedType = overrides.type ?? type;
      const resolvedSearch =
        overrides.search ?? search;

      if (resolvedStatus) {
        params.status = resolvedStatus;
      }

      if (resolvedType) {
        params.type = resolvedType;
      }

      if (resolvedSearch.trim()) {
        params.search = resolvedSearch.trim();
      }

      try {
        const response = await getTransfers(params);

        if (requestId !== requestIdRef.current) {
          return [];
        }

        const payload = response?.data ?? response;

        const nextTransfers =
          extractTransfers(payload);

        const responsePagination =
          payload?.pagination ||
          payload?.data?.pagination;

        setTransfers(nextTransfers);

        setPagination({
          page:
            Number(responsePagination?.page) ||
            Number(params.page) ||
            1,

          pageSize:
            Number(
              responsePagination?.pageSize ??
                responsePagination?.limit,
            ) ||
            Number(params.pageSize) ||
            20,

          total:
            Number(
              responsePagination?.total ??
                responsePagination?.totalItems ??
                nextTransfers.length,
            ) || 0,

          totalPages:
            Number(responsePagination?.totalPages) ||
            1,
        });

        return nextTransfers;
      } catch (requestError) {
        if (requestId !== requestIdRef.current) {
          return [];
        }

        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load transfers.";

        setError(message);
        setTransfers([]);

        throw requestError;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      enabled,
      page,
      pageSize,
      status,
      type,
      search,
    ],
  );

  const fetchTransfer = useCallback(async (transferId) => {
    if (!transferId) {
      throw new Error("Transfer ID is required.");
    }

    return getTransfer(transferId);
  }, []);

  const refresh = useCallback(
    (overrides = {}) =>
      fetchTransfers({
        ...overrides,
        page: overrides.page ?? 1,
      }),
    [fetchTransfers],
  );

  const clear = useCallback(() => {
    ++requestIdRef.current;

    setTransfers([]);
    setError("");
    setPagination({
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
    });
  }, [pageSize]);

  useEffect(() => {
    if (!autoFetch || !enabled) {
      setLoading(false);
      return;
    }

    fetchTransfers().catch(() => {});
  }, [autoFetch, enabled, fetchTransfers]);

  return {
    transfers,
    pagination,

    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,

    loading,
    error,

    hasTransfers: transfers.length > 0,

    fetchTransfers,
    fetchTransfer,
    refresh,
    clear,
  };
};

export default useTransfers;