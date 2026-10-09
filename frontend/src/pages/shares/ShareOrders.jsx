import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpToLine,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../../services/api.js";

const PAGE_SIZE = 20;

const ORDER_STATUSES = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REJECTED",
  "REVERSED",
];

const ORDER_SIDES = [
  "ALL",
  "BUY",
  "SELL",
];

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const normalizeOrders = (
  payload,
) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.orders ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.orders ??
    root?.data?.items ??
    []
  );
};

const getApiMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const numberValue = (
  value,
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const formatMoney = (
  amount,
  currency = "USD",
) => {
  const value =
    numberValue(amount);

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency:
          currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(
      2,
    )}`;
  }
};

const formatNumber = (
  value,
) =>
  new Intl.NumberFormat(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    },
  ).format(numberValue(value));

const formatDate = (
  value,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
};

const formatStatus = (
  value,
) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const getOrderSide = (
  order,
) =>
  String(
    order?.side ??
      order?.orderSide ??
      order?.type ??
      "BUY",
  ).toUpperCase();

const getOrderStatus = (
  order,
) =>
  String(
    order?.status ??
      order?.orderStatus ??
      "PENDING",
  ).toUpperCase();

const getOrderAmount = (
  order,
) =>
  order?.executedAmount ??
  order?.totalAmount ??
  order?.amount ??
  order?.value ??
  0;

const getOrderUnits = (
  order,
) =>
  order?.executedUnits ??
  order?.filledUnits ??
  order?.units ??
  order?.quantity ??
  order?.shares ??
  0;

const getCurrency = (
  order,
) =>
  order?.currency?.code ??
  order?.currencyCode ??
  order?.currency ??
  order?.share?.currency?.code ??
  order?.product?.currency?.code ??
  "USD";

const getOrderName = (
  order,
) =>
  order?.shareName ??
  order?.productName ??
  order?.investmentName ??
  order?.share?.name ??
  order?.product?.name ??
  order?.securityName ??
  "Share order";

const getOrderReference = (
  order,
) =>
  order?.reference ??
  order?.orderReference ??
  order?.orderNumber ??
  order?.id ??
  "—";

const getOrderDate = (
  order,
) =>
  order?.executedAt ??
  order?.completedAt ??
  order?.submittedAt ??
  order?.createdAt ??
  null;

const getStatusClasses = (
  status,
) => {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";

    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

    case "FAILED":
    case "CANCELLED":
    case "REJECTED":
    case "REVERSED":
      return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

const getSideClasses = (
  side,
) =>
  side === "SELL"
    ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";

const ShareOrders = () => {
  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("ALL");

  const [side, setSide] =
    useState("ALL");

  const [cursor, setCursor] =
    useState(null);

  const [
    previousCursors,
    setPreviousCursors,
  ] = useState([]);

  const [nextCursor, setNextCursor] =
    useState(null);

  const [hasNextPage, setHasNextPage] =
    useState(false);

  const loadOrders =
    useCallback(
      async ({
        targetCursor = null,
        background = false,
      } = {}) => {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const params = {
            limit: PAGE_SIZE,
          };

          if (search.trim()) {
            params.search =
              search.trim();
          }

          if (status !== "ALL") {
            params.status =
              status;
          }

          if (side !== "ALL") {
            params.side =
              side;
          }

          if (targetCursor) {
            params.cursor =
              targetCursor;
          }

          let response;

          try {
            response =
              await api.get(
                "/shares/orders",
                {
                  params,
                },
              );
          } catch (requestError) {
            if (
              [404, 501].includes(
                requestError?.response
                  ?.status,
              )
            ) {
              response =
                await api.get(
                  "/shares/orders",
                  {
                    params: {
                      ...params,
                      orderSide:
                        params.side,
                    },
                  },
                );
            } else {
              throw requestError;
            }
          }

          const root =
            getRoot(
              response?.data,
            );

          const nextOrders =
            normalizeOrders(
              response?.data,
            );

          setOrders(
            nextOrders,
          );

          const responseNextCursor =
            root?.nextCursor ??
            root?.pagination
              ?.nextCursor ??
            root?.meta?.nextCursor ??
            null;

          const responseHasNext =
            Boolean(
              root?.hasNextPage ??
                root?.pagination
                  ?.hasNextPage ??
                root?.meta
                  ?.hasNextPage ??
                responseNextCursor,
            );

          setNextCursor(
            responseNextCursor,
          );

          setHasNextPage(
            responseHasNext,
          );

          setCursor(
            targetCursor,
          );
        } catch (requestError) {
          const requestStatus =
            requestError?.response
              ?.status;

          if (
            requestStatus === 404 ||
            requestStatus === 501
          ) {
            setError(
              "Share order history is not available from the banking API yet.",
            );
          } else {
            setError(
              getApiMessage(
                requestError,
                "Unable to load your share orders.",
              ),
            );
          }

          setOrders([]);
          setNextCursor(null);
          setHasNextPage(false);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        search,
        status,
        side,
      ],
    );

  useEffect(() => {
    setCursor(null);
    setPreviousCursors([]);

    const timer =
      window.setTimeout(
        () => {
          loadOrders();
        },
        250,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    search,
    status,
    side,
    loadOrders,
  ]);

  const handleNext =
    async () => {
      if (
        !nextCursor ||
        !hasNextPage
      ) {
        return;
      }

      setPreviousCursors(
        (current) => [
          ...current,
          cursor,
        ],
      );

      await loadOrders({
        targetCursor:
          nextCursor,
      });
    };

  const handlePrevious =
    async () => {
      if (
        previousCursors.length ===
        0
      ) {
        return;
      }

      const previous =
        previousCursors[
          previousCursors.length -
            1
        ];

      setPreviousCursors(
        (current) =>
          current.slice(
            0,
            -1,
          ),
      );

      await loadOrders({
        targetCursor:
          previous || null,
      });
    };

  const summary = useMemo(() => {
    const completed =
      orders.filter(
        (order) =>
          getOrderStatus(
            order,
          ) === "COMPLETED",
      );

    const pending =
      orders.filter((order) =>
        [
          "PENDING",
          "PROCESSING",
        ].includes(
          getOrderStatus(order),
        ),
      );

    const failed =
      orders.filter((order) =>
        [
          "FAILED",
          "CANCELLED",
          "REJECTED",
          "REVERSED",
        ].includes(
          getOrderStatus(order),
        ),
      );

    const buyOrders =
      orders.filter(
        (order) =>
          getOrderSide(order) ===
          "BUY",
      );

    const sellOrders =
      orders.filter(
        (order) =>
          getOrderSide(order) ===
          "SELL",
      );

    const volume =
      orders.reduce(
        (total, order) =>
          total +
          numberValue(
            getOrderAmount(
              order,
            ),
          ),
        0,
      );

    const completedVolume =
      completed.reduce(
        (total, order) =>
          total +
          numberValue(
            getOrderAmount(
              order,
            ),
          ),
        0,
      );

    const currency =
      orders[0]
        ? getCurrency(
            orders[0],
          )
        : "USD";

    return {
      total: orders.length,
      completed:
        completed.length,
      pending:
        pending.length,
      failed:
        failed.length,
      buys:
        buyOrders.length,
      sells:
        sellOrders.length,
      volume,
      completedVolume,
      currency,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Share orders
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review your share purchase and sale instructions and their
                processing status.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadOrders({
              targetCursor:
                cursor,
              background: true,
            })
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
      </section>

      {/* Error */}
      {error && (
        <section
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

          <div>
            <p className="text-sm font-bold text-red-950 dark:text-red-300">
              Share orders unavailable
            </p>

            <p className="mt-1 text-xs leading-5 text-red-800 dark:text-red-400">
              {error}
            </p>
          </div>
        </section>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Orders loaded"
          value={summary.total}
          icon={FileText}
        />

        <SummaryCard
          label="Completed"
          value={summary.completed}
          icon={CheckCircle2}
          valueClass="text-emerald-700 dark:text-emerald-400"
        />

        <SummaryCard
          label="Pending"
          value={summary.pending}
          icon={Clock3}
          valueClass="text-amber-700 dark:text-amber-400"
        />

        <SummaryCard
          label="Order volume"
          value={formatMoney(
            summary.volume,
            summary.currency,
          )}
          icon={TrendingUp}
        />
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />

          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Filter orders
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search share, reference or order ID..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-slate-500 dark:focus:ring-slate-800"
            />
          </label>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value,
              )
            }
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:focus:ring-slate-800"
          >
            {ORDER_STATUSES.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item === "ALL"
                    ? "All statuses"
                    : formatStatus(
                        item,
                      )}
                </option>
              ),
            )}
          </select>

          <select
            value={side}
            onChange={(event) =>
              setSide(
                event.target.value,
              )
            }
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:focus:ring-slate-800"
          >
            {ORDER_SIDES.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item === "ALL"
                    ? "All order types"
                    : `${item === "BUY" ? "Buy" : "Sell"} orders`}
                </option>
              ),
            )}
          </select>
        </div>
      </section>

      {/* Desktop table */}
      <section className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
              <tr>
                <TableHeader>
                  Share
                </TableHeader>

                <TableHeader>
                  Type
                </TableHeader>

                <TableHeader>
                  Units
                </TableHeader>

                <TableHeader>
                  Amount
                </TableHeader>

                <TableHeader>
                  Status
                </TableHeader>

                <TableHeader>
                  Date
                </TableHeader>

                <TableHeader>
                  Reference
                </TableHeader>

                <TableHeader>
                  <span className="sr-only">
                    Action
                  </span>
                </TableHeader>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <LoadingRows />
              ) : orders.length ===
                0 ? (
                <EmptyTableRow />
              ) : (
                orders.map(
                  (
                    order,
                    index,
                  ) => (
                    <DesktopOrderRow
                      key={
                        order?.id ||
                        order?.orderId ||
                        index
                      }
                      order={order}
                    />
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mobile cards */}
      <section className="space-y-3 lg:hidden">
        {loading ? (
          <LoadingCards />
        ) : orders.length ===
          0 ? (
          <EmptyState />
        ) : (
          orders.map(
            (
              order,
              index,
            ) => (
              <MobileOrderCard
                key={
                  order?.id ||
                  order?.orderId ||
                  index
                }
                order={order}
              />
            ),
          )
        )}
      </section>

      {/* Pagination */}
      {!loading &&
        orders.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {orders.length} order
              {orders.length === 1
                ? ""
                : "s"} from the current page.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={
                  handlePrevious
                }
                disabled={
                  previousCursors.length ===
                  0
                }
                className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={
                  handleNext
                }
                disabled={
                  !hasNextPage ||
                  !nextCursor
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        )}

      {/* Security */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Secure order history
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Orders shown here are retrieved from your authenticated Epex
              Bank account. This page does not create, cancel, or modify
              orders locally.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  valueClass = "text-slate-950 dark:text-white",
}) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" />
      </div>
    </div>

    <p
      className={`mt-4 truncate text-xl font-bold ${valueClass}`}
    >
      {value}
    </p>
  </div>
);

const TableHeader = ({
  children,
}) => (
  <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
    {children}
  </th>
);

const DesktopOrderRow = ({
  order,
}) => {
  const side =
    getOrderSide(order);

  const status =
    getOrderStatus(order);

  const currency =
    getCurrency(order);

  const amount =
    getOrderAmount(order);

  const units =
    getOrderUnits(order);

  const reference =
    getOrderReference(order);

  const date =
    getOrderDate(order);

  const orderId =
    order?.id ??
    order?.orderId ??
    "";

  return (
    <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50">
      <td className="px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {getOrderName(
              order,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {currency}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <SideBadge side={side} />
      </td>

      <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {formatNumber(units)}
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {formatMoney(
            amount,
            currency,
          )}
        </p>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
            status,
          )}`}
        >
          {formatStatus(
            status,
          )}
        </span>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
        {formatDate(date)}
      </td>

      <td className="max-w-[190px] px-5 py-4">
        <p className="truncate font-mono text-xs text-slate-600 dark:text-slate-400">
          {reference}
        </p>
      </td>

      <td className="px-5 py-4 text-right">
        {orderId ? (
          <Link
            to={`/shares/orders/${encodeURIComponent(
              orderId,
            )}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="View share order details"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="text-xs text-slate-400">
            —
          </span>
        )}
      </td>
    </tr>
  );
};

const MobileOrderCard = ({
  order,
}) => {
  const side =
    getOrderSide(order);

  const status =
    getOrderStatus(order);

  const currency =
    getCurrency(order);

  const orderId =
    order?.id ??
    order?.orderId ??
    "";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getSideClasses(
              side,
            )}`}
          >
            {side ===
            "SELL" ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-950 dark:text-white">
              {getOrderName(
                order,
              )}
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatStatus(
                side,
              )}{" "}
              · {currency}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
            status,
          )}`}
        >
          {formatStatus(
            status,
          )}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <MobileValue
          label="Units"
          value={formatNumber(
            getOrderUnits(
              order,
            ),
          )}
        />

        <MobileValue
          label="Amount"
          value={formatMoney(
            getOrderAmount(
              order,
            ),
            currency,
          )}
        />

        <MobileValue
          label="Date"
          value={formatDate(
            getOrderDate(
              order,
            ),
          )}
        />

        <MobileValue
          label="Reference"
          value={getOrderReference(
            order,
          )}
          mono
        />
      </div>

      {orderId && (
        <Link
          to={`/shares/orders/${encodeURIComponent(
            orderId,
          )}`}
          className="mt-5 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          View order details
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </article>
  );
};

const SideBadge = ({
  side,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${getSideClasses(
      side,
    )}`}
  >
    {side === "SELL" ? (
      <ArrowDownToLine className="h-3 w-3" />
    ) : (
      <ArrowUpToLine className="h-3 w-3" />
    )}

    {side}
  </span>
);

const MobileValue = ({
  label,
  value,
  mono = false,
}) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <p
      className={`mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300 ${
        mono
          ? "font-mono"
          : ""
      }`}
    >
      {value}
    </p>
  </div>
);

const LoadingRows = () => (
  <>
    {Array.from({
      length: 6,
    }).map((_, index) => (
      <tr key={index}>
        <td
          colSpan={8}
          className="px-5 py-5"
        >
          <div className="flex items-center gap-3">
            <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />

            <div className="h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </td>
      </tr>
    ))}
  </>
);

const LoadingCards = () => (
  <>
    {Array.from({
      length: 4,
    }).map((_, index) => (
      <div
        key={index}
        className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />

          <div className="space-y-2">
            <div className="h-3 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

            <div className="h-2.5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          {Array.from({
            length: 4,
          }).map(
            (_, itemIndex) => (
              <div
                key={itemIndex}
                className="space-y-2"
              >
                <div className="h-2 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

                <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ),
          )}
        </div>
      </div>
    ))}
  </>
);

const EmptyTableRow = () => (
  <tr>
    <td
      colSpan={8}
      className="px-5 py-16 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <FileText className="h-5 w-5" />
      </div>

      <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
        No share orders found
      </p>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Try changing the search or filters.
      </p>
    </td>
  </tr>
);

const EmptyState = () => (
  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <FileText className="h-5 w-5" />
    </div>

    <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
      No share orders found
    </p>

    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
      Try changing the search or filters.
    </p>
  </div>
);

export default ShareOrders;