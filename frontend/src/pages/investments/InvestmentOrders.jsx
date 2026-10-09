import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
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

const SIDE_OPTIONS = [
  "ALL",
  "BUY",
  "SELL",
];

const normalizeOrders = (payload) => {
  if (Array.isArray(payload)) {
    return {
      orders: payload,
      nextCursor: null,
    };
  }

  const orders =
    payload?.orders ??
    payload?.items ??
    payload?.results ??
    payload?.records ??
    payload?.data?.orders ??
    payload?.data?.items ??
    payload?.data?.results ??
    payload?.data?.records ??
    [];

  return {
    orders: Array.isArray(orders) ? orders : [],
    nextCursor:
      payload?.nextCursor ??
      payload?.pagination?.nextCursor ??
      payload?.meta?.nextCursor ??
      payload?.data?.nextCursor ??
      null,
  };
};

const getOrderId = (order) =>
  order?.id ??
  order?.orderId ??
  order?.investmentOrderId ??
  null;

const getInvestmentId = (order) =>
  order?.investmentId ??
  order?.investment?.id ??
  order?.holdingId ??
  order?.holding?.id ??
  null;

const getInvestmentName = (order) =>
  order?.investmentName ??
  order?.investment?.name ??
  order?.productName ??
  order?.product?.name ??
  order?.name ??
  order?.title ??
  "Investment";

const getSide = (order) =>
  String(
    order?.side ??
      order?.orderType ??
      order?.type ??
      "BUY",
  ).toUpperCase();

const getStatus = (order) =>
  String(order?.status ?? "PENDING").toUpperCase();

const getCurrency = (order) =>
  order?.currency?.code ??
  order?.currencyCode ??
  order?.currency ??
  order?.investment?.currency?.code ??
  "USD";

const getAmount = (order) =>
  order?.amount ??
  order?.totalAmount ??
  order?.orderAmount ??
  order?.grossAmount ??
  order?.netAmount ??
  null;

const getUnits = (order) =>
  order?.units ??
  order?.quantity ??
  order?.shares ??
  order?.unitsOrdered ??
  null;

const getExecutedUnits = (order) =>
  order?.executedUnits ??
  order?.filledUnits ??
  order?.unitsExecuted ??
  order?.filledQuantity ??
  null;

const getUnitPrice = (order) =>
  order?.unitPrice ??
  order?.executionPrice ??
  order?.price ??
  order?.averagePrice ??
  null;

const getReference = (order) =>
  order?.reference ??
  order?.orderReference ??
  order?.orderNumber ??
  order?.transactionReference ??
  null;

const getCreatedAt = (order) =>
  order?.createdAt ??
  order?.submittedAt ??
  order?.placedAt ??
  order?.date ??
  order?.timestamp ??
  null;

const getExecutedAt = (order) =>
  order?.executedAt ??
  order?.completedAt ??
  order?.processedAt ??
  null;

const formatAmount = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(number);
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

const sideClass = (side) => {
  if (side === "BUY") {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (side === "SELL") {
    return "text-blue-600 dark:text-blue-400";
  }

  return "text-slate-600 dark:text-slate-300";
};

const InvestmentOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [side, setSide] = useState("ALL");

  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);

  const loadOrders = useCallback(
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

        if (side !== "ALL") {
          params.side = side;
        }

        const response = await api.get(
          "/investments/orders",
          { params },
        );

        const normalized = normalizeOrders(response?.data);

        setOrders(normalized.orders);
        setNextCursor(normalized.nextCursor);
        setCursor(nextCursorValue);
      } catch (requestError) {
        setOrders([]);
        setNextCursor(null);

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load investment orders.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, side, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCursor(null);
      setCursorHistory([]);

      loadOrders({
        nextCursorValue: null,
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search, side, status, loadOrders]);

  const summary = useMemo(() => {
    let total = orders.length;
    let completed = 0;
    let pending = 0;
    let failed = 0;
    let buyOrders = 0;
    let sellOrders = 0;
    let volume = 0;

    for (const order of orders) {
      const orderStatus = getStatus(order);
      const orderSide = getSide(order);

      if (orderStatus === "COMPLETED") {
        completed += 1;
      }

      if (
        orderStatus === "PENDING" ||
        orderStatus === "PROCESSING"
      ) {
        pending += 1;
      }

      if (
        orderStatus === "FAILED" ||
        orderStatus === "REJECTED" ||
        orderStatus === "CANCELLED" ||
        orderStatus === "REVERSED"
      ) {
        failed += 1;
      }

      if (orderSide === "BUY") {
        buyOrders += 1;
      }

      if (orderSide === "SELL") {
        sellOrders += 1;
      }

      const amount = Number(getAmount(order));

      if (Number.isFinite(amount)) {
        volume += Math.abs(amount);
      }
    }

    return {
      total,
      completed,
      pending,
      failed,
      buyOrders,
      sellOrders,
      volume,
    };
  }, [orders]);

  const handleNext = async () => {
    if (!nextCursor) {
      return;
    }

    if (cursor) {
      setCursorHistory((current) => [
        ...current,
        cursor,
      ]);
    }

    await loadOrders({
      nextCursorValue: nextCursor,
    });
  };

  const handlePrevious = async () => {
    if (!cursorHistory.length) {
      return;
    }

    const previous =
      cursorHistory[cursorHistory.length - 1];

    setCursorHistory((current) =>
      current.slice(0, -1),
    );

    await loadOrders({
      nextCursorValue: previous || null,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setSide("ALL");
    setCursor(null);
    setNextCursor(null);
    setCursorHistory([]);
  };

  const hasFilters =
    Boolean(search.trim()) ||
    status !== "ALL" ||
    side !== "ALL";

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
                Investment orders
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Review investment purchase and sale orders,
                execution status, amounts and references.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/investments"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <BarChart3 size={17} />
              Investments
            </Link>

            <Link
              to="/investments/buy"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              New purchase
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Unable to load investment orders
              </p>

              <p className="mt-1 leading-6">{error}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadOrders({
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
              Loaded orders
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
              {formatAmount(summary.volume, "USD")}
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
                    placeholder="Search orders or references..."
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
                      <option
                        key={option}
                        value={option}
                      >
                        {option === "ALL"
                          ? "All statuses"
                          : option}
                      </option>
                    ))}
                  </select>

                  <select
                    value={side}
                    onChange={(event) =>
                      setSide(event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {SIDE_OPTIONS.map((option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option === "ALL"
                          ? "All sides"
                          : option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadOrders({
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

                {side !== "ALL" && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                    Side: {side}
                  </span>
                )}

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
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
                  Loading investment orders...
                </p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <ReceiptText size={26} />
              </div>

              <h2 className="mt-4 font-bold">
                No investment orders found
              </h2>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                {hasFilters
                  ? "No orders match your current filters."
                  : "Investment orders will appear here when they are submitted through Epex Bank."}
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Investment
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Side
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Amount
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Units
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Submitted
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order, index) => {
                      const id =
                        getOrderId(order) ||
                        `order-${index}`;

                      const investmentId =
                        getInvestmentId(order);

                      const orderSide = getSide(order);
                      const orderStatus =
                        getStatus(order);

                      const currency =
                        getCurrency(order);

                      const amount = getAmount(order);
                      const units = getUnits(order);
                      const executedUnits =
                        getExecutedUnits(order);

                      const reference =
                        getReference(order);

                      return (
                        <tr
                          key={String(id)}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                                <ReceiptText
                                  size={17}
                                  className="text-slate-500 dark:text-slate-300"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold">
                                  {getInvestmentName(order)}
                                </p>

                                {reference && (
                                  <p className="mt-1 max-w-[230px] truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                                    {reference}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-sm font-semibold ${sideClass(
                                orderSide,
                              )}`}
                            >
                              {orderSide === "BUY" ? (
                                <ArrowDownRight
                                  size={16}
                                />
                              ) : (
                                <ArrowUpRight
                                  size={16}
                                />
                              )}

                              {orderSide}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold">
                              {formatAmount(
                                amount,
                                currency,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {currency}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium">
                              {formatNumber(units)}
                            </p>

                            {executedUnits !== null &&
                              executedUnits !== undefined && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Filled:{" "}
                                  {formatNumber(
                                    executedUnits,
                                  )}
                                </p>
                              )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                orderStatus,
                              )}`}
                            >
                              {orderStatus}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {formatDate(
                                getCreatedAt(order),
                              )}
                            </p>

                            {getExecutedAt(order) && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Executed:{" "}
                                {formatDate(
                                  getExecutedAt(order),
                                )}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              to={`/investments/orders/${id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                            >
                              View
                              <ExternalLink size={15} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
                {orders.map((order, index) => {
                  const id =
                    getOrderId(order) ||
                    `order-${index}`;

                  const orderSide = getSide(order);
                  const orderStatus =
                    getStatus(order);

                  const currency =
                    getCurrency(order);

                  const amount = getAmount(order);
                  const units = getUnits(order);
                  const executedUnits =
                    getExecutedUnits(order);

                  const reference =
                    getReference(order);

                  return (
                    <div
                      key={String(id)}
                      className="p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                          {orderSide === "BUY" ? (
                            <ArrowDownRight
                              size={18}
                              className="text-emerald-600 dark:text-emerald-400"
                            />
                          ) : (
                            <ArrowUpRight
                              size={18}
                              className="text-blue-600 dark:text-blue-400"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {getInvestmentName(order)}
                              </p>

                              <p
                                className={`mt-1 text-xs font-semibold ${sideClass(
                                  orderSide,
                                )}`}
                              >
                                {orderSide}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                orderStatus,
                              )}`}
                            >
                              {orderStatus}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Amount
                              </p>

                              <p className="mt-1 font-semibold">
                                {formatAmount(
                                  amount,
                                  currency,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Units
                              </p>

                              <p className="mt-1 font-semibold">
                                {formatNumber(units)}
                              </p>
                            </div>
                          </div>

                          {executedUnits !== null &&
                            executedUnits !== undefined && (
                              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                Filled:{" "}
                                {formatNumber(
                                  executedUnits,
                                )}
                              </p>
                            )}

                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Clock3 size={14} />
                            {formatDate(
                              getCreatedAt(order),
                            )}
                          </div>

                          {reference && (
                            <p className="mt-2 truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                              {reference}
                            </p>
                          )}

                          <Link
                            to={`/investments/orders/${id}`}
                            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400"
                          >
                            View order
                            <ChevronRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {orders.length} order
                  {orders.length === 1 ? "" : "s"}.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={
                      !cursorHistory.length ||
                      loading
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
                      !nextCursor ||
                      loading
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
            Investment orders are retrieved from the authenticated Epex Bank
            investment service. An order shown as completed represents the
            status returned by that service; this page does not manufacture
            execution results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvestmentOrders;