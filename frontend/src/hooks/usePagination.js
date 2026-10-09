import { useCallback, useEffect, useMemo, useState } from "react";

const normalizePositiveInteger = (value, fallback) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }

  return Math.floor(number);
};

const usePagination = (options = {}) => {
  const {
    initialPage = 1,
    initialPageSize = 20,
    totalItems = 0,
    pageSizeOptions = [10, 20, 50, 100],
  } = options;

  const [page, setPageState] = useState(
    normalizePositiveInteger(initialPage, 1),
  );

  const [pageSize, setPageSizeState] = useState(
    normalizePositiveInteger(initialPageSize, 20),
  );

  const normalizedTotalItems = Math.max(
    0,
    Number.isFinite(Number(totalItems)) ? Number(totalItems) : 0,
  );

  const totalPages = Math.max(
    1,
    Math.ceil(normalizedTotalItems / pageSize),
  );

  const setPage = useCallback(
    (nextPage) => {
      const resolvedPage =
        typeof nextPage === "function"
          ? nextPage(page)
          : nextPage;

      const normalizedPage = normalizePositiveInteger(
        resolvedPage,
        1,
      );

      setPageState(
        Math.min(Math.max(normalizedPage, 1), totalPages),
      );
    },
    [page, totalPages],
  );

  const setPageSize = useCallback((nextPageSize) => {
    const normalizedSize = normalizePositiveInteger(
      nextPageSize,
      20,
    );

    setPageSizeState(normalizedSize);
    setPageState(1);
  }, []);

  const nextPage = useCallback(() => {
    setPageState((currentPage) =>
      Math.min(currentPage + 1, totalPages),
    );
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setPageState((currentPage) =>
      Math.max(currentPage - 1, 1),
    );
  }, []);

  const firstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const lastPage = useCallback(() => {
    setPageState(totalPages);
  }, [totalPages]);

  const reset = useCallback(() => {
    setPageState(1);
  }, []);

  useEffect(() => {
    setPageState((currentPage) =>
      Math.min(Math.max(currentPage, 1), totalPages),
    );
  }, [totalPages]);

  const offset = (page - 1) * pageSize;

  const from =
    normalizedTotalItems === 0 ? 0 : offset + 1;

  const to =
    normalizedTotalItems === 0
      ? 0
      : Math.min(offset + pageSize, normalizedTotalItems);

  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      totalItems: normalizedTotalItems,
      totalPages,
      offset,
      from,
      to,
      hasPreviousPage,
      hasNextPage,
      pageSizeOptions,
    }),
    [
      page,
      pageSize,
      normalizedTotalItems,
      totalPages,
      offset,
      from,
      to,
      hasPreviousPage,
      hasNextPage,
      pageSizeOptions,
    ],
  );

  return {
    ...pagination,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    reset,
  };
};

export default usePagination;