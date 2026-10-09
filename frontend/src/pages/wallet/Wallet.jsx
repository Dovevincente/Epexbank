import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  WalletMinimal,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
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

const getWalletBalance = (wallet) =>
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

  return direction === "CREDIT" || direction === "IN";
};

const getTransactionStatusClass = (status) => {
  const normalized = String(
    status || "",
  ).toUpperCase();

  if (
    normalized === "COMPLETED" ||
    normalized === "SUCCESS"
  ) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "REVERSED"
  ) {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
  }

  return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
};

const Wallet = () => {
  const navigate = useNavigate();

  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");
  const [transactionsError, setTransactionsError] =
    useState("");

  const [selectedWalletId, setSelectedWalletId] =
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

        try {
          response = await api.get("/wallets");
        } catch (firstError) {
          const status =
            firstError?.response?.status;

          if (status !== 404 && status !== 501) {
            throw firstError;
          }

          response = await api.get("/wallet");
        }

        const nextWallets =
          normalizeWallets(response?.data);

        if (nextWallets.length > 0) {
          setWallets(nextWallets);
        } else {
          const singleWallet =
            normalizeWallet(response?.data);

          setWallets(
            singleWallet ? [singleWallet] : [],
          );
        }

        return nextWallets;
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load your wallet.";

        setWallets([]);
        setError(message);

        throw requestError;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const loadTransactions = useCallback(
    async () => {
      setTransactionsError("");

      try {
        let response;

        try {
          response = await api.get(
            "/wallets/transactions",
            {
              params: {
                limit: 5,
              },
            },
          );
        } catch (firstError) {
          const status =
            firstError?.response?.status;

          if (status !== 404 && status !== 501) {
            throw firstError;
          }

          response = await api.get(
            "/wallet/transactions",
            {
              params: {
                limit: 5,
              },
            },
          );
        }

        setTransactions(
          normalizeTransactions(
            response?.data,
          ).slice(0, 5),
        );
      } catch (requestError) {
        setTransactions([]);
        setTransactionsError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "Unable to load wallet activity.",
        );
      }
    },
    [],
  );

  useEffect(() => {
    Promise.all([
      loadWallet(),
      loadTransactions(),
    ]).catch(() => {});
  }, [loadWallet, loadTransactions]);

  useEffect(() => {
    if (!wallets.length) {
      setSelectedWalletId("");
      return;
    }

    const currentWallet = wallets.find(
      (wallet) =>
        String(getWalletId(wallet)) ===
        String(selectedWalletId),
    );

    if (currentWallet) {
      return;
    }

    setSelectedWalletId(
      getWalletId(wallets[0]) || "",
    );
  }, [wallets, selectedWalletId]);

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

  const totalAvailableBalance = useMemo(
    () =>
      wallets.reduce((total, wallet) => {
        const value =
          getWalletBalance(wallet);

        return (
          total +
          (Number.isFinite(value) ? value : 0)
        );
      }, 0),
    [wallets],
  );

  const selectedCurrency = getCurrency(
    selectedWallet,
  );

  const selectedCurrencyCode =
    getCurrencyCode(selectedCurrency);

  const selectedBalance =
    getWalletBalance(selectedWallet);

  const selectedLedgerBalance =
    getLedgerBalance(selectedWallet);

  const walletStatus =
    getWalletStatus(selectedWallet);

  const walletNumber =
    getWalletNumber(selectedWallet);

  const walletReference =
    selectedWallet?.reference ||
    selectedWallet?.walletReference ||
    selectedWallet?.id ||
    null;

  const availableDifference =
    selectedLedgerBalance -
    selectedBalance;

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

  const copyValue = async (value) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(
        String(value),
      );
    } catch {
      // Clipboard access may be unavailable.
    }
  };

  const maskValue = (value) => {
    if (!value) return "—";

    const text = String(value);

    if (text.length <= 4) {
      return "••••";
    }

    return `•••• ${text.slice(-4)}`;
  };

  const hasWallet = Boolean(selectedWallet);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              Digital wallet
            </span>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Wallet
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Manage your Epex Bank wallet, available
              funds and recent wallet activity.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
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

      {/* Error */}
      {error && (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />

            <div className="min-w-0">
              <p className="text-sm font-bold text-red-800 dark:text-red-200">
                Wallet unavailable
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadWallet().catch(() => {})
                }
                className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition hover:bg-red-700"
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && !wallets.length ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            Loading your wallet...
          </p>
        </section>
      ) : !hasWallet ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <WalletMinimal className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
            No wallet available
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Your account does not currently have a
            wallet returned by Epex Bank.
          </p>

          <button
            type="button"
            onClick={() => navigate("/accounts")}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            View accounts
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      ) : (
        <>
          {/* Wallet selector */}
          {wallets.length > 1 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <label
                htmlFor="wallet-selector"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400"
              >
                Wallet
              </label>

              <select
                id="wallet-selector"
                value={selectedWalletId}
                onChange={(event) =>
                  setSelectedWalletId(
                    event.target.value,
                  )
                }
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
              >
                {wallets.map((wallet) => (
                  <option
                    key={getWalletId(wallet)}
                    value={getWalletId(wallet)}
                  >
                    {getWalletNumber(wallet) ||
                      getWalletId(wallet) ||
                      "Wallet"}{" "}
                    ·{" "}
                    {getCurrencyCode(
                      getCurrency(wallet),
                    )}
                  </option>
                ))}
              </select>
            </section>
          )}

          {/* Balance */}
          <section className="overflow-hidden rounded-3xl bg-slate-950 shadow-xl dark:bg-slate-800">
            <div className="relative p-6 sm:p-8">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <WalletCards className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-[0.15em]">
                        Available wallet balance
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        {showBalances
                          ? formatAmount(
                              selectedBalance,
                              selectedCurrency,
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
                            ? "Hide balance"
                            : "Show balance"
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
                      <span>
                        {selectedCurrencyCode}
                      </span>

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
                        copyValue(walletNumber)
                      }
                      className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      {showBalances
                        ? walletNumber
                        : maskValue(walletNumber)}
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
                            selectedLedgerBalance,
                            selectedCurrency,
                          )
                        : "••••••"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-slate-400">
                      Currency
                    </p>

                    <p className="mt-2 text-base font-bold text-white">
                      {selectedCurrencyCode}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-slate-400">
                      Wallet ID
                    </p>

                    <p className="mt-2 truncate text-base font-bold text-white">
                      {selectedWallet?.id ||
                        selectedWallet?.walletId ||
                        "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => navigate("/deposit")}
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ArrowDownToLine className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Deposit
              </p>

              <p className="mt-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Add funds
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/withdrawals")}
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <ArrowUpRight className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Withdraw
              </p>

              <p className="mt-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Move funds out
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/transfers/internal")
              }
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <ArrowUpRight className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Transfer
              </p>

              <p className="mt-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Send funds
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/transactions")
              }
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Clock3 className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Activity
              </p>

              <p className="mt-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                View transactions
              </p>
            </button>
          </section>

          {/* Secondary information */}
          {Number.isFinite(
            availableDifference,
          ) &&
            availableDifference > 0 && (
              <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />

                  <div>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                      Some funds may be unavailable
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
                      Your ledger balance is{" "}
                      {formatAmount(
                        availableDifference,
                        selectedCurrency,
                      )}{" "}
                      higher than your currently
                      available balance. This can
                      represent pending or reserved
                      activity.
                    </p>
                  </div>
                </div>
              </section>
            )}

          {/* Recent activity */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Recent wallet activity
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  The latest activity returned by
                  Epex Bank.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/transactions")
                }
                className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-300"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {transactionsError ? (
              <div className="p-6">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                  <p className="text-sm font-bold text-red-800 dark:text-red-200">
                    Activity unavailable
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700 dark:text-red-300">
                    {transactionsError}
                  </p>
                </div>
              </div>
            ) : transactions.length ===
              0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <Clock3 className="h-5 w-5" />
                </div>

                <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                  No wallet activity
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Wallet transactions will appear here
                  when available.
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

                    const amount = Math.abs(
                      Number(
                        transaction?.amount ??
                          0,
                      ),
                    );

                    const status =
                      transaction?.status ||
                      "PENDING";

                    return (
                      <button
                        key={
                          transactionId ||
                          `${transaction?.createdAt}-${transaction?.reference}`
                        }
                        type="button"
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
                        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50 sm:p-5 dark:hover:bg-slate-800/60"
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
                            <ArrowDownToLine className="h-5 w-5" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {formatType(
                              transaction?.type ||
                                transaction?.transactionType ||
                                "Wallet transaction",
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
                                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                getTransactionStatusClass(
                                  status,
                                ),
                              ].join(" ")}
                            >
                              {formatType(status)}
                            </span>
                          </div>
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
                                selectedCurrency,
                            )}
                          </p>

                          <ChevronRight className="ml-auto mt-1 h-4 w-4 text-slate-300 dark:text-slate-600" />
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
              Wallet balances and activity shown here
              come from the authenticated Epex Bank API.
              Never share your password, OTP, PIN or
              other security credentials with anyone.
            </p>
          </section>
        </>
      )}
    </div>
  );
};

export default Wallet;