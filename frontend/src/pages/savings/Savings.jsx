import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Target,
  Wallet,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../services/api.js";

/* =========================================================
   HELPERS
========================================================= */

const getErrorMessage = (
  error,
  fallback = "Something went wrong.",
) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const getSavingsRecords = (payload) => {
  const root = payload?.data ?? payload ?? {};

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.savings ||
    root?.accounts ||
    root?.items ||
    root?.records ||
    root?.results ||
    root?.data?.savings ||
    root?.data?.accounts ||
    []
  );
};

const getAccountRecords = (payload) => {
  const root = payload?.data ?? payload ?? {};

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.accounts ||
    root?.items ||
    root?.records ||
    root?.results ||
    root?.data?.accounts ||
    []
  );
};

const normalizeType = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const isWithdrawableSavings = (savings) => {
  const type = normalizeType(savings?.type);
  const status = normalizeStatus(savings?.status);

  return (
    (type === "REGULAR" || type === "GOAL") &&
    ["ACTIVE", "MATURED"].includes(status)
  );
};

const isFixedSavings = (savings) =>
  normalizeType(savings?.type) === "FIXED";

const formatMoney = (
  value,
  currency = "USD",
) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getCurrency = (savings) =>
  savings?.currency?.code ||
  savings?.currencyCode ||
  "USD";

const getBalance = (savings) =>
  Number(
    savings?.balance ??
      savings?.currentBalance ??
      0,
  );

const getTargetAmount = (savings) => {
  const value = Number(
    savings?.targetAmount ?? 0,
  );

  return Number.isFinite(value) && value > 0
    ? value
    : 0;
};

const getProgress = (savings) => {
  const balance = getBalance(savings);
  const target = getTargetAmount(savings);

  if (!target) {
    return null;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (balance / target) * 100,
    ),
  );
};

const getSavingsName = (savings) =>
  savings?.name ||
  savings?.savingsName ||
  savings?.title ||
  "Savings Account";

const getSavingsReference = (savings) =>
  savings?.reference ||
  savings?.accountNumber ||
  savings?.id ||
  "—";

const getAccountNumber = (account) =>
  account?.accountNumber ||
  account?.number ||
  account?.accountNo ||
  "—";

const getAccountBalance = (account) =>
  Number(
    account?.availableBalance ??
      account?.balance ??
      0,
  );

const getAccountCurrency = (account) =>
  account?.currency?.code ||
  account?.currencyCode ||
  "USD";

/* =========================================================
   STATUS UI
========================================================= */

const statusClasses = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 ring-emerald-200",
  MATURED:
    "bg-blue-50 text-blue-700 ring-blue-200",
  COMPLETED:
    "bg-slate-100 text-slate-600 ring-slate-200",
  WITHDRAWN:
    "bg-slate-100 text-slate-600 ring-slate-200",
  CANCELLED:
    "bg-red-50 text-red-700 ring-red-200",
};

const SavingsStatus = ({
  status,
}) => {
  const normalized =
    normalizeStatus(status) ||
    "UNKNOWN";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        statusClasses[normalized] ||
          "bg-slate-100 text-slate-600 ring-slate-200",
      ].join(" ")}
    >
      {normalized}
    </span>
  );
};

/* =========================================================
   SAVINGS ICON
========================================================= */

const SavingsIcon = ({
  type,
}) => {
  const normalized =
    normalizeType(type);

  if (normalized === "GOAL") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <Target size={24} />
      </div>
    );
  }

  if (normalized === "FIXED") {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <ShieldCheck size={24} />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
      <PiggyBank size={24} />
    </div>
  );
};

/* =========================================================
   WITHDRAW MODAL
========================================================= */

const WithdrawModal = ({
  savings,
  accounts,
  loading,
  error,
  amount,
  accountId,
  onAmountChange,
  onAccountChange,
  onClose,
  onSubmit,
}) => {
  if (!savings) {
    return null;
  }

  const currency =
    getCurrency(savings);

  const balance =
    getBalance(savings);

  const validAccounts =
    accounts.filter(
      (account) =>
        normalizeStatus(
          account?.status,
        ) === "ACTIVE" &&
        getAccountCurrency(
          account,
        ) === currency,
    );

  const numericAmount =
    Number(amount);

  const amountIsValid =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= balance;

  const canSubmit =
    !loading &&
    Boolean(accountId) &&
    amountIsValid;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-savings-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Savings withdrawal
            </p>

            <h2
              id="withdraw-savings-title"
              className="mt-1 text-xl font-bold text-slate-900"
            >
              Withdraw from{" "}
              {getSavingsName(savings)}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Available balance:{" "}
              <span className="font-semibold text-slate-700">
                {formatMoney(
                  balance,
                  currency,
                )}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close withdrawal"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="space-y-5 px-5 py-5 sm:px-6 sm:py-6"
        >
          {error ? (
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <p>{error}</p>
            </div>
          ) : null}

          {/* DESTINATION ACCOUNT */}
          <div>
            <label
              htmlFor="withdraw-destination-account"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Destination account
            </label>

            <select
              id="withdraw-destination-account"
              value={accountId}
              onChange={(event) =>
                onAccountChange(
                  event.target.value,
                )
              }
              disabled={
                loading ||
                validAccounts.length === 0
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                Select an account
              </option>

              {validAccounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {getAccountNumber(
                      account,
                    )}{" "}
                    —{" "}
                    {formatMoney(
                      getAccountBalance(
                        account,
                      ),
                      getAccountCurrency(
                        account,
                      ),
                    )}
                  </option>
                ),
              )}
            </select>

            {validAccounts.length ===
            0 ? (
              <p className="mt-2 text-xs text-red-600">
                No active{" "}
                {currency} account is
                available to receive this
                withdrawal.
              </p>
            ) : null}
          </div>

          {/* AMOUNT */}
          <div>
            <label
              htmlFor="withdraw-amount"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Withdrawal amount
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {currency}
              </span>

              <input
                id="withdraw-amount"
                type="number"
                min="0.01"
                max={balance}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) =>
                  onAmountChange(
                    event.target.value,
                  )
                }
                disabled={loading}
                placeholder="0.00"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-16 pr-4 text-lg font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Maximum withdrawal
              </span>

              <button
                type="button"
                onClick={() =>
                  onAmountChange(
                    balance.toFixed(2),
                  )
                }
                disabled={
                  loading ||
                  balance <= 0
                }
                className="font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Use full balance
              </button>
            </div>
          </div>

          {/* INFO */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex gap-3">
              <Wallet
                size={19}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div className="text-sm text-blue-800">
                <p className="font-semibold">
                  How this works
                </p>

                <p className="mt-1 leading-6 text-blue-700">
                  The amount will be removed
                  from your savings balance
                  and credited to the selected
                  active bank account.
                </p>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownToLine
                    size={18}
                  />
                  Withdraw funds
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN PAGE
========================================================= */

const Savings = () => {
  const navigate = useNavigate();

  const [savings, setSavings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const [withdrawalSavings, setWithdrawalSavings] =
    useState(null);

  const [accounts, setAccounts] =
    useState([]);

  const [accountsLoading, setAccountsLoading] =
    useState(false);

  const [withdrawalAmount, setWithdrawalAmount] =
    useState("");

  const [destinationAccountId, setDestinationAccountId] =
    useState("");

  const [withdrawalError, setWithdrawalError] =
    useState("");

  const [withdrawalSubmitting, setWithdrawalSubmitting] =
    useState(false);

  /* =======================================================
     LOAD SAVINGS
  ======================================================= */

  const loadSavings = useCallback(
    async ({
      showLoader = true,
    } = {}) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const response =
          await api.get("/savings");

        const records =
          getSavingsRecords(
            response?.data,
          );

        setSavings(
          Array.isArray(records)
            ? records
            : [],
        );
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Unable to load your savings accounts.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadSavings();
  }, [loadSavings]);

  /* =======================================================
     LOAD DESTINATION ACCOUNTS
  ======================================================= */

  const loadAccounts = useCallback(
    async () => {
      setAccountsLoading(true);

      try {
        const response =
          await api.get("/accounts");

        const records =
          getAccountRecords(
            response?.data,
          );

        setAccounts(
          Array.isArray(records)
            ? records
            : [],
        );
      } catch (requestError) {
        setWithdrawalError(
          getErrorMessage(
            requestError,
            "Unable to load your bank accounts.",
          ),
        );
      } finally {
        setAccountsLoading(false);
      }
    },
    [],
  );

  /* =======================================================
     OPEN WITHDRAWAL
  ======================================================= */

  const openWithdrawal = useCallback(
    async (saving) => {
      if (
        !isWithdrawableSavings(
          saving,
        )
      ) {
        return;
      }

      setWithdrawalSavings(
        saving,
      );

      setWithdrawalAmount("");

      setDestinationAccountId("");

      setWithdrawalError("");

      await loadAccounts();
    },
    [loadAccounts],
  );

  /* =======================================================
     CLOSE WITHDRAWAL
  ======================================================= */

  const closeWithdrawal =
    useCallback(() => {
      if (withdrawalSubmitting) {
        return;
      }

      setWithdrawalSavings(null);

      setWithdrawalAmount("");

      setDestinationAccountId("");

      setWithdrawalError("");
    }, [withdrawalSubmitting]);

  /* =======================================================
     SUBMIT WITHDRAWAL
  ======================================================= */

  const submitWithdrawal =
    useCallback(async () => {
      if (!withdrawalSavings) {
        return;
      }

      const amount =
        Number(
          withdrawalAmount,
        );

      const balance =
        getBalance(
          withdrawalSavings,
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setWithdrawalError(
          "Enter a valid withdrawal amount.",
        );
        return;
      }

      if (amount > balance) {
        setWithdrawalError(
          "Withdrawal amount cannot exceed your available savings balance.",
        );
        return;
      }

      if (!destinationAccountId) {
        setWithdrawalError(
          "Select the account that should receive the funds.",
        );
        return;
      }

      setWithdrawalSubmitting(
        true,
      );

      setWithdrawalError("");

      try {
        await api.post(
          `/savings/${encodeURIComponent(
            withdrawalSavings.id,
          )}/withdraw`,
          {
            accountId:
              destinationAccountId,
            amount,
          },
        );

        closeWithdrawal();

        await loadSavings({
          showLoader: false,
        });
      } catch (requestError) {
        setWithdrawalError(
          getErrorMessage(
            requestError,
            "Unable to complete the withdrawal.",
          ),
        );
      } finally {
        setWithdrawalSubmitting(
          false,
        );
      }
    }, [
      withdrawalSavings,
      withdrawalAmount,
      destinationAccountId,
      closeWithdrawal,
      loadSavings,
    ]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const totalBalance =
      savings.reduce(
        (sum, item) =>
          sum + getBalance(item),
        0,
      );

    const regular =
      savings.filter(
        (item) =>
          normalizeType(
            item?.type,
          ) === "REGULAR",
      ).length;

    const goal =
      savings.filter(
        (item) =>
          normalizeType(
            item?.type,
          ) === "GOAL",
      ).length;

    const fixed =
      savings.filter(
        (item) =>
          normalizeType(
            item?.type,
          ) === "FIXED",
      ).length;

    return {
      totalBalance,
      regular,
      goal,
      fixed,
    };
  }, [savings]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="text-center">
              <Loader2
                size={34}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-4 text-sm font-medium text-slate-500">
                Loading your savings...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <PiggyBank
                  size={24}
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Savings
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Manage your regular, goal, and fixed
                  savings accounts in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                loadSavings({
                  showLoader: false,
                })
              }
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <Link
              to="/savings/create"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <PiggyBank
                size={17}
              />
              Open savings
            </Link>
          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Unable to load savings
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadSavings()
              }
              className="rounded-xl px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total savings
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatMoney(
                summary.totalBalance,
                "USD",
              )}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Regular
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {summary.regular}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Goal
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {summary.goal}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Fixed
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {summary.fixed}
            </p>
          </div>
        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {savings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
              <PiggyBank size={30} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No savings accounts yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Open a Regular, Goal, or Fixed savings
              account to start building your savings.
            </p>

            <Link
              to="/savings/create"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Open your first savings
              <ChevronRight size={17} />
            </Link>
          </div>
        ) : (
          /* =================================================
             SAVINGS CARDS
          ================================================= */

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {savings.map(
              (saving) => {
                const type =
                  normalizeType(
                    saving?.type,
                  );

                const currency =
                  getCurrency(
                    saving,
                  );

                const balance =
                  getBalance(
                    saving,
                  );

                const target =
                  getTargetAmount(
                    saving,
                  );

                const progress =
                  getProgress(
                    saving,
                  );

                const withdrawable =
                  isWithdrawableSavings(
                    saving,
                  );

                const fixed =
                  isFixedSavings(
                    saving,
                  );

                return (
                  <article
                    key={
                      saving.id ||
                      saving.reference
                    }
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* CARD HEADER */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <SavingsIcon
                          type={type}
                        />

                        <div className="min-w-0">
                          <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                            {getSavingsName(
                              saving,
                            )}
                          </h2>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {type} •{" "}
                            {
                              getSavingsReference(
                                saving,
                              )
                            }
                          </p>
                        </div>
                      </div>

                      <SavingsStatus
                        status={
                          saving?.status
                        }
                      />
                    </div>

                    {/* BALANCE */}
                    <div className="p-5 sm:p-6">
                      <p className="text-sm font-medium text-slate-500">
                        Current balance
                      </p>

                      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                        {formatMoney(
                          balance,
                          currency,
                        )}
                      </p>

                      {/* GOAL PROGRESS */}
                      {type ===
                        "GOAL" &&
                      target > 0 ? (
                        <div className="mt-5">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-500">
                              Goal progress
                            </span>

                            <span className="font-bold text-slate-700">
                              {progress?.toFixed(
                                0,
                              )}
                              %
                            </span>
                          </div>

                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>

                          <div className="mt-2 flex justify-between text-xs text-slate-400">
                            <span>
                              Saved{" "}
                              {formatMoney(
                                balance,
                                currency,
                              )}
                            </span>

                            <span>
                              Target{" "}
                              {formatMoney(
                                target,
                                currency,
                              )}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {/* FIXED MATURITY */}
                      {type ===
                        "FIXED" &&
                      saving?.maturityDate ? (
                        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                          <Clock3
                            size={19}
                            className="shrink-0 text-slate-500"
                          />

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Maturity date
                            </p>

                            <p className="mt-0.5 text-sm font-semibold text-slate-800">
                              {formatDate(
                                saving.maturityDate,
                              )}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {/* ACTIONS */}
                      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Link
                          to={`/savings/${encodeURIComponent(
                            saving.id,
                          )}`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View details
                          <ChevronRight
                            size={17}
                          />
                        </Link>

                        {withdrawable ? (
                          <button
                            type="button"
                            onClick={() =>
                              openWithdrawal(
                                saving,
                              )
                            }
                            disabled={
                              balance <=
                                0 ||
                              accountsLoading
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ArrowDownToLine
                              size={17}
                            />
                            Withdraw
                          </button>
                        ) : fixed ? (
                          <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-500">
                            <ShieldCheck
                              size={17}
                            />
                            Locked until maturity
                          </div>
                        ) : (
                          <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-500">
                            <Clock3
                              size={17}
                            />
                            Withdrawal unavailable
                          </div>
                        )}
                      </div>

                      {/* WITHDRAWAL RULE */}
                      {withdrawable ? (
                        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-400">
                          <ArrowUpFromLine
                            size={14}
                            className="mt-0.5 shrink-0"
                          />
                          Withdrawals are available
                          for this savings type and
                          are credited to your selected
                          active account.
                        </p>
                      ) : fixed ? (
                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          Fixed savings remain locked
                          until the maturity date.
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </div>

      {/* ===================================================
          WITHDRAWAL MODAL
      =================================================== */}

      <WithdrawModal
        savings={
          withdrawalSavings
        }
        accounts={accounts}
        loading={
          withdrawalSubmitting
        }
        error={
          withdrawalError
        }
        amount={
          withdrawalAmount
        }
        accountId={
          destinationAccountId
        }
        onAmountChange={
          setWithdrawalAmount
        }
        onAccountChange={
          setDestinationAccountId
        }
        onClose={
          closeWithdrawal
        }
        onSubmit={
          submitWithdrawal
        }
      />
    </div>
  );
};

export default Savings;