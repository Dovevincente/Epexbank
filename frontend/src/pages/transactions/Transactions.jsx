import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { getTransactions } from "../../services/transactionService.js";

const TRANSACTION_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER",
  "PAYMENT",
  "FEE",
  "REFUND",
  "LOAN_DISBURSEMENT",
  "LOAN_REPAYMENT",
  "SAVINGS_DEPOSIT",
  "SAVINGS_WITHDRAWAL",
  "INVESTMENT_BUY",
  "INVESTMENT_SELL",
  "DIVIDEND",
  "INTEREST",
  "ADJUSTMENT",
];

const TRANSACTION_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REVERSED",
  "CANCELLED",
];

const CREDIT_TYPES = new Set([
  "DEPOSIT",
  "REFUND",
  "LOAN_DISBURSEMENT",
  "DIVIDEND",
  "INTEREST",
  "ADJUSTMENT",
]);

const formatType = (type) =>
  String(type || "")
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const formatAmount = (amount, currency) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  const currencyCode =
    currency?.code ||
    currency ||
    "USD";

  const decimals = Number.isInteger(
    Number(currency?.decimals),
  )
    ? Number(currency.decimals)
    : 2;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericAmount);
  } catch {
    return `${currencyCode} ${numericAmount.toFixed(
      decimals,
    )}`;
  }
};

const statusClasses = {
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  PENDING:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  PROCESSING:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  FAILED:
    "bg-red-50 text-red-700 ring-1 ring-red-100",
  REVERSED:
    "bg-orange-50 text-orange-700 ring-1 ring-orange-100",
  CANCELLED:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const StatusIcon = ({ status }) => {
  if (status === "COMPLETED") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (
    status === "FAILED" ||
    status === "CANCELLED"
  ) {
    return <XCircle className="h-4 w-4" />;
  }

  return <Clock3 className="h-4 w-4" />;
};

const getTransactionId = (transaction) =>
  transaction?.id ||
  transaction?.transactionId ||
  transaction?.reference ||
  null;

const Transactions = () => {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] =
    useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [nextCursor, setNextCursor] =
    useState(null);
  const [hasMore, setHasMore] = useState(false);

  const loadTransactions = useCallback(
    async ({
      append = false,
      cursor = null,
      silent = false,
    } = {}) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await getTransactions({
          type: type || undefined,
          status: status || undefined,
          limit: 50,
          cursor: cursor || undefined,
        });

        const data = response?.data || {};

        const incoming = Array.isArray(
          data?.transactions,
        )
          ? data.transactions
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.data?.transactions)
              ? data.data.transactions
              : [];

        setTransactions((current) => {
          if (!append) {
            return incoming;
          }

          const existingIds = new Set(
            current.map(
              (transaction) =>
                getTransactionId(transaction),
            ),
          );

          const uniqueIncoming = incoming.filter(
            (transaction) =>
              !existingIds.has(
                getTransactionId(transaction),
              ),
          );

          return [
            ...current,
            ...uniqueIncoming,
          ];
        });

        setNextCursor(
          data?.nextCursor ||
            data?.data?.nextCursor ||
            null,
        );

        setHasMore(
          Boolean(
            data?.hasMore ??
              data?.data?.hasMore,
          ),
        );
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load your transactions.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [type, status],
  );

  useEffect(() => {
    setTransactions([]);
    setNextCursor(null);
    setHasMore(false);

    loadTransactions().catch(() => {});
  }, [type, status, loadTransactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return transactions;
    }

    return transactions.filter(
      (transaction) => {
        const values = [
          transaction?.reference,
          transaction?.type,
          transaction?.status,
          transaction?.description,
          transaction?.account?.accountNumber,
          transaction?.accountNumber,
          transaction?.currency?.code,
          transaction?.currencyCode,
          transaction?.counterparty?.name,
          transaction?.counterparty?.accountNumber,
        ];

        return values.some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );
      },
    );
  }, [transactions, search]);

  const summary = useMemo(() => {
    let credits = 0;
    let debits = 0;

    for (const transaction of transactions) {
      const amount = Number(
        transaction?.amount ?? 0,
      );

      if (!Number.isFinite(amount)) {
        continue;
      }

      if (
        CREDIT_TYPES.has(
          transaction?.type,
        )
      ) {
        credits += amount;
      } else {
        debits += amount;
      }
    }

    return {
      count: transactions.length,
      credits,
      debits,
    };
  }, [transactions]);

  const resetFilters = () => {
    setType("");
    setStatus("");
    setSearch("");
  };

  const handleRefresh = () => {
    loadTransactions({
      silent: true,
    }).catch(() => {});
  };

  const handleLoadMore = () => {
    if (
      !hasMore ||
      !nextCursor ||
      loadingMore
    ) {
      return;
    }

    loadTransactions({
      append: true,
      cursor: nextCursor,
    }).catch(() => {});
  };

  const openTransaction = (transaction) => {
    const transactionId =
      getTransactionId(transaction);

    if (!transactionId) {
      return;
    }

    navigate(
      `/transactions/${encodeURIComponent(
        transactionId,
      )}`,
    );
  };

  const activeFilters =
    Boolean(type) ||
    Boolean(status) ||
    Boolean(search.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
              Account activity
            </span>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Transactions
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review your account activity and
              transaction history directly from
              Epex Bank&apos;s ledger.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={
              loading ||
              refreshing ||
              loadingMore
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={[
                "h-4 w-4",
                refreshing
                  ? "animate-spin"
                  : "",
              ].join(" ")}
            />

            Refresh
          </button>
        </div>
      </section>

      {/* Summary */}
      {!loading &&
        !error &&
        transactions.length > 0 && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transactions loaded
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950">
                {summary.count}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Current result set
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Credits
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-700">
                {formatAmount(
                  summary.credits,
                  transactions[0]?.currency,
                )}
              </p>

              <p className="mt-1 text-xs text-emerald-600/80">
                Credit activity in this result set
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Debits
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatAmount(
                  summary.debits,
                  transactions[0]?.currency,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Debit activity in this result set
              </p>
            </div>
          </section>
        )}

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search reference, description or account..."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">
                All transaction types
              </option>

              {TRANSACTION_TYPES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {formatType(item)}
                  </option>
                ),
              )}
            </select>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value,
                )
              }
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">
                All statuses
              </option>

              {TRANSACTION_STATUSES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {formatType(item)}
                  </option>
                ),
              )}
            </select>

            {activeFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div className="min-w-0">
              <p className="text-sm font-bold text-red-800">
                Transactions unavailable
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadTransactions().catch(
                    () => {},
                  )
                }
                className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition hover:bg-red-700"
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Transactions */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />

            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading your transaction history...
            </p>
          </div>
        ) : filteredTransactions.length ===
          0 ? (
          <div className="p-10 text-center sm:p-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              No transactions found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {activeFilters
                ? "There are no transactions matching your current filters."
                : "Your transaction activity will appear here when available."}
            </p>

            {activeFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Transaction
                    </th>

                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Account
                    </th>

                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Amount
                    </th>

                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Date
                    </th>

                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map(
                    (transaction) => {
                      const isCredit =
                        CREDIT_TYPES.has(
                          transaction?.type,
                        );

                      const statusClass =
                        statusClasses[
                          transaction?.status
                        ] ||
                        "bg-slate-100 text-slate-600 ring-1 ring-slate-200";

                      return (
                        <tr
                          key={
                            getTransactionId(
                              transaction,
                            )
                          }
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={[
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                  isCredit
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-blue-50 text-blue-600",
                                ].join(" ")}
                              >
                                {isCredit ? (
                                  <ArrowDownLeft className="h-5 w-5" />
                                ) : (
                                  <ArrowUpRight className="h-5 w-5" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">
                                  {formatType(
                                    transaction?.type,
                                  )}
                                </p>

                                <p className="mt-1 max-w-56 truncate text-xs text-slate-400">
                                  {transaction?.reference ||
                                    "No reference"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <p className="text-sm font-semibold text-slate-700">
                              {transaction?.account
                                ?.accountNumber ||
                                transaction?.accountNumber ||
                                "—"}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <p
                              className={[
                                "text-sm font-bold",
                                isCredit
                                  ? "text-emerald-600"
                                  : "text-slate-900",
                              ].join(" ")}
                            >
                              {isCredit
                                ? "+"
                                : "-"}
                              {formatAmount(
                                transaction?.amount,
                                transaction?.currency,
                              )}
                            </p>

                            {Number(
                              transaction?.fee ??
                                0,
                            ) > 0 && (
                              <p className="mt-1 text-xs text-slate-400">
                                Fee:{" "}
                                {formatAmount(
                                  transaction.fee,
                                  transaction.currency,
                                )}
                              </p>
                            )}
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={[
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                                statusClass,
                              ].join(" ")}
                            >
                              <StatusIcon
                                status={
                                  transaction?.status
                                }
                              />

                              {formatType(
                                transaction?.status,
                              )}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500">
                            {formatDate(
                              transaction?.createdAt,
                            )}
                          </td>

                          <td className="px-6 py-5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                openTransaction(
                                  transaction,
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              aria-label="View transaction details"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredTransactions.map(
                (transaction) => {
                  const isCredit =
                    CREDIT_TYPES.has(
                      transaction?.type,
                    );

                  const statusClass =
                    statusClasses[
                      transaction?.status
                    ] ||
                    "bg-slate-100 text-slate-600 ring-1 ring-slate-200";

                  return (
                    <article
                      key={getTransactionId(
                        transaction,
                      )}
                      className="p-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openTransaction(
                            transaction,
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={[
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                isCredit
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-blue-50 text-blue-600",
                              ].join(" ")}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="h-5 w-5" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {formatType(
                                  transaction?.type,
                                )}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-400">
                                {transaction?.reference ||
                                  "No reference"}
                              </p>
                            </div>
                          </div>

                          <p
                            className={[
                              "whitespace-nowrap text-sm font-bold",
                              isCredit
                                ? "text-emerald-600"
                                : "text-slate-900",
                            ].join(" ")}
                          >
                            {isCredit
                              ? "+"
                              : "-"}
                            {formatAmount(
                              transaction?.amount,
                              transaction?.currency,
                            )}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                              statusClass,
                            ].join(" ")}
                          >
                            <StatusIcon
                              status={
                                transaction?.status
                              }
                            />

                            {formatType(
                              transaction?.status,
                            )}
                          </span>

                          <span className="text-xs text-slate-400">
                            {formatDate(
                              transaction?.createdAt,
                            )}
                          </span>
                        </div>

                        {transaction?.description && (
                          <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">
                            {
                              transaction.description
                            }
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-xs font-semibold text-slate-400">
                            {
                              transaction?.account
                                ?.accountNumber
                            }
                          </span>

                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                            View details
                            <Eye className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    </article>
                  );
                },
              )}
            </div>

            {/* Pagination */}
            {hasMore && nextCursor && (
              <div className="border-t border-slate-100 p-4 text-center">
                <button
                  type="button"
                  disabled={
                    loadingMore ||
                    refreshing
                  }
                  onClick={handleLoadMore}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}

                  {loadingMore
                    ? "Loading..."
                    : "Load more transactions"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Transactions;