import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  FileText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import api from "../../services/api.js";

const formatAmount = (amount, currency = "USD") => {
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
    return `${currencyCode} ${numericAmount.toFixed(decimals)}`;
  }
};

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

const normalizeWallet = (payload) => {
  const data = payload?.data ?? payload;

  return (
    data?.wallet ||
    data?.walletData ||
    data?.result ||
    (data && !Array.isArray(data) ? data : null)
  );
};

const normalizeTransactions = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.transactions)) {
    return data.transactions;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};

const getCurrency = (wallet) =>
  wallet?.currency ||
  wallet?.currencyCode ||
  wallet?.account?.currency ||
  "USD";

const getCurrencyCode = (currency) =>
  typeof currency === "string"
    ? currency.toUpperCase()
    : String(
        currency?.code ||
          currency?.currencyCode ||
          currency?.currency ||
          "USD",
      ).toUpperCase();

const getAvailableBalance = (wallet) =>
  Number(
    wallet?.availableBalance ??
      wallet?.balance ??
      wallet?.currentBalance ??
      wallet?.ledgerBalance ??
      0,
  );

const getLedgerBalance = (wallet) =>
  Number(
    wallet?.ledgerBalance ??
      wallet?.balance ??
      wallet?.currentBalance ??
      wallet?.availableBalance ??
      0,
  );

const getWalletStatus = (wallet) =>
  String(
    wallet?.status ||
      wallet?.state ||
      "ACTIVE",
  ).toUpperCase();

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

const getTransactionId = (transaction) =>
  transaction?.id ||
  transaction?.transactionId ||
  transaction?.reference ||
  null;

const isCreditTransaction = (transaction) => {
  const type = String(
    transaction?.type ||
      transaction?.transactionType ||
      "",
  ).toUpperCase();

  if (
    [
      "DEPOSIT",
      "REFUND",
      "LOAN_DISBURSEMENT",
      "DIVIDEND",
      "INTEREST",
      "CREDIT",
      "CASH_IN",
    ].includes(type)
  ) {
    return true;
  }

  if (
    [
      "WITHDRAWAL",
      "TRANSFER",
      "PAYMENT",
      "FEE",
      "LOAN_REPAYMENT",
      "INVESTMENT_BUY",
      "CASH_OUT",
      "DEBIT",
    ].includes(type)
  ) {
    return false;
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

const getStatusClass = (status) => {
  const normalized = String(
    status || "",
  ).toUpperCase();

  if (
    normalized === "COMPLETED" ||
    normalized === "SUCCESS" ||
    normalized === "APPROVED"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  }

  if (
    normalized === "FAILED" ||
    normalized === "REJECTED" ||
    normalized === "CANCELLED" ||
    normalized === "REVERSED"
  ) {
    return "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
};

const StatusIcon = ({ status }) => {
  const normalized = String(
    status || "",
  ).toUpperCase();

  if (
    normalized === "COMPLETED" ||
    normalized === "SUCCESS" ||
    normalized === "APPROVED"
  ) {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (
    normalized === "FAILED" ||
    normalized === "REJECTED" ||
    normalized === "CANCELLED" ||
    normalized === "REVERSED"
  ) {
    return <XCircle className="h-4 w-4" />;
  }

  return <Clock3 className="h-4 w-4" />;
};

const DetailRow = ({
  label,
  value,
  copyable = false,
}) => {
  const handleCopy = async () => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(
        String(value),
      );
    } catch {
      // Clipboard access may be unavailable.
    }
  };

  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2 sm:max-w-[65%]">
        <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
          {value || "—"}
        </span>

        {copyable && value && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            title={`Copy ${label}`}
            aria-label={`Copy ${label}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const WalletDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletId: routeWalletId } =
    useParams();

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const walletId =
    routeWalletId ||
    queryParams.get("walletId") ||
    queryParams.get("id");

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [transactionsLoading, setTransactionsLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [transactionsError, setTransactionsError] =
    useState("");

  const [showBalances, setShowBalances] =
    useState(true);

  const loadWallet = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        let response;

        if (walletId) {
          try {
            response = await api.get(
              `/wallets/${encodeURIComponent(
                walletId,
              )}`,
            );
          } catch (firstError) {
            const status =
              firstError?.response?.status;

            if (
              status !== 404 &&
              status !== 501
            ) {
              throw firstError;
            }

            response = await api.get(
              `/wallet/${encodeURIComponent(
                walletId,
              )}`,
            );
          }
        } else {
          try {
            response = await api.get(
              "/wallets",
            );
          } catch (firstError) {
            const status =
              firstError?.response?.status;

            if (
              status !== 404 &&
              status !== 501
            ) {
              throw firstError;
            }

            response = await api.get(
              "/wallet",
            );
          }
        }

        const data = response?.data;

        let nextWallet =
          normalizeWallet(data);

        if (
          !nextWallet &&
          Array.isArray(
            data?.data?.wallets,
          )
        ) {
          nextWallet =
            data.data.wallets.find(
              (item) =>
                String(getWalletId(item)) ===
                String(walletId),
            ) ||
            data.data.wallets[0] ||
            null;
        }

        if (
          !nextWallet &&
          Array.isArray(data?.wallets)
        ) {
          nextWallet =
            data.wallets.find(
              (item) =>
                String(getWalletId(item)) ===
                String(walletId),
            ) ||
            data.wallets[0] ||
            null;
        }

        if (!nextWallet) {
          throw new Error(
            "The Epex Bank API did not return wallet details.",
          );
        }

        setWallet(nextWallet);

        return nextWallet;
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load wallet details.";

        setWallet(null);
        setError(message);

        throw requestError;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [walletId],
  );

  const loadTransactions = useCallback(
    async () => {
      setTransactionsLoading(true);
      setTransactionsError("");

      try {
        let response;

        if (walletId) {
          try {
            response = await api.get(
              `/wallets/${encodeURIComponent(
                walletId,
              )}/transactions`,
              {
                params: {
                  limit: 20,
                },
              },
            );
          } catch (firstError) {
            const status =
              firstError?.response?.status;

            if (
              status !== 404 &&
              status !== 501
            ) {
              throw firstError;
            }

            response = await api.get(
              `/wallet/${encodeURIComponent(
                walletId,
              )}/transactions`,
              {
                params: {
                  limit: 20,
                },
              },
            );
          }
        } else {
          try {
            response = await api.get(
              "/wallets/transactions",
              {
                params: {
                  limit: 20,
                },
              },
            );
          } catch (firstError) {
            const status =
              firstError?.response?.status;

            if (
              status !== 404 &&
              status !== 501
            ) {
              throw firstError;
            }

            response = await api.get(
              "/wallet/transactions",
              {
                params: {
                  limit: 20,
                },
              },
            );
          }
        }

        setTransactions(
          normalizeTransactions(
            response?.data,
          ),
        );
      } catch (requestError) {
        setTransactions([]);

        setTransactionsError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "Unable to load wallet transactions.",
        );
      } finally {
        setTransactionsLoading(false);
      }
    },
    [walletId],
  );

  useEffect(() => {
    Promise.all([
      loadWallet(),
      loadTransactions(),
    ]).catch(() => {});
  }, [loadWallet, loadTransactions]);

  const handleRefresh = async () => {
    setRefreshing(true);

    await Promise.all([
      loadWallet({ silent: true }).catch(
        () => {},
      ),
      loadTransactions().catch(() => {}),
    ]);

    setRefreshing(false);
  };

  const currency = getCurrency(wallet);
  const currencyCode =
    getCurrencyCode(currency);

  const availableBalance =
    getAvailableBalance(wallet);

  const ledgerBalance =
    getLedgerBalance(wallet);

  const walletStatus =
    getWalletStatus(wallet);

  const walletNumber =
    getWalletNumber(wallet);

  const walletReference =
    wallet?.reference ||
    wallet?.walletReference ||
    wallet?.id ||
    null;

  const availableDifference =
    ledgerBalance - availableBalance;

  const accountId =
    wallet?.accountId ||
    wallet?.account?.id ||
    null;

  const accountNumber =
    wallet?.account?.accountNumber ||
    wallet?.accountNumber ||
    null;

  const createdAt =
    wallet?.createdAt ||
    wallet?.openedAt ||
    wallet?.createdOn ||
    null;

  const updatedAt =
    wallet?.updatedAt ||
    wallet?.lastUpdatedAt ||
    null;

  const maskedWalletNumber = walletNumber
    ? walletNumber.length > 4
      ? `•••• ${walletNumber.slice(-4)}`
      : "••••"
    : "—";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-7 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-600" />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Loading wallet details...
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Wallet
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              Wallet details
            </h1>
          </div>
        </div>

        <section className="rounded-3xl border border-red-100 bg-red-50 p-8 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <XCircle className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-red-900 dark:text-red-100">
              Wallet details unavailable
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
              {error ||
                "The requested wallet could not be found."}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  loadWallet().catch(() => {})
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/wallet")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-700 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                Back to wallet
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Wallet
              </p>

              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Wallet details
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
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

      {/* Balance hero */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 shadow-xl dark:bg-slate-800">
        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-400">
                  <WalletCards className="h-4 w-4" />

                  <span className="text-xs font-bold uppercase tracking-[0.16em]">
                    Available balance
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {showBalances
                      ? formatAmount(
                          availableBalance,
                          currency,
                        )
                      : "••••••••"}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowBalances(
                        (current) => !current,
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                    aria-label={
                      showBalances
                        ? "Hide wallet balance"
                        : "Show wallet balance"
                    }
                  >
                    {showBalances ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{currencyCode}</span>

                  <span>•</span>

                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 font-bold",
                      walletStatus ===
                        "ACTIVE"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-amber-400/10 text-amber-300",
                    ].join(" ")}
                  >
                    {formatType(
                      walletStatus,
                    )}
                  </span>
                </div>
              </div>

              {walletNumber && (
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(
                      String(walletNumber),
                    )
                  }
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {showBalances
                    ? walletNumber
                    : maskedWalletNumber}
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">
                  Ledger balance
                </p>

                <p className="mt-2 text-base font-bold text-white">
                  {showBalances
                    ? formatAmount(
                        ledgerBalance,
                        currency,
                      )
                    : "••••••"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">
                  Currency
                </p>

                <p className="mt-2 text-base font-bold text-white">
                  {currencyCode}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400">
                  Wallet number
                </p>

                <p className="mt-2 truncate text-base font-bold text-white">
                  {showBalances
                    ? walletNumber || "—"
                    : maskedWalletNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Balance warning */}
      {Number.isFinite(
        availableDifference,
      ) &&
        availableDifference > 0 && (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />

              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  Part of your balance may be unavailable
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  Your ledger balance is{" "}
                  {formatAmount(
                    availableDifference,
                    currency,
                  )}{" "}
                  higher than your available balance.
                  This may represent pending or reserved
                  activity.
                </p>
              </div>
            </div>
          </section>
        )}

      {/* Details + actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <WalletCards className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Wallet information
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Information returned by the bank.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <DetailRow
              label="Wallet ID"
              value={wallet?.id || wallet?.walletId}
              copyable
            />

            <DetailRow
              label="Wallet number"
              value={walletNumber}
              copyable
            />

            <DetailRow
              label="Reference"
              value={walletReference}
              copyable
            />

            <DetailRow
              label="Status"
              value={formatType(walletStatus)}
            />

            <DetailRow
              label="Currency"
              value={currencyCode}
            />

            <DetailRow
              label="Account"
              value={accountNumber}
              copyable
            />

            {createdAt && (
              <DetailRow
                label="Created"
                value={formatDate(createdAt)}
              />
            )}

            {updatedAt && (
              <DetailRow
                label="Last updated"
                value={formatDate(updatedAt)}
              />
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Wallet actions
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Continue with an authenticated banking action.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  accountId
                    ? `/deposit?accountId=${encodeURIComponent(
                        accountId,
                      )}`
                    : "/deposit",
                )
              }
              className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ArrowDownLeft className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Deposit
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add funds to your account.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  accountId
                    ? `/withdrawals?accountId=${encodeURIComponent(
                        accountId,
                      )}`
                    : "/withdrawals",
                )
              }
              className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <ArrowUpRight className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Withdraw
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Request a withdrawal.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  accountId
                    ? `/transfers/internal?accountId=${encodeURIComponent(
                        accountId,
                      )}`
                    : "/transfers/internal",
                )
              }
              className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <ArrowUpRight className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Transfer
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Send funds internally.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  accountId
                    ? `/transactions?accountId=${encodeURIComponent(
                        accountId,
                      )}`
                    : "/transactions",
                )
              }
              className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <FileText className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Transactions
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Review account activity.
              </p>
            </button>
          </div>
        </section>
      </div>

      {/* Transactions */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Wallet activity
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Recent transactions associated with this wallet.
            </p>
          </div>

          <Link
            to={
              walletId
                ? `/transactions?walletId=${encodeURIComponent(
                    walletId,
                  )}`
                : "/transactions"
            }
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-300"
          >
            View all
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {transactionsLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Loading wallet activity...
            </p>
          </div>
        ) : transactionsError ? (
          <div className="p-6">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />

                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-200">
                    Activity unavailable
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700 dark:text-red-300">
                    {transactionsError}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <FileText className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              No wallet transactions
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Wallet activity will appear here when
              available.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {transactions.map(
              (transaction) => {
                const isCredit =
                  isCreditTransaction(
                    transaction,
                  );

                const transactionId =
                  getTransactionId(
                    transaction,
                  );

                const status =
                  transaction?.status ||
                  "PENDING";

                const amount = Math.abs(
                  Number(
                    transaction?.amount ?? 0,
                  ),
                );

                return (
                  <button
                    key={
                      transactionId ||
                      `${transaction?.createdAt}-${transaction?.reference}`
                    }
                    type="button"
                    disabled={!transactionId}
                    onClick={() => {
                      if (!transactionId) {
                        return;
                      }

                      navigate(
                        `/transactions/${encodeURIComponent(
                          transactionId,
                        )}`,
                      );
                    }}
                    className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50 disabled:cursor-default sm:p-5 dark:hover:bg-slate-800/60"
                  >
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

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {formatType(
                          transaction?.type ||
                            transaction?.transactionType ||
                            "Transaction",
                        )}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {formatDate(
                            transaction?.createdAt ||
                              transaction?.processedAt,
                          )}
                        </span>

                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            getStatusClass(
                              status,
                            ),
                          ].join(" ")}
                        >
                          <StatusIcon
                            status={status}
                          />

                          {formatType(status)}
                        </span>
                      </div>

                      {transaction?.reference && (
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {transaction.reference}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
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
                            currency,
                        )}
                      </p>
                    </div>
                  </button>
                );
              },
            )}
          </div>
        )}
      </section>

      {/* Security */}
      <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Wallet information and transaction activity
          displayed here are loaded from your authenticated
          Epex Bank account. Never share your password, OTP,
          PIN or other security credentials with anyone.
        </p>
      </section>
    </div>
  );
};

export default WalletDetails;