import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  RefreshCw,
  ReceiptText,
  Search,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import api from "../../services/api.js";

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
  "CREDIT",
  "CASH_IN",
]);

const formatType = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatAmount = (
  amount,
  currency = "USD",
) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  const currencyCode =
    typeof currency === "string"
      ? currency.toUpperCase()
      : String(
          currency?.code ||
            currency?.currencyCode ||
            currency?.currency ||
            "USD",
        ).toUpperCase();

  const decimals =
    typeof currency === "object" &&
    Number.isInteger(Number(currency?.decimals))
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

const normalizeWallets = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.wallets)) {
    return data.wallets;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (data?.wallet) {
    return [data.wallet];
  }

  return [];
};

const normalizeTransactions = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return {
      transactions: data,
      nextCursor: null,
      hasMore: false,
    };
  }

  const transactions = Array.isArray(
    data?.transactions,
  )
    ? data.transactions
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
        ? data.results
        : [];

  return {
    transactions,
    nextCursor:
      data?.nextCursor ||
      data?.pagination?.nextCursor ||
      data?.meta?.nextCursor ||
      null,
    hasMore: Boolean(
      data?.hasMore ??
        data?.pagination?.hasMore ??
        data?.meta?.hasMore,
    ),
  };
};

const getWalletId = (wallet) =>
  wallet?.id ||
  wallet?.walletId ||
  wallet?.account?.id ||
  null;

const getWalletNumber = (wallet) =>
  wallet?.walletNumber ||
  wallet?.accountNumber ||
  wallet?.account?.accountNumber ||
  null;

const getWalletCurrency = (wallet) =>
  wallet?.currency ||
  wallet?.currencyCode ||
  wallet?.account?.currency ||
  "USD";

const getTransactionId = (transaction) =>
  transaction?.id ||
  transaction?.transactionId ||
  transaction?.reference ||
  null;

const getTransactionType = (transaction) =>
  String(
    transaction?.type ||
      transaction?.transactionType ||
      "",
  ).toUpperCase();

const getTransactionStatus = (transaction) =>
  String(
    transaction?.status || "PENDING",
  ).toUpperCase();

const isCreditTransaction = (transaction) => {
  const type = getTransactionType(
    transaction,
  );

  if (CREDIT_TYPES.has(type)) {
    return true;
  }

  const direction = String(
    transaction?.direction ||
      transaction?.entryType ||
      transaction?.flow ||
      "",
  ).toUpperCase();

  if (
    direction === "CREDIT" ||
    direction === "IN"
  ) {
    return true;
  }

  if (
    direction === "DEBIT" ||
    direction === "OUT"
  ) {
    return false;
  }

  return Number(transaction?.amount || 0) >= 0;
};

const statusClasses = {
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  PENDING:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  PROCESSING:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
  FAILED:
    "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
  REVERSED:
    "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
  CANCELLED:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

const StatusIcon = ({ status }) => {
  if (status === "COMPLETED") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (
    status === "FAILED" ||
    status === "CANCELLED" ||
    status === "REVERSED"
  ) {
    return <XCircle className="h-4 w-4" />;
  }

  return <Clock3 className="h-4 w-4" />;
};

const WalletHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const queryWalletId =
    queryParams.get("walletId") ||
    queryParams.get("wallet");

  const [wallets, setWallets] = useState([]);
  const [walletsLoading, setWalletsLoading] =
    useState(true);
  const [walletsError, setWalletsError] =
    useState("");

  const [selectedWalletId, setSelectedWalletId] =
    useState(queryWalletId || "");

  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [loadingMore, setLoadingMore] =
    useState(false);

  const [error, setError] = useState("");

  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [nextCursor, setNextCursor] =
    useState(null);
  const [hasMore, setHasMore] =
    useState(false);

  const loadWallets = useCallback(async () => {
    setWalletsLoading(true);
    setWalletsError("");

    try {
      let response;

      try {
        response = await api.get("/wallets");
      } catch (firstError) {
        const responseStatus =
          firstError?.response?.status;

        if (
          responseStatus !== 404 &&
          responseStatus !== 501
        ) {
          throw firstError;
        }

        response = await api.get("/wallet");
      }

      const nextWallets = normalizeWallets(
        response?.data,
      );

      setWallets(nextWallets);

      return nextWallets;
    } catch (requestError) {
      setWallets([]);

      setWalletsError(
        requestError?.response?.data
          ?.message ||
          requestError?.message ||
          "Unable to load your wallets.",
      );

      return [];
    } finally {
      setWalletsLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(
    async ({
      append = false,
      cursor = null,
      silent = false,
    } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = {
          limit: 50,
          type: type || undefined,
          status: status || undefined,
          cursor: cursor || undefined,
        };

        let response;

        if (selectedWalletId) {
          try {
            response = await api.get(
              `/wallets/${encodeURIComponent(
                selectedWalletId,
              )}/transactions`,
              { params },
            );
          } catch (firstError) {
            const responseStatus =
              firstError?.response?.status;

            if (
              responseStatus !== 404 &&
              responseStatus !== 501
            ) {
              throw firstError;
            }

            response = await api.get(
              `/wallet/${encodeURIComponent(
                selectedWalletId,
              )}/transactions`,
              { params },
            );
          }
        } else {
          try {
            response = await api.get(
              "/wallets/transactions",
              { params },
            );
          } catch (firstError) {
            const responseStatus =
              firstError?.response?.status;

            if (
              responseStatus !== 404 &&
              responseStatus !== 501
            ) {
              throw firstError;
            }

            response = await api.get(
              "/wallet/transactions",
              { params },
            );
          }
        }

        const result = normalizeTransactions(
          response?.data,
        );

        setTransactions((current) => {
          if (!append) {
            return result.transactions;
          }

          const existingIds = new Set(
            current.map((transaction) =>
              getTransactionId(transaction),
            ),
          );

          const incoming =
            result.transactions.filter(
              (transaction) =>
                !existingIds.has(
                  getTransactionId(transaction),
                ),
            );

          return [...current, ...incoming];
        });

        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);

        return result;
      } catch (requestError) {
        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "Unable to load wallet history.",
        );

        if (!append) {
          setTransactions([]);
          setNextCursor(null);
          setHasMore(false);
        }

        throw requestError;
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [
      selectedWalletId,
      type,
      status,
    ],
  );

  useEffect(() => {
    loadWallets().catch(() => {});
  }, [loadWallets]);

  useEffect(() => {
    if (!wallets.length) {
      setSelectedWalletId("");
      return;
    }

    const queryWallet = queryWalletId
      ? wallets.find(
          (wallet) =>
            String(getWalletId(wallet)) ===
              String(queryWalletId) ||
            String(
              getWalletNumber(wallet),
            ) === String(queryWalletId),
        )
      : null;

    if (queryWallet) {
      setSelectedWalletId(
        getWalletId(queryWallet),
      );
      return;
    }

    const selectedWallet = wallets.find(
      (wallet) =>
        String(getWalletId(wallet)) ===
        String(selectedWalletId),
    );

    if (selectedWallet) {
      return;
    }

    setSelectedWalletId(
      getWalletId(wallets[0]) || "",
    );
  }, [
    wallets,
    queryWalletId,
    selectedWalletId,
  ]);

  useEffect(() => {
    setTransactions([]);
    setNextCursor(null);
    setHasMore(false);

    loadTransactions().catch(() => {});
  }, [
    selectedWalletId,
    type,
    status,
    loadTransactions,
  ]);

  const filteredTransactions = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return transactions;
    }

    return transactions.filter(
      (transaction) => {
        const values = [
          transaction?.reference,
          transaction?.type,
          transaction?.transactionType,
          transaction?.status,
          transaction?.description,
          transaction?.accountNumber,
          transaction?.account?.accountNumber,
          transaction?.counterparty?.name,
          transaction?.counterparty?.accountNumber,
          transaction?.currency,
          transaction?.currencyCode,
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
    let completed = 0;
    let pending = 0;

    for (const transaction of transactions) {
      const amount = Math.abs(
        Number(transaction?.amount ?? 0),
      );

      if (!Number.isFinite(amount)) {
        continue;
      }

      if (
        isCreditTransaction(transaction)
      ) {
        credits += amount;
      } else {
        debits += amount;
      }

      const transactionStatus =
        getTransactionStatus(transaction);

      if (transactionStatus === "COMPLETED") {
        completed += 1;
      }

      if (
        transactionStatus === "PENDING" ||
        transactionStatus === "PROCESSING"
      ) {
        pending += 1;
      }
    }

    return {
      count: transactions.length,
      credits,
      debits,
      completed,
      pending,
    };
  }, [transactions]);

  const selectedWallet = useMemo(
    () =>
      wallets.find(
        (wallet) =>
          String(getWalletId(wallet)) ===
          String(selectedWalletId),
      ) ||
      wallets[0] ||
      null,
    [wallets, selectedWalletId],
  );

  const selectedCurrency =
    getWalletCurrency(selectedWallet);

  const resetFilters = () => {
    setType("");
    setStatus("");
    setSearch("");
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    await Promise.all([
      loadWallets().catch(() => {}),
      loadTransactions({
        silent: true,
      }).catch(() => {}),
    ]);

    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (
      loadingMore ||
      !hasMore ||
      !nextCursor
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
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              Wallet activity
            </span>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Wallet history
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review wallet transactions and activity
              directly from your Epex Bank ledger.
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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

      {/* Wallet selector */}
      {walletsLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </section>
      ) : wallets.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="wallet-history-selector"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                Wallet
              </label>

              <select
                id="wallet-history-selector"
                value={selectedWalletId}
                onChange={(event) =>
                  setSelectedWalletId(
                    event.target.value,
                  )
                }
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
              >
                {wallets.map((wallet) => (
                  <option
                    key={
                      getWalletId(wallet) ||
                      getWalletNumber(wallet)
                    }
                    value={getWalletId(wallet)}
                  >
                    {getWalletNumber(wallet) ||
                      "Wallet"}{" "}
                    ·{" "}
                    {typeof getWalletCurrency(
                      wallet,
                    ) === "string"
                      ? getWalletCurrency(
                          wallet,
                        )
                      : getWalletCurrency(wallet)
                          ?.code || "USD"}
                  </option>
                ))}
              </select>
            </div>

            {selectedWallet && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Wallet balance
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {formatAmount(
                    selectedWallet?.availableBalance ??
                      selectedWallet?.balance ??
                      0,
                    selectedCurrency,
                  )}
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
            No wallet available
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
            {walletsError ||
              "No wallet was returned for your account."}
          </p>
        </section>
      )}

      {/* Summary */}
      {!loading &&
        !error &&
        transactions.length > 0 && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transactions
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {summary.count}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Current result set
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                Credits
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatAmount(
                  summary.credits,
                  selectedCurrency,
                )}
              </p>

              <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-300/70">
                Incoming activity
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Debits
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                {formatAmount(
                  summary.debits,
                  selectedCurrency,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Outgoing activity
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Processing
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {summary.pending}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Pending or processing
              </p>
            </div>
          </section>
        )}

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
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
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
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
                setStatus(event.target.value)
              }
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
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
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
        <section className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />

            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">
                Wallet history unavailable
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300">
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

      {/* Transaction list */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />

            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading wallet history...
            </p>
          </div>
        ) : filteredTransactions.length ===
          0 ? (
          <div className="p-10 text-center sm:p-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <ReceiptText className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
              No wallet transactions found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {activeFilters
                ? "There are no wallet transactions matching your current filters."
                : "Wallet activity will appear here when transactions are available."}
            </p>

            {activeFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
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
                <thead className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/60">
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

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredTransactions.map(
                    (transaction) => {
                      const isCredit =
                        isCreditTransaction(
                          transaction,
                        );

                      const transactionId =
                        getTransactionId(
                          transaction,
                        );

                      const transactionStatus =
                        getTransactionStatus(
                          transaction,
                        );

                      const statusClass =
                        statusClasses[
                          transactionStatus
                        ] ||
                        statusClasses.PENDING;

                      const amount = Math.abs(
                        Number(
                          transaction?.amount ??
                            0,
                        ),
                      );

                      return (
                        <tr
                          key={
                            transactionId ||
                            `${transaction?.createdAt}-${transaction?.reference}`
                          }
                          className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={[
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                  isCredit
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
                                ].join(" ")}
                              >
                                {isCredit ? (
                                  <ArrowDownLeft className="h-5 w-5" />
                                ) : (
                                  <ArrowUpRight className="h-5 w-5" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {formatType(
                                    getTransactionType(
                                      transaction,
                                    ),
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
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {transaction
                                ?.account
                                ?.accountNumber ||
                                transaction?.accountNumber ||
                                getWalletNumber(
                                  selectedWallet,
                                ) ||
                                "—"}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <p
                              className={[
                                "text-sm font-bold",
                                isCredit
                                  ? "text-emerald-600 dark:text-emerald-300"
                                  : "text-slate-900 dark:text-white",
                              ].join(" ")}
                            >
                              {isCredit ? "+" : "-"}
                              {formatAmount(
                                amount,
                                transaction?.currency ||
                                  selectedCurrency,
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
                                  transaction.currency ||
                                    selectedCurrency,
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
                                  transactionStatus
                                }
                              />

                              {formatType(
                                transactionStatus,
                              )}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(
                              transaction?.createdAt ||
                                transaction?.processedAt,
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
                              disabled={
                                !transactionId
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
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
            <div className="divide-y divide-slate-100 dark:divide-slate-700 md:hidden">
              {filteredTransactions.map(
                (transaction) => {
                  const isCredit =
                    isCreditTransaction(
                      transaction,
                    );

                  const transactionId =
                    getTransactionId(
                      transaction,
                    );

                  const transactionStatus =
                    getTransactionStatus(
                      transaction,
                    );

                  const statusClass =
                    statusClasses[
                      transactionStatus
                    ] ||
                    statusClasses.PENDING;

                  const amount = Math.abs(
                    Number(
                      transaction?.amount ??
                        0,
                    ),
                  );

                  return (
                    <article
                      key={
                        transactionId ||
                        `${transaction?.createdAt}-${transaction?.reference}`
                      }
                      className="p-4"
                    >
                      <button
                        type="button"
                        disabled={!transactionId}
                        onClick={() =>
                          openTransaction(
                            transaction,
                          )
                        }
                        className="w-full text-left disabled:cursor-default"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={[
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                isCredit
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                                  : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
                              ].join(" ")}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="h-5 w-5" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {formatType(
                                  getTransactionType(
                                    transaction,
                                  ),
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
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-slate-900 dark:text-white",
                            ].join(" ")}
                          >
                            {isCredit ? "+" : "-"}
                            {formatAmount(
                              amount,
                              transaction?.currency ||
                                selectedCurrency,
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
                                transactionStatus
                              }
                            />

                            {formatType(
                              transactionStatus,
                            )}
                          </span>

                          <span className="text-xs text-slate-400">
                            {formatDate(
                              transaction?.createdAt ||
                                transaction?.processedAt,
                            )}
                          </span>
                        </div>

                        {transaction?.description && (
                          <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                            {transaction.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
                          <span className="text-xs font-semibold text-slate-400">
                            {transaction
                              ?.account
                              ?.accountNumber ||
                              transaction?.accountNumber ||
                              getWalletNumber(
                                selectedWallet,
                              ) ||
                              "Wallet"}
                          </span>

                          {transactionId && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-300">
                              View details
                              <Eye className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </button>
                    </article>
                  );
                },
              )}
            </div>

            {/* Pagination */}
            {hasMore && nextCursor && (
              <div className="border-t border-slate-100 p-4 text-center dark:border-slate-700">
                <button
                  type="button"
                  disabled={
                    loadingMore ||
                    refreshing
                  }
                  onClick={handleLoadMore}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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

      {/* Security */}
      <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Wallet history is loaded from the authenticated
          Epex Bank API. Transaction records shown here are
          not generated locally. Use the transaction details
          page to review the complete record returned by the
          bank.
        </p>
      </section>
    </div>
  );
};

export default WalletHistory;