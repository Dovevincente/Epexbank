import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
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

const METHOD_OPTIONS = [
  "ALL",
  "BANK_TRANSFER",
  "BANK",
  "WIRE",
  "CARD",
  "CASH",
  "WALLET",
  "OTHER",
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
    (Array.isArray(source?.withdrawals) && source.withdrawals) ||
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

const normalizeWithdrawal = (withdrawal) => {
  const metadata =
    withdrawal?.metadata &&
    typeof withdrawal.metadata === "object"
      ? withdrawal.metadata
      : {};

  const account =
    withdrawal?.account ??
    withdrawal?.sourceAccount ??
    withdrawal?.debitAccount ??
    null;

  const customer =
    withdrawal?.customer ??
    withdrawal?.user ??
    withdrawal?.owner ??
    account?.user ??
    null;

  const amount = Number(
    withdrawal?.amount ??
      withdrawal?.value ??
      withdrawal?.withdrawalAmount ??
      metadata?.amount ??
      0,
  );

  const fee = Number(
    withdrawal?.fee ??
      withdrawal?.fees ??
      withdrawal?.withdrawalFee ??
      metadata?.fee ??
      0,
  );

  return {
    ...withdrawal,

    id:
      withdrawal?.id ??
      withdrawal?.withdrawalId ??
      withdrawal?.reference ??
      metadata?.withdrawalId ??
      "",

    reference:
      withdrawal?.reference ??
      withdrawal?.withdrawalReference ??
      metadata?.reference ??
      "",

    status:
      withdrawal?.status ??
      withdrawal?.withdrawalStatus ??
      "UNKNOWN",

    method:
      withdrawal?.method ??
      withdrawal?.withdrawalMethod ??
      withdrawal?.channel ??
      metadata?.method ??
      "OTHER",

    amount: Number.isFinite(amount) ? amount : 0,
    fee: Number.isFinite(fee) ? fee : 0,

    currency:
      withdrawal?.currency?.code ??
      withdrawal?.currencyCode ??
      withdrawal?.currency ??
      account?.currency?.code ??
      "USD",

    account,
    customer,

    destination:
      withdrawal?.destination ??
      withdrawal?.beneficiary ??
      withdrawal?.bankDetails ??
      null,

    description:
      withdrawal?.description ??
      withdrawal?.narration ??
      withdrawal?.purpose ??
      "Withdrawal",

    createdAt:
      withdrawal?.createdAt ??
      withdrawal?.created_at ??
      withdrawal?.date ??
      withdrawal?.requestedAt ??
      null,

    processedAt:
      withdrawal?.processedAt ??
      withdrawal?.completedAt ??
      withdrawal?.processed_at ??
      null,
  };
};

const normalizeStatus = (value) =>
  String(value ?? "UNKNOWN")
    .trim()
    .toUpperCase();

const normalizeMethod = (value) =>
  String(value ?? "OTHER")
    .trim()
    .toUpperCase();

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

const getCustomerName = (customer) => {
  if (!customer) return "Customer";

  if (typeof customer === "string" && customer.trim()) {
    return customer;
  }

  const firstName =
    customer?.firstName ??
    customer?.first_name ??
    "";

  const lastName =
    customer?.lastName ??
    customer?.last_name ??
    "";

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    customer?.name ||
    customer?.fullName ||
    customer?.displayName ||
    "Customer"
  );
};

const getCustomerEmail = (customer) =>
  customer?.email ??
  customer?.emailAddress ??
  "";

const getAccountNumber = (account) =>
  account?.accountNumber ??
  account?.number ??
  account?.maskedAccountNumber ??
  "";

const maskAccountNumber = (value) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) return "Not available";

  if (normalized.length <= 4) {
    return normalized;
  }

  return `•••• ${normalized.slice(-4)}`;
};

const getMethodLabel = (method) =>
  normalizeMethod(method)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (
    ["PENDING", "PROCESSING"].includes(normalized)
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
  }

  if (
    ["FAILED", "REVERSED", "CANCELLED"].includes(
      normalized,
    )
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);

  const positive = normalized === "COMPLETED";

  const negative = [
    "FAILED",
    "REVERSED",
    "CANCELLED",
  ].includes(normalized);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
        normalized,
      )}`}
    >
      {positive ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : negative ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        <Clock3 className="h-3.5 w-3.5" />
      )}

      {normalized}
    </span>
  );
};

const SummaryCard = ({
  label,
  value,
  description,
  icon: Icon,
}) => (
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

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [method, setMethod] = useState("ALL");

  const [nextCursor, setNextCursor] = useState(null);

  const fetchWithdrawals = useCallback(
    async ({
      reset = true,
      cursor = null,
      refresh = false,
    } = {}) => {
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

        if (method !== "ALL") {
          params.method = method;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const response = await api.get(
          "/admin/withdrawals",
          {
            params,
          },
        );

        const normalized = normalizeCollection(
          response?.data,
        );

        const mapped = normalized.items.map(
          normalizeWithdrawal,
        );

        setWithdrawals((current) =>
          reset ? mapped : [...current, ...mapped],
        );

        setNextCursor(normalized.nextCursor);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load withdrawal records.";

        setError(message);

        if (reset) {
          setWithdrawals([]);
          setNextCursor(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, status, method],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchWithdrawals({ reset: true });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchWithdrawals]);

  const summary = useMemo(() => {
    const completed = withdrawals.filter(
      (withdrawal) =>
        normalizeStatus(withdrawal.status) ===
        "COMPLETED",
    ).length;

    const pending = withdrawals.filter((withdrawal) =>
      ["PENDING", "PROCESSING"].includes(
        normalizeStatus(withdrawal.status),
      ),
    ).length;

    const failed = withdrawals.filter((withdrawal) =>
      ["FAILED", "REVERSED", "CANCELLED"].includes(
        normalizeStatus(withdrawal.status),
      ),
    ).length;

    const totalRequested = withdrawals.reduce(
      (total, withdrawal) =>
        total + withdrawal.amount,
      0,
    );

    const totalFees = withdrawals.reduce(
      (total, withdrawal) =>
        total + withdrawal.fee,
      0,
    );

    return {
      total: withdrawals.length,
      completed,
      pending,
      failed,
      totalRequested,
      totalFees,
    };
  }, [withdrawals]);

  const copyReference = async (reference) => {
    if (!reference || !navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(
        String(reference),
      );
    } catch {
      // Clipboard permissions may be unavailable.
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setMethod("ALL");
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <ArrowDownToLine className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  Withdrawals
                </h1>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Review customer withdrawal requests, processing status,
                  destination details and financial records.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchWithdrawals({
                  reset: true,
                  refresh: true,
                })
              }
              disabled={loading || refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Loaded requests"
            value={summary.total.toLocaleString()}
            description="Withdrawal records currently loaded."
            icon={ArrowDownToLine}
          />

          <SummaryCard
            label="Completed"
            value={summary.completed.toLocaleString()}
            description="Withdrawals completed in the current result set."
            icon={CheckCircle2}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending.toLocaleString()}
            description="Pending or processing withdrawal requests."
            icon={Clock3}
          />

          <SummaryCard
            label="Requested volume"
            value={formatMoney(summary.totalRequested)}
            description="Loaded withdrawal volume. Mixed currencies are not consolidated."
            icon={Banknote}
          />

          <SummaryCard
            label="Fees"
            value={formatMoney(summary.totalFees)}
            description="Loaded withdrawal fees. Mixed currencies are not consolidated."
            icon={Wallet}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="admin-withdrawal-search"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Search withdrawals
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="admin-withdrawal-search"
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Reference, customer, account or description..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="w-full xl:w-52">
              <label
                htmlFor="admin-withdrawal-status"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Status
              </label>

              <select
                id="admin-withdrawal-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
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

            <div className="w-full xl:w-56">
              <label
                htmlFor="admin-withdrawal-method"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Method
              </label>

              <select
                id="admin-withdrawal-method"
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value)
                }
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {METHOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL"
                      ? "All methods"
                      : getMethodLabel(option)}
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
                  Withdrawal records could not be loaded
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    fetchWithdrawals({ reset: true })
                  }
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
                Withdrawal activity
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Withdrawal records returned by the authenticated admin API.
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
          ) : withdrawals.length === 0 ? (
            <div className="p-10 text-center">
              <ArrowDownToLine className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No withdrawals found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                No withdrawal records matched the current search and filter
                criteria.
              </p>

              {(search ||
                status !== "ALL" ||
                method !== "ALL") && (
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
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-slate-50 dark:bg-slate-950/60">
                    <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Withdrawal
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Account
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Method
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Status
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Requested
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {withdrawals.map((withdrawal) => {
                      const accountNumber =
                        getAccountNumber(
                          withdrawal.account,
                        );

                      return (
                        <tr
                          key={
                            withdrawal.id ||
                            withdrawal.reference
                          }
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50"
                        >
                          <td className="px-5 py-4">
                            <div className="max-w-[250px]">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {withdrawal.description}
                              </p>

                              <div className="mt-1 flex items-center gap-2">
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {withdrawal.reference ||
                                    withdrawal.id ||
                                    "No reference"}
                                </p>

                                {withdrawal.reference && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyReference(
                                        withdrawal.reference,
                                      )
                                    }
                                    aria-label="Copy withdrawal reference"
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
                                {getCustomerName(
                                  withdrawal.customer,
                                )}
                              </p>

                              {getCustomerEmail(
                                withdrawal.customer,
                              ) && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {getCustomerEmail(
                                    withdrawal.customer,
                                  )}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {maskAccountNumber(
                                accountNumber,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <Banknote className="h-3.5 w-3.5" />
                              {getMethodLabel(
                                withdrawal.method,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatMoney(
                                withdrawal.amount,
                                withdrawal.currency,
                              )}
                            </p>

                            {withdrawal.fee > 0 && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Fee:{" "}
                                {formatMoney(
                                  withdrawal.fee,
                                  withdrawal.currency,
                                )}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={withdrawal.status}
                            />
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {formatDateTime(
                              withdrawal.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {withdrawal.id ? (
                              <Link
                                to={`/admin/withdrawals/${encodeURIComponent(
                                  withdrawal.id,
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
                {withdrawals.map((withdrawal) => {
                  const accountNumber =
                    getAccountNumber(
                      withdrawal.account,
                    );

                  return (
                    <article
                      key={
                        withdrawal.id ||
                        withdrawal.reference
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {withdrawal.description}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {withdrawal.reference ||
                              withdrawal.id ||
                              "No reference"}
                          </p>
                        </div>

                        <StatusBadge
                          status={withdrawal.status}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Customer
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {getCustomerName(
                              withdrawal.customer,
                            )}
                          </p>

                          {accountNumber && (
                            <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                              {maskAccountNumber(
                                accountNumber,
                              )}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Amount
                          </p>

                          <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                            {formatMoney(
                              withdrawal.amount,
                              withdrawal.currency,
                            )}
                          </p>

                          {withdrawal.fee > 0 && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Fee:{" "}
                              {formatMoney(
                                withdrawal.fee,
                                withdrawal.currency,
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Banknote className="h-3.5 w-3.5" />
                          {getMethodLabel(
                            withdrawal.method,
                          )}
                        </span>

                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(
                            withdrawal.createdAt,
                          )}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        {withdrawal.reference ? (
                          <button
                            type="button"
                            onClick={() =>
                              copyReference(
                                withdrawal.reference,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy reference
                          </button>
                        ) : (
                          <span />
                        )}

                        {withdrawal.id && (
                          <Link
                            to={`/admin/withdrawals/${encodeURIComponent(
                              withdrawal.id,
                            )}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                          >
                            Review
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
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
                      fetchWithdrawals({
                        reset: false,
                        cursor: nextCursor,
                      })
                    }
                    disabled={loadingMore}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        loadingMore
                          ? "animate-spin"
                          : ""
                      }`}
                    />
                    {loadingMore
                      ? "Loading..."
                      : "Load more"}
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
                Withdrawal security
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                Withdrawal records are loaded through the authenticated
                administration API. Account numbers are masked and sensitive
                banking credentials should never be exposed in the admin
                interface.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex justify-end">
          <Link
            to="/admin/audit-logs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Review administrative audit logs
            <ChevronRight className="h-4 w-4" />
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Withdrawals;