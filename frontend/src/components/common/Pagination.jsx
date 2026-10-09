import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const buildPageNumbers = (
  currentPage,
  totalPages,
  maxVisible = 5,
) => {
  if (totalPages <= maxVisible) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  const pages = new Set([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);

  const sorted = [...pages]
    .filter(
      (page) => page >= 1 && page <= totalPages,
    )
    .sort((a, b) => a - b);

  const result = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];

    if (index > 0 && page - previous > 1) {
      result.push(`ellipsis-${previous}-${page}`);
    }

    result.push(page);
  });

  return result;
};

const Pagination = ({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showSummary = true,
  className = "",
}) => {
  const safePage = Math.min(
    Math.max(Number(page) || 1, 1),
    Math.max(Number(totalPages) || 1, 1),
  );

  const safeTotalPages = Math.max(
    Number(totalPages) || 1,
    1,
  );

  const safeTotalItems = Math.max(
    Number(totalItems) || 0,
    0,
  );

  const safePageSize = Math.max(
    Number(pageSize) || 1,
    1,
  );

  if (safeTotalItems === 0) {
    return null;
  }

  const start =
    (safePage - 1) * safePageSize + 1;

  const end = Math.min(
    safePage * safePageSize,
    safeTotalItems,
  );

  const pages = buildPageNumbers(
    safePage,
    safeTotalPages,
  );

  const goToPage = (nextPage) => {
    if (
      typeof onPageChange !== "function" ||
      nextPage < 1 ||
      nextPage > safeTotalPages ||
      nextPage === safePage
    ) {
      return;
    }

    onPageChange(nextPage);
  };

  return (
    <div
      className={`flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {showSummary ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {start}
          </span>{" "}
          to{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {end}
          </span>{" "}
          of{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {safeTotalItems}
          </span>
        </p>
      ) : (
        <span />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {showPageSize && typeof onPageSizeChange === "function" ? (
          <select
            value={safePageSize}
            onChange={(event) =>
              onPageSizeChange(
                Number(event.target.value),
              )
            }
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          onClick={() => goToPage(1)}
          disabled={safePage <= 1}
          aria-label="First page"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => goToPage(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                onClick={() => goToPage(item)}
                aria-current={
                  item === safePage
                    ? "page"
                    : undefined
                }
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
                  item === safePage
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item}
              </button>
            ) : (
              <span
                key={item}
                className="px-1 text-slate-400"
                aria-hidden="true"
              >
                …
              </span>
            ),
          )}
        </div>

        <span className="px-2 text-sm font-medium text-slate-700 dark:text-slate-200 sm:hidden">
          {safePage} / {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => goToPage(safePage + 1)}
          disabled={safePage >= safeTotalPages}
          aria-label="Next page"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => goToPage(safeTotalPages)}
          disabled={safePage >= safeTotalPages}
          aria-label="Last page"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;