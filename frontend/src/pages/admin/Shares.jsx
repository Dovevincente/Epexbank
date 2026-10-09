import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ACTIVE", label: "Active" },
  { value: "SETTLED", label: "Settled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "All records" },
  { value: "PRODUCT", label: "Share products" },
  { value: "ORDER", label: "Share orders" },
  { value: "HOLDING", label: "Customer holdings" },
  { value: "DIVIDEND", label: "Dividends" },
];

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.shares)) return payload.shares;
  if (Array.isArray(payload?.shareProducts)) return payload.shareProducts;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.holdings)) return payload.holdings;
  if (Array.isArray(payload?.dividends)) return payload.dividends;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;

  if (Array.isArray(payload?.data?.shares)) return payload.data.shares;
  if (Array.isArray(payload?.data?.shareProducts)) {
    return payload.data.shareProducts;
  }
  if (Array.isArray(payload?.data?.products)) {
    return payload.data.products;
  }
  if (Array.isArray(payload?.data?.orders)) {
    return payload.data.orders;
  }
  if (Array.isArray(payload?.data?.holdings)) {
    return payload.data.holdings;
  }
  if (Array.isArray(payload?.data?.dividends)) {
    return payload.data.dividends;
  }
  if (Array.isArray(payload?.data?.results)) {
    return payload.data.results;
  }

  return [];
};

const normalizeStatus = (value) => {
  const status = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    status === "SUBMITTED" ||
    status === "AWAITING_REVIEW" ||
    status === "PENDING_REVIEW"
  ) {
    return "PENDING";
  }

  if (
    status === "IN_REVIEW" ||
    status === "UNDER_REVIEW" ||
    status === "OPEN"
  ) {
    return "PROCESSING";
  }

  if (status === "SUCCESS" || status === "EXECUTED") {
    return "COMPLETED";
  }

  if (status === "DECLINED" || status === "DENIED") {
    return "REJECTED";
  }

  if (status === "CANCELED") {
    return "CANCELLED";
  }

  return status || "PENDING";
};

const getCustomer = (item) =>
  item?.user ||
  item?.customer ||
  item?.holder ||
  item?.investor ||
  {};

const getCustomerName = (item) => {
  const customer = getCustomer(item);

  return (
    customer?.name ||
    customer?.fullName ||
    [customer?.firstName, customer?.lastName]
      .filter(Boolean)
      .join(" ") ||
    item?.customerName ||
    item?.holderName ||
    "Customer"
  );
};

const getCustomerEmail = (item) => {
  const customer = getCustomer(item);

  return customer?.email || item?.email || item?.customerEmail || "—";
};

const getRecordId = (item) =>
  item?.id ||
  item?.shareId ||
  item?.shareOrderId ||
  item?.holdingId ||
  item?.dividendId ||
  item?.orderId ||
  item?.reference ||
  "";

const getProductName = (item) =>
  item?.product?.name ||
  item?.shareProduct?.name ||
  item?.productName ||
  item?.shareName ||
  item?.securityName ||
  item?.name ||
  "Share";

const getTicker = (item) =>
  item?.product?.symbol ||
  item?.product?.ticker ||
  item?.shareProduct?.symbol ||
  item?.symbol ||
  item?.ticker ||
  item?.stockSymbol ||
  "";

const getCurrency = (item) =>
  item?.currency?.code ||
  item?.currencyCode ||
  item?.currency ||
  item?.product?.currency?.code ||
  "USD";

const getQuantity = (item) =>
  item?.quantity ??
  item?.units ??
  item?.shares ??
  item?.shareQuantity ??
  item?.numberOfShares ??
  0;

const getUnitPrice = (item) =>
  item?.unitPrice ??
  item?.pricePerShare ??
  item?.sharePrice ??
  item?.price ??
  item?.product?.unitPrice ??
  item?.product?.price ??
  0;

const getTotalValue = (item) =>
  item?.totalAmount ??
  item?.totalValue ??
  item?.amount ??
  item?.orderValue ??
  item?.marketValue ??
  item?.value ??
  0;

const getDividendAmount = (item) =>
  item?.dividendAmount ??
  item?.amount ??
  item?.totalDividend ??
  item?.payoutAmount ??
  0;

const getCreatedAt = (item) =>
  item?.createdAt ||
  item?.orderedAt ||
  item?.purchasedAt ||
  item?.declaredAt ||
  item?.paymentDate ||
  item?.date ||
  null;

const getCurrencySafe = (value) => {
  const currency = String(value || "USD").trim().toUpperCase();

  return /^[A-Z]{3}$/.test(currency) ? currency : "USD";
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value, currency = "USD") => {
  const amount = toNumber(value);
  const safeCurrency = getCurrencySafe(currency);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${safeCurrency} ${amount.toFixed(2)}`;
  }
};

const formatNumber = (value) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
  }).format(toNumber(value));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatRelativeDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(value);
};

const getStatusMeta = (status) => {
  switch (normalizeStatus(status)) {
    case "COMPLETED":
    case "ACTIVE":
    case "SETTLED":
      return {
        label:
          normalizeStatus(status) === "ACTIVE"
            ? "Active"
            : normalizeStatus(status) === "SETTLED"
              ? "Settled"
              : "Completed",
        icon: CheckCircle2,
        className:
          "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      };

    case "REJECTED":
    case "CANCELLED":
      return {
        label:
          normalizeStatus(status) === "CANCELLED"
            ? "Cancelled"
            : "Rejected",
        icon: XCircle,
        className:
          "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      };

    case "PROCESSING":
      return {
        label: "Processing",
        icon: TrendingUp,
        className:
          "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
      };

    default:
      return {
        label: "Pending",
        icon: Clock3,
        className:
          "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      };
  }
};

const getRecordType = (item) => {
  const explicitType = String(
    item?.recordType ||
      item?.entityType ||
      item?.type ||
      item?.kind ||
      "",
  )
    .trim()
    .toUpperCase();

  if (
    ["PRODUCT", "ORDER", "HOLDING", "DIVIDEND"].includes(explicitType)
  ) {
    return explicitType;
  }

  if (item?.dividendAmount !== undefined || item?.declaredAt) {
    return "DIVIDEND";
  }

  if (
    item?.holdingId ||
    item?.shares !== undefined ||
    item?.shareQuantity !== undefined
  ) {
    return "HOLDING";
  }

  if (item?.orderId || item?.orderedAt) {
    return "ORDER";
  }

  return "PRODUCT";
};

const getPagination = (payload) => {
  const pagination =
    payload?.pagination ||
    payload?.meta?.pagination ||
    payload?.meta ||
    {};

  return {
    nextCursor:
      pagination?.nextCursor ||
      pagination?.next_cursor ||
      payload?.nextCursor ||
      payload?.next_cursor ||
      null,
    hasNextPage: Boolean(
      pagination?.hasNextPage ??
        pagination?.has_next_page ??
        payload?.hasNextPage ??
        payload?.has_next_page,
    ),
    total:
      pagination?.total ??
      payload?.total ??
      payload?.count ??
      null,
  };
};

const AdminShares = () => {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [recordType, setRecordType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(null);

  const loadShares = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      if (append) {
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

        if (recordType !== "ALL") {
          params.type = recordType;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const trimmedSearch = search.trim();

        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        const response = await api.get("/admin/shares", { params });
        const payload = response?.data;

        const incomingRecords = normalizeCollection(payload);
        const pagination = getPagination(payload);

        setRecords((current) =>
          append ? [...current, ...incomingRecords] : incomingRecords,
        );

        setNextCursor(pagination.nextCursor);
        setHasNextPage(
          Boolean(
            pagination.hasNextPage ||
              pagination.nextCursor ||
              incomingRecords.length === PAGE_SIZE,
          ),
        );
        setTotal(pagination.total);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load share records.";

        setError(message);

        if (!append) {
          setRecords([]);
          setNextCursor(null);
          setHasNextPage(false);
          setTotal(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [recordType, search, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadShares();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadShares]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((item) => {
      const itemType = getRecordType(item);

      if (recordType !== "ALL" && itemType !== recordType) {
        return false;
      }

      if (!query) return true;

      const customer = getCustomer(item);

      const values = [
        getRecordId(item),
        getCustomerName(item),
        getCustomerEmail(item),
        getProductName(item),
        getTicker(item),
        item?.reference,
        item?.orderId,
        item?.holdingId,
        item?.dividendId,
      ];

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [records, recordType, search]);

  const summary = useMemo(() => {
    return records.reduce(
      (result, item) => {
        const itemType = getRecordType(item);
        const normalizedStatus = normalizeStatus(
          item?.status ||
            item?.orderStatus ||
            item?.holdingStatus ||
            item?.dividendStatus,
        );

        const value = toNumber(
          itemType === "DIVIDEND"
            ? getDividendAmount(item)
            : getTotalValue(item),
        );

        result.total += 1;

        if (itemType === "PRODUCT") result.products += 1;
        if (itemType === "ORDER") result.orders += 1;
        if (itemType === "HOLDING") result.holdings += 1;
        if (itemType === "DIVIDEND") {
          result.dividends += 1;
          result.dividendValue += value;
        }

        if (
          normalizedStatus === "PENDING" ||
          normalizedStatus === "PROCESSING"
        ) {
          result.pending += 1;
        }

        if (
          normalizedStatus === "COMPLETED" ||
          normalizedStatus === "ACTIVE" ||
          normalizedStatus === "SETTLED"
        ) {
          result.active += 1;
        }

        return result;
      },
      {
        total: 0,
        products: 0,
        orders: 0,
        holdings: 0,
        dividends: 0,
        dividendValue: 0,
        pending: 0,
        active: 0,
      },
    );
  }, [records]);

  const handleRefresh = () => {
    loadShares();
  };

  const handleLoadMore = () => {
    if (!nextCursor || refreshing || loading) return;

    loadShares({
      append: true,
      cursor: nextCursor,
    });
  };

  const getDetailPath = (item) => {
    const id = getRecordId(item);

    if (!id) return null;

    const type = getRecordType(item);

    if (type === "PRODUCT") {
      return `/admin/shares/products/${encodeURIComponent(id)}`;
    }

    if (type === "ORDER") {
      return `/admin/shares/orders/${encodeURIComponent(id)}`;
    }

    if (type === "HOLDING") {
      return `/admin/shares/holdings/${encodeURIComponent(id)}`;
    }

    if (type === "DIVIDEND") {
      return `/admin/shares/dividends/${encodeURIComponent(id)}`;
    }

    return `/admin/shares/${encodeURIComponent(id)}`;
  };

  const summaryCards = [
    {
      label: "Total records",
      value: total ?? summary.total,
      icon: BarChart3,
    },
    {
      label: "Share products",
      value: summary.products,
      icon: WalletCards,
    },
    {
      label: "Customer orders",
      value: summary.orders,
      icon: CreditCard,
    },
    {
      label: "Holdings",
      value: summary.holdings,
      icon: TrendingUp,
    },
    {
      label: "Dividend records",
      value: summary.dividends,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <BarChart3 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Wealth & investments
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Shares
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review share products, customer orders, holdings and dividend
                  activity using live administrative data.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {summaryCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          {card.label}
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {loading ? "—" : card.value}
                        </p>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, product, ticker, order or holding"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="relative xl:w-52">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <select
                value={recordType}
                onChange={(event) => setRecordType(event.target.value)}
                aria-label="Filter share record type"
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative xl:w-52">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter share status"
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Unable to load share records</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Pending activity
              </p>
              <Clock3 className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : summary.pending}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Pending or processing records in the current result set.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Active / settled
              </p>
              <CheckCircle2 className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : summary.active}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Completed, active or settled records returned by the API.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Dividend records
              </p>
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : summary.dividends}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Dividend records returned by the current result set.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Share records
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredRecords.length} record
                {filteredRecords.length === 1 ? "" : "s"} currently loaded
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Protected administrative data
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <BarChart3 className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No share records found
              </h3>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                No share products, orders, holdings or dividends match the
                current search and filters.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Customer / Record
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Product
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Quantity
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Value
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRecords.map((item) => {
                      const id = getRecordId(item);
                      const itemType = getRecordType(item);
                      const currency = getCurrency(item);
                      const statusMeta = getStatusMeta(
                        item?.status ||
                          item?.orderStatus ||
                          item?.holdingStatus ||
                          item?.dividendStatus,
                      );
                      const StatusIcon = statusMeta.icon;

                      const value =
                        itemType === "DIVIDEND"
                          ? getDividendAmount(item)
                          : getTotalValue(item);

                      return (
                        <tr
                          key={
                            id ||
                            `${getCustomerEmail(item)}-${getCreatedAt(item)}`
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[230px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {getCustomerName(item)}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {getCustomerEmail(item)}
                                </p>

                                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                  {itemType}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {getProductName(item)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getTicker(item) || "No ticker"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {formatNumber(getQuantity(item))}
                            </p>

                            {getUnitPrice(item) > 0 && (
                              <p className="mt-1 text-xs text-slate-500">
                                {formatMoney(
                                  getUnitPrice(item),
                                  currency,
                                )}{" "}
                                / unit
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {formatMoney(value, currency)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatRelativeDate(getCreatedAt(item))}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusMeta.label}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            {getDetailPath(item) ? (
                              <Link
                                to={getDetailPath(item)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4" />
                                Review
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">
                                No record ID
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredRecords.map((item) => {
                  const id = getRecordId(item);
                  const itemType = getRecordType(item);
                  const currency = getCurrency(item);
                  const statusMeta = getStatusMeta(
                    item?.status ||
                      item?.orderStatus ||
                      item?.holdingStatus ||
                      item?.dividendStatus,
                  );
                  const StatusIcon = statusMeta.icon;

                  const value =
                    itemType === "DIVIDEND"
                      ? getDividendAmount(item)
                      : getTotalValue(item);

                  const detailPath = getDetailPath(item);

                  return (
                    <article
                      key={
                        id ||
                        `${getCustomerEmail(item)}-${getCreatedAt(item)}`
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-slate-900">
                              {getCustomerName(item)}
                            </h3>

                            <p className="truncate text-xs text-slate-500">
                              {getCustomerEmail(item)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              {itemType}
                            </p>

                            <p className="mt-1 truncate font-semibold text-slate-900">
                              {getProductName(item)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getTicker(item) || "No ticker"}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Value
                            </p>

                            <p className="mt-1 font-bold text-slate-900">
                              {formatMoney(value, currency)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Quantity
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatNumber(getQuantity(item))}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Date
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatRelativeDate(getCreatedAt(item))}
                            </p>
                          </div>
                        </div>
                      </div>

                      {detailPath && (
                        <Link
                          to={detailPath}
                          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <Eye className="h-4 w-4" />
                          Review record
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>

              {(hasNextPage || nextCursor) && (
                <div className="border-t border-slate-200 p-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={!nextCursor || refreshing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                    {refreshing ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Share administration controls
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Share orders, holdings and dividend operations involve
                customer assets. Any execution, settlement, holding adjustment
                or dividend action should be authorized and recorded by the
                server-side administrative workflow.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminShares;