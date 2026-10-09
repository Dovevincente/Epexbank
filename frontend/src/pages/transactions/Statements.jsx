import {
  AlertCircle,
  ArrowDownToLine,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const PAGE_SIZE = 12;

const STATEMENT_TYPES = [
  "ALL",
  "ACCOUNT",
  "TRANSACTION",
  "MONTHLY",
  "ANNUAL",
];

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const getApiMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const normalizeStatements = (
  payload,
) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.statements ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.statements ??
    root?.data?.items ??
    []
  );
};

const normalizeStatement = (
  statement,
) => ({
  id:
    statement?.id ??
    statement?.statementId ??
    statement?.documentId ??
    "",

  accountId:
    statement?.accountId ??
    statement?.account?.id ??
    "",

  accountNumber:
    statement?.accountNumber ??
    statement?.account?.accountNumber ??
    "",

  accountName:
    statement?.accountName ??
    statement?.account?.name ??
    statement?.account?.type ??
    "Account",

  currency:
    statement?.currency?.code ??
    statement?.currencyCode ??
    statement?.currency ??
    statement?.account?.currency?.code ??
    "USD",

  type:
    String(
      statement?.type ??
        statement?.statementType ??
        "ACCOUNT",
    ).toUpperCase(),

  period:
    statement?.period ??
    statement?.periodLabel ??
    statement?.month ??
    statement?.year ??
    "",

  startDate:
    statement?.startDate ??
    statement?.fromDate ??
    statement?.periodStart ??
    null,

  endDate:
    statement?.endDate ??
    statement?.toDate ??
    statement?.periodEnd ??
    null,

  generatedAt:
    statement?.generatedAt ??
    statement?.createdAt ??
    statement?.issuedAt ??
    null,

  status:
    String(
      statement?.status ??
        "AVAILABLE",
    ).toUpperCase(),

  fileUrl:
    statement?.fileUrl ??
    statement?.downloadUrl ??
    statement?.url ??
    statement?.documentUrl ??
    null,

  viewUrl:
    statement?.viewUrl ??
    statement?.previewUrl ??
    null,

  fileName:
    statement?.fileName ??
    statement?.filename ??
    null,

  format:
    String(
      statement?.format ??
        statement?.fileType ??
        "PDF",
    ).toUpperCase(),

  size:
    statement?.size ??
    statement?.fileSize ??
    null,
});

const maskAccountNumber = (
  accountNumber,
) => {
  if (!accountNumber) {
    return "Account";
  }

  const value = String(
    accountNumber,
  );

  if (value.length <= 4) {
    return value;
  }

  return `•••• ${value.slice(-4)}`;
};

const formatStatus = (
  value,
) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const formatDate = (
  value,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
    },
  ).format(date);
};

const formatDateTime = (
  value,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
};

const formatFileSize = (
  value,
) => {
  const bytes =
    Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};

const getTypeClasses = (
  type,
) => {
  switch (type) {
    case "MONTHLY":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";

    case "ANNUAL":
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300";

    case "TRANSACTION":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

const getStatusClasses = (
  status,
) => {
  switch (status) {
    case "AVAILABLE":
    case "READY":
    case "GENERATED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";

    case "PROCESSING":
    case "PENDING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

    case "FAILED":
    case "EXPIRED":
      return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

const Statements = () => {
  const {
    accounts,
    loading: accountsLoading,
  } = useAccounts();

  const [
    statements,
    setStatements,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    accountFilter,
    setAccountFilter,
  ] = useState("ALL");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("ALL");

  const [yearFilter, setYearFilter] =
    useState("ALL");

  const [page, setPage] =
    useState(1);

  const loadStatements =
    useCallback(
      async ({
        background = false,
      } = {}) => {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const params = {
            limit: 100,
          };

          if (
            accountFilter !==
            "ALL"
          ) {
            params.accountId =
              accountFilter;
          }

          if (
            typeFilter !==
            "ALL"
          ) {
            params.type =
              typeFilter;
          }

          if (yearFilter !== "ALL") {
            params.year =
              yearFilter;
          }

          let response;

          try {
            response =
              await api.get(
                "/statements",
                {
                  params,
                },
              );
          } catch (requestError) {
            if (
              [404, 501].includes(
                requestError?.response
                  ?.status,
              )
            ) {
              response =
                await api.get(
                  "/transactions/statements",
                  {
                    params,
                  },
                );
            } else {
              throw requestError;
            }
          }

          const normalized =
            normalizeStatements(
              response?.data,
            ).map(
              normalizeStatement,
            );

          setStatements(
            normalized,
          );

          setPage(1);
        } catch (requestError) {
          const status =
            requestError?.response
              ?.status;

          if (
            status === 404 ||
            status === 501
          ) {
            setError(
              "Statement services are not available from the banking API yet.",
            );
          } else {
            setError(
              getApiMessage(
                requestError,
                "Unable to load your statements.",
              ),
            );
          }

          setStatements([]);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        accountFilter,
        typeFilter,
        yearFilter,
      ],
    );

  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

  const availableYears =
    useMemo(() => {
      const years =
        statements
          .map(
            (statement) => {
              const source =
                statement.startDate ??
                statement.endDate ??
                statement.generatedAt;

              if (!source) {
                return null;
              }

              const date =
                new Date(source);

              if (
                Number.isNaN(
                  date.getTime(),
                )
              ) {
                return null;
              }

              return String(
                date.getFullYear(),
              );
            },
          )
          .filter(Boolean);

      return [
        ...new Set(years),
      ].sort(
        (a, b) =>
          Number(b) -
          Number(a),
      );
    }, [statements]);

  const filteredStatements =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return statements;
      }

      return statements.filter(
        (statement) => {
          const searchable = [
            statement.accountNumber,
            statement.accountName,
            statement.type,
            statement.period,
            statement.currency,
            statement.fileName,
            statement.id,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query,
          );
        },
      );
    }, [
      statements,
      search,
    ]);

  const pageCount = Math.max(
    1,
    Math.ceil(
      filteredStatements.length /
        PAGE_SIZE,
    ),
  );

  const currentPage =
    Math.min(
      page,
      pageCount,
    );

  const paginatedStatements =
    filteredStatements.slice(
      (currentPage - 1) *
        PAGE_SIZE,
      currentPage *
        PAGE_SIZE,
    );

  const summary = useMemo(
    () => {
      const available =
        statements.filter(
          (statement) =>
            [
              "AVAILABLE",
              "READY",
              "GENERATED",
            ].includes(
              statement.status,
            ),
        ).length;

      const processing =
        statements.filter(
          (statement) =>
            [
              "PENDING",
              "PROCESSING",
            ].includes(
              statement.status,
            ),
        ).length;

      const annual =
        statements.filter(
          (statement) =>
            statement.type ===
            "ANNUAL",
        ).length;

      const monthly =
        statements.filter(
          (statement) =>
            statement.type ===
            "MONTHLY",
        ).length;

      return {
        total:
          statements.length,
        available,
        processing,
        annual,
        monthly,
      };
    },
    [statements],
  );

  const handleSearch = (
    value,
  ) => {
    setSearch(value);
    setPage(1);
  };

  const handleAccountFilter = (
    value,
  ) => {
    setAccountFilter(value);
    setPage(1);
  };

  const handleTypeFilter = (
    value,
  ) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleYearFilter = (
    value,
  ) => {
    setYearFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Statements
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Access available account and transaction statements.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadStatements({
              background: true,
            })
          }
          disabled={refreshing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />
          Refresh
        </button>
      </section>

      {/* Error */}
      {error && (
        <section
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

          <div>
            <p className="text-sm font-bold text-red-950 dark:text-red-300">
              Statements unavailable
            </p>

            <p className="mt-1 text-xs leading-5 text-red-800 dark:text-red-400">
              {error}
            </p>
          </div>
        </section>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Statements"
          value={summary.total}
          icon={FileText}
        />

        <SummaryCard
          label="Available"
          value={summary.available}
          icon={FileText}
          valueClass="text-emerald-700 dark:text-emerald-400"
        />

        <SummaryCard
          label="Processing"
          value={summary.processing}
          icon={RefreshCw}
          valueClass="text-amber-700 dark:text-amber-400"
        />

        <SummaryCard
          label="Annual"
          value={summary.annual}
          icon={CalendarDays}
        />
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />

          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Find a statement
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_150px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                handleSearch(
                  event.target.value,
                )
              }
              placeholder="Search statement..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:ring-slate-800"
            />
          </label>

          <select
            value={accountFilter}
            onChange={(event) =>
              handleAccountFilter(
                event.target.value,
              )
            }
            disabled={
              accountsLoading
            }
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:focus:ring-slate-800"
          >
            <option value="ALL">
              All accounts
            </option>

            {accounts.map(
              (account) => (
                <option
                  key={
                    account.id
                  }
                  value={
                    account.id
                  }
                >
                  {maskAccountNumber(
                    account.accountNumber,
                  )}
                </option>
              ),
            )}
          </select>

          <select
            value={typeFilter}
            onChange={(event) =>
              handleTypeFilter(
                event.target.value,
              )
            }
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:focus:ring-slate-800"
          >
            {STATEMENT_TYPES.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type === "ALL"
                    ? "All types"
                    : formatStatus(
                        type,
                      )}
                </option>
              ),
            )}
          </select>

          <select
            value={yearFilter}
            onChange={(event) =>
              handleYearFilter(
                event.target.value,
              )
            }
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:focus:ring-slate-800"
          >
            <option value="ALL">
              All years
            </option>

            {availableYears.map(
              (year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ),
            )}
          </select>
        </div>
      </section>

      {/* Statements */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Available statements
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {filteredStatements.length} statement
            {filteredStatements.length ===
            1
              ? ""
              : "s"}{" "}
            match your current filters.
          </p>
        </div>

        {loading ? (
          <LoadingStatements />
        ) : paginatedStatements.length ===
          0 ? (
          <EmptyStatements />
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {paginatedStatements.map(
              (
                statement,
                index,
              ) => (
                <StatementRow
                  key={
                    statement.id ||
                    `${statement.period}-${index}`
                  }
                  statement={
                    statement
                  }
                />
              ),
            )}
          </div>
        )}
      </section>

      {/* Pagination */}
      {!loading &&
        filteredStatements.length >
          PAGE_SIZE && (
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {currentPage} of{" "}
              {pageCount}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current -
                          1,
                      ),
                  )
                }
                disabled={
                  currentPage ===
                  1
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        pageCount,
                        current +
                          1,
                      ),
                  )
                }
                disabled={
                  currentPage ===
                  pageCount
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        )}

      {/* Security */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Secure document access
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Statements are loaded from your authenticated Epex Bank account.
              The page only exposes document links returned by the banking
              service and does not generate or fabricate statement records.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  valueClass = "text-slate-950 dark:text-white",
}) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" />
      </div>
    </div>

    <p
      className={`mt-4 text-xl font-bold ${valueClass}`}
    >
      {value}
    </p>
  </div>
);

const StatementRow = ({
  statement,
}) => {
  const canOpen =
    Boolean(
      statement.viewUrl ||
        statement.fileUrl,
    );

  const canDownload =
    Boolean(
      statement.fileUrl,
    );

  const size =
    formatFileSize(
      statement.size,
    );

  return (
    <article className="px-5 py-5 transition hover:bg-slate-50 dark:hover:bg-slate-950/50 sm:px-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <FileText className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-950 dark:text-white">
                {statement.period ||
                  formatDate(
                    statement.startDate,
                  ) ||
                  "Account statement"}
              </h3>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getTypeClasses(
                  statement.type,
                )}`}
              >
                {formatStatus(
                  statement.type,
                )}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
                  statement.status,
                )}`}
              >
                {formatStatus(
                  statement.status,
                )}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {statement.accountName} ·{" "}
              {maskAccountNumber(
                statement.accountNumber,
              )}{" "}
              · {statement.currency}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                Period:{" "}
                <strong className="font-bold text-slate-700 dark:text-slate-300">
                  {formatDate(
                    statement.startDate,
                  )}{" "}
                  —{" "}
                  {formatDate(
                    statement.endDate,
                  )}
                </strong>
              </span>

              <span>
                Generated:{" "}
                <strong className="font-bold text-slate-700 dark:text-slate-300">
                  {formatDateTime(
                    statement.generatedAt,
                  )}
                </strong>
              </span>

              {size && (
                <span>
                  Size:{" "}
                  <strong className="font-bold text-slate-700 dark:text-slate-300">
                    {size}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          {canOpen ? (
            <a
              href={
                statement.viewUrl ||
                statement.fileUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600"
            >
              <Eye className="h-3.5 w-3.5" />
              View unavailable
            </button>
          )}

          {canDownload ? (
            <a
              href={
                statement.fileUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              download={
                statement.fileName ||
                undefined
              }
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Download
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-600"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Download unavailable
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const LoadingStatements = () => (
  <div className="divide-y divide-slate-200 dark:divide-slate-800">
    {Array.from({
      length: 5,
    }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-4 px-5 py-6 sm:px-7"
      >
        <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />

        <div className="flex-1 space-y-2">
          <div className="h-3 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

          <div className="h-2.5 w-64 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyStatements = () => (
  <div className="p-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <FileText className="h-5 w-5" />
    </div>

    <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
      No statements found
    </h3>

    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
      There are no statements matching your current filters.
    </p>
  </div>
);

export default Statements;