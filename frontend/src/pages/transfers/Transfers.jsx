import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
  Send,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getTransfers } from "../../services/transferService.js";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REVERSED", label: "Reversed" },
];

const getTransferId = (transfer) =>
  transfer?.id ||
  transfer?.transferId ||
  transfer?._id ||
  "";

const isBankTransfer = (transfer) =>
  String(transfer?.type || "").toUpperCase() === "BANK";

const getTransferDetailsPath = (transfer) => {
  const id = getTransferId(transfer);

  if (!id) {
    return "";
  }

  const encodedId = encodeURIComponent(id);

  return isBankTransfer(transfer)
    ? `/transfers/bank/${encodedId}`
    : `/transfers/${encodedId}`;
};

const getTransferStatus = (transfer) =>
  String(transfer?.status || "").toUpperCase();

const getTransferReference = (transfer) =>
  transfer?.reference ||
  transfer?.transferReference ||
  transfer?.transactionReference ||
  "—";

const getTransferDescription = (transfer) =>
  transfer?.description ||
  transfer?.metadata?.description ||
  transfer?.purpose ||
  "Epex Bank transfer";

const getTransferDate = (transfer) =>
  transfer?.createdAt ||
  transfer?.updatedAt ||
  transfer?.date ||
  transfer?.processedAt ||
  null;

const getTransferCurrency = (transfer) =>
  transfer?.currencyCode ||
  transfer?.currency?.code ||
  transfer?.currency?.currencyCode ||
  transfer?.sourceCurrency ||
  "USD";

const getTransferAmount = (transfer) => {
  const amount =
    transfer?.amount ??
    transfer?.total ??
    transfer?.value ??
    transfer?.transferAmount ??
    0;

  const number = Number(amount);

  return Number.isFinite(number) ? number : 0;
};

const getTransferDirection = (transfer) => {
  const direction = String(transfer?.direction || "").toLowerCase();
  const type = String(transfer?.type || "").toUpperCase();

  if (
    direction === "in" ||
    direction === "incoming" ||
    direction === "received" ||
    type === "RECEIVED" ||
    type === "CREDIT"
  ) {
    return "received";
  }

  return "sent";
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatShortDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getStatusClasses = (status) => {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

    case "PENDING":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";

    case "PROCESSING":
      return "bg-blue-50 text-blue-700 ring-blue-600/20";

    case "FAILED":
    case "REVERSED":
      return "bg-red-50 text-red-700 ring-red-600/20";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600 ring-slate-500/20";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "COMPLETED":
      return <WalletCards className="h-3.5 w-3.5" />;

    case "PENDING":
    case "PROCESSING":
      return <Clock3 className="h-3.5 w-3.5" />;

    case "FAILED":
    case "REVERSED":
      return <CircleAlert className="h-3.5 w-3.5" />;

    case "CANCELLED":
      return <XCircle className="h-3.5 w-3.5" />;

    default:
      return <Clock3 className="h-3.5 w-3.5" />;
  }
};

const normalizeTransfersResponse = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return {
      transfers: data,
      nextCursor: null,
      hasMore: false,
    };
  }

  if (Array.isArray(data?.transfers)) {
    const nextCursor =
      data.nextCursor ??
      data.pagination?.nextCursor ??
      null;

    return {
      transfers: data.transfers,
      nextCursor,
      hasMore: Boolean(
        data.hasMore ??
          data.pagination?.hasMore ??
          nextCursor,
      ),
    };
  }

  if (Array.isArray(data?.data)) {
    const nextCursor =
      data.nextCursor ??
      data.pagination?.nextCursor ??
      null;

    return {
      transfers: data.data,
      nextCursor,
      hasMore: Boolean(
        data.hasMore ??
          data.pagination?.hasMore ??
          nextCursor,
      ),
    };
  }

  if (Array.isArray(response?.transfers)) {
    const nextCursor = response.nextCursor ?? null;

    return {
      transfers: response.transfers,
      nextCursor,
      hasMore: Boolean(
        response.hasMore ?? nextCursor,
      ),
    };
  }

  return {
    transfers: [],
    nextCursor: null,
    hasMore: false,
  };
};

const TransferDirectionIcon = ({ direction }) => {
  if (direction === "received") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <ArrowDownLeft className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
      <ArrowUpRight className="h-5 w-5" />
    </div>
  );
};

const TransferTypeCard = ({
  to,
  icon: Icon,
  title,
  description,
}) => (
  <Link
    to={to}
    className="group flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60"
  >
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
      <Icon className="h-5 w-5" />
    </div>

    <div className="min-w-0">
      <p className="font-semibold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>

    <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
  </Link>
);

const Transfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [cursor, setCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);

  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const loadTransfers = useCallback(
    async ({
      refresh = false,
      requestedCursor = cursor,
      requestedStatus = status,
    } = {}) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await getTransfers({
          status: requestedStatus || undefined,
          limit: PAGE_SIZE,
          cursor: requestedCursor || undefined,
        });

        const normalized = normalizeTransfersResponse(response);

        setTransfers(normalized.transfers);
        setNextCursor(normalized.nextCursor);
        setHasMore(normalized.hasMore);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to load your transfers.";

        setError(message);
        setTransfers([]);
        setNextCursor(null);
        setHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cursor, status],
  );

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
  }, [status]);

  useEffect(() => {
    loadTransfers({
      requestedCursor: cursor,
      requestedStatus: status,
    });
  }, [cursor, status, loadTransfers]);

  const filteredTransfers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return transfers;
    }

    return transfers.filter((transfer) => {
      const values = [
        getTransferReference(transfer),
        getTransferDescription(transfer),

        transfer?.senderAccountNumber,
        transfer?.receiverAccountNumber,

        transfer?.sender?.accountNumber,
        transfer?.receiver?.accountNumber,

        transfer?.beneficiary?.name,
        transfer?.beneficiary?.accountNumber,

        transfer?.type,
        transfer?.status,
        transfer?.currencyCode,
      ];

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [search, transfers]);

  const summary = useMemo(() => {
    return transfers.reduce(
      (result, transfer) => {
        const currentStatus = getTransferStatus(transfer);
        const amount = getTransferAmount(transfer);

        if (currentStatus === "COMPLETED") {
          result.completed += 1;
          result.completedAmount += amount;
        }

        if (
          currentStatus === "PENDING" ||
          currentStatus === "PROCESSING"
        ) {
          result.pending += 1;
        }

        result.total += 1;

        return result;
      },
      {
        total: 0,
        completed: 0,
        completedAmount: 0,
        pending: 0,
      },
    );
  }, [transfers]);

  const completedCurrency = useMemo(() => {
    const completedTransfer = transfers.find(
      (transfer) =>
        getTransferStatus(transfer) === "COMPLETED",
    );

    return getTransferCurrency(completedTransfer);
  }, [transfers]);

  const handleNextPage = () => {
    if (!nextCursor || !hasMore || loading || refreshing) {
      return;
    }

    setCursorHistory((current) => [
      ...current,
      cursor,
    ]);

    setCursor(nextCursor);
  };

  const handlePreviousPage = () => {
    if (
      cursorHistory.length === 0 ||
      loading ||
      refreshing
    ) {
      return;
    }

    const previous =
      cursorHistory[cursorHistory.length - 1];

    setCursorHistory((current) =>
      current.slice(0, -1),
    );

    setCursor(previous || null);
  };

  const clearSearch = () => {
    setSearch("");
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Money movement
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Transfers
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Send money securely and keep track of every
            transfer from your Epex Bank accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadTransfers({
              refresh: true,
              requestedCursor: cursor,
              requestedStatus: status,
            })
          }
          disabled={loading || refreshing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Transfer actions */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TransferTypeCard
          to="/transfers/internal"
          icon={Send}
          title="Internal transfer"
          description="Move money instantly between eligible Epex Bank accounts."
        />

        <TransferTypeCard
          to="/transfers/bank"
          icon={Building2}
          title="Bank transfer"
          description="Send funds to a supported external bank account."
        />

        <TransferTypeCard
          to="/transfers/international"
          icon={Globe2}
          title="International transfer"
          description="Send funds internationally through supported channels."
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Transfers shown
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {loading ? "—" : summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Completed
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? "—" : summary.completed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Pending
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-600">
            {loading ? "—" : summary.pending}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Completed value
          </p>

          <p className="mt-2 truncate text-xl font-bold text-slate-950">
            {loading
              ? "—"
              : formatMoney(
                  summary.completedAmount,
                  completedCurrency,
                )}
          </p>
        </div>
      </div>

      {/* Main transfers panel */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filters */}
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search reference, account or description..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                aria-label="Search transfers"
              />

              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 lg:w-48"
              aria-label="Filter transfers by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value || "all"}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {search && !loading && !error && (
            <p className="mt-3 text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredTransfers.length}
              </span>{" "}
              matching transfer
              {filteredTransfers.length === 1
                ? ""
                : "s"}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 sm:m-5">
            <div className="flex gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  Unable to load transfers
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadTransfers({
                      refresh: true,
                      requestedCursor: cursor,
                      requestedStatus: status,
                    })
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex min-h-[360px] items-center justify-center px-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />

              <p className="mt-3 text-sm font-medium text-slate-700">
                Loading transfers...
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Securely retrieving your transfer history.
              </p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          filteredTransfers.length === 0 && (
            <div className="flex min-h-[360px] items-center justify-center px-6">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <ArrowLeftRight className="h-6 w-6" />
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-950">
                  {search
                    ? "No matching transfers"
                    : "No transfers yet"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {search
                    ? "Try a different reference, account number, description or status."
                    : "Once you make or receive a supported transfer, it will appear here."}
                </p>

                {!search && (
                  <Link
                    to="/transfers/internal"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  >
                    <Send className="h-4 w-4" />
                    Make an internal transfer
                  </Link>
                )}
              </div>
            </div>
          )}

        {/* Results */}
        {!loading &&
          !error &&
          filteredTransfers.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Transfer
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Direction
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredTransfers.map(
                      (transfer, index) => {
                        const id = getTransferId(transfer);
                        const transferStatus =
                          getTransferStatus(transfer);
                        const direction =
                          getTransferDirection(transfer);
                        const currency =
                          getTransferCurrency(transfer);
                        const amount =
                          getTransferAmount(transfer);
                        const reference =
                          getTransferReference(transfer);
                        const date =
                          getTransferDate(transfer);

                        const rowKey =
                          id ||
                          reference ||
                          `transfer-${index}`;

                        return (
                          <tr
                            key={rowKey}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <TransferDirectionIcon
                                  direction={direction}
                                />

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {getTransferDescription(
                                      transfer,
                                    )}
                                  </p>

                                  <p className="mt-1 truncate font-mono text-xs text-slate-400">
                                    {reference}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-sm font-medium text-slate-700">
                                {direction === "received"
                                  ? "Received"
                                  : "Sent"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`text-sm font-bold ${
                                  direction ===
                                  "received"
                                    ? "text-emerald-600"
                                    : "text-slate-900"
                                }`}
                              >
                                {direction === "received"
                                  ? "+"
                                  : "-"}
                                {formatMoney(
                                  amount,
                                  currency,
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                                  transferStatus,
                                )}`}
                              >
                                {getStatusIcon(
                                  transferStatus,
                                )}

                                {transferStatus ||
                                  "UNKNOWN"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {formatShortDate(date)}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {formatDate(date)}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-right">
                              {id ? (
                                <Link
                                  to={getTransferDetailsPath(transfer)}
                                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                                >
                                  View
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Unavailable
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

              {/* Mobile / tablet cards */}
              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredTransfers.map(
                  (transfer, index) => {
                    const id = getTransferId(transfer);
                    const transferStatus =
                      getTransferStatus(transfer);
                    const direction =
                      getTransferDirection(transfer);
                    const currency =
                      getTransferCurrency(transfer);
                    const amount =
                      getTransferAmount(transfer);
                    const reference =
                      getTransferReference(transfer);
                    const date =
                      getTransferDate(transfer);

                    const cardKey =
                      id ||
                      reference ||
                      `transfer-mobile-${index}`;

                    return (
                      <div
                        key={cardKey}
                        className="p-4 sm:p-5"
                      >
                        <div className="flex items-start gap-3">
                          <TransferDirectionIcon
                            direction={direction}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-950">
                                  {getTransferDescription(
                                    transfer,
                                  )}
                                </p>

                                <p className="mt-1 truncate font-mono text-xs text-slate-400">
                                  {reference}
                                </p>
                              </div>

                              <p
                                className={`shrink-0 text-sm font-bold ${
                                  direction ===
                                  "received"
                                    ? "text-emerald-600"
                                    : "text-slate-950"
                                }`}
                              >
                                {direction === "received"
                                  ? "+"
                                  : "-"}
                                {formatMoney(
                                  amount,
                                  currency,
                                )}
                              </p>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                                  transferStatus,
                                )}`}
                              >
                                {getStatusIcon(
                                  transferStatus,
                                )}

                                {transferStatus ||
                                  "UNKNOWN"}
                              </span>

                              <span className="text-xs text-slate-400">
                                {direction ===
                                "received"
                                  ? "Received"
                                  : "Sent"}
                              </span>

                              <span className="text-xs text-slate-300">
                                •
                              </span>

                              <span className="text-xs text-slate-400">
                                {formatDate(date)}
                              </span>
                            </div>

                            {id && (
                              <Link
                                to={getTransferDetailsPath(transfer)}
                                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
                              >
                                View transfer
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}

        {/* Pagination */}
        {!loading &&
          !error &&
          (cursorHistory.length > 0 || hasMore) && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {cursorHistory.length > 0
                  ? "Page navigation available"
                  : "Showing the latest transfers"}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviousPage}
                  disabled={
                    cursorHistory.length === 0 ||
                    loading ||
                    refreshing
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={
                    !hasMore ||
                    !nextCursor ||
                    loading ||
                    refreshing
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
      </div>
    </section>
  );
};

export default Transfers;
