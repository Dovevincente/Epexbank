import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import api from "../../services/api.js";

const STATUS_OPTIONS = [
  "ALL",
  "COMPLETED",
  "PENDING",
  "PROCESSING",
  "FAILED",
  "REVERSED",
  "CANCELLED",
];

const TYPE_OPTIONS = [
  "ALL",
  "CARD_PAYMENT",
  "PURCHASE",
  "PAYMENT",
  "REFUND",
  "REVERSAL",
  "WITHDRAWAL",
  "CASH_WITHDRAWAL",
  "FEE",
];

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      nextCursor: null,
      total: payload.length,
    };
  }

  const source =
    payload?.data ??
    payload ??
    {};

  return {
    items:
      (Array.isArray(source?.transactions) &&
        source.transactions) ||
      (Array.isArray(source?.items) &&
        source.items) ||
      (Array.isArray(source?.results) &&
        source.results) ||
      (Array.isArray(source?.records) &&
        source.records) ||
      [],
    nextCursor:
      source?.nextCursor ??
      source?.pagination?.nextCursor ??
      source?.meta?.nextCursor ??
      null,
    total:
      source?.total ??
      source?.pagination?.total ??
      source?.meta?.total ??
      0,
  };
};

const normalizeStatus = (value) =>
  String(value ?? "UNKNOWN")
    .trim()
    .toUpperCase();

const normalizeType = (value) =>
  String(value ?? "TRANSACTION")
    .trim()
    .toUpperCase();

const normalizeTransaction = (transaction) => {
  const source = transaction ?? {};

  const amount = Number(
    source?.amount ??
      source?.value ??
      source?.transactionAmount ??
      0,
  );

  const fee = Number(
    source?.fee ??
      source?.fees ??
      0,
  );

  return {
    ...source,

    id:
      source?.id ??
      source?.transactionId ??
      "",

    reference:
      source?.reference ??
      source?.transactionReference ??
      source?.ref ??
      "",

    type:
      source?.type ??
      source?.transactionType ??
      "TRANSACTION",

    status:
      source?.status ??
      "UNKNOWN",

    amount: Number.isFinite(amount)
      ? amount
      : 0,

    fee: Number.isFinite(fee)
      ? fee
      : 0,

    currency:
      source?.currency?.code ??
      source?.currencyCode ??
      source?.currency ??
      "USD",

    direction:
      source?.direction ??
      source?.entryType ??
      source?.creditDebit ??
      null,

    description:
      source?.description ??
      source?.narration ??
      source?.merchantName ??
      source?.name ??
      "Card transaction",

    merchant:
      source?.merchant ??
      source?.merchantName ??
      source?.counterparty ??
      null,

    createdAt:
      source?.createdAt ??
      source?.created_at ??
      source?.date ??
      source?.transactionDate ??
      null,
  };
};

const formatMoney = (
  value,
  currency = "USD",
) => {
  const amount = Number(value ?? 0);
  const normalizedCurrency = String(
    currency || "USD",
  ).toUpperCase();

  if (!Number.isFinite(amount)) {
    return `${normalizedCurrency} 0.00`;
  }

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency: normalizedCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(
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

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
};

const formatLabel = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );

const getTransactionDirection = (
  transaction,
) => {
  const direction = String(
    transaction?.direction ?? "",
  ).toUpperCase();

  if (
    ["CREDIT", "IN", "INCOMING"].includes(
      direction,
    )
  ) {
    return "CREDIT";
  }

  if (
    ["DEBIT", "OUT", "OUTGOING"].includes(
      direction,
    )
  ) {
    return "DEBIT";
  }

  const type = normalizeType(
    transaction?.type,
  );

  if (
    [
      "REFUND",
      "REVERSAL",
      "CREDIT",
    ].includes(type)
  ) {
    return "CREDIT";
  }

  return "DEBIT";
};

const getStatusClasses = (status) => {
  const normalized =
    normalizeStatus(status);

  if (normalized === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/60";
  }

  if (
    ["PENDING", "PROCESSING"].includes(
      normalized,
    )
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/60";
  }

  if (
    [
      "FAILED",
      "REVERSED",
      "CANCELLED",
    ].includes(normalized)
  ) {
    return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/60";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
};

const StatusBadge = ({ status }) => {
  const normalized =
    normalizeStatus(status);

  const Icon =
    normalized === "COMPLETED"
      ? CheckCircle2
      : [
            "FAILED",
            "REVERSED",
            "CANCELLED",
          ].includes(normalized)
        ? XCircle
        : Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getStatusClasses(
        normalized,
      )}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {normalized}
    </span>
  );
};

const TransactionIcon = ({
  transaction,
}) => {
  const direction =
    getTransactionDirection(
      transaction,
    );

  const Icon =
    direction === "CREDIT"
      ? ArrowDownLeft
      : ArrowUpRight;

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        direction === "CREDIT"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
};

const CardTransactions = () => {
  const { cardId } = useParams();
  const navigate = useNavigate();

  const [card, setCard] = useState(null);
  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("ALL");

  const [type, setType] =
    useState("ALL");

  const [nextCursor, setNextCursor] =
    useState(null);

  const fetchCardTransactions =
    useCallback(
      async ({
        reset = true,
        cursor = null,
        refresh = false,
      } = {}) => {
        if (!cardId) {
          setError(
            "A card ID is required.",
          );
          setLoading(false);
          return;
        }

        if (refresh) {
          setRefreshing(true);
        } else if (reset) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        setError("");

        try {
          const cardResponse =
            await api.get(
              `/cards/${encodeURIComponent(
                cardId,
              )}`,
            );

          const cardPayload =
            cardResponse?.data;

          const normalizedCard =
            cardPayload?.data?.card ??
            cardPayload?.card ??
            cardPayload?.data ??
            cardPayload ??
            {};

          setCard(normalizedCard);

          const params = {
            limit: 25,
          };

          if (search.trim()) {
            params.search =
              search.trim();
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

          const transactionResponse =
            await api.get(
              `/cards/${encodeURIComponent(
                cardId,
              )}/transactions`,
              {
                params,
              },
            );

          const normalized =
            normalizeCollection(
              transactionResponse?.data,
            );

          const mapped =
            normalized.items.map(
              normalizeTransaction,
            );

          setTransactions((current) =>
            reset
              ? mapped
              : [...current, ...mapped],
          );

          setNextCursor(
            normalized.nextCursor,
          );
        } catch (requestError) {
          const statusCode =
            requestError?.response
              ?.status;

          const message =
            requestError?.response
              ?.data?.message ||
            requestError?.message ||
            (statusCode === 404
              ? "Card or card transactions were not found."
              : "Unable to load card transactions.");

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
      [
        cardId,
        search,
        status,
        type,
      ],
    );

  useEffect(() => {
    const timeout =
      window.setTimeout(() => {
        fetchCardTransactions({
          reset: true,
        });
      }, 250);

    return () =>
      window.clearTimeout(timeout);
  }, [fetchCardTransactions]);

  const summary = useMemo(() => {
    const completed =
      transactions.filter(
        (transaction) =>
          normalizeStatus(
            transaction.status,
          ) === "COMPLETED",
      ).length;

    const pending =
      transactions.filter(
        (transaction) =>
          [
            "PENDING",
            "PROCESSING",
          ].includes(
            normalizeStatus(
              transaction.status,
            ),
          ),
      ).length;

    const credits =
      transactions.filter(
        (transaction) =>
          getTransactionDirection(
            transaction,
          ) === "CREDIT",
      ).length;

    const debits =
      transactions.filter(
        (transaction) =>
          getTransactionDirection(
            transaction,
          ) === "DEBIT",
      ).length;

    return {
      total: transactions.length,
      completed,
      pending,
      credits,
      debits,
    };
  }, [transactions]);

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setType("ALL");
  };

  const cardCurrency =
    card?.currency?.code ??
    card?.currencyCode ??
    "USD";

  const maskedCardNumber = card
    ? `•••• ${
        card?.last4 ??
        card?.lastFour ??
        String(
          card?.cardNumber ??
            card?.pan ??
            "",
        ).slice(-4)
      }`
    : "Card";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="mb-6">
          <button
            type="button"
            onClick={() =>
              navigate(
                cardId
                  ? `/cards/${encodeURIComponent(
                      cardId,
                    )}`
                  : "/cards",
              )
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to card
          </button>

          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Card activity
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Card transactions
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Review transactions associated with{" "}
                {maskedCardNumber}.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchCardTransactions({
                  reset: true,
                  refresh: true,
                })
              }
              disabled={refreshing}
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        {/* Card Summary */}
        {card && (
          <section className="mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <CreditCard className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Epex Bank
                  </p>

                  <p className="mt-1 font-mono text-sm text-slate-300">
                    {maskedCardNumber}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <div className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Type
                  </p>

                  <p className="mt-1 font-semibold text-slate-100">
                    {formatLabel(
                      card?.type ??
                        card?.cardType ??
                        "CARD",
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Currency
                  </p>

                  <p className="mt-1 font-semibold text-slate-100">
                    {String(
                      cardCurrency,
                    ).toUpperCase()}
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Status
                  </p>

                  <p className="mt-1 font-semibold text-slate-100">
                    {normalizeStatus(
                      card?.status,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <section
            role="alert"
            className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />

              <div>
                <h2 className="font-semibold text-rose-900 dark:text-rose-300">
                  Unable to load card transactions
                </h2>

                <p className="mt-1 text-sm leading-6 text-rose-700 dark:text-rose-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    fetchCardTransactions({
                      reset: true,
                    })
                  }
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Summary */}
        {!loading && (
          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Loaded
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {summary.total}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Transactions in this result
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Completed
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.completed}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Successfully processed
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Pending
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {summary.pending}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Awaiting processing
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Credits / debits
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {summary.credits} /{" "}
                {summary.debits}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Incoming and outgoing activity
              </p>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="card-transaction-search"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Search
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="card-transaction-search"
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Reference, merchant or description..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
                />
              </div>
            </div>

            <div className="w-full xl:w-52">
              <label
                htmlFor="card-transaction-status"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Status
              </label>

              <select
                id="card-transaction-status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value,
                  )
                }
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option === "ALL"
                        ? "All statuses"
                        : formatLabel(
                            option,
                          )}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="w-full xl:w-56">
              <label
                htmlFor="card-transaction-type"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Type
              </label>

              <select
                id="card-transaction-type"
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value,
                  )
                }
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {TYPE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option === "ALL"
                        ? "All types"
                        : formatLabel(
                            option,
                          )}
                    </option>
                  ),
                )}
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

        {/* Transaction List */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="font-bold text-slate-950 dark:text-white">
              Transaction history
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Activity returned by the authenticated Epex Bank card API.
            </p>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-5"
                >
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />

                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <div className="h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center sm:p-14">
              <CreditCard className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No card transactions found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                No transactions matched the current search and filter
                criteria.
              </p>

              {(search ||
                status !== "ALL" ||
                type !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px]">
                  <thead className="bg-slate-50 dark:bg-slate-950/60">
                    <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Transaction
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
                    {transactions.map(
                      (transaction) => {
                        const direction =
                          getTransactionDirection(
                            transaction,
                          );

                        const amountPrefix =
                          direction ===
                          "CREDIT"
                            ? "+"
                            : "-";

                        return (
                          <tr
                            key={
                              transaction.id ||
                              transaction.reference
                            }
                            className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <TransactionIcon
                                  transaction={
                                    transaction
                                  }
                                />

                                <div className="min-w-0">
                                  <p className="max-w-[280px] truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {
                                      transaction.description
                                    }
                                  </p>

                                  <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500 dark:text-slate-400">
                                    {transaction.merchant ||
                                      transaction.reference ||
                                      "Card transaction"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                              {formatLabel(
                                transaction.type,
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <p
                                className={`text-sm font-bold ${
                                  direction ===
                                  "CREDIT"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-950 dark:text-white"
                                }`}
                              >
                                {amountPrefix}
                                {formatMoney(
                                  transaction.amount,
                                  transaction.currency,
                                )}
                              </p>

                              {transaction.fee >
                                0 && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Fee:{" "}
                                  {formatMoney(
                                    transaction.fee,
                                    transaction.currency,
                                  )}
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge
                                status={
                                  transaction.status
                                }
                              />
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                              {formatDateTime(
                                transaction.createdAt,
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              {transaction.id ? (
                                <Link
                                  to={`/transactions/${encodeURIComponent(
                                    transaction.id,
                                  )}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
                                >
                                  Details
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
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
                {transactions.map(
                  (transaction) => {
                    const direction =
                      getTransactionDirection(
                        transaction,
                      );

                    const amountPrefix =
                      direction ===
                      "CREDIT"
                        ? "+"
                        : "-";

                    return (
                      <article
                        key={
                          transaction.id ||
                          transaction.reference
                        }
                        className="p-4 sm:p-5"
                      >
                        <div className="flex items-start gap-3">
                          <TransactionIcon
                            transaction={
                              transaction
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                  {
                                    transaction.description
                                  }
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                  {transaction.merchant ||
                                    transaction.reference ||
                                    "Card transaction"}
                                </p>
                              </div>

                              <p
                                className={`shrink-0 text-sm font-bold ${
                                  direction ===
                                  "CREDIT"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-950 dark:text-white"
                                }`}
                              >
                                {amountPrefix}
                                {formatMoney(
                                  transaction.amount,
                                  transaction.currency,
                                )}
                              </p>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <StatusBadge
                                status={
                                  transaction.status
                                }
                              />

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {formatLabel(
                                  transaction.type,
                                )}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDateTime(
                                  transaction.createdAt,
                                )}
                              </span>

                              {transaction.id && (
                                <Link
                                  to={`/transactions/${encodeURIComponent(
                                    transaction.id,
                                  )}`}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300"
                                >
                                  Details
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>

              {nextCursor && (
                <div className="border-t border-slate-200 p-5 text-center dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      fetchCardTransactions({
                        reset: false,
                        cursor:
                          nextCursor,
                      })
                    }
                    disabled={loadingMore}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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

        {/* Security */}
        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" />

            <div>
              <h2 className="font-semibold text-blue-950 dark:text-blue-200">
                Transaction security
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                Card activity shown here is retrieved from the authenticated
                Epex Bank API. Sensitive card credentials are never displayed
                in the transaction history.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p>
            Epex Bank · Card transaction history
          </p>

          <Link
            to={`/cards/${encodeURIComponent(
              cardId,
            )}`}
            className="inline-flex items-center gap-1 font-semibold transition hover:text-slate-600 dark:hover:text-slate-300"
          >
            Card details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </div>
    </main>
  );
};

export default CardTransactions;