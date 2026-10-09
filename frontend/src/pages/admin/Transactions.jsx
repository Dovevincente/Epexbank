import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REVERSED",
  "CANCELLED",
];

const TYPE_OPTIONS = [
  "ALL",
  "CREDIT",
  "DEBIT",
  "TRANSFER",
  "DEPOSIT",
  "WITHDRAWAL",
  "PAYMENT",
  "FEE",
  "INTEREST",
];

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      nextCursor: null,
      total: payload.length,
    };
  }

  const source = payload?.data ?? payload ?? {};

  const items =
    (Array.isArray(source?.transactions) && source.transactions) ||
    (Array.isArray(source?.items) && source.items) ||
    (Array.isArray(source?.results) && source.results) ||
    (Array.isArray(source?.records) && source.records) ||
    [];

  return {
    items,
    nextCursor:
      source?.nextCursor ??
      source?.pagination?.nextCursor ??
      source?.meta?.nextCursor ??
      null,
    total:
      source?.total ??
      source?.pagination?.total ??
      source?.meta?.total ??
      items.length,
  };
};

const normalizeTransaction = (transaction) => {
  const metadata =
    transaction?.metadata && typeof transaction.metadata === "object"
      ? transaction.metadata
      : {};

  const account =
    transaction?.account ??
    transaction?.sourceAccount ??
    transaction?.senderAccount ??
    null;

  const counterparty =
    transaction?.counterparty ??
    transaction?.recipient ??
    transaction?.destinationAccount ??
    transaction?.receiverAccount ??
    null;

  const amount = Number(
    transaction?.amount ??
      transaction?.value ??
      transaction?.grossAmount ??
      transaction?.totalAmount ??
      0,
  );

  const fee = Number(
    transaction?.fee ??
      transaction?.fees ??
      transaction?.charge ??
      metadata?.fee ??
      0,
  );

  return {
    ...transaction,
    id:
      transaction?.id ??
      transaction?.transactionId ??
      transaction?.reference ??
      metadata?.transactionId ??
      "",
    reference:
      transaction?.reference ??
      transaction?.transactionReference ??
      metadata?.reference ??
      "",
    type:
      transaction?.type ??
      transaction?.transactionType ??
      transaction?.category ??
      "UNKNOWN",
    status:
      transaction?.status ??
      transaction?.transactionStatus ??
      "UNKNOWN",
    amount: Number.isFinite(amount) ? amount : 0,
    fee: Number.isFinite(fee) ? fee : 0,
    currency:
      transaction?.currency?.code ??
      transaction?.currencyCode ??
      transaction?.currency ??
      account?.currency?.code ??
      "USD",
    account,
    counterparty,
    customer:
      transaction?.customer ??
      transaction?.user ??
      transaction?.owner ??
      account?.user ??
      null,
    description:
      transaction?.description ??
      transaction?.narration ??
      transaction?.memo ??
      metadata?.description ??
      "Transaction",
    createdAt:
      transaction?.createdAt ??
      transaction?.created_at ??
      transaction?.date ??
      transaction?.transactionDate ??
      transaction?.processedAt ??
      null,
  };
};

const normalizeStatus = (value) =>
  String(value ?? "UNKNOWN")
    .trim()
    .toUpperCase();

const normalizeType = (value) =>
  String(value ?? "UNKNOWN")
    .trim()
    .toUpperCase();

const isCreditType = (type) => {
  const normalized = normalizeType(type);

  return [
    "CREDIT",
    "DEPOSIT",
    "INTEREST",
    "REFUND",
    "CASH_DEPOSIT",
  ].includes(normalized);
};

const isDebitType = (type) => {
  const normalized = normalizeType(type);

  return [
    "DEBIT",
    "WITHDRAWAL",
    "PAYMENT",
    "FEE",
    "TRANSFER",
    "CASH_WITHDRAWAL",
  ].includes(normalized);
};

const formatMoney = (amount, currency = "USD") => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${numericAmount.toFixed(
      2,
    )}`;
  }
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

const getCustomerName = (transaction) => {
  const customer = transaction?.customer;

  if (typeof customer === "string" && customer.trim()) {
    return customer;
  }

  const firstName =
    customer?.firstName ??
    customer?.first_name ??
    transaction?.user?.firstName ??
    "";

  const lastName =
    customer?.lastName ??
    customer?.last_name ??
    transaction?.user?.lastName ??
    "";

  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return (
    customer?.name ??
    customer?.fullName ??
    transaction?.customerName ??
    transaction?.user?.name ??
    transaction?.account?.user?.name ??
    "Customer"
  );
};

const getCustomerEmail = (transaction) => {
  return (
    transaction?.customer?.email ??
    transaction?.user?.email ??
    transaction?.customerEmail ??
    transaction?.account?.user?.email ??
    ""
  );
};

const getAccountNumber = (account) => {
  if (!account) return "";

  return (
    account?.accountNumber ??
    account?.number ??
    account?.maskedAccountNumber ??
    ""
  );
};

const maskAccountNumber = (value) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "—";
  }

  if (normalized.length <= 4) {
    return normalized;
  }

  return `•••• ${normalized.slice(-4)}`;
};

const getTransactionId = (transaction) => {
  return (
    transaction?.id ??
    transaction?.transactionId ??
    transaction?.reference ??
    ""
  );
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);

  const config = {
    COMPLETED: {
      icon: CheckCircle2,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
    },
    PROCESSING: {
      icon: Clock3,
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
    },
    PENDING: {
      icon: Clock3,
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
    },
    FAILED: {
      icon: XCircle,
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
    },
    REVERSED: {
      icon: AlertTriangle,
      className:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300",
    },
    CANCELLED: {
      icon: XCircle,
      className:
        "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
  };

  const selected = config[normalized] ?? {
    icon: Activity,
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };

  const Icon = selected.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${selected.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {normalized}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const normalized = normalizeType(type);
  const credit = isCreditType(normalized);
  const debit = isDebitType(normalized);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        credit
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          : debit
            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {credit ? (
        <ArrowDownLeft className="h-3.5 w-3.5" />
      ) : debit ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <Activity className="h-3.5 w-3.5" />
      )}

      {normalized}
    </span>
  );
};

const SummaryCard = ({ label, value, description, icon: Icon }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {value}
        </p>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon className="h-5 w-5" />
      </div>
    </div>

    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
      {description}
    </p>
  </article>
);

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");

  const [nextCursor, setNextCursor] = useState(null);

  const fetchTransactions = useCallback(
    async ({ reset = true, cursor = null, refresh = false } = {}) => {
      if (refresh) {
        setRefreshing(true);
      } else if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError("");

      try {
        const params = {
          limit: 25,
        };

        if (search.trim()) {
          params.search = search.trim();
        }

        if (status !== "ALL") {
          params.status = status;
        }

        if (type !== "ALL") {
          params.type = type;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const response = await api.get("/admin/transactions", {
          params,
        });

        const normalized = normalizeCollection(response?.data);
        const mapped = normalized.items.map(normalizeTransaction);

        setTransactions((current) =>
          reset ? mapped : [...current, ...mapped],
        );

        setNextCursor(normalized.nextCursor);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load administrative transaction records.";

        setError(message);

        if (reset) {
          setTransactions([]);
          setNextCursor(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, status, type],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchTransactions({ reset: true });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchTransactions]);

  const summary = useMemo(() => {
    const completed = transactions.filter(
      (transaction) => normalizeStatus(transaction.status) === "COMPLETED",
    ).length;

    const pending = transactions.filter((transaction) =>
      ["PENDING", "PROCESSING"].includes(
        normalizeStatus(transaction.status),
      ),
    ).length;

    const failed = transactions.filter((transaction) =>
      ["FAILED", "REVERSED", "CANCELLED"].includes(
        normalizeStatus(transaction.status),
      ),
    ).length;

    const credits = transactions.filter((transaction) =>
      isCreditType(transaction.type),
    );

    const debits = transactions.filter((transaction) =>
      isDebitType(transaction.type),
    );

    const creditTotal = credits.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );

    const debitTotal = debits.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );

    return {
      total: transactions.length,
      completed,
      pending,
      failed,
      creditTotal,
      debitTotal,
    };
  }, [transactions]);

  const copyReference = async (reference) => {
    if (!reference || !navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(String(reference));
    } catch {
      // Clipboard permissions may be unavailable in the current browser.
    }
  };

  const getBankTransferStatusOptions = (transaction) => {
    const currentStatus = normalizeStatus(
      transaction?.status,
    );

    const transferType = String(
      transaction?.metadata?.transferType || "",
    ).toUpperCase();

    const isBankTransfer =
      String(transaction?.type || "").toUpperCase() ===
        "TRANSFER" &&
      transferType === "BANK";

    if (!isBankTransfer) {
      return [];
    }

    if (currentStatus === "PENDING") {
      return [
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ];
    }

    if (currentStatus === "PROCESSING") {
      return [
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ];
    }

    return [];
  };

  const updateTransactionStatus = async (
    transaction,
    nextStatus,
  ) => {
    const transactionId =
      getTransactionId(transaction);

    if (!transactionId) {
      return;
    }

    const currentStatus = normalizeStatus(
      transaction.status,
    );

    if (
      ["COMPLETED", "FAILED", "CANCELLED"].includes(
        currentStatus,
      )
    ) {
      return;
    }

    const allowedStatuses =
      getBankTransferStatusOptions(transaction);

    if (!allowedStatuses.includes(nextStatus)) {
      return;
    }

    let reason = "";

    if (
      nextStatus === "FAILED" ||
      nextStatus === "CANCELLED"
    ) {
      reason =
        window.prompt(
          `Enter the reason for marking this transfer ${nextStatus.toLowerCase()}:`,
          "",
        ) || "";

      if (!reason.trim()) {
        return;
      }
    } else {
      reason =
        "Administrative bank transfer status update.";
    }

    setUpdatingId(transactionId);
    setError("");

    try {
      const response = await api.patch(
        `/admin/transactions/${encodeURIComponent(
          transactionId,
        )}/status`,
        {
          status: nextStatus,
          reason: reason.trim(),
        },
      );

      const responseTransaction =
        response?.data?.data?.transaction ||
        response?.data?.transaction ||
        null;

      setTransactions((current) =>
        current.map((item) => {
          const itemId =
            getTransactionId(item);

          if (itemId !== transactionId) {
            return item;
          }

          if (responseTransaction) {
            return normalizeTransaction(
              responseTransaction,
            );
          }

          return {
            ...item,
            status: nextStatus,
            metadata: {
              ...(item.metadata || {}),
              ...(nextStatus === "FAILED"
                ? {
                    failureReason:
                      reason.trim(),
                  }
                : {}),
              ...(nextStatus === "CANCELLED"
                ? {
                    cancellationReason:
                      reason.trim(),
                  }
                : {}),
            },
          };
        }),
      );

      window.alert(
        `Transaction ${nextStatus.toLowerCase()} successfully.`,
      );
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to update the transaction status.";

      setError(message);
      window.alert(message);
    } finally {
      setUpdatingId("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setType("ALL");
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <Activity className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  Transactions
                </h1>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Review transaction activity and financial records across the
                  Epex Bank platform.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchTransactions({
                  reset: true,
                  refresh: true,
                })
              }
              disabled={loading || refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Loaded records"
            value={summary.total.toLocaleString()}
            description="Transaction records currently loaded into the admin view."
            icon={Activity}
          />

          <SummaryCard
            label="Completed"
            value={summary.completed.toLocaleString()}
            description="Loaded transactions with completed status."
            icon={CheckCircle2}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending.toLocaleString()}
            description="Pending or processing transactions in the current result set."
            icon={Clock3}
          />

          <SummaryCard
            label="Credits"
            value={formatMoney(summary.creditTotal)}
            description="Credit-side volume across loaded records."
            icon={ArrowDownLeft}
          />

          <SummaryCard
            label="Debits"
            value={formatMoney(summary.debitTotal)}
            description="Debit-side volume across loaded records."
            icon={ArrowUpRight}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="admin-transaction-search"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Search transactions
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="admin-transaction-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Reference, customer, account or description..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="w-full xl:w-52">
              <label
                htmlFor="admin-transaction-status"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Status
              </label>

              <select
                id="admin-transaction-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL"
                      ? "All statuses"
                      : option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full xl:w-52">
              <label
                htmlFor="admin-transaction-type"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Transaction type
              </label>

              <select
                id="admin-transaction-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL"
                      ? "All types"
                      : option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Filter className="h-4 w-4" />
              Clear
            </button>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

              <div>
                <h2 className="font-semibold text-red-800 dark:text-red-300">
                  Transaction records could not be loaded
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => fetchTransactions({ reset: true })}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Transaction activity
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Financial records returned by the authenticated admin API.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Admin access
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center">
              <Activity className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No transactions found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                No transaction records matched the current search and filter
                criteria.
              </p>

              {(search || status !== "ALL" || type !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-slate-50 dark:bg-slate-950/60">
                    <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Transaction
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Customer
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Type
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Date
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((transaction) => {
                      const id = getTransactionId(transaction);
                      const customerName = getCustomerName(transaction);
                      const customerEmail = getCustomerEmail(transaction);
                      const accountNumber = getAccountNumber(
                        transaction.account,
                      );

                      return (
                        <tr
                          key={id || transaction.reference}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50"
                        >
                          <td className="px-5 py-4">
                            <div className="max-w-[260px]">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {transaction.description}
                              </p>

                              <div className="mt-1 flex items-center gap-2">
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {transaction.reference || id || "No reference"}
                                </p>

                                {transaction.reference && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyReference(transaction.reference)
                                    }
                                    aria-label="Copy transaction reference"
                                    className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {customerName}
                              </p>

                              {customerEmail && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {customerEmail}
                                </p>
                              )}

                              {accountNumber && (
                                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                  {maskAccountNumber(accountNumber)}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <TypeBadge type={transaction.type} />
                          </td>

                          <td className="px-5 py-4">
                            <div>
                              <p
                                className={`text-sm font-bold ${
                                  isCreditType(transaction.type)
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : isDebitType(transaction.type)
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {isCreditType(transaction.type) ? "+" : ""}
                                {formatMoney(
                                  transaction.amount,
                                  transaction.currency,
                                )}
                              </p>

                              {transaction.fee > 0 && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Fee:{" "}
                                  {formatMoney(
                                    transaction.fee,
                                    transaction.currency,
                                  )}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={transaction.status} />
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {formatDateTime(transaction.createdAt)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex flex-col items-end gap-2">
                              {(() => {
                                const statusOptions =
                                  getBankTransferStatusOptions(transaction);

                                if (statusOptions.length > 0 && id) {
                                  return (
                                    <select
                                      value=""
                                      disabled={updatingId === id}
                                      onChange={(event) => {
                                        const nextStatus = event.target.value;

                                        if (!nextStatus) return;

                                        updateTransactionStatus(
                                          transaction,
                                          nextStatus,
                                        );
                                      }}
                                      className="min-w-[145px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                    >
                                      <option value="">
                                        {updatingId === id
                                          ? "Updating..."
                                          : "Update status"}
                                      </option>

                                      {statusOptions.map((option) => (
                                        <option
                                          key={option}
                                          value={option}
                                        >
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  );
                                }

                                return null;
                              })()}

                              {id ? (
                                <Link
                                  to={`/admin/transactions/${encodeURIComponent(
                                    id,
                                  )}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
                                >
                                  Review
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  No ID
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
                {transactions.map((transaction) => {
                  const id = getTransactionId(transaction);
                  const accountNumber = getAccountNumber(transaction.account);

                  return (
                    <article
                      key={id || transaction.reference}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {transaction.description}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {transaction.reference || id || "No reference"}
                          </p>
                        </div>

                        <StatusBadge status={transaction.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Customer
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {getCustomerName(transaction)}
                          </p>

                          {accountNumber && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {maskAccountNumber(accountNumber)}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Amount
                          </p>

                          <p
                            className={`mt-1 text-sm font-bold ${
                              isCreditType(transaction.type)
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isDebitType(transaction.type)
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {isCreditType(transaction.type) ? "+" : ""}
                            {formatMoney(
                              transaction.amount,
                              transaction.currency,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <TypeBadge type={transaction.type} />

                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(transaction.createdAt)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          {transaction.reference ? (
                            <button
                              type="button"
                              onClick={() =>
                                copyReference(transaction.reference)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy reference
                            </button>
                          ) : (
                            <span />
                          )}

                          {id && (
                            <Link
                              to={`/admin/transactions/${encodeURIComponent(id)}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                            >
                              Review
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>

                        {(() => {
                          const statusOptions =
                            getBankTransferStatusOptions(transaction);

                          if (!id || statusOptions.length === 0) {
                            return null;
                          }

                          return (
                            <select
                              value=""
                              disabled={updatingId === id}
                              onChange={(event) => {
                                const nextStatus = event.target.value;

                                if (!nextStatus) return;

                                updateTransactionStatus(
                                  transaction,
                                  nextStatus,
                                );
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                              <option value="">
                                {updatingId === id
                                  ? "Updating..."
                                  : "Update transfer status"}
                              </option>

                              {statusOptions.map((option) => (
                                <option
                                  key={option}
                                  value={option}
                                >
                                  {option}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>
                    </article>
                  );
                })}
              </div>

              {nextCursor && (
                <div className="border-t border-slate-200 p-5 text-center dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      fetchTransactions({
                        reset: false,
                        cursor: nextCursor,
                      })
                    }
                    disabled={loadingMore}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        loadingMore ? "animate-spin" : ""
                      }`}
                    />
                    {loadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" />

            <div>
              <h2 className="font-semibold text-blue-950 dark:text-blue-200">
                Financial record security
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                Transaction records are displayed from the authenticated admin
                API. Account numbers are masked in the interface and sensitive
                payment credentials should never be exposed through this page.
              </p>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Link
            to="/admin/audit-logs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Review administrative audit logs
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminTransactions;


