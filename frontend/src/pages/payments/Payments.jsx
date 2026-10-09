import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

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

  if (Array.isArray(root)) {
    return root;
  }

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

const getPaymentId = (payment) =>
  payment?.id ??
  payment?.paymentId ??
  payment?.transactionId ??
  "";

const getStatus = (payment) =>
  String(
    payment?.status ??
      payment?.paymentStatus ??
      payment?.transactionStatus ??
      "",
  ).toUpperCase();

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

const getCurrency = (payment) =>
  payment?.currency?.code ??
  payment?.currencyCode ??
  payment?.currency ??
  "USD";

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

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ""} ${amount.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      },
    )}`.trim();
  }
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
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

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPayments = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        let response;

        try {
          response = await api.get("/payments/history", {
            params: {
              limit: 6,
            },
          });
        } catch (historyError) {
          if (
            [404, 501].includes(
              historyError?.response?.status,
            )
          ) {
            response = await api.get("/payments", {
              params: {
                limit: 6,
              },
            });
          } else {
            throw historyError;
          }
        }

        const records = getRecords(
          response?.data,
        );

        setPayments(
          Array.isArray(records)
            ? records.slice(0, 6)
            : [],
        );
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load payment activity.",
        );
        setPayments([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const summary = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let failed = 0;
    let volume = 0;

    payments.forEach((payment) => {
      const status = getStatus(payment);
      const amount = getAmount(payment);

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
        volume += amount;
      }
    });

    return {
      completed,
      pending,
      failed,
      volume,
    };
  }, [payments]);

  const currency =
    payments.length > 0
      ? getCurrency(payments[0])
      : "USD";

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-blue-700 dark:text-blue-400" />

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Loading payments
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Loading your payment activity...
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
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <ReceiptText className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Epex Bank
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  Payments
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Make supported payments and review your payment activity from
              one secure place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadPayments(true)}
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
                  Payment activity unavailable
                </p>

                <p className="mt-1 text-sm text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadPayments()}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        )}

        {/* Payment actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Payment services
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose what you want to do.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              to="/payments/pay-bill"
              className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  <ReceiptText className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700 dark:group-hover:text-blue-400" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                Pay a bill
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Make a payment to a supported biller or service provider using
                an eligible Epex Bank account.
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400">
                Start payment
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <Link
              to="/payments/history"
              className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <FileText className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700 dark:group-hover:text-blue-400" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                Payment history
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Search, filter and review payments that have been recorded on
                your account.
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400">
                View history
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>

        {/* Summary */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Payment overview
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ReceiptText className="h-4 w-4" />
              </div>

              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Recent payments
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                {payments.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>

              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Completed
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {summary.completed}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Clock3 className="h-4 w-4" />
              </div>

              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Pending
              </p>

              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
                {summary.pending}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <Wallet className="h-4 w-4" />
              </div>

              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Recent volume
              </p>

              <p className="mt-1 truncate text-xl font-bold text-slate-950 dark:text-white">
                {formatMoney(
                  summary.volume,
                  currency,
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Recent payments */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Recent payments
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your latest payment activity.
              </p>
            </div>

            <Link
              to="/payments/history"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {payments.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Search className="h-6 w-6" />
              </div>

              <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                No payment activity
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Payments recorded through your Epex Bank account will appear
                here.
              </p>

              <Link
                to="/payments/pay-bill"
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Make a payment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[800px]">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Payment
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Reference
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
                    {payments.map(
                      (payment, index) => {
                        const id =
                          getPaymentId(
                            payment,
                          );

                        const status =
                          getStatus(payment);

                        const config =
                          STATUS_CONFIG[
                            status
                          ] ?? {
                            label:
                              status ||
                              "Unknown",
                            tone: "neutral",
                            icon: FileText,
                          };

                        const StatusIcon =
                          config.icon;

                        const amount =
                          getAmount(payment);

                        const paymentCurrency =
                          getCurrency(
                            payment,
                          );

                        return (
                          <tr
                            key={
                              id ||
                              getReference(
                                payment,
                              ) ||
                              `${getProvider(
                                payment,
                              )}-${index}`
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
                                    {getProvider(
                                      payment,
                                    )}
                                  </p>

                                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                    {getCategory(
                                      payment,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="max-w-[220px] px-5 py-4">
                              <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {getReference(
                                  payment,
                                ) || "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span className="font-bold text-slate-950 dark:text-white">
                                {formatMoney(
                                  amount,
                                  paymentCurrency,
                                )}
                              </span>
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

                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {formatDate(
                                getCreatedAt(
                                  payment,
                                ),
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              {id && (
                                <Link
                                  to={`/payments/${encodeURIComponent(
                                    String(id),
                                  )}`}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400"
                                >
                                  Details
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
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
              <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
                {payments.map(
                  (payment, index) => {
                    const id =
                      getPaymentId(
                        payment,
                      );

                    const status =
                      getStatus(payment);

                    const config =
                      STATUS_CONFIG[
                        status
                      ] ?? {
                        label:
                          status ||
                          "Unknown",
                        tone: "neutral",
                        icon: FileText,
                      };

                    const StatusIcon =
                      config.icon;

                    return (
                      <div
                        key={
                          id ||
                          getReference(
                            payment,
                          ) ||
                          `${getProvider(
                            payment,
                          )}-${index}`
                        }
                        className="p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                              <ReceiptText className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-950 dark:text-white">
                                {getProvider(
                                  payment,
                                )}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                {getCategory(
                                  payment,
                                )}
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

                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Amount
                            </p>

                            <p className="mt-1 font-bold text-slate-950 dark:text-white">
                              {formatMoney(
                                getAmount(
                                  payment,
                                ),
                                getCurrency(
                                  payment,
                                ),
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Date
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {formatDate(
                                getCreatedAt(
                                  payment,
                                ),
                              )}
                            </p>
                          </div>
                        </div>

                        {id && (
                          <Link
                            to={`/payments/${encodeURIComponent(
                              String(id),
                            )}`}
                            className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            View details
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}
        </section>

        {/* Quick navigation */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/payments/history"
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
          >
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
            </div>

            <p className="mt-3 font-bold text-slate-950 dark:text-white">
              Payment history
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Search and filter all available payment records.
            </p>
          </Link>

          <Link
            to="/payments/pay-bill"
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
          >
            <div className="flex items-center justify-between">
              <ReceiptText className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
            </div>

            <p className="mt-3 font-bold text-slate-950 dark:text-white">
              Pay a bill
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Create a new payment instruction.
            </p>
          </Link>

          <Link
            to="/transactions"
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
          >
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
            </div>

            <p className="mt-3 font-bold text-slate-950 dark:text-white">
              Account transactions
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              View the broader ledger and transaction activity.
            </p>
          </Link>
        </section>

        {/* Security */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Payment records
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Payment information displayed here is retrieved from your
                authenticated Epex Bank account. Do not share your password,
                PIN, OTP, card security code, or other authentication
                credentials with anyone.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Payments;
