import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  Loader2,
  PiggyBank,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const STATUS_OPTIONS = [
  "ALL",
  "COMPLETED",
  "PENDING",
  "PROCESSING",
  "FAILED",
  "REVERSED",
  "CANCELLED",
];

const TYPE_OPTIONS = [
  "ALL",
  "CREDIT",
  "DEBIT",
  "DEPOSIT",
  "WITHDRAWAL",
  "INTEREST",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "FEE",
  "PAYMENT",
];

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const normalizeTransactions = (payload) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.transactions ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.transactions ??
    root?.data?.items ??
    []
  );
};

const normalizeAccounts = (payload) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.accounts ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.accounts ??
    []
  );
};

const getPagination = (payload) => {
  const root = getRoot(payload);

  const pagination =
    root?.pagination ??
    root?.meta ??
    root?.pageInfo ??
    root?.data?.pagination ??
    root?.data?.meta ??
    {};

  return {
    nextCursor:
      pagination?.nextCursor ??
      pagination?.next_cursor ??
      root?.nextCursor ??
      root?.next_cursor ??
      null,

    previousCursor:
      pagination?.previousCursor ??
      pagination?.previous_cursor ??
      root?.previousCursor ??
      root?.previous_cursor ??
      null,

    hasNext:
      Boolean(
        pagination?.hasNext ??
          pagination?.hasNextPage ??
          root?.hasNext ??
          root?.hasNextPage ??
          pagination?.nextCursor ??
          root?.nextCursor,
      ),

    hasPrevious:
      Boolean(
        pagination?.hasPrevious ??
          pagination?.hasPreviousPage ??
          root?.hasPrevious ??
          root?.hasPreviousPage ??
          pagination?.previousCursor ??
          root?.previousCursor,
      ),
  };
};

const getTransactionId = (transaction) =>
  transaction?.id ??
  transaction?.transactionId ??
  transaction?.transactionID ??
  "";

const getAccountId = (account) =>
  account?.id ??
  account?.accountId ??
  account?.savingsAccountId ??
  "";

const getAccountNumber = (account) =>
  account?.accountNumber ??
  account?.number ??
  "";

const getAccountStatus = (account) =>
  String(
    account?.status ??
      account?.accountStatus ??
      "ACTIVE",
  ).toUpperCase();

const getAccountType = (account) =>
  String(
    account?.type ??
      account?.accountType ??
      account?.productType ??
      "",
  ).toUpperCase();

const getCurrency = (account) =>
  account?.currency?.code ??
  account?.currencyCode ??
  account?.currency ??
  "USD";

const getTransactionType = (transaction) =>
  String(
    transaction?.type ??
      transaction?.transactionType ??
      transaction?.category ??
      transaction?.direction ??
      "",
  ).toUpperCase();

const getTransactionStatus = (transaction) =>
  String(
    transaction?.status ??
      transaction?.transactionStatus ??
      "COMPLETED",
  ).toUpperCase();

const getTransactionDescription = (
  transaction,
) =>
  transaction?.description ??
  transaction?.narration ??
  transaction?.memo ??
  transaction?.title ??
  transaction?.reference ??
  "Savings transaction";

const getTransactionReference = (
  transaction,
) =>
  transaction?.reference ??
  transaction?.transactionReference ??
  transaction?.transactionRef ??
  "";

const getTransactionAmount = (transaction) => {
  const value =
    transaction?.amount ??
    transaction?.transactionAmount ??
    transaction?.value;

  const amount = Number(value);

  return Number.isFinite(amount)
    ? Math.abs(amount)
    : null;
};

const getTransactionCurrency = (
  transaction,
  fallback = "USD",
) =>
  transaction?.currency?.code ??
  transaction?.currencyCode ??
  transaction?.currency ??
  fallback;

const getTransactionDate = (
  transaction,
) =>
  transaction?.createdAt ??
  transaction?.date ??
  transaction?.transactionDate ??
  transaction?.postedAt ??
  transaction?.processedAt ??
  null;

const getTransactionDirection = (
  transaction,
) => {
  const explicitDirection = String(
    transaction?.direction ?? "",
  ).toUpperCase();

  if (
    explicitDirection === "CREDIT" ||
    explicitDirection === "DEBIT"
  ) {
    return explicitDirection;
  }

  const type = getTransactionType(
    transaction,
  );

  if (
    [
      "CREDIT",
      "DEPOSIT",
      "INTEREST",
      "DIVIDEND",
      "REFUND",
      "TRANSFER_IN",
    ].some((value) =>
      type.includes(value),
    )
  ) {
    return "CREDIT";
  }

  if (
    [
      "DEBIT",
      "WITHDRAWAL",
      "TRANSFER_OUT",
      "FEE",
      "CHARGE",
      "PAYMENT",
    ].some((value) =>
      type.includes(value),
    )
  ) {
    return "DEBIT";
  }

  const amount = Number(
    transaction?.amount ??
      transaction?.transactionAmount ??
      0,
  );

  if (Number.isFinite(amount)) {
    return amount < 0
      ? "DEBIT"
      : "CREDIT";
  }

  return "DEBIT";
};

const formatMoney = (
  value,
  currency = "USD",
) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
      },
    ).format(amount);
  } catch {
    return `${currency || ""} ${amount.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      },
    )}`.trim();
  }
};

const formatDate = (value) => {
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

const formatDateTime = (value) => {
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

const formatType = (value) => {
  if (!value) return "Transaction";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
};

const formatStatus = (value) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
};

const maskAccountNumber = (value) => {
  if (!value) return "—";

  const account = String(value);

  if (account.length <= 4) {
    return `•••• ${account}`;
  }

  return `•••• ${account.slice(-4)}`;
};

const getStatusClasses = (status) => {
  switch (
    String(status).toUpperCase()
  ) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";

    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

    case "FAILED":
    case "REVERSED":
    case "CANCELLED":
      return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

const getStatusIcon = (status) => {
  switch (
    String(status).toUpperCase()
  ) {
    case "COMPLETED":
      return FileText;

    case "PENDING":
    case "PROCESSING":
      return Clock3;

    case "FAILED":
    case "REVERSED":
    case "CANCELLED":
      return XCircle;

    default:
      return FileText;
  }
};

const SavingsHistory = () => {
  const [searchParams] =
    useSearchParams();

  const queryAccountId =
    searchParams.get("accountId") ||
    searchParams.get("savingsId") ||
    searchParams.get("savingsAccountId") ||
    "";

  const {
    accounts: hookAccounts,
    loading: accountsLoading,
  } = useAccounts();

  const [accounts, setAccounts] =
    useState([]);

  const [selectedAccountId, setSelectedAccountId] =
    useState(queryAccountId);

  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  const [cursorHistory, setCursorHistory] =
    useState([]);

  const [nextCursor, setNextCursor] =
    useState(null);

  const [hasNext, setHasNext] =
    useState(false);

  const [hasPrevious, setHasPrevious] =
    useState(false);

  const [pageNumber, setPageNumber] =
    useState(1);

  const loadAccounts = useCallback(
    async () => {
      if (
        Array.isArray(hookAccounts) &&
        hookAccounts.length
      ) {
        setAccounts(hookAccounts);
        return hookAccounts;
      }

      try {
        const response =
          await api.get("/accounts");

        const nextAccounts =
          normalizeAccounts(
            response?.data,
          );

        setAccounts(nextAccounts);

        return nextAccounts;
      } catch (requestError) {
        setAccounts([]);

        throw requestError;
      }
    },
    [hookAccounts],
  );

  useEffect(() => {
    if (
      Array.isArray(hookAccounts)
    ) {
      setAccounts(hookAccounts);
    }
  }, [hookAccounts]);

  const savingsAccounts =
    useMemo(() => {
      return accounts.filter(
        (account) => {
          const type =
            getAccountType(account);

          const productType =
            String(
              account?.product
                ?.type ??
                account?.savingsProduct
                  ?.type ??
                "",
            ).toUpperCase();

          return (
            type.includes("SAV") ||
            type === "CURRENT_SAVINGS" ||
            productType.includes("SAV")
          );
        },
      );
    }, [accounts]);

  useEffect(() => {
    if (!selectedAccountId) {
      if (queryAccountId) {
        setSelectedAccountId(
          queryAccountId,
        );
        return;
      }

      if (savingsAccounts.length) {
        setSelectedAccountId(
          String(
            getAccountId(
              savingsAccounts[0],
            ),
          ),
        );
      }
    }
  }, [
    queryAccountId,
    selectedAccountId,
    savingsAccounts,
  ]);

  const selectedAccount = useMemo(
    () =>
      savingsAccounts.find(
        (account) =>
          String(
            getAccountId(account),
          ) ===
          String(selectedAccountId),
      ) ?? null,
    [
      savingsAccounts,
      selectedAccountId,
    ],
  );

  const loadHistory = useCallback(
    async ({
      accountId = selectedAccountId,
      cursor = null,
      background = false,
    } = {}) => {
      if (!accountId) {
        setTransactions([]);
        setError(
          "Select a savings account to view its history.",
        );
        setLoading(false);
        return;
      }

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const query = new URLSearchParams();

        query.set(
          "limit",
          "25",
        );

        if (cursor) {
          query.set(
            "cursor",
            cursor,
          );
        }

        let response;

        try {
          response = await api.get(
            `/savings/${encodeURIComponent(
              String(accountId),
            )}/transactions?${query.toString()}`,
          );
        } catch (requestError) {
          if (
            [404, 501].includes(
              requestError?.response?.status,
            )
          ) {
            response = await api.get(
              `/accounts/${encodeURIComponent(
                String(accountId),
              )}/transactions?${query.toString()}`,
            );
          } else {
            throw requestError;
          }
        }

        setTransactions(
          normalizeTransactions(
            response?.data,
          ),
        );

        const pagination =
          getPagination(
            response?.data,
          );

        setNextCursor(
          pagination.nextCursor,
        );

        setHasNext(
          pagination.hasNext,
        );

        setHasPrevious(
          pagination.hasPrevious ||
            cursorHistory.length > 0,
        );
      } catch (requestError) {
        setTransactions([]);

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "Unable to load savings history.",
        );

        setNextCursor(null);
        setHasNext(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      cursorHistory.length,
      selectedAccountId,
    ],
  );

  useEffect(() => {
    if (accountsLoading) return;

    if (!savingsAccounts.length) {
      loadAccounts().catch(
        (requestError) => {
          setError(
            requestError?.response
              ?.data?.message ||
              requestError?.message ||
              "Unable to load your savings accounts.",
          );
        },
      );

      return;
    }

    if (selectedAccountId) {
      loadHistory();
    }
  }, [
    accountsLoading,
    savingsAccounts.length,
    selectedAccountId,
    loadAccounts,
    loadHistory,
  ]);

  useEffect(() => {
    setCursorHistory([]);
    setPageNumber(1);
    setNextCursor(null);
    setHasNext(false);
    setHasPrevious(false);
  }, [selectedAccountId]);

  const goNext = async () => {
    if (!nextCursor) return;

    setCursorHistory(
      (current) => [
        ...current,
        nextCursor,
      ],
    );

    setPageNumber(
      (current) => current + 1,
    );

    await loadHistory({
      cursor: nextCursor,
    });
  };

  const goPrevious = async () => {
    if (!cursorHistory.length) {
      return;
    }

    const nextHistory =
      cursorHistory.slice(0, -1);

    const previousCursor =
      cursorHistory[
        cursorHistory.length - 2
      ] ?? null;

    setCursorHistory(nextHistory);

    setPageNumber(
      (current) =>
        Math.max(1, current - 1),
    );

    await loadHistory({
      cursor: previousCursor,
    });
  };

  const filteredTransactions =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return transactions.filter(
        (transaction) => {
          const status =
            getTransactionStatus(
              transaction,
            );

          const type =
            getTransactionType(
              transaction,
            );

          const description =
            getTransactionDescription(
              transaction,
            ).toLowerCase();

          const reference =
            getTransactionReference(
              transaction,
            ).toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            description.includes(
              normalizedSearch,
            ) ||
            reference.includes(
              normalizedSearch,
            ) ||
            type
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            status
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesStatus =
            statusFilter === "ALL" ||
            status === statusFilter;

          const matchesType =
            typeFilter === "ALL" ||
            type === typeFilter ||
            getTransactionDirection(
              transaction,
            ) === typeFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesType
          );
        },
      );
    }, [
      search,
      statusFilter,
      typeFilter,
      transactions,
    ]);

  const summary = useMemo(() => {
    let credits = 0;
    let debits = 0;
    let completed = 0;
    let pending = 0;
    let failed = 0;

    transactions.forEach(
      (transaction) => {
        const amount =
          getTransactionAmount(
            transaction,
          );

        if (amount !== null) {
          if (
            getTransactionDirection(
              transaction,
            ) === "CREDIT"
          ) {
            credits += amount;
          } else {
            debits += amount;
          }
        }

        const status =
          getTransactionStatus(
            transaction,
          );

        if (status === "COMPLETED") {
          completed += 1;
        }

        if (
          status === "PENDING" ||
          status === "PROCESSING"
        ) {
          pending += 1;
        }

        if (
          status === "FAILED" ||
          status === "REVERSED" ||
          status === "CANCELLED"
        ) {
          failed += 1;
        }
      },
    );

    return {
      loaded: transactions.length,
      credits,
      debits,
      completed,
      pending,
      failed,
    };
  }, [transactions]);

  const currency = selectedAccount
    ? getCurrency(selectedAccount)
    : "USD";

  const selectedAccountNumber =
    selectedAccount
      ? getAccountNumber(
          selectedAccount,
        )
      : "";

  const retry = () =>
    loadHistory({
      background: false,
    });

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/savings"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to savings
            </Link>

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <ReceiptIcon />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Savings activity
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  Savings history
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Review transactions associated with your savings account.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              loadHistory({
                background: true,
              })
            }
            disabled={
              refreshing ||
              !selectedAccountId
            }
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
        </div>

        {/* Account selector */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-slate-500 dark:text-slate-400" />

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Savings account
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose the account whose activity you want to review.
                  </p>
                </div>
              </div>

              {selectedAccount && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {getAccountType(
                      selectedAccount,
                    )}
                  </span>

                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {maskAccountNumber(
                      selectedAccountNumber,
                    )}
                  </span>

                  <span className="text-slate-300 dark:text-slate-700">
                    •
                  </span>

                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {getCurrency(
                      selectedAccount,
                    )}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      getAccountStatus(
                        selectedAccount,
                      ) === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {formatStatus(
                      getAccountStatus(
                        selectedAccount,
                      ),
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full xl:max-w-md">
              <label
                htmlFor="savings-history-account"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Account
              </label>

              <select
                id="savings-history-account"
                value={
                  selectedAccountId
                }
                onChange={(event) => {
                  setSelectedAccountId(
                    event.target.value,
                  );
                  setTransactions([]);
                  setError("");
                }}
                disabled={
                  accountsLoading ||
                  savingsAccounts.length ===
                    0
                }
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-950"
              >
                <option value="">
                  {accountsLoading
                    ? "Loading accounts..."
                    : savingsAccounts.length
                      ? "Select savings account"
                      : "No savings accounts found"}
                </option>

                {savingsAccounts.map(
                  (account) => {
                    const id =
                      getAccountId(
                        account,
                      );

                    return (
                      <option
                        key={id}
                        value={id}
                      >
                        {getAccountType(
                          account,
                        )}{" "}
                        •{" "}
                        {maskAccountNumber(
                          getAccountNumber(
                            account,
                          ),
                        )}{" "}
                        •{" "}
                        {getCurrency(
                          account,
                        )}
                      </option>
                    );
                  },
                )}
              </select>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
          >
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-red-900 dark:text-red-300">
                  Unable to load savings history
                </p>

                <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={retry}
                className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-red-800 transition hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950/50"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            icon={FileText}
            label="Loaded"
            value={summary.loaded}
          />

          <SummaryCard
            icon={ArrowDownLeft}
            label="Credits"
            value={formatMoney(
              summary.credits,
              currency,
            )}
            positive
          />

          <SummaryCard
            icon={ArrowUpRight}
            label="Debits"
            value={formatMoney(
              summary.debits,
              currency,
            )}
          />

          <SummaryCard
            icon={PiggyBank}
            label="Completed"
            value={summary.completed}
          />

          <SummaryCard
            icon={Clock3}
            label="Pending"
            value={summary.pending}
            warning
          />
        </div>

        {/* Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />

            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Filter activity
            </h2>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search description, reference or type..."
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-950"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-950"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status === "ALL"
                      ? "All statuses"
                      : formatStatus(
                          status,
                        )}
                  </option>
                ),
              )}
            </select>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value,
                )
              }
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-950"
              aria-label="Filter by transaction type"
            >
              {TYPE_OPTIONS.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type === "ALL"
                      ? "All transaction types"
                      : formatType(
                          type,
                        )}
                  </option>
                ),
              )}
            </select>
          </div>
        </section>

        {/* History */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Transaction history
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {filteredTransactions.length} transaction
                {filteredTransactions.length ===
                1
                  ? ""
                  : "s"} shown on this page.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-4 w-4" />
              Page {pageNumber}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700 dark:text-emerald-400" />

              <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                Loading savings history...
              </p>
            </div>
          ) : filteredTransactions.length ===
            0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <FileText className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                No transactions found
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                There are no savings transactions matching your current
                account and filters.
              </p>

              {(search ||
                statusFilter !==
                  "ALL" ||
                typeFilter !==
                  "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter(
                      "ALL",
                    );
                    setTypeFilter("ALL");
                  }}
                  className="mt-5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/50">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Transaction
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Type
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Date
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredTransactions.map(
                      (
                        transaction,
                        index,
                      ) => {
                        const id =
                          getTransactionId(
                            transaction,
                          );

                        const direction =
                          getTransactionDirection(
                            transaction,
                          );

                        const credit =
                          direction ===
                          "CREDIT";

                        const amount =
                          getTransactionAmount(
                            transaction,
                          );

                        const transactionCurrency =
                          getTransactionCurrency(
                            transaction,
                            currency,
                          );

                        const status =
                          getTransactionStatus(
                            transaction,
                          );

                        const StatusIcon =
                          getStatusIcon(
                            status,
                          );

                        return (
                          <tr
                            key={
                              id ||
                              getTransactionReference(
                                transaction,
                              ) ||
                              index
                            }
                            className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                    credit
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {credit ? (
                                    <ArrowDownLeft className="h-5 w-5" />
                                  ) : (
                                    <ArrowUpRight className="h-5 w-5" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="max-w-[300px] truncate text-sm font-bold text-slate-950 dark:text-white">
                                    {getTransactionDescription(
                                      transaction,
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {getTransactionReference(
                                      transaction,
                                    ) ||
                                      "No reference"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {formatType(
                                getTransactionType(
                                  transaction,
                                ),
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {formatDateTime(
                                getTransactionDate(
                                  transaction,
                                ),
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold ${getStatusClasses(
                                  status,
                                )}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {formatStatus(
                                  status,
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span
                                className={`text-sm font-bold ${
                                  credit
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-slate-950 dark:text-white"
                                }`}
                              >
                                {credit
                                  ? "+"
                                  : "−"}
                                {formatMoney(
                                  amount,
                                  transactionCurrency,
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              {id ? (
                                <Link
                                  to={`/transactions/${encodeURIComponent(
                                    String(id),
                                  )}`}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                                >
                                  View
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
                {filteredTransactions.map(
                  (
                    transaction,
                    index,
                  ) => {
                    const id =
                      getTransactionId(
                        transaction,
                      );

                    const direction =
                      getTransactionDirection(
                        transaction,
                      );

                    const credit =
                      direction ===
                      "CREDIT";

                    const amount =
                      getTransactionAmount(
                        transaction,
                      );

                    const transactionCurrency =
                      getTransactionCurrency(
                        transaction,
                        currency,
                      );

                    const status =
                      getTransactionStatus(
                        transaction,
                      );

                    const StatusIcon =
                      getStatusIcon(
                        status,
                      );

                    return (
                      <div
                        key={
                          id ||
                          getTransactionReference(
                            transaction,
                          ) ||
                          index
                        }
                        className="p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              credit
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {credit ? (
                              <ArrowDownLeft className="h-5 w-5" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                                  {getTransactionDescription(
                                    transaction,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {formatDateTime(
                                    getTransactionDate(
                                      transaction,
                                    ),
                                  )}
                                </p>
                              </div>

                              <p
                                className={`shrink-0 text-sm font-bold ${
                                  credit
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-slate-950 dark:text-white"
                                }`}
                              >
                                {credit
                                  ? "+"
                                  : "−"}
                                {formatMoney(
                                  amount,
                                  transactionCurrency,
                                )}
                              </p>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {formatType(
                                  getTransactionType(
                                    transaction,
                                  ),
                                )}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                                  status,
                                )}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {formatStatus(
                                  status,
                                )}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                Ref:{" "}
                                {getTransactionReference(
                                  transaction,
                                ) ||
                                  "Not provided"}
                              </p>

                              {id && (
                                <Link
                                  to={`/transactions/${encodeURIComponent(
                                    String(id),
                                  )}`}
                                  className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                                >
                                  Details
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Pagination */}
              {(hasPrevious ||
                hasNext ||
                cursorHistory.length >
                  0) && (
                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/50">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Page {pageNumber}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={
                        goPrevious
                      }
                      disabled={
                        cursorHistory.length ===
                        0
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={goNext}
                      disabled={
                        !hasNext ||
                        !nextCursor
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Security */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Secure account history
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Transaction records shown here are retrieved from your
                authenticated Epex Bank account. The page does not generate
                sample transactions, balances or activity.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const ReceiptIcon = () => (
  <FileText className="h-6 w-6" />
);

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  positive = false,
  warning = false,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" />
      </div>

      {positive && (
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
          Credit
        </span>
      )}

      {warning && (
        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
          Attention
        </span>
      )}
    </div>

    <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
      {label}
    </p>

    <p
      className={`mt-1 truncate text-lg font-bold ${
        positive
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-slate-950 dark:text-white"
      }`}
    >
      {value}
    </p>
  </div>
);

export default SavingsHistory;