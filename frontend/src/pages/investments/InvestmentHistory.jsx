import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  XCircle,
  CheckCircle2,
} from "lucide-react";

import api from "../../services/api.js";

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REJECTED",
  "REVERSED",
];

const TYPE_OPTIONS = [
  "ALL",
  "BUY",
  "SELL",
  "SUBSCRIPTION",
  "REDEMPTION",
  "DIVIDEND",
  "INTEREST",
  "FEE",
  "TRANSFER",
];

const normalizeHistory = (payload) => {
  if (Array.isArray(payload)) {
    return {
      records: payload,
      nextCursor: null,
    };
  }

  const records =
    payload?.investments ??
    payload?.orders ??
    payload?.history ??
    payload?.transactions ??
    payload?.items ??
    payload?.results ??
    payload?.records ??
    payload?.data?.investments ??
    payload?.data?.orders ??
    payload?.data?.history ??
    payload?.data?.items ??
    payload?.data?.results ??
    payload?.data?.records ??
    [];

  return {
    records: Array.isArray(records) ? records : [],
    nextCursor:
      payload?.nextCursor ??
      payload?.pagination?.nextCursor ??
      payload?.meta?.nextCursor ??
      payload?.data?.nextCursor ??
      null,
  };
};

const getId = (record) =>
  record?.id ??
  record?.orderId ??
  record?.investmentId ??
  record?.transactionId ??
  null;

const getInvestmentId = (record) =>
  record?.investmentId ??
  record?.investment?.id ??
  record?.holdingId ??
  record?.holding?.id ??
  null;

const getOrderId = (record) =>
  record?.orderId ??
  record?.investmentOrderId ??
  record?.order?.id ??
  null;

const getName = (record) =>
  record?.investmentName ??
  record?.investment?.name ??
  record?.productName ??
  record?.product?.name ??
  record?.name ??
  record?.title ??
  "Investment activity";

const getType = (record) =>
  String(
    record?.type ??
      record?.side ??
      record?.orderType ??
      record?.transactionType ??
      "ACTIVITY",
  ).toUpperCase();

const getStatus = (record) =>
  String(record?.status ?? "PENDING").toUpperCase();

const getCurrency = (record) =>
  record?.currency?.code ??
  record?.currencyCode ??
  record?.currency ??
  record?.investment?.currency?.code ??
  "USD";

const getAmount = (record) =>
  record?.amount ??
  record?.totalAmount ??
  record?.orderAmount ??
  record?.value ??
  record?.currentValue ??
  record?.principal ??
  record?.netAmount ??
  null;

const getUnits = (record) =>
  record?.units ??
  record?.quantity ??
  record?.shares ??
  record?.unitsPurchased ??
  null;

const getReference = (record) =>
  record?.reference ??
  record?.orderReference ??
  record?.transactionReference ??
  record?.investmentReference ??
  null;

const getDate = (record) =>
  record?.executedAt ??
  record?.completedAt ??
  record?.processedAt ??
  record?.createdAt ??
  record?.date ??
  record?.timestamp ??
  null;

const formatAmount = (amount, currency = "USD") => {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatUnits = (units) => {
  const value = Number(units);

  if (!Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const statusClass = (status) => {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";

    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

    case "FAILED":
    case "REJECTED":
    case "CANCELLED":
    case "REVERSED":
      return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

const typeIcon = (type) => {
  if (
    type === "BUY" ||
    type === "SUBSCRIPTION"
  ) {
    return (
      <ArrowDownRight
        size={17}
        className="text-emerald-600 dark:text-emerald-400"
      />
    );
  }

  if (
    type === "SELL" ||
    type === "REDEMPTION"
  ) {
    return (
      <ArrowUpRight
        size={17}
        className="text-blue-600 dark:text-blue-400"
      />
    );
  }

  if (type === "FAILED" || type === "REJECTED") {
    return (
      <XCircle
        size={17}
        className="text-red-600 dark:text-red-400"
      />
    );
  }

  return (
    <ReceiptText
      size={17}
      className="text-slate-500 dark:text-slate-400"
    />
  );
};

const InvestmentHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");

  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);

  const loadHistory = useCallback(
    async ({
      nextCursorValue = null,
      silent = false,
    } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = {
          limit: 25,
        };

        if (nextCursorValue) {
          params.cursor = nextCursorValue;
        }

        if (search.trim()) {
          params.search = search.trim();
        }

        if (status !== "ALL") {
          params.status = status;
        }

        if (type !== "ALL") {
          params.type = type;
        }

        const response = await api.get(
          "/investments/history",
          { params },
        );

        const normalized = normalizeHistory(response?.data);

        setRecords(normalized.records);
        setNextCursor(normalized.nextCursor);
        setCursor(nextCursorValue);
      } catch (requestError) {
        setRecords([]);
        setNextCursor(null);

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load investment history.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status, type],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCursor(null);
      setCursorHistory([]);
      loadHistory({ nextCursorValue: null });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search, status, type, loadHistory]);

  const summary = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let failed = 0;
    let totalAmount = 0;

    for (const record of records) {
      const recordStatus = getStatus(record);

      if (recordStatus === "COMPLETED") {
        completed += 1;
      }

      if (
        recordStatus === "PENDING" ||
        recordStatus === "PROCESSING"
      ) {
        pending += 1;
      }

      if (
        recordStatus === "FAILED" ||
        recordStatus === "REJECTED" ||
        recordStatus === "CANCELLED" ||
        recordStatus === "REVERSED"
      ) {
        failed += 1;
      }

      const amount = Number(getAmount(record));

      if (Number.isFinite(amount)) {
        totalAmount += Math.abs(amount);
      }
    }

    return {
      total: records.length,
      completed,
      pending,
      failed,
      totalAmount,
    };
  }, [records]);

  const handleNext = async () => {
    if (!nextCursor) return;

    if (cursor) {
      setCursorHistory((current) => [...current, cursor]);
    }

    await loadHistory({
      nextCursorValue: nextCursor,
    });
  };

  const handlePrevious = async () => {
    if (!cursorHistory.length) return;

    const previous =
      cursorHistory[cursorHistory.length - 1];

    setCursorHistory((current) => current.slice(0, -1));

    await loadHistory({
      nextCursorValue: previous || null,
    });
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setType("ALL");
    setCursor(null);
    setNextCursor(null);
    setCursorHistory([]);
  };

  const hasFilters =
    search.trim() ||
    status !== "ALL" ||
    type !== "ALL";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <ReceiptText size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Investment history
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Review your investment purchase, sale, redemption,
                dividend and other investment activity.
              </p>
            </div>
          </div>

          <Link
            to="/investments"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <BarChart3 size={17} />
            My investments
          </Link>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Unable to load investment history
              </p>

              <p className="mt-1 leading-6">{error}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadHistory({
                  nextCursorValue: cursor,
                  silent: true,
                })
              }
              disabled={refreshing}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />
              Retry
            </button>
          </div>
        )}

        <div className="mb-6 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-5 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Loaded activity
            </p>
            <p className="mt-2 text-2xl font-bold">
              {summary.total}
            </p>
          </div>

          <div className="bg-white p-5 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Completed
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.completed}
            </p>
          </div>

          <div className="bg-white p-5 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Pending
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.pending}
            </p>
          </div>

          <div className="bg-white p-5 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Loaded volume
            </p>
            <p className="mt-2 text-xl font-bold">
              {formatAmount(summary.totalAmount, "USD")}
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1 lg:max-w-md">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search investments or references..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-500/10"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter
                    size={17}
                    className="shrink-0 text-slate-400"
                  />

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === "ALL"
                          ? "All statuses"
                          : option}
                      </option>
                    ))}
                  </select>

                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === "ALL"
                          ? "All types"
                          : option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadHistory({
                    nextCursorValue: cursor,
                    silent: true,
                  })
                }
                disabled={refreshing}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing ? "animate-spin" : ""
                  }
                />
                Refresh
              </button>
            </div>

            {hasFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Filters:
                </span>

                {search.trim() && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                    Search: {search.trim()}
                  </span>
                )}

                {status !== "ALL" && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                    Status: {status}
                  </span>
                )}

                {type !== "ALL" && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                    Type: {type}
                  </span>
                )}

                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                <Loader2
                  size={30}
                  className="animate-spin"
                />
                <p className="text-sm">
                  Loading investment history...
                </p>
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <ReceiptText size={26} />
              </div>

              <h2 className="mt-4 font-bold">
                No investment activity found
              </h2>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                {hasFilters
                  ? "No investment activity matches your current filters."
                  : "Investment activity will appear here after the banking service records it."}
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Investment
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Type
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Amount
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Status
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Date
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {records.map((record, index) => {
                      const id = getId(record) || `record-${index}`;
                      const investmentIdValue =
                        getInvestmentId(record);
                      const orderId = getOrderId(record);
                      const recordType = getType(record);
                      const recordStatus = getStatus(record);
                      const recordCurrency =
                        getCurrency(record);
                      const recordAmount =
                        getAmount(record);
                      const recordUnits = getUnits(record);
                      const reference =
                        getReference(record);

                      return (
                        <tr
                          key={String(id)}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                                {typeIcon(recordType)}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold">
                                  {getName(record)}
                                </p>

                                {reference && (
                                  <p className="mt-1 max-w-[240px] truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                                    {reference}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-medium">
                              {recordType}
                            </span>

                            {recordUnits !== null &&
                              recordUnits !== undefined && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {formatUnits(recordUnits)} units
                                </p>
                              )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold">
                              {formatAmount(
                                recordAmount,
                                recordCurrency,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {recordCurrency}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                recordStatus,
                              )}`}
                            >
                              {recordStatus}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {formatDate(getDate(record))}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {investmentIdValue ? (
                              <Link
                                to={`/investments/${investmentIdValue}`}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                              >
                                View
                                <ExternalLink size={15} />
                              </Link>
                            ) : orderId ? (
                              <Link
                                to={`/investments/orders/${orderId}`}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                              >
                                Order
                                <ExternalLink size={15} />
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">
                                No details
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
                {records.map((record, index) => {
                  const id = getId(record) || `record-${index}`;
                  const investmentIdValue =
                    getInvestmentId(record);
                  const orderId = getOrderId(record);
                  const recordType = getType(record);
                  const recordStatus = getStatus(record);
                  const recordCurrency =
                    getCurrency(record);
                  const recordAmount =
                    getAmount(record);
                  const recordUnits = getUnits(record);
                  const reference =
                    getReference(record);

                  const detailsUrl = investmentIdValue
                    ? `/investments/${investmentIdValue}`
                    : orderId
                      ? `/investments/orders/${orderId}`
                      : null;

                  return (
                    <div
                      key={String(id)}
                      className="p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                          {typeIcon(recordType)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {getName(record)}
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {recordType}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                recordStatus,
                              )}`}
                            >
                              {recordStatus}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Amount
                              </p>

                              <p className="mt-1 font-semibold">
                                {formatAmount(
                                  recordAmount,
                                  recordCurrency,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Date
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {formatDate(
                                  getDate(record),
                                )}
                              </p>
                            </div>
                          </div>

                          {recordUnits !== null &&
                            recordUnits !== undefined && (
                              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                Units:{" "}
                                {formatUnits(recordUnits)}
                              </p>
                            )}

                          {reference && (
                            <p className="mt-2 truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                              {reference}
                            </p>
                          )}

                          {detailsUrl && (
                            <Link
                              to={detailsUrl}
                              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400"
                            >
                              View details
                              <ChevronRight size={16} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {records.length} activity record
                  {records.length === 1 ? "" : "s"}.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={
                      !cursorHistory.length || loading
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={
                      !nextCursor || loading
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <CheckCircle2
            size={17}
            className="mt-0.5 shrink-0"
          />

          <p>
            Investment history is retrieved from the authenticated Epex Bank
            investment service. Records shown here are not generated or
            estimated by the application.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvestmentHistory;