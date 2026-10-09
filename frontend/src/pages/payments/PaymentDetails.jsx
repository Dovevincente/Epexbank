import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const STATUS_CONFIG = {
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

const TONE_STYLES = {
  success: {
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    icon:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    accent: "text-emerald-700 dark:text-emerald-400",
  },
  warning: {
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    icon:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    accent: "text-amber-700 dark:text-amber-400",
  },
  danger: {
    badge:
      "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
    icon:
      "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    accent: "text-red-700 dark:text-red-400",
  },
  neutral: {
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    accent: "text-slate-700 dark:text-slate-300",
  },
};

const normalizePayment = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  return (
    root?.payment ??
    root?.billPayment ??
    root?.transaction ??
    root?.record ??
    root
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

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getCurrency = (payment) =>
  payment?.currency?.code ??
  payment?.currencyCode ??
  payment?.currency ??
  "USD";

const getProvider = (payment) =>
  payment?.biller?.name ??
  payment?.billerName ??
  payment?.provider?.name ??
  payment?.providerName ??
  payment?.merchant?.name ??
  payment?.merchantName ??
  payment?.serviceName ??
  "Bill payment";

const getCategory = (payment) =>
  payment?.biller?.category?.name ??
  payment?.biller?.categoryName ??
  payment?.category?.name ??
  payment?.categoryName ??
  payment?.category ??
  payment?.type ??
  "Payment";

const getCustomerReference = (payment) =>
  payment?.customerReference ??
  payment?.customerNumber ??
  payment?.serviceReference ??
  payment?.accountReference ??
  payment?.meterNumber ??
  payment?.subscriberNumber ??
  "";

const getAccountNumber = (payment) =>
  payment?.account?.accountNumber ??
  payment?.accountNumber ??
  payment?.sourceAccount?.accountNumber ??
  "";

const getAccountId = (payment) =>
  payment?.account?.id ??
  payment?.accountId ??
  payment?.sourceAccount?.id ??
  "";

const getDescription = (payment) =>
  payment?.description ??
  payment?.narration ??
  payment?.memo ??
  "";

const getCreatedAt = (payment) =>
  payment?.createdAt ??
  payment?.created_at ??
  payment?.initiatedAt ??
  payment?.submittedAt ??
  null;

const getUpdatedAt = (payment) =>
  payment?.updatedAt ??
  payment?.updated_at ??
  payment?.processedAt ??
  payment?.completedAt ??
  null;

const getFee = (payment) => {
  const value =
    payment?.fee ??
    payment?.fees ??
    payment?.feeAmount ??
    payment?.charge;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getPaymentMethod = (payment) =>
  payment?.method ??
  payment?.paymentMethod ??
  payment?.channel ??
  payment?.source ??
  "";

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

const formatStatus = (value) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return "—";

  const value = String(accountNumber);

  if (value.length <= 4) {
    return `•••• ${value}`;
  }

  return `•••• ${value.slice(-4)}`;
};

const PaymentDetails = () => {
  const { paymentId, transactionId } = useParams();

  const id = paymentId || transactionId;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const loadPayment = useCallback(async () => {
    if (!id) {
      setPayment(null);
      setError("No payment identifier was supplied.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let response;

      try {
        response = await api.get(
          `/payments/${encodeURIComponent(id)}`,
        );
      } catch (paymentError) {
        /*
         * Some banking API implementations expose bill payments
         * through the transaction resource. Use that endpoint only
         * when the dedicated payment endpoint does not exist.
         */
        if (
          [404, 501].includes(
            paymentError?.response?.status,
          )
        ) {
          response = await api.get(
            `/transactions/${encodeURIComponent(id)}`,
          );
        } else {
          throw paymentError;
        }
      }

      const nextPayment = normalizePayment(
        response?.data,
      );

      if (
        !nextPayment ||
        typeof nextPayment !== "object"
      ) {
        throw new Error(
          "The banking API returned an invalid payment record.",
        );
      }

      setPayment(nextPayment);
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404) {
        setError(
          "The payment record could not be found.",
        );
      } else if (status === 403) {
        setError(
          "You are not authorized to view this payment.",
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load payment details.",
        );
      }

      setPayment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  useEffect(() => {
    if (!copied) return undefined;

    const timer = window.setTimeout(
      () => setCopied(""),
      1800,
    );

    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyValue = async (value, key) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(key);
    } catch {
      setCopied("");
    }
  };

  const status = getStatus(payment);
  const statusConfig =
    STATUS_CONFIG[status] ?? {
      label: formatStatus(status),
      tone: "neutral",
      icon: FileText,
    };

  const StatusIcon = statusConfig.icon;

  const styles =
    TONE_STYLES[statusConfig.tone] ??
    TONE_STYLES.neutral;

  const currency = getCurrency(payment);
  const amount = getAmount(payment);
  const fee = getFee(payment);

  const provider = getProvider(payment);
  const category = getCategory(payment);
  const reference = getReference(payment);
  const customerReference =
    getCustomerReference(payment);
  const accountNumber = getAccountNumber(payment);
  const accountId = getAccountId(payment);
  const description = getDescription(payment);
  const paymentMethod = getPaymentMethod(payment);

  const paymentCreated = getCreatedAt(payment);
  const paymentUpdated = getUpdatedAt(payment);

  const paymentMetadata = useMemo(() => {
    if (!payment || typeof payment !== "object") {
      return {};
    }

    const metadata =
      payment?.metadata ??
      payment?.meta ??
      payment?.details ??
      {};

    if (
      !metadata ||
      typeof metadata !== "object" ||
      Array.isArray(metadata)
    ) {
      return {};
    }

    return metadata;
  }, [payment]);

  const backPath = "/payments";

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link
            to={backPath}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to payments
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-blue-700 dark:text-blue-400" />

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Loading payment details
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Retrieving the authenticated payment record...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link
            to={backPath}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to payments
          </Link>

          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Payment details unavailable
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {error ||
                "The requested payment record could not be loaded."}
            </p>

            <button
              type="button"
              onClick={loadPayment}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to={backPath}
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to payments
            </Link>

            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
              >
                <StatusIcon className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Payment details
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {provider}
                </h1>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadPayment}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Main summary */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Payment amount
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  {formatMoney(amount, currency)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${styles.badge}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig.label}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {category}
                  </span>
                </div>
              </div>

              <div className="w-full max-w-md rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Payment reference
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <p className="min-w-0 flex-1 break-all text-sm font-bold text-slate-950 dark:text-white">
                    {reference || getPaymentId(payment) || "—"}
                  </p>

                  {(reference || getPaymentId(payment)) && (
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(
                          reference ||
                            getPaymentId(payment),
                          "reference",
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                      aria-label="Copy payment reference"
                      title="Copy payment reference"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {copied === "reference" && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Reference copied.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Details */}
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Payment information
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Information returned by the banking API.
                  </p>
                </div>
              </div>

              <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Provider
                  </span>

                  <span className="font-semibold text-slate-950 dark:text-white sm:text-right">
                    {provider}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Category
                  </span>

                  <span className="font-semibold text-slate-950 dark:text-white sm:text-right">
                    {category}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Customer reference
                  </span>

                  <div className="flex items-center gap-2 sm:max-w-[60%]">
                    <span className="break-all font-semibold text-slate-950 dark:text-white sm:text-right">
                      {customerReference || "—"}
                    </span>

                    {customerReference && (
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(
                            customerReference,
                            "customerReference",
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        aria-label="Copy customer reference"
                        title="Copy customer reference"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Payment method
                  </span>

                  <span className="font-semibold text-slate-950 dark:text-white sm:text-right">
                    {paymentMethod || "—"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Description
                  </span>

                  <span className="break-words font-semibold text-slate-950 dark:text-white sm:max-w-[60%] sm:text-right">
                    {description || "—"}
                  </span>
                </div>
              </div>
            </section>

            {/* Account */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                  <Wallet className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Funding account
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Account associated with this payment.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Account number
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                      {maskAccountNumber(
                        accountNumber,
                      )}
                    </p>
                  </div>

                  {accountId && (
                    <Link
                      to={`/accounts/${encodeURIComponent(
                        String(accountId),
                      )}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      View account
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Payment timeline
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Recorded lifecycle timestamps.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {paymentCreated && (
                  <div className="flex gap-4">
                    <div className="relative flex w-8 justify-center">
                      <div className="absolute top-8 h-full w-px bg-slate-200 dark:bg-slate-800" />

                      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                        <FileText className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="pb-1">
                      <p className="font-bold text-slate-950 dark:text-white">
                        Payment created
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {formatDateTime(
                          paymentCreated,
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {paymentUpdated && (
                  <div className="flex gap-4">
                    <div className="flex w-8 justify-center">
                      <div
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${styles.icon}`}
                      >
                        <StatusIcon className="h-4 w-4" />
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-950 dark:text-white">
                        Latest status update
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {formatDateTime(
                          paymentUpdated,
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Side panel */}
          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Amount breakdown
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Payment
                  </span>

                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    {formatMoney(
                      amount,
                      currency,
                    )}
                  </span>
                </div>

                {fee !== null && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Fee
                    </span>

                    <span className="text-sm font-bold text-slate-950 dark:text-white">
                      {formatMoney(
                        fee,
                        currency,
                      )}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-slate-950 dark:text-white">
                      Total
                    </span>

                    <span className="text-xl font-bold text-slate-950 dark:text-white">
                      {formatMoney(
                        fee !== null &&
                          amount !== null
                          ? amount + fee
                          : amount,
                        currency,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Status */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}
                >
                  <StatusIcon className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Current status
                  </p>

                  <p className="mt-1 font-bold text-slate-950 dark:text-white">
                    {statusConfig.label}
                  </p>
                </div>
              </div>

              {status === "PENDING" ||
              status === "PROCESSING" ||
              status === "SUBMITTED" ? (
                <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  This payment is still being processed. The final status will
                  be determined by the banking system and bill payment
                  provider.
                </p>
              ) : null}

              {["FAILED", "REJECTED", "DECLINED"].includes(
                status,
              ) && (
                <p className="mt-4 rounded-2xl bg-red-50 p-3 text-xs leading-5 text-red-800 dark:bg-red-950/30 dark:text-red-300">
                  The payment was not completed. Review the transaction record
                  or contact Epex Bank support if you need assistance.
                </p>
              )}

              {["COMPLETED", "SUCCESS", "PAID", "SETTLED"].includes(
                status,
              ) && (
                <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  The banking system reports this payment as completed.
                </p>
              )}
            </section>

            {/* Dates */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Dates
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Created
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {formatDateTime(paymentCreated)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last updated
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {formatDateTime(paymentUpdated)}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* Metadata */}
        {Object.keys(paymentMetadata).length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Info className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Additional payment information
                </h2>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Non-sensitive metadata returned by the banking API.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(paymentMetadata).map(
                ([key, value]) => {
                  if (
                    value === null ||
                    value === undefined ||
                    typeof value === "object"
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={key}
                      className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {String(key).replace(
                          /([A-Z])/g,
                          " $1",
                        )}
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
                        {String(value)}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </section>
        )}

        {/* Security */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />

            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Secure payment information
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                This page displays information returned for your authenticated
                payment record. Never share your Epex Bank password, OTP, PIN,
                card security code, or other authentication credentials.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PaymentDetails;