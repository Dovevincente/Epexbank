import {
  AlertCircle,
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../../services/api.js";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PAID", label: "Paid" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "REVERSED", label: "Reversed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const getApiMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const normalizeDividends = (
  payload,
) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return {
      records: root,
      nextCursor: null,
      previousCursor: null,
      hasMore: false,
    };
  }

  const records =
    root?.dividends ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.dividends ??
    root?.data?.items ??
    [];

  return {
    records: Array.isArray(records)
      ? records
      : [],
    nextCursor:
      root?.nextCursor ??
      root?.next_cursor ??
      root?.pagination
        ?.nextCursor ??
      root?.data?.nextCursor ??
      null,
    previousCursor:
      root?.previousCursor ??
      root?.previous_cursor ??
      root?.pagination
        ?.previousCursor ??
      root?.data?.previousCursor ??
      null,
    hasMore: Boolean(
      root?.hasMore ??
        root?.has_more ??
        root?.pagination?.hasMore ??
        root?.pagination?.hasNext ??
        root?.data?.hasMore,
    ),
  };
};

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
  const numericAmount =
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
    ).format(numericAmount);
  } catch {
    return `${currency || "USD"} ${numericAmount.toFixed(
      2,
    )}`;
  }
};

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
    },
  ).format(date);
};

const formatDateTime = (
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

const getDividendId = (
  dividend,
) =>
  dividend?.id ??
  dividend?.dividendId ??
  dividend?.recordId ??
  "";

const getDividendReference = (
  dividend,
) =>
  dividend?.reference ??
  dividend?.dividendReference ??
  dividend?.paymentReference ??
  dividend?.transactionReference ??
  "—";

const getDividendName = (
  dividend,
) =>
  dividend?.shareName ??
  dividend?.productName ??
  dividend?.shareProduct?.name ??
  dividend?.product?.name ??
  dividend?.securityName ??
  "Share investment";

const getDividendAmount = (
  dividend,
) =>
  dividend?.amount ??
  dividend?.dividendAmount ??
  dividend?.paymentAmount ??
  dividend?.netAmount ??
  dividend?.grossAmount ??
  0;

const getDividendCurrency = (
  dividend,
) =>
  dividend?.currency?.code ??
  dividend?.currencyCode ??
  dividend?.currency ??
  "USD";

const getDividendStatus = (
  dividend,
) =>
  String(
    dividend?.status ??
      dividend?.paymentStatus ??
      "PENDING",
  ).toUpperCase();

const getDividendDate = (
  dividend,
) =>
  dividend?.paidAt ??
  dividend?.paymentDate ??
  dividend?.date ??
  dividend?.createdAt ??
  null;

const getExDividendDate = (
  dividend,
) =>
  dividend?.exDividendDate ??
  dividend?.exDate ??
  null;

const getRecordDate = (
  dividend,
) =>
  dividend?.recordDate ??
  null;

const getSharesHeld = (
  dividend,
) =>
  dividend?.sharesHeld ??
  dividend?.units ??
  dividend?.quantity ??
  dividend?.eligibleUnits ??
  null;

const getPerShareAmount = (
  dividend,
) =>
  dividend?.perShare ??
  dividend?.dividendPerShare ??
  dividend?.amountPerShare ??
  null;

const getAccountNumber = (
  dividend,
) =>
  dividend?.account?.accountNumber ??
  dividend?.accountNumber ??
  dividend?.creditedAccountNumber ??
  null;

const getStatusClasses = (
  status,
) => {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";

    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

    case "FAILED":
    case "REVERSED":
    case "CANCELLED":
      return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

const getStatusIcon = (
  status,
) => {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return TrendingUp;

    case "FAILED":
    case "REVERSED":
    case "CANCELLED":
      return XCircle;

    default:
      return Clock3;
  }
};

const Dividends = () => {
  const [dividends, setDividends] =
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

  const [cursor, setCursor] =
    useState(null);

  const [cursorHistory, setCursorHistory] =
    useState([]);

  const [nextCursor, setNextCursor] =
    useState(null);

  const [hasMore, setHasMore] =
    useState(false);

  const [selectedDividend, setSelectedDividend] =
    useState(null);

  const loadDividends =
    useCallback(
      async ({
        next = cursor,
        background = false,
        direction = "next",
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

          if (status !== "ALL") {
            params.status = status;
          }

          if (search.trim()) {
            params.search =
              search.trim();
          }

          if (next) {
            params.cursor = next;
          }

          let response;

          try {
            response = await api.get(
              "/shares/dividends",
              {
                params,
              },
            );
          } catch (requestError) {
            if (
              [404, 501].includes(
                requestError?.response?.status,
              )
            ) {
              response = await api.get(
                "/dividends",
                {
                  params,
                },
              );
            } else {
              throw requestError;
            }
          }

          const normalized =
            normalizeDividends(
              response?.data,
            );

          setDividends(
            normalized.records,
          );

          setNextCursor(
            normalized.nextCursor,
          );

          setHasMore(
            normalized.hasMore ||
              Boolean(
                normalized.nextCursor,
              ),
          );

          if (direction === "next") {
            if (next) {
              setCursorHistory(
                (history) => [
                  ...history,
                  next,
                ],
              );
            }

            setCursor(next || null);
          }
        } catch (requestError) {
          const statusCode =
            requestError?.response
              ?.status;

          if (
            statusCode === 404 ||
            statusCode === 501
          ) {
            setError(
              "Dividend activity is not available from the banking API yet.",
            );
          } else {
            setError(
              getApiMessage(
                requestError,
                "Unable to load your dividend activity.",
              ),
            );
          }

          setDividends([]);
          setNextCursor(null);
          setHasMore(false);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [cursor, search, status],
    );

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
    setNextCursor(null);
    setHasMore(false);
  }, [search, status]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        loadDividends({
          next: null,
        });
      }, 300);

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [search, status]);

  const filteredDividends =
    useMemo(() => {
      return dividends.filter(
        (dividend) => {
          const dividendStatus =
            getDividendStatus(
              dividend,
            );

          if (
            status !== "ALL" &&
            dividendStatus !==
              status
          ) {
            return false;
          }

          if (!search.trim()) {
            return true;
          }

          const query =
            search
              .trim()
              .toLowerCase();

          return [
            getDividendReference(
              dividend,
            ),
            getDividendName(
              dividend,
            ),
            getAccountNumber(
              dividend,
            ),
            dividend?.id,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query),
            );
        },
      );
    }, [
      dividends,
      search,
      status,
    ]);

  const summary = useMemo(() => {
    const paid = dividends.filter(
      (dividend) => {
        const value =
          getDividendStatus(
            dividend,
          );

        return (
          value === "PAID" ||
          value === "COMPLETED"
        );
      },
    );

    const pending =
      dividends.filter(
        (dividend) => {
          const value =
            getDividendStatus(
              dividend,
            );

          return (
            value === "PENDING" ||
            value === "PROCESSING"
          );
        },
      );

    const failed =
      dividends.filter(
        (dividend) => {
          const value =
            getDividendStatus(
              dividend,
            );

          return (
            value === "FAILED" ||
            value === "REVERSED" ||
            value === "CANCELLED"
          );
        },
      );

    const totalPaid =
      paid.reduce(
        (total, dividend) =>
          total +
          numberValue(
            getDividendAmount(
              dividend,
            ),
          ),
        0,
      );

    return {
      loaded: dividends.length,
      paid: paid.length,
      pending: pending.length,
      failed: failed.length,
      totalPaid,
      currency:
        paid[0]
          ? getDividendCurrency(
              paid[0],
            )
          : "USD",
    };
  }, [dividends]);

  const goNext = () => {
    if (!nextCursor) return;

    loadDividends({
      next: nextCursor,
      direction: "next",
    });
  };

  const goPrevious = () => {
    if (!cursorHistory.length) {
      return;
    }

    const history =
      [...cursorHistory];

    history.pop();

    const previousCursor =
      history.length
        ? history[history.length - 1]
        : null;

    setCursorHistory(
      history,
    );

    setCursor(
      previousCursor,
    );

    loadDividends({
      next: previousCursor,
      direction: "previous",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/shares"
            className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to shares
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
              <Banknote className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Dividends
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review dividend activity associated with your share
                investments.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadDividends({
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
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

          <div>
            <p className="text-sm font-bold text-red-950 dark:text-red-300">
              Dividend activity unavailable
            </p>

            <p className="mt-1 text-xs leading-5 text-red-800 dark:text-red-400">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Records loaded"
          value={summary.loaded}
          icon={Banknote}
        />

        <SummaryCard
          label="Paid"
          value={summary.paid}
          icon={CheckIcon}
        />

        <SummaryCard
          label="Pending"
          value={summary.pending}
          icon={Clock3}
        />

        <SummaryCard
          label="Paid value"
          value={formatMoney(
            summary.totalPaid,
            summary.currency,
          )}
          icon={CircleDollarSign}
        />
      </section>

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />

          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Filter dividend activity
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search reference, share or account..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white"
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value,
              )
            }
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white"
          >
            {STATUS_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>
      </section>

      {/* Loading */}
      {loading ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-emerald-700 dark:text-emerald-400" />

          <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading dividend activity...
          </p>
        </section>
      ) : filteredDividends.length ===
        0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Banknote className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-base font-bold text-slate-950 dark:text-white">
            No dividend records found
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            No dividend activity matches the current filters. New dividend
            records will appear here when they are returned by the banking
            service.
          </p>
        </section>
      ) : (
        <>
          {/* Desktop */}
          <section className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Investment
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Shares
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Payment date
                    </th>

                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredDividends.map(
                    (dividend, index) => {
                      const dividendId =
                        getDividendId(
                          dividend,
                        );

                      const dividendStatus =
                        getDividendStatus(
                          dividend,
                        );

                      const StatusIcon =
                        getStatusIcon(
                          dividendStatus,
                        );

                      return (
                        <tr
                          key={
                            dividendId ||
                            index
                          }
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {getDividendName(
                                  dividend,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {
                                  getDividendReference(
                                    dividend,
                                  )
                                }
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatMoney(
                                getDividendAmount(
                                  dividend,
                                ),
                                getDividendCurrency(
                                  dividend,
                                ),
                              )}
                            </p>

                            {getPerShareAmount(
                              dividend,
                            ) !== null && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {formatMoney(
                                  getPerShareAmount(
                                    dividend,
                                  ),
                                  getDividendCurrency(
                                    dividend,
                                  ),
                                )}{" "}
                                / share
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {getSharesHeld(
                              dividend,
                            ) !== null
                              ? formatNumber(
                                  getSharesHeld(
                                    dividend,
                                  ),
                                )
                              : "—"}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {formatDate(
                              getDividendDate(
                                dividend,
                              ),
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${getStatusClasses(
                                dividendStatus,
                              )}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {formatStatus(
                                dividendStatus,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDividend(
                                  dividend,
                                )
                              }
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mobile/tablet */}
          <section className="space-y-3 lg:hidden">
            {filteredDividends.map(
              (dividend, index) => {
                const dividendId =
                  getDividendId(
                    dividend,
                  );

                const dividendStatus =
                  getDividendStatus(
                    dividend,
                  );

                const StatusIcon =
                  getStatusIcon(
                    dividendStatus,
                  );

                return (
                  <article
                    key={
                      dividendId ||
                      index
                    }
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <Banknote className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                            {getDividendName(
                              dividend,
                            )}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {
                              getDividendReference(
                                dividend,
                              )
                            }
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${getStatusClasses(
                          dividendStatus,
                        )}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {formatStatus(
                          dividendStatus,
                        )}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <MobileValue
                        label="Amount"
                        value={formatMoney(
                          getDividendAmount(
                            dividend,
                          ),
                          getDividendCurrency(
                            dividend,
                          ),
                        )}
                      />

                      <MobileValue
                        label="Shares"
                        value={
                          getSharesHeld(
                            dividend,
                          ) !== null
                            ? formatNumber(
                                getSharesHeld(
                                  dividend,
                                ),
                              )
                            : "—"
                        }
                      />

                      <MobileValue
                        label="Payment date"
                        value={formatDate(
                          getDividendDate(
                            dividend,
                          ),
                        )}
                      />

                      <MobileValue
                        label="Account"
                        value={
                          getAccountNumber(
                            dividend,
                          ) || "Not provided"
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDividend(
                          dividend,
                        )
                      }
                      className="mt-5 min-h-10 w-full rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      View dividend details
                    </button>
                  </article>
                );
              },
            )}
          </section>

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {filteredDividends.length}
              </span>{" "}
              loaded dividend record
              {filteredDividends.length ===
              1
                ? ""
                : "s"}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={
                  goPrevious
                }
                disabled={
                  !cursorHistory.length ||
                  loading
                }
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={
                  goNext
                }
                disabled={
                  !hasMore ||
                  !nextCursor ||
                  loading
                }
                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Security notice */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Dividend records
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Dividend amounts and payment status shown here come from the
              authenticated banking service. No dividend payment is created or
              estimated locally by this page.
            </p>
          </div>
        </div>
      </section>

      {/* Details modal */}
      {selectedDividend && (
        <DividendDetailsModal
          dividend={
            selectedDividend
          }
          onClose={() =>
            setSelectedDividend(
              null,
            )
          }
        />
      )}
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  icon: Icon,
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

    <p className="mt-4 truncate text-xl font-bold text-slate-950 dark:text-white">
      {value}
    </p>
  </div>
);

const CheckIcon = ({
  className,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={
      className ||
      "h-4 w-4"
    }
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m5 12 4 4L19 6"
    />
  </svg>
);

const MobileValue = ({
  label,
  value,
}) => (
  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <p className="mt-1 truncate text-xs font-bold text-slate-800 dark:text-slate-200">
      {value}
    </p>
  </div>
);

const DividendDetailsModal = ({
  dividend,
  onClose,
}) => {
  const amount =
    getDividendAmount(
      dividend,
    );

  const currency =
    getDividendCurrency(
      dividend,
    );

  const status =
    getDividendStatus(
      dividend,
    );

  const StatusIcon =
    getStatusIcon(status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dividend-details-title"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        <div className="sticky top-0 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Dividend details
              </p>

              <h2
                id="dividend-details-title"
                className="mt-1 text-xl font-bold text-slate-950 dark:text-white"
              >
                {getDividendName(
                  dividend,
                )}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close dividend details"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-500">
                  Dividend amount
                </p>

                <p className="mt-1 text-3xl font-bold text-emerald-950 dark:text-emerald-300">
                  {formatMoney(
                    amount,
                    currency,
                  )}
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                  status,
                )}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {formatStatus(
                  status,
                )}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem
              label="Reference"
              value={getDividendReference(
                dividend,
              )}
            />

            <DetailItem
              label="Payment date"
              value={formatDateTime(
                getDividendDate(
                  dividend,
                ),
              )}
            />

            <DetailItem
              label="Ex-dividend date"
              value={formatDate(
                getExDividendDate(
                  dividend,
                ),
              )}
            />

            <DetailItem
              label="Record date"
              value={formatDate(
                getRecordDate(
                  dividend,
                ),
              )}
            />

            <DetailItem
              label="Eligible shares"
              value={
                getSharesHeld(
                  dividend,
                ) !== null
                  ? formatNumber(
                      getSharesHeld(
                        dividend,
                      ),
                    )
                  : "Not provided"
              }
            />

            <DetailItem
              label="Dividend per share"
              value={
                getPerShareAmount(
                  dividend,
                ) !== null
                  ? formatMoney(
                      getPerShareAmount(
                        dividend,
                      ),
                      currency,
                    )
                  : "Not provided"
              }
            />

            <DetailItem
              label="Credited account"
              value={
                getAccountNumber(
                  dividend,
                ) ||
                "Not provided"
              }
            />

            <DetailItem
              label="Currency"
              value={currency}
            />
          </div>

          {dividend?.description && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Description
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {dividend.description}
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Dividend information displayed here is sourced from the
              authenticated Epex Bank investment service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({
  label,
  value,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <p className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-200">
      {value}
    </p>
  </div>
);

export default Dividends;