import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  Globe2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
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
  "INTERNAL",
  "BANK",
  "INTERNATIONAL",
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
    (Array.isArray(source?.transfers) && source.transfers) ||
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

const normalizeTransfer = (transfer) => {
  const metadata =
    transfer?.metadata && typeof transfer.metadata === "object"
      ? transfer.metadata
      : {};

  const senderAccount =
    transfer?.senderAccount ??
    transfer?.sourceAccount ??
    transfer?.fromAccount ??
    null;

  const receiverAccount =
    transfer?.receiverAccount ??
    transfer?.destinationAccount ??
    transfer?.toAccount ??
    null;

  const sender =
    transfer?.sender ??
    transfer?.senderUser ??
    transfer?.fromUser ??
    senderAccount?.user ??
    null;

  const receiver =
    transfer?.receiver ??
    transfer?.receiverUser ??
    transfer?.toUser ??
    receiverAccount?.user ??
    null;

  const amount = Number(
    transfer?.amount ??
      transfer?.value ??
      transfer?.transferAmount ??
      metadata?.amount ??
      0,
  );

  const fee = Number(
    transfer?.fee ??
      transfer?.fees ??
      transfer?.transferFee ??
      metadata?.fee ??
      0,
  );

  return {
    ...transfer,

    id:
      transfer?.id ??
      transfer?.transferId ??
      transfer?.reference ??
      metadata?.transferId ??
      "",

    reference:
      transfer?.reference ??
      transfer?.transferReference ??
      metadata?.reference ??
      "",

    type:
      transfer?.type ??
      transfer?.transferType ??
      transfer?.method ??
      transfer?.channel ??
      "UNKNOWN",

    status:
      transfer?.status ??
      transfer?.transferStatus ??
      "UNKNOWN",

    amount: Number.isFinite(amount) ? amount : 0,
    fee: Number.isFinite(fee) ? fee : 0,

    currency:
      transfer?.currency?.code ??
      transfer?.currencyCode ??
      transfer?.currency ??
      senderAccount?.currency?.code ??
      "USD",

    sender,
    receiver,
    senderAccount,
    receiverAccount,

    description:
      transfer?.description ??
      transfer?.narration ??
      transfer?.purpose ??
      metadata?.description ??
      "Transfer",

    createdAt:
      transfer?.createdAt ??
      transfer?.created_at ??
      transfer?.date ??
      transfer?.transferDate ??
      transfer?.processedAt ??
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

const getPersonName = (person, fallback = "Customer") => {
  if (!person) return fallback;

  if (typeof person === "string" && person.trim()) {
    return person;
  }

  const firstName = person?.firstName ?? person?.first_name ?? "";
  const lastName = person?.lastName ?? person?.last_name ?? "";

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    person?.name ||
    person?.fullName ||
    person?.displayName ||
    fallback
  );
};

const getPersonEmail = (person) =>
  person?.email ??
  person?.emailAddress ??
  "";

const getAccountNumber = (account) =>
  account?.accountNumber ??
  account?.number ??
  account?.maskedAccountNumber ??
  "";

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

  const config = {
    INTERNAL: {
      icon: UserRound,
      className:
        "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
    },
    BANK: {
      icon: Banknote,
      className:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
    },
    INTERNATIONAL: {
      icon: Globe2,
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    },
  };

  const selected = config[normalized] ?? {
    icon: Activity,
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  const Icon = selected.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${selected.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
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

const AdminTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");

  const [nextCursor, setNextCursor] = useState(null);

  const fetchTransfers = useCallback(
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

        if (type !== "ALL") {
          params.type = type;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const response = await api.get("/admin/transfers", {
          params,
        });

        const normalized = normalizeCollection(response?.data);

        const mapped = normalized.items.map(normalizeTransfer);

        setTransfers((current) =>
          reset ? mapped : [...current, ...mapped],
        );

        setNextCursor(normalized.nextCursor);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load administrative transfer records.";

        setError(message);

        if (reset) {
          setTransfers([]);
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
      fetchTransfers({ reset: true });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchTransfers]);

  const summary = useMemo(() => {
    const completed = transfers.filter(
      (transfer) =>
        normalizeStatus(transfer.status) === "COMPLETED",
    ).length;

    const pending = transfers.filter((transfer) =>
      ["PENDING", "PROCESSING"].includes(
        normalizeStatus(transfer.status),
      ),
    ).length;

    const failed = transfers.filter((transfer) =>
      ["FAILED", "REVERSED", "CANCELLED"].includes(
        normalizeStatus(transfer.status),
      ),
    ).length;

    const internal = transfers.filter(
      (transfer) => normalizeType(transfer.type) === "INTERNAL",
    ).length;

    const bank = transfers.filter(
      (transfer) => normalizeType(transfer.type) === "BANK",
    ).length;

    const international = transfers.filter(
      (transfer) =>
        normalizeType(transfer.type) === "INTERNATIONAL",
    ).length;

    const totalVolume = transfers.reduce(
      (total, transfer) => total + transfer.amount,
      0,
    );

    const totalFees = transfers.reduce(
      (total, transfer) => total + transfer.fee,
      0,
    );

    return {
      total: transfers.length,
      completed,
      pending,
      failed,
      internal,
      bank,
      international,
      totalVolume,
      totalFees,
    };
  }, [transfers]);

  const copyReference = async (reference) => {
    if (!reference || !navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(String(reference));
    } catch {
      // Clipboard permissions may be unavailable.
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
                  Transfers
                </h1>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Review internal, bank and international transfer activity
                  across the Epex Bank platform.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchTransfers({
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
            label="Loaded transfers"
            value={summary.total.toLocaleString()}
            description="Transfer records currently loaded into the admin view."
            icon={Activity}
          />

          <SummaryCard
            label="Completed"
            value={summary.completed.toLocaleString()}
            description="Transfers with completed status in the current result set."
            icon={CheckCircle2}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending.toLocaleString()}
            description="Pending or processing transfers awaiting completion."
            icon={Clock3}
          />

          <SummaryCard
            label="Transfer volume"
            value={formatMoney(summary.totalVolume)}
            description="Loaded transfer volume. Mixed currencies are not consolidated."
            icon={ArrowUpRight}
          />

          <SummaryCard
            label="Fees"
            value={formatMoney(summary.totalFees)}
            description="Loaded transfer fees. Mixed currencies are not consolidated."
            icon={Banknote}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900/60 dark:bg-violet-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                  Internal
                </p>
                <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
                  Epex Bank customer-to-customer transfers
                </p>
              </div>

              <UserRound className="h-5 w-5 text-violet-700 dark:text-violet-300" />
            </div>

            <p className="mt-4 text-2xl font-bold text-violet-950 dark:text-violet-100">
              {summary.internal.toLocaleString()}
            </p>
          </article>

          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Bank
                </p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  External domestic bank transfers
                </p>
              </div>

              <Banknote className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            </div>

            <p className="mt-4 text-2xl font-bold text-blue-950 dark:text-blue-100">
              {summary.bank.toLocaleString()}
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  International
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Cross-border transfer activity
                </p>
              </div>

              <Globe2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            </div>

            <p className="mt-4 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
              {summary.international.toLocaleString()}
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="admin-transfer-search"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Search transfers
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="admin-transfer-search"
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
                htmlFor="admin-transfer-status"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Status
              </label>

              <select
                id="admin-transfer-status"
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
                htmlFor="admin-transfer-type"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Transfer type
              </label>

              <select
                id="admin-transfer-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL"
                      ? "All transfer types"
                      : option}
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
                  Transfer records could not be loaded
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => fetchTransfers({ reset: true })}
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
                Transfer activity
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Transfer records returned by the authenticated admin API.
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
          ) : transfers.length === 0 ? (
            <div className="p-10 text-center">
              <Activity className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No transfers found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                No transfer records matched the current search and filter
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
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-slate-50 dark:bg-slate-950/60">
                    <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Transfer
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Sender
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Recipient
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
                    {transfers.map((transfer) => {
                      const senderName = getPersonName(
                        transfer.sender,
                        "Sender",
                      );

                      const receiverName = getPersonName(
                        transfer.receiver,
                        "Recipient",
                      );

                      const senderAccount = getAccountNumber(
                        transfer.senderAccount,
                      );

                      const receiverAccount = getAccountNumber(
                        transfer.receiverAccount,
                      );

                      return (
                        <tr
                          key={transfer.id || transfer.reference}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50"
                        >
                          <td className="px-5 py-4">
                            <div className="max-w-[260px]">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {transfer.description}
                              </p>

                              <div className="mt-1 flex items-center gap-2">
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {transfer.reference ||
                                    transfer.id ||
                                    "No reference"}
                                </p>

                                {transfer.reference && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyReference(transfer.reference)
                                    }
                                    aria-label="Copy transfer reference"
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
                                {senderName}
                              </p>

                              {getPersonEmail(transfer.sender) && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {getPersonEmail(transfer.sender)}
                                </p>
                              )}

                              {senderAccount && (
                                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                  {maskAccountNumber(senderAccount)}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {receiverName}
                              </p>

                              {getPersonEmail(transfer.receiver) && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {getPersonEmail(transfer.receiver)}
                                </p>
                              )}

                              {receiverAccount && (
                                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                  {maskAccountNumber(receiverAccount)}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <TypeBadge type={transfer.type} />
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatMoney(
                                transfer.amount,
                                transfer.currency,
                              )}
                            </p>

                            {transfer.fee > 0 && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Fee:{" "}
                                {formatMoney(
                                  transfer.fee,
                                  transfer.currency,
                                )}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={transfer.status} />
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {formatDateTime(transfer.createdAt)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {transfer.id ? (
                              <Link
                                to={`/admin/transfers/${encodeURIComponent(
                                  transfer.id,
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
                {transfers.map((transfer) => {
                  const senderAccount = getAccountNumber(
                    transfer.senderAccount,
                  );

                  const receiverAccount = getAccountNumber(
                    transfer.receiverAccount,
                  );

                  return (
                    <article
                      key={transfer.id || transfer.reference}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {transfer.description}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {transfer.reference ||
                              transfer.id ||
                              "No reference"}
                          </p>
                        </div>

                        <StatusBadge status={transfer.status} />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <TypeBadge type={transfer.type} />

                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(transfer.createdAt)}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Sender
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {getPersonName(transfer.sender, "Sender")}
                            </p>

                            {senderAccount && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {maskAccountNumber(senderAccount)}
                              </p>
                            )}
                          </div>

                          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />

                          <div className="min-w-0 text-right">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Recipient
                            </p>

                            <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {getPersonName(
                                transfer.receiver,
                                "Recipient",
                              )}
                            </p>

                            {receiverAccount && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {maskAccountNumber(receiverAccount)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Amount
                          </p>

                          <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                            {formatMoney(
                              transfer.amount,
                              transfer.currency,
                            )}
                          </p>

                          {transfer.fee > 0 && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Fee:{" "}
                              {formatMoney(
                                transfer.fee,
                                transfer.currency,
                              )}
                            </p>
                          )}
                        </div>

                        {transfer.id && (
                          <Link
                            to={`/admin/transfers/${encodeURIComponent(
                              transfer.id,
                            )}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                          >
                            Review
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>

                      {transfer.reference && (
                        <button
                          type="button"
                          onClick={() =>
                            copyReference(transfer.reference)
                          }
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy reference
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              {nextCursor && (
                <div className="border-t border-slate-200 p-5 text-center dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      fetchTransfers({
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
                Transfer security
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                Transfer records are loaded from the authenticated
                administrative API. Account numbers are masked and sensitive
                payment credentials are never displayed in this interface.
              </p>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Link
            to="/admin/audit-logs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Review administrative audit logs
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminTransfers;