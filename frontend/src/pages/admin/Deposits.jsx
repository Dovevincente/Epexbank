import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";

const PAGE_SIZE = 12;

const normalizeDeposits = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.deposits)) {
    return payload.deposits;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.deposits)) {
    return payload.data.deposits;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

const getCustomer = (deposit) => {
  const customer =
    deposit?.user ||
    deposit?.customer ||
    deposit?.owner ||
    deposit?.account?.user ||
    deposit?.account?.customer ||
    null;

  return {
    id:
      customer?.id ||
      deposit?.userId ||
      deposit?.customerId ||
      deposit?.account?.userId ||
      "",
    name:
      customer?.name ||
      customer?.fullName ||
      [customer?.firstName, customer?.lastName]
        .filter(Boolean)
        .join(" ") ||
      customer?.email ||
      "Customer",
    email: customer?.email || "",
  };
};

const getAccountNumber = (deposit) =>
  deposit?.account?.accountNumber ||
  deposit?.accountNumber ||
  deposit?.destinationAccountNumber ||
  deposit?.destinationAccount?.accountNumber ||
  "—";

const getDepositId = (deposit) =>
  deposit?.id ||
  deposit?.depositId ||
  "";

const getStatus = (deposit) =>
  String(
    deposit?.status ||
      deposit?.depositStatus ||
      deposit?.state ||
      "UNKNOWN",
  ).toUpperCase();

const getMethod = (deposit) =>
  String(
    deposit?.method ||
      deposit?.depositMethod ||
      deposit?.paymentMethod ||
      deposit?.channel ||
      "—",
  );

const getReference = (deposit) =>
  deposit?.reference ||
  deposit?.depositReference ||
  deposit?.transactionReference ||
  deposit?.transaction?.reference ||
  "—";

const getCurrency = (deposit) => {
  if (typeof deposit?.currency === "string") {
    return deposit.currency.toUpperCase();
  }

  return String(
    deposit?.currency?.code ||
      deposit?.currencyCode ||
      deposit?.account?.currency?.code ||
      "USD",
  ).toUpperCase();
};

const getAmount = (deposit) => {
  const amount = Number(
    deposit?.amount ??
      deposit?.requestedAmount ??
      deposit?.depositAmount ??
      deposit?.transaction?.amount ??
      0,
  );

  return Number.isFinite(amount) ? amount : 0;
};

const getTimestamp = (deposit) =>
  deposit?.createdAt ||
  deposit?.requestedAt ||
  deposit?.processedAt ||
  deposit?.updatedAt ||
  null;

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency).toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatRelativeDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference = Date.now() - date.getTime();
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return "";
};

const formatLabel = (value) =>
  String(value || "—")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const statusClass = (status) => {
  switch (String(status).toUpperCase()) {
    case "COMPLETED":
    case "SUCCESS":
    case "APPROVED":
    case "POSTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PENDING":
    case "AWAITING":
    case "REVIEW":
    case "PROCESSING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FAILED":
    case "REJECTED":
    case "DENIED":
    case "CANCELLED":
    case "CANCELED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const AdminDeposits = () => {
  const navigate = useNavigate();

  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [copiedReference, setCopiedReference] = useState("");

  const loadDeposits = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/admin/deposits");

      setDeposits(normalizeDeposits(response?.data));
      setPage(1);
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to load deposit records.";

      setError(message);
      setDeposits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, methodFilter]);

  const statuses = useMemo(() => {
    const values = new Set();

    deposits.forEach((deposit) => {
      const status = getStatus(deposit);

      if (status) {
        values.add(status);
      }
    });

    return Array.from(values).sort();
  }, [deposits]);

  const methods = useMemo(() => {
    const values = new Set();

    deposits.forEach((deposit) => {
      const method = getMethod(deposit);

      if (method && method !== "—") {
        values.add(method);
      }
    });

    return Array.from(values).sort();
  }, [deposits]);

  const filteredDeposits = useMemo(() => {
    const query = search.trim().toLowerCase();

    return deposits.filter((deposit) => {
      const customer = getCustomer(deposit);
      const accountNumber = getAccountNumber(deposit);
      const reference = getReference(deposit);
      const status = getStatus(deposit);
      const method = getMethod(deposit);
      const depositId = getDepositId(deposit);

      const searchableText = [
        customer.name,
        customer.email,
        accountNumber,
        reference,
        depositId,
        status,
        method,
        deposit?.description,
        deposit?.provider,
        deposit?.channel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      const matchesMethod =
        methodFilter === "ALL" || method === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [deposits, search, statusFilter, methodFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeposits.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleDeposits = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredDeposits.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredDeposits]);

  const summary = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let failed = 0;

    const totalsByCurrency = new Map();

    deposits.forEach((deposit) => {
      const status = getStatus(deposit);
      const currency = getCurrency(deposit);
      const amount = getAmount(deposit);

      if (
        status === "COMPLETED" ||
        status === "SUCCESS" ||
        status === "APPROVED" ||
        status === "POSTED"
      ) {
        completed += 1;
      }

      if (
        status === "PENDING" ||
        status === "AWAITING" ||
        status === "REVIEW" ||
        status === "PROCESSING"
      ) {
        pending += 1;
      }

      if (
        status === "FAILED" ||
        status === "REJECTED" ||
        status === "DENIED" ||
        status === "CANCELLED" ||
        status === "CANCELED"
      ) {
        failed += 1;
      }

      if (amount > 0) {
        totalsByCurrency.set(
          currency,
          (totalsByCurrency.get(currency) || 0) + amount,
        );
      }
    });

    return {
      total: deposits.length,
      completed,
      pending,
      failed,
      totalsByCurrency,
    };
  }, [deposits]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setPage(1);
  };

  const openDeposit = (deposit) => {
    const depositId = getDepositId(deposit);

    if (!depositId) {
      return;
    }

    navigate(
      `/admin/deposits/${encodeURIComponent(depositId)}`,
    );
  };

  const copyReference = async (reference) => {
    if (!reference || reference === "—") {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(reference));
      setCopiedReference(String(reference));

      window.setTimeout(() => {
        setCopiedReference("");
      }, 1800);
    } catch {
      // Clipboard access can be unavailable in some browser contexts.
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />

              <p className="mt-4 font-semibold text-slate-950">
                Loading deposits
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Retrieving live deposit records from the Epex Bank API.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !deposits.length) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              Deposits unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadDeposits()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Protected deposit operations
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Deposits
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Review deposit requests, processing status and completed
                deposit activity using live records from the banking API.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadDeposits(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Deposit data warning
              </p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Deposit records
              </p>
              <WalletCards className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Completed
              </p>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.completed}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Pending
              </p>
              <Clock3 className="h-5 w-5 text-amber-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Failed / rejected
              </p>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.failed}
            </p>
          </div>
        </section>

        {summary.totalsByCurrency.size > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from(summary.totalsByCurrency.entries())
              .slice(0, 4)
              .map(([currency, amount]) => (
                <div
                  key={currency}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Returned deposit volume
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatMoney(amount, currency)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {currency} records returned by the API
                  </p>
                </div>
              ))}
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Deposit directory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredDeposits.length} deposit
                  {filteredDeposits.length === 1 ? "" : "s"} match the
                  current filters.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search customer, account, reference..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All statuses</option>

                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>

                <select
                  value={methodFilter}
                  onChange={(event) =>
                    setMethodFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All methods</option>

                  {methods.map((method) => (
                    <option key={method} value={method}>
                      {formatLabel(method)}
                    </option>
                  ))}
                </select>

                {(search ||
                  statusFilter !== "ALL" ||
                  methodFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {visibleDeposits.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <WalletCards className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-950">
                No deposits found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                No deposit records match the current search and filter
                settings.
              </p>

              {(search ||
                statusFilter !== "ALL" ||
                methodFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Account</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Method</th>
                      <th className="px-5 py-4">Reference</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleDeposits.map((deposit) => {
                      const customer = getCustomer(deposit);
                      const status = getStatus(deposit);
                      const currency = getCurrency(deposit);
                      const reference = getReference(deposit);
                      const timestamp = getTimestamp(deposit);

                      return (
                        <tr
                          key={getDepositId(deposit)}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[210px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {customer.name}
                                </p>

                                {customer.email ? (
                                  <p className="truncate text-xs text-slate-500">
                                    {customer.email}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {getAccountNumber(deposit)}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">
                              {formatMoney(
                                getAmount(deposit),
                                currency,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {formatLabel(getMethod(deposit))}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex max-w-[190px] items-center gap-1">
                              <span className="truncate font-mono text-xs text-slate-600">
                                {reference}
                              </span>

                              {reference !== "—" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyReference(reference)
                                  }
                                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                  aria-label="Copy deposit reference"
                                  title="Copy reference"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                status,
                              )}`}
                            >
                              {formatLabel(status)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <p className="text-sm text-slate-700">
                              {formatDateTime(timestamp)}
                            </p>

                            {formatRelativeDate(timestamp) ? (
                              <p className="mt-1 text-xs text-slate-400">
                                {formatRelativeDate(timestamp)}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openDeposit(deposit)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4" />
                              Review
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {visibleDeposits.map((deposit) => {
                  const customer = getCustomer(deposit);
                  const status = getStatus(deposit);
                  const currency = getCurrency(deposit);
                  const reference = getReference(deposit);
                  const timestamp = getTimestamp(deposit);

                  return (
                    <article
                      key={getDepositId(deposit)}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <WalletCards className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-slate-950">
                              {customer.name}
                            </h3>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {getAccountNumber(deposit)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                            status,
                          )}`}
                        >
                          {formatLabel(status)}
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">
                          Deposit amount
                        </p>

                        <p className="mt-1 text-xl font-bold text-slate-950">
                          {formatMoney(
                            getAmount(deposit),
                            currency,
                          )}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">
                              Method
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatLabel(getMethod(deposit))}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Date
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatDateTime(timestamp)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs text-slate-400">
                            Reference
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <p className="min-w-0 flex-1 break-all font-mono text-xs font-semibold text-slate-700">
                              {reference}
                            </p>

                            {reference !== "—" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  copyReference(reference)
                                }
                                className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100"
                                aria-label="Copy deposit reference"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openDeposit(deposit)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4" />
                        Review deposit
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredDeposits.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredDeposits.length}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      Previous
                    </span>
                  </button>

                  <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1),
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">
                      Next
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

          <p>
            Deposit records are financial information. Approval, posting,
            reversal and account-credit operations must be authorized and
            audited by the backend. This interface does not bypass those
            controls.
          </p>
        </div>
      </div>

      {copiedReference ? (
        <div
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl"
          role="status"
        >
          Reference copied
        </div>
      ) : null}
    </div>
  );
};

export default AdminDeposits;