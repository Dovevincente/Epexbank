import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  Info,
  Loader2,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Active",
    tone: "success",
    icon: CheckCircle2,
  },
  OPEN: {
    label: "Open",
    tone: "success",
    icon: CheckCircle2,
  },
  COMPLETED: {
    label: "Completed",
    tone: "success",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    tone: "warning",
    icon: Clock3,
  },
  PROCESSING: {
    label: "Processing",
    tone: "warning",
    icon: Clock3,
  },
  IN_REVIEW: {
    label: "In review",
    tone: "warning",
    icon: Clock3,
  },
  PENDING_APPROVAL: {
    label: "Pending approval",
    tone: "warning",
    icon: Clock3,
  },
  BLOCKED: {
    label: "Blocked",
    tone: "danger",
    icon: XCircle,
  },
  FROZEN: {
    label: "Frozen",
    tone: "danger",
    icon: XCircle,
  },
  SUSPENDED: {
    label: "Suspended",
    tone: "danger",
    icon: XCircle,
  },
  CLOSED: {
    label: "Closed",
    tone: "neutral",
    icon: XCircle,
  },
  REJECTED: {
    label: "Rejected",
    tone: "danger",
    icon: XCircle,
  },
  FAILED: {
    label: "Failed",
    tone: "danger",
    icon: XCircle,
  },
};

const STATUS_STYLES = {
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  danger:
    "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  neutral:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const normalizeAccount = (payload) => {
  const root = getRoot(payload);

  return (
    root?.savingsAccount ??
    root?.account ??
    root?.record ??
    root
  );
};

const getAccountId = (account) =>
  account?.id ??
  account?.accountId ??
  account?.savingsAccountId ??
  "";

const getAccountNumber = (account) =>
  account?.accountNumber ??
  account?.number ??
  "";

const getAccountName = (account) =>
  account?.name ??
  account?.product?.name ??
  account?.productName ??
  account?.savingsProduct?.name ??
  "Savings account";

const getAccountType = (account) =>
  account?.type ??
  account?.accountType ??
  account?.product?.type ??
  account?.productType ??
  "SAVINGS";

const getStatus = (account) =>
  String(
    account?.status ??
      account?.accountStatus ??
      "ACTIVE",
  ).toUpperCase();

const getCurrency = (account) =>
  account?.currency?.code ??
  account?.currencyCode ??
  account?.currency ??
  account?.product?.currency?.code ??
  "USD";

const getBalance = (account) => {
  const value =
    account?.balance ??
    account?.currentBalance ??
    account?.availableBalance ??
    account?.ledgerBalance ??
    0;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
};

const getAvailableBalance = (account) => {
  const value =
    account?.availableBalance ??
    account?.balance ??
    account?.currentBalance ??
    account?.ledgerBalance ??
    0;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
};

const getLedgerBalance = (account) => {
  const value =
    account?.ledgerBalance ??
    account?.balance ??
    account?.currentBalance ??
    account?.availableBalance ??
    0;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
};

const getInterestRate = (account) => {
  const value =
    account?.interestRate ??
    account?.annualInterestRate ??
    account?.rate ??
    account?.apy ??
    account?.product?.interestRate ??
    account?.product?.annualInterestRate;

  const rate = Number(value);

  return Number.isFinite(rate) ? rate : null;
};

const getMinimumBalance = (account) => {
  const value =
    account?.minimumBalance ??
    account?.minimumRequiredBalance ??
    account?.product?.minimumBalance ??
    account?.product?.minimumRequiredBalance;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
};

const getMinimumOpeningAmount = (account) => {
  const value =
    account?.minimumOpeningAmount ??
    account?.openingMinimum ??
    account?.product?.minimumOpeningAmount ??
    account?.product?.minimumDeposit;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
};

const getMaximumBalance = (account) => {
  const value =
    account?.maximumBalance ??
    account?.product?.maximumBalance ??
    account?.product?.maxBalance;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
};

const getTerm = (account) =>
  account?.term ??
  account?.termMonths ??
  account?.duration ??
  account?.tenor ??
  account?.product?.term ??
  account?.product?.termMonths ??
  null;

const getCreatedAt = (account) =>
  account?.createdAt ??
  account?.openedAt ??
  account?.openingDate ??
  null;

const getUpdatedAt = (account) =>
  account?.updatedAt ??
  account?.lastUpdatedAt ??
  null;

const getMaturityDate = (account) =>
  account?.maturityDate ??
  account?.maturesAt ??
  account?.maturityAt ??
  null;

const getProductDescription = (account) =>
  account?.description ??
  account?.product?.description ??
  account?.product?.summary ??
  "";

const getAccountIdForTransactions = (account) =>
  account?.id ??
  account?.accountId ??
  account?.savingsAccountId ??
  "";

const getTransactions = (payload) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) return root;

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

const getTransactionId = (transaction) =>
  transaction?.id ??
  transaction?.transactionId ??
  "";

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
  transaction?.reference ??
  "Savings transaction";

const getTransactionReference = (
  transaction,
) =>
  transaction?.reference ??
  transaction?.transactionReference ??
  "";

const getTransactionAmount = (transaction) => {
  const value =
    transaction?.amount ??
    transaction?.transactionAmount ??
    transaction?.value;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
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
  null;

const isCreditTransaction = (
  transaction,
) => {
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
    ].some((value) => type.includes(value))
  ) {
    return true;
  }

  if (
    [
      "DEBIT",
      "WITHDRAWAL",
      "TRANSFER_OUT",
      "FEE",
      "CHARGE",
      "PAYMENT",
    ].some((value) => type.includes(value))
  ) {
    return false;
  }

  const direction = String(
    transaction?.direction ?? "",
  ).toUpperCase();

  return direction === "CREDIT";
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ""} ${amount.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      },
    )}`.trim();
  }
};

const formatPercent = (value) => {
  const rate = Number(value);

  if (!Number.isFinite(rate)) return "—";

  return `${rate.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatTransactionType = (
  value,
) => {
  if (!value) return "Transaction";

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

const SavingsDetails = () => {
  const { savingsId, accountId } = useParams();

  const id = savingsId || accountId;

  const [account, setAccount] =
    useState(null);
  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const [copied, setCopied] =
    useState("");

  const loadDetails = useCallback(
    async (background = false) => {
      if (!id) {
        setAccount(null);
        setTransactions([]);
        setError(
          "No savings account identifier was supplied.",
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
        let response;

        try {
          response = await api.get(
            `/savings/${encodeURIComponent(
              String(id),
            )}`,
          );
        } catch (requestError) {
          if (
            [404, 501].includes(
              requestError?.response?.status,
            )
          ) {
            response = await api.get(
              `/accounts/${encodeURIComponent(
                String(id),
              )}`,
            );
          } else {
            throw requestError;
          }
        }

        const nextAccount =
          normalizeAccount(
            response?.data,
          );

        if (
          !nextAccount ||
          typeof nextAccount !==
            "object" ||
          !(
            nextAccount.id ||
            nextAccount.accountId ||
            nextAccount.savingsAccountId
          )
        ) {
          throw new Error(
            "The banking API returned an invalid savings account record.",
          );
        }

        setAccount(nextAccount);

        const transactionAccountId =
          getAccountIdForTransactions(
            nextAccount,
          ) || id;

        try {
          let transactionResponse;

          try {
            transactionResponse =
              await api.get(
                `/savings/${encodeURIComponent(
                  String(
                    transactionAccountId,
                  ),
                )}/transactions`,
              );
          } catch (
            transactionError
          ) {
            if (
              [404, 501].includes(
                transactionError
                  ?.response?.status,
              )
            ) {
              transactionResponse =
                await api.get(
                  `/accounts/${encodeURIComponent(
                    String(
                      transactionAccountId,
                    ),
                  )}/transactions`,
                );
            } else {
              throw transactionError;
            }
          }

          setTransactions(
            getTransactions(
              transactionResponse?.data,
            ).slice(0, 8),
          );
        } catch (transactionError) {
          if (
            ![404, 501].includes(
              transactionError?.response
                ?.status,
            )
          ) {
            throw transactionError;
          }

          setTransactions([]);
        }
      } catch (requestError) {
        const status =
          requestError?.response?.status;

        if (status === 404) {
          setError(
            "The savings account could not be found.",
          );
        } else if (status === 403) {
          setError(
            "You are not authorized to view this savings account.",
          );
        } else {
          setError(
            requestError?.response?.data
              ?.message ||
              requestError?.message ||
              "Unable to load savings account details.",
          );
        }

        setAccount(null);
        setTransactions([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (!copied) return undefined;

    const timer = window.setTimeout(
      () => setCopied(""),
      1800,
    );

    return () =>
      window.clearTimeout(timer);
  }, [copied]);

  const copyValue = async (
    value,
    key,
  ) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(
        String(value),
      );
      setCopied(key);
    } catch {
      setCopied("");
    }
  };

  const status = getStatus(account);

  const statusConfig =
    STATUS_CONFIG[status] ?? {
      label: status
        ? status
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (char) =>
              char.toUpperCase(),
            )
        : "Unknown",
      tone: "neutral",
      icon: Clock3,
    };

  const StatusIcon =
    statusConfig.icon;

  const currency =
    getCurrency(account);

  const balance =
    getBalance(account);

  const availableBalance =
    getAvailableBalance(account);

  const ledgerBalance =
    getLedgerBalance(account);

  const interestRate =
    getInterestRate(account);

  const minimumBalance =
    getMinimumBalance(account);

  const minimumOpeningAmount =
    getMinimumOpeningAmount(account);

  const maximumBalance =
    getMaximumBalance(account);

  const term = getTerm(account);

  const createdAt =
    getCreatedAt(account);

  const updatedAt =
    getUpdatedAt(account);

  const maturityDate =
    getMaturityDate(account);

  const accountNumber =
    getAccountNumber(account);

  const accountName =
    getAccountName(account);

  const accountType =
    getAccountType(account);

  const description =
    getProductDescription(account);

  const accountReference =
    account?.reference ??
    account?.accountReference ??
    "";

  const transactionSummary =
    useMemo(() => {
      let credits = 0;
      let debits = 0;

      transactions.forEach(
        (transaction) => {
          const amount =
            getTransactionAmount(
              transaction,
            );

          if (amount === null) return;

          if (
            isCreditTransaction(
              transaction,
            )
          ) {
            credits += amount;
          } else {
            debits += amount;
          }
        },
      );

      return {
        credits,
        debits,
      };
    }, [transactions]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/savings"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to savings
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-emerald-700 dark:text-emerald-400" />

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Loading savings details
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Retrieving the authenticated savings account...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/savings"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to savings
          </Link>

          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Savings details unavailable
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {error ||
                "The requested savings account could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() =>
                loadDetails()
              }
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/savings"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to savings
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <PiggyBank className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Savings account
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {accountName}
                </h1>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              loadDetails(true)
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
        </div>

        {/* Balance hero */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-100/70 blur-3xl dark:bg-emerald-950/30" />

            <div className="relative">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                        STATUS_STYLES[
                          statusConfig.tone
                        ]
                      }`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig.label}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {accountType}
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Current balance
                  </p>

                  <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                    {formatMoney(
                      balance,
                      currency,
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {maskAccountNumber(
                        accountNumber,
                      )}
                    </span>

                    {accountNumber && (
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(
                            accountNumber,
                            "account",
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        aria-label="Copy account number"
                        title="Copy account number"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}

                    <span className="text-slate-300 dark:text-slate-700">
                      •
                    </span>

                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {currency}
                    </span>
                  </div>

                  {copied === "account" && (
                    <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Account number copied.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <Link
                    to={`/accounts/${encodeURIComponent(
                      String(
                        getAccountId(
                          account,
                        ),
                      ),
                    )}/transactions`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    View transactions
                    <ArrowRightIcon />
                  </Link>

                  <Link
                    to="/savings"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Savings overview
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main */}
          <div className="space-y-6">
            {/* Balances */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  <Wallet className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Balance information
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Balances returned by the banking system.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <BalanceCard
                  label="Current balance"
                  value={formatMoney(
                    balance,
                    currency,
                  )}
                />

                <BalanceCard
                  label="Available balance"
                  value={formatMoney(
                    availableBalance,
                    currency,
                  )}
                />

                <BalanceCard
                  label="Ledger balance"
                  value={formatMoney(
                    ledgerBalance,
                    currency,
                  )}
                />
              </div>
            </section>

            {/* Product terms */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <PiggyBank className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Savings terms
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Product information available for this account.
                  </p>
                </div>
              </div>

              {description && (
                <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950/50 dark:text-slate-400">
                  {description}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <TermCard
                  label="Interest rate"
                  value={formatPercent(
                    interestRate,
                  )}
                />

                <TermCard
                  label="Currency"
                  value={currency}
                />

                <TermCard
                  label="Account type"
                  value={accountType}
                />

                <TermCard
                  label="Minimum balance"
                  value={
                    minimumBalance !== null
                      ? formatMoney(
                          minimumBalance,
                          currency,
                        )
                      : "—"
                  }
                />

                <TermCard
                  label="Opening minimum"
                  value={
                    minimumOpeningAmount !==
                    null
                      ? formatMoney(
                          minimumOpeningAmount,
                          currency,
                        )
                      : "—"
                  }
                />

                <TermCard
                  label="Maximum balance"
                  value={
                    maximumBalance !== null
                      ? formatMoney(
                          maximumBalance,
                          currency,
                        )
                      : "—"
                  }
                />
              </div>

              {term !== null &&
                term !== undefined && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Term
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                      {String(term)}
                    </p>
                  </div>
                )}
            </section>

            {/* Recent activity */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Recent activity
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Latest transactions recorded against this savings account.
                  </p>
                </div>

                <Link
                  to={`/accounts/${encodeURIComponent(
                    String(
                      getAccountIdForTransactions(
                        account,
                      ),
                    ),
                  )}/transactions`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400"
                >
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {transactions.length ===
              0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <FileText className="h-6 w-6" />
                  </div>

                  <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                    No recent transactions
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    No transaction records were returned for this savings
                    account.
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {transactions.map(
                      (
                        transaction,
                        index,
                      ) => {
                        const transactionId =
                          getTransactionId(
                            transaction,
                          );

                        const credit =
                          isCreditTransaction(
                            transaction,
                          );

                        const amount =
                          getTransactionAmount(
                            transaction,
                          );

                        const transactionCurrency =
                          getTransactionCurrency(
                            transaction,
                            currency,
                          );

                        return (
                          <div
                            key={
                              transactionId ||
                              getTransactionReference(
                                transaction,
                              ) ||
                              index
                            }
                            className="flex items-center gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
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
                              <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                                {getTransactionDescription(
                                  transaction,
                                )}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                  {formatTransactionType(
                                    getTransactionType(
                                      transaction,
                                    ),
                                  )}
                                </span>

                                <span>
                                  •
                                </span>

                                <span>
                                  {formatDate(
                                    getTransactionDate(
                                      transaction,
                                    ),
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <p
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
                              </p>

                              {transactionId && (
                                <Link
                                  to={`/transactions/${encodeURIComponent(
                                    String(
                                      transactionId,
                                    ),
                                  )}`}
                                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400"
                                >
                                  Details
                                  <ChevronRight className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="grid grid-cols-2 gap-3">
                      <ActivitySummary
                        label="Recent credits"
                        value={formatMoney(
                          transactionSummary.credits,
                          currency,
                        )}
                        positive
                      />

                      <ActivitySummary
                        label="Recent debits"
                        value={formatMoney(
                          transactionSummary.debits,
                          currency,
                        )}
                      />
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* Side panel */}
          <aside className="space-y-5">
            {/* Account information */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Account information
              </h2>

              <div className="mt-5 space-y-4">
                <InfoRow
                  label="Account number"
                  value={maskAccountNumber(
                    accountNumber,
                  )}
                />

                <InfoRow
                  label="Currency"
                  value={currency}
                />

                <InfoRow
                  label="Status"
                  value={statusConfig.label}
                />

                <InfoRow
                  label="Opened"
                  value={formatDate(
                    createdAt,
                  )}
                />

                <InfoRow
                  label="Last updated"
                  value={formatDateTime(
                    updatedAt,
                  )}
                />

                {maturityDate && (
                  <InfoRow
                    label="Maturity date"
                    value={formatDate(
                      maturityDate,
                    )}
                  />
                )}

                {accountReference && (
                  <InfoRow
                    label="Reference"
                    value={accountReference}
                  />
                )}
              </div>
            </section>

            {/* Interest */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <PiggyBank className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Interest rate
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                    {formatPercent(
                      interestRate,
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                The interest rate displayed here is the rate returned by the
                savings product associated with this account. No projected
                earnings are calculated on this page.
              </p>
            </section>

            {/* Quick links */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Quick actions
              </h2>

              <div className="mt-4 space-y-2">
                <Link
                  to={`/accounts/${encodeURIComponent(
                    String(
                      getAccountIdForTransactions(
                        account,
                      ),
                    ),
                  )}/transactions`}
                  className="flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  View transactions
                  <ChevronRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/transactions"
                  className="flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  All transactions
                  <ChevronRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/savings"
                  className="flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Savings overview
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </aside>
        </div>

        {/* Timeline */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Account timeline
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Important dates returned for this savings account.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TimelineCard
              label="Account opened"
              value={formatDateTime(
                createdAt,
              )}
            />

            <TimelineCard
              label="Last updated"
              value={formatDateTime(
                updatedAt,
              )}
            />

            <TimelineCard
              label="Maturity"
              value={
                maturityDate
                  ? formatDateTime(
                      maturityDate,
                    )
                  : "Not provided"
              }
            />
          </div>
        </section>

        {/* Security */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Secure savings information
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Account balances, terms, interest rates and transactions shown
                on this page are retrieved from your authenticated Epex Bank
                account. No projected savings growth or fabricated transaction
                data is displayed.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const ArrowRightIcon = () => (
  <ArrowUpRight className="h-4 w-4" />
);

const BalanceCard = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
      {label}
    </p>

    <p className="mt-2 truncate text-lg font-bold text-slate-950 dark:text-white">
      {value}
    </p>
  </div>
);

const TermCard = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </p>

    <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">
      {value}
    </p>
  </div>
);

const InfoRow = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-slate-500 dark:text-slate-400">
      {label}
    </span>

    <span className="max-w-[60%] break-words text-right text-sm font-semibold text-slate-950 dark:text-white">
      {value || "—"}
    </span>
  </div>
);

const ActivitySummary = ({
  label,
  value,
  positive = false,
}) => (
  <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </p>

    <p
      className={`mt-1 text-sm font-bold ${
        positive
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-slate-950 dark:text-white"
      }`}
    >
      {value}
    </p>
  </div>
);

const TimelineCard = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" />

      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>

    <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
      {value}
    </p>
  </div>
);

export default SavingsDetails;