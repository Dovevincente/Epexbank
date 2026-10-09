import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const PAGE_SIZE = 15;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "FAILED", label: "Failed" },
  { value: "REVERSED", label: "Reversed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "All payments" },
  { value: "BILL", label: "Bill payments" },
  { value: "UTILITY", label: "Utilities" },
  { value: "AIRTIME", label: "Airtime" },
  { value: "DATA", label: "Data" },
  { value: "PAYMENT", label: "Other payments" },
];

const STATUS_CONFIG = {
  COMPLETED: {
    label: "Completed",
    tone: "success",
    icon: CheckCircle2,
  },
  SUCCESS: {
    label: "Successful",
    tone: "success",
    icon: CheckCircle2,
  },
  PAID: {
    label: "Paid",
    tone: "success",
    icon: CheckCircle2,
  },
  SETTLED: {
    label: "Settled",
    tone: "success",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    tone: "warning",
    icon: Clock3,
  },
  PROCESSING: {
    label: "Processing",
    tone: "warning",
    icon: Clock3,
  },
  SUBMITTED: {
    label: "Submitted",
    tone: "warning",
    icon: Clock3,
  },
  FAILED: {
    label: "Failed",
    tone: "danger",
    icon: XCircle,
  },
  REJECTED: {
    label: "Rejected",
    tone: "danger",
    icon: XCircle,
  },
  DECLINED: {
    label: "Declined",
    tone: "danger",
    icon: XCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "neutral",
    icon: XCircle,
  },
  REVERSED: {
    label: "Reversed",
    tone: "danger",
    icon: AlertCircle,
  },
};

const STATUS_STYLES = {
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  danger:
    "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  neutral:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const getRecords = (payload) => {
  const root = payload?.data ?? payload ?? {};

  if (Array.isArray(root)) return root;

  return (
    root?.payments ??
    root?.billPayments ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.transactions ??
    root?.data?.payments ??
    root?.data?.billPayments ??
    root?.data?.items ??
    root?.data?.records ??
    root?.data?.results ??
    []
  );
};

const getPagination = (payload) => {
  const root = payload?.data ?? payload ?? {};

  const pagination =
    root?.pagination ??
    root?.meta ??
    root?.pageInfo ??
    root?.data?.pagination ??
    root?.data?.meta ??
    {};

  return {
    nextCursor:
      pagination?.nextCursor ??
      pagination?.next_cursor ??
      root?.nextCursor ??
      root?.next_cursor ??
      null,
    previousCursor:
      pagination?.previousCursor ??
      pagination?.previous_cursor ??
      root?.previousCursor ??
      root?.previous_cursor ??
      null,
    total:
      pagination?.total ??
      pagination?.totalCount ??
      pagination?.count ??
      root?.total ??
      null,
  };
};

const getStatus = (payment) =>
  String(
    payment?.status ??
      payment?.paymentStatus ??
      payment?.transactionStatus ??
      "",
  ).toUpperCase();

const getType = (payment) => {
  const value =
    payment?.type ??
    payment?.paymentType ??
    payment?.category?.code ??
    payment?.categoryCode ??
    payment?.category ??
    "";

  return String(value).toUpperCase();
};

const getProvider = (payment) =>
  payment?.biller?.name ??
  payment?.billerName ??
  payment?.provider?.name ??
  payment?.providerName ??
  payment?.merchant?.name ??
  payment?.merchantName ??
  payment?.serviceName ??
  payment?.description ??
  "Payment";

const getCategory = (payment) =>
  payment?.biller?.category?.name ??
  payment?.biller?.categoryName ??
  payment?.category?.name ??
  payment?.categoryName ??
  payment?.category ??
  payment?.type ??
  "Payment";

const getReference = (payment) =>
  payment?.reference ??
  payment?.paymentReference ??
  payment?.transactionReference ??
  payment?.externalReference ??
  payment?.id ??
  "";

const getPaymentId = (payment) =>
  payment?.id ??
  payment?.paymentId ??
  payment?.transactionId ??
  "";

const getCustomerReference = (payment) =>
  payment?.customerReference ??
  payment?.customerNumber ??
  payment?.serviceReference ??
  payment?.accountReference ??
  payment?.meterNumber ??
  payment?.subscriberNumber ??
  "";

const getAmount = (payment) => {
  const value =
    payment?.amount ??
    payment?.paymentAmount ??
    payment?.transactionAmount ??
    payment?.totalAmount;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
};

const getFee = (payment) => {
  const value =
    payment?.fee ??
    payment?.fees ??
    payment?.feeAmount ??
    payment?.charge;

  const fee = Number(value);

  return Number.isFinite(fee) ? fee : null;
};

const getCurrency = (payment) =>
  payment?.currency?.code ??
  payment?.currencyCode ??
  payment?.currency ??
  "USD";

const getAccountNumber = (payment) =>
  payment?.account?.accountNumber ??
  payment?.accountNumber ??
  payment?.sourceAccount?.accountNumber ??
  "";

const getCreatedAt = (payment) =>
  payment?.createdAt ??
  payment?.created_at ??
  payment?.initiatedAt ??
  payment?.submittedAt ??
  payment?.date ??
  payment?.transactionDate ??
  null;

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ""} ${amount.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`.trim();
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

const formatStatus = (value) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const maskAccount = (value) => {
  if (!value) return "—";

  const account = String(value);

  if (account.length <= 4) {
    return `•••• ${account}`;
  }

  return `•••• ${account.slice(-4)}`;
};

const getStatusStyle = (status) => {
  const config =
    STATUS_CONFIG[status] ?? {
      tone: "neutral",
    };

  return (
    STATUS_STYLES[config.tone] ??
    STATUS_STYLES.neutral
  );
};

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([]);
  const [nextCursor, setNextCursor] =
    useState(null);
  const [previousCursor, setPreviousCursor] =
    useState(null);
  const [total, setTotal] = useState(null);

  const loadPayments = useCallback(
    async ({
      requestedCursor = null,
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

        if (requestedCursor) {
          params.cursor = requestedCursor;
        }

        if (statusFilter !== "ALL") {
          params.status = statusFilter;
        }

        if (typeFilter !== "ALL") {
          params.type = typeFilter;
        }

        const trimmedSearch = search.trim();

        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        let response;

        try {
          response = await api.get(
            "/payments/history",
            { params },
          );
        } catch (historyError) {
          if (
            [404, 501].includes(
              historyError?.response?.status,
            )
          ) {
            response = await api.get(
              "/payments",
              { params },
            );
          } else {
            throw historyError;
          }
        }

        const records = getRecords(
          response?.data,
        );

        const pagination = getPagination(
          response?.data,
        );

        setPayments(
          Array.isArray(records) ? records : [],
        );

        setNextCursor(
          pagination.nextCursor || null,
        );

        setPreviousCursor(
          pagination.previousCursor || null,
        );

        setTotal(
          Number.isFinite(Number(pagination.total))
            ? Number(pagination.total)
            : null,
        );
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load payment history.",
        );

        if (!background) {
          setPayments([]);
          setNextCursor(null);
          setPreviousCursor(null);
          setTotal(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, typeFilter],
  );

  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPayments({
        requestedCursor: cursor,
      });
    }, search.trim() ? 350 : 0);

    return () => window.clearTimeout(timer);
  }, [cursor, loadPayments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return payments;
    }

    return payments.filter((payment) => {
      const searchable = [
        getProvider(payment),
        getCategory(payment),
        getReference(payment),
        getCustomerReference(payment),
        getAccountNumber(payment),
        payment?.description,
        payment?.narration,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [payments, search]);

  const summary = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let failed = 0;
    let totalAmount = 0;
    let totalFees = 0;

    payments.forEach((payment) => {
      const status = getStatus(payment);
      const amount = getAmount(payment);
      const fee = getFee(payment);

      if (
        ["COMPLETED", "SUCCESS", "PAID", "SETTLED"].includes(
          status,
        )
      ) {
        completed += 1;
      }

      if (
        ["PENDING", "PROCESSING", "SUBMITTED"].includes(
          status,
        )
      ) {
        pending += 1;
      }

      if (
        ["FAILED", "REJECTED", "DECLINED"].includes(
          status,
        )
      ) {
        failed += 1;
      }

      if (amount !== null) {
        totalAmount += amount;
      }

      if (fee !== null) {
        totalFees += fee;
      }
    });

    return {
      loaded: payments.length,
      completed,
      pending,
      failed,
      totalAmount,
      totalFees,
    };
  }, [payments]);

  const handleNext = () => {
    if (!nextCursor) return;

    setCursorStack((current) => [
      ...current,
      cursor,
    ]);

    setCursor(nextCursor);
  };

  const handlePrevious = () => {
    if (!cursor) return;

    const previous =
      cursorStack[cursorStack.length - 1] ??
      previousCursor ??
      null;

    setCursorStack((current) =>
      current.slice(0, -1),
    );

    setCursor(previous);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setCursor(null);
    setCursorStack([]);
  };

  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "ALL" ||
    typeFilter !== "ALL";

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-blue-700 dark:text-blue-400" />

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Loading payment history
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Retrieving your authenticated payment activity...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <ReceiptText className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Payments
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  Payment history
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review bill payments and other payment activity recorded on your
              Epex Bank account.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadPayments({
                requestedCursor: cursor,
                background: true,
              })
            }
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/50 dark:bg-red-950/30"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

              <div>
                <p className="font-bold text-red-900 dark:text-red-300">
                  Unable to load payment history
                </p>

                <p className="mt-1 text-sm text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                loadPayments({
                  requestedCursor: cursor,
                })
              }
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Loaded
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
              {summary.loaded}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Completed
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {summary.completed}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">
              {summary.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Failed
            </p>

            <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-400">
              {summary.failed}
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Loaded volume
            </p>

            <p className="mt-2 truncate text-xl font-bold text-slate-950 dark:text-white">
              {formatMoney(
                summary.totalAmount,
                payments[0]
                  ? getCurrency(payments[0])
                  : "USD",
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />

            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Filter payment history
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_200px_auto]">
            <label className="relative block">
              <span className="sr-only">
                Search payments
              </span>

              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search provider, reference..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              {TYPE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Clear
              </button>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>
        </section>

        {/* Desktop table */}
        <section className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Reference
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Account
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Date
                  </th>

                  <th className="px-5 py-4" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPayments.map(
                  (payment, index) => {
                    const paymentId =
                      getPaymentId(payment);

                    const reference =
                      getReference(payment);

                    const status =
                      getStatus(payment);

                    const config =
                      STATUS_CONFIG[status] ?? {
                        label:
                          formatStatus(status),
                        tone: "neutral",
                        icon: FileText,
                      };

                    const StatusIcon = config.icon;

                    const currency =
                      getCurrency(payment);

                    const amount =
                      getAmount(payment);

                    const provider =
                      getProvider(payment);

                    const category =
                      getCategory(payment);

                    return (
                      <tr
                        key={
                          paymentId ||
                          reference ||
                          `${provider}-${index}`
                        }
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                              <ReceiptText className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-950 dark:text-white">
                                {provider}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {category}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="max-w-[220px] px-5 py-4">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {reference || "—"}
                          </p>

                          {getCustomerReference(
                            payment,
                          ) && (
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {getCustomerReference(
                                payment,
                              )}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-slate-400" />

                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {maskAccount(
                                getAccountNumber(
                                  payment,
                                ),
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <p className="font-bold text-slate-950 dark:text-white">
                            {formatMoney(
                              amount,
                              currency,
                            )}
                          </p>

                          {getFee(payment) !==
                            null && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Fee:{" "}
                              {formatMoney(
                                getFee(payment),
                                currency,
                              )}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                              status,
                            )}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {config.label}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <CalendarDays className="h-4 w-4 shrink-0" />

                            <span>
                              {formatDateTime(
                                getCreatedAt(
                                  payment,
                                ),
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          {paymentId ? (
                            <Link
                              to={`/payments/${encodeURIComponent(
                                String(paymentId),
                              )}`}
                              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                            >
                              View
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">
                              —
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

          {filteredPayments.length === 0 && (
            <EmptyState hasFilters={hasFilters} />
          )}
        </section>

        {/* Mobile cards */}
        <section className="space-y-3 lg:hidden">
          {filteredPayments.map(
            (payment, index) => {
              const paymentId =
                getPaymentId(payment);

              const reference =
                getReference(payment);

              const status =
                getStatus(payment);

              const config =
                STATUS_CONFIG[status] ?? {
                  label: formatStatus(status),
                  tone: "neutral",
                  icon: FileText,
                };

              const StatusIcon = config.icon;

              const currency =
                getCurrency(payment);

              const amount =
                getAmount(payment);

              return (
                <article
                  key={
                    paymentId ||
                    reference ||
                    `${getProvider(payment)}-${index}`
                  }
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        <ReceiptText className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-slate-950 dark:text-white">
                          {getProvider(payment)}
                        </h2>

                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {getCategory(payment)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusStyle(
                        status,
                      )}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Amount
                      </p>

                      <p className="mt-1 font-bold text-slate-950 dark:text-white">
                        {formatMoney(
                          amount,
                          currency,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Account
                      </p>

                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                        {maskAccount(
                          getAccountNumber(
                            payment,
                          ),
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Reference
                      </span>

                      <span className="max-w-[65%] break-all text-right text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {reference || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Date
                      </span>

                      <span className="text-right text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {formatDateTime(
                          getCreatedAt(
                            payment,
                          ),
                        )}
                      </span>
                    </div>
                  </div>

                  {paymentId && (
                    <Link
                      to={`/payments/${encodeURIComponent(
                        String(paymentId),
                      )}`}
                      className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      View payment
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </article>
              );
            },
          )}

          {filteredPayments.length === 0 && (
            <EmptyState hasFilters={hasFilters} />
          )}
        </section>

        {/* Pagination */}
        {(nextCursor ||
          previousCursor ||
          cursor ||
          total !== null) && (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {total !== null
                ? `${total.toLocaleString()} payment record${
                    total === 1 ? "" : "s"
                  }`
                : `Showing ${filteredPayments.length} payment${
                    filteredPayments.length === 1
                      ? ""
                      : "s"
                  }`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={
                  !cursor ||
                  loading ||
                  refreshing
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={
                  !nextCursor ||
                  loading ||
                  refreshing
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Security notice */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Payment activity
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Payment records shown here come from your authenticated Epex
                Bank account. Always verify the payment reference and status
                before contacting a biller or service provider.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const EmptyState = ({ hasFilters }) => (
  <div className="p-10 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <ReceiptText className="h-7 w-7" />
    </div>

    <h2 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
      {hasFilters
        ? "No matching payments"
        : "No payment history yet"}
    </h2>

    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
      {hasFilters
        ? "Try changing your search or clearing one of the filters."
        : "Payments recorded by Epex Bank will appear here once you complete a payment."}
    </p>
  </div>
);

export default PaymentHistory;