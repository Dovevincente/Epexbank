import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Info,
  Landmark,
  Loader2,
  LockKeyhole,
  Percent,
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
    description:
      "This loan application is awaiting processing or review.",
  },
  SUBMITTED: {
    label: "Submitted",
    tone: "warning",
    icon: Clock3,
    description:
      "Your loan application has been submitted and is awaiting review.",
  },
  PROCESSING: {
    label: "Processing",
    tone: "warning",
    icon: Clock3,
    description:
      "Your loan application is currently being processed.",
  },
  UNDER_REVIEW: {
    label: "Under review",
    tone: "warning",
    icon: Clock3,
    description:
      "Your loan application is currently under review.",
  },
  APPROVED: {
    label: "Approved",
    tone: "success",
    icon: CheckCircle2,
    description:
      "Your loan application has been approved.",
  },
  ACTIVE: {
    label: "Active",
    tone: "success",
    icon: CheckCircle2,
    description:
      "This loan is currently active.",
  },
  DISBURSED: {
    label: "Disbursed",
    tone: "success",
    icon: CheckCircle2,
    description:
      "The approved loan has been disbursed.",
  },
  COMPLETED: {
    label: "Completed",
    tone: "success",
    icon: CheckCircle2,
    description:
      "This loan has been fully completed.",
  },
  PAID: {
    label: "Paid",
    tone: "success",
    icon: CheckCircle2,
    description:
      "This loan has been fully repaid.",
  },
  REJECTED: {
    label: "Rejected",
    tone: "danger",
    icon: XCircle,
    description:
      "This loan application was not approved.",
  },
  DECLINED: {
    label: "Declined",
    tone: "danger",
    icon: XCircle,
    description:
      "This loan application was declined.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "danger",
    icon: XCircle,
    description:
      "This loan application has been cancelled.",
  },
  DEFAULTED: {
    label: "Defaulted",
    tone: "danger",
    icon: AlertCircle,
    description:
      "This loan has been marked as defaulted.",
  },
  OVERDUE: {
    label: "Overdue",
    tone: "danger",
    icon: AlertCircle,
    description:
      "This loan has an outstanding repayment that is past due.",
  },
};

const TONE_STYLES = {
  success: {
    wrapper:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    icon:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    title: "text-emerald-950 dark:text-emerald-300",
    text: "text-emerald-800 dark:text-emerald-400",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  warning: {
    wrapper:
      "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
    icon:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    title: "text-amber-950 dark:text-amber-300",
    text: "text-amber-800 dark:text-amber-400",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  danger: {
    wrapper:
      "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
    icon:
      "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    title: "text-red-950 dark:text-red-300",
    text: "text-red-800 dark:text-red-400",
    badge:
      "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  },
  neutral: {
    wrapper:
      "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900",
    icon:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    title: "text-slate-950 dark:text-white",
    text: "text-slate-600 dark:text-slate-400",
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

const formatStatus = (value) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDate = (value) => {
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

const formatDateOnly = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const formatMoney = (value, currency = "USD") => {
  const amount = numberOrNull(value);

  if (amount === null) return "—";

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

const formatPercentage = (value) => {
  const number = numberOrNull(value);

  if (number === null) return "—";

  return `${number.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
};

const getLoanStatus = (loan) =>
  String(
    loan?.status ??
      loan?.loanStatus ??
      loan?.applicationStatus ??
      "",
  ).toUpperCase();

const getCurrency = (loan) =>
  loan?.currency?.code ??
  loan?.currencyCode ??
  loan?.currency ??
  "USD";

const getPrincipal = (loan) =>
  numberOrNull(
    loan?.principalAmount ??
      loan?.principal ??
      loan?.approvedAmount ??
      loan?.amount,
  );

const getOutstanding = (loan) =>
  numberOrNull(
    loan?.outstandingBalance ??
      loan?.outstandingPrincipal ??
      loan?.remainingBalance ??
      loan?.balanceOutstanding,
  );

const getPaidAmount = (loan) =>
  numberOrNull(
    loan?.amountPaid ??
      loan?.paidAmount ??
      loan?.totalPaid ??
      loan?.repaidAmount,
  );

const getInterest = (loan) =>
  numberOrNull(
    loan?.interestAmount ??
      loan?.totalInterest ??
      loan?.interest,
  );

const getFees = (loan) =>
  numberOrNull(
    loan?.fees ??
      loan?.feeAmount ??
      loan?.totalFees,
  );

const getTotalRepayable = (loan) =>
  numberOrNull(
    loan?.totalRepayable ??
      loan?.totalRepayment ??
      loan?.repaymentAmount,
  );

const getInterestRate = (loan) =>
  numberOrNull(
    loan?.interestRate ??
      loan?.annualInterestRate ??
      loan?.apr ??
      loan?.rate,
  );

const getTermMonths = (loan) =>
  numberOrNull(
    loan?.termMonths ??
      loan?.term ??
      loan?.durationMonths,
  );

const normalizeLoanResponse = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  const loan =
    root?.loan ??
    root?.application ??
    root?.loanApplication ??
    root?.result ??
    (root?.id || root?.loanId ? root : null);

  return loan;
};

const normalizeSchedule = (loan) => {
  const schedule =
    loan?.repaymentSchedule ??
    loan?.repayment_schedule ??
    loan?.schedule ??
    loan?.installments;

  return Array.isArray(schedule) ? schedule : [];
};

const getInstallmentAmount = (item) =>
  numberOrNull(
    item?.amount ??
      item?.installmentAmount ??
      item?.totalAmount ??
      item?.paymentAmount,
  );

const getInstallmentPrincipal = (item) =>
  numberOrNull(
    item?.principalAmount ??
      item?.principal ??
      item?.principalPortion,
  );

const getInstallmentInterest = (item) =>
  numberOrNull(
    item?.interestAmount ??
      item?.interest ??
      item?.interestPortion,
  );

const getInstallmentPaid = (item) =>
  numberOrNull(
    item?.paidAmount ??
      item?.amountPaid,
  );

const getInstallmentStatus = (item) =>
  String(
    item?.status ??
      item?.paymentStatus ??
      "",
  ).toUpperCase();

const LoanDetails = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const loadLoan = useCallback(async () => {
    if (!loanId) {
      setLoan(null);
      setError("A loan identifier was not provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/loans/${encodeURIComponent(loanId)}`,
      );

      const normalized = normalizeLoanResponse(response?.data);

      if (!normalized) {
        throw new Error("The banking API returned no loan details.");
      }

      setLoan(normalized);
    } catch (requestError) {
      setLoan(null);

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load this loan.",
      );
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    loadLoan();
  }, [loadLoan]);

  const copyValue = async (value, key) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(key);

      window.setTimeout(() => {
        setCopied((current) => (current === key ? "" : current));
      }, 1800);
    } catch {
      setCopied("");
    }
  };

  const status = getLoanStatus(loan);
  const config = STATUS_CONFIG[status];

  const StatusIcon = config?.icon ?? Banknote;
  const tone = config?.tone ?? "neutral";
  const styles = TONE_STYLES[tone];

  const currency = getCurrency(loan);
  const principal = getPrincipal(loan);
  const outstanding = getOutstanding(loan);
  const paid = getPaidAmount(loan);
  const interest = getInterest(loan);
  const fees = getFees(loan);
  const totalRepayable = getTotalRepayable(loan);
  const interestRate = getInterestRate(loan);
  const termMonths = getTermMonths(loan);

  const schedule = useMemo(() => normalizeSchedule(loan), [loan]);

  const calculatedPaid =
    paid !== null
      ? paid
      : principal !== null && outstanding !== null
        ? Math.max(principal - outstanding, 0)
        : null;

  const repaymentProgress =
    principal !== null &&
    outstanding !== null &&
    principal > 0
      ? Math.min(
          Math.max(
            ((principal - outstanding) / principal) * 100,
            0,
          ),
          100,
        )
      : null;

  const applicationReference =
    loan?.reference ??
    loan?.loanReference ??
    loan?.applicationReference ??
    loan?.referenceNumber ??
    "";

  const accountNumber =
    loan?.account?.accountNumber ??
    loan?.accountNumber ??
    loan?.disbursementAccount?.accountNumber ??
    "";

  const accountId =
    loan?.account?.id ??
    loan?.accountId ??
    loan?.disbursementAccount?.id ??
    "";

  const productName =
    loan?.product?.name ??
    loan?.productName ??
    loan?.loanProduct?.name ??
    loan?.loanType ??
    "Loan";

  const purpose =
    loan?.purposeDescription ??
    loan?.purpose ??
    "";

  const nextPayment =
    loan?.nextPayment ??
    loan?.nextRepayment ??
    loan?.nextInstallment ??
    null;

  const nextPaymentAmount = nextPayment
    ? getInstallmentAmount(nextPayment)
    : numberOrNull(
        loan?.nextPaymentAmount ??
          loan?.nextRepaymentAmount,
      );

  const nextPaymentDate = nextPayment
    ? nextPayment?.dueDate ??
      nextPayment?.paymentDate ??
      nextPayment?.date
    : loan?.nextPaymentDate ??
      loan?.nextRepaymentDate ??
      loan?.nextDueDate;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />

          <div className="h-56 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-slate-900 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
              Unable to load loan details
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {error ||
                "The requested loan could not be found or returned by the banking API."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadLoan}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <Link
                to="/loans"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to loans
              </Link>
            </div>
          </section>
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
              to="/loans"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to loans
            </Link>

            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <FileText className="h-4 w-4" />
              Lending
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Loan details
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Review the actual terms, repayment position, status, and
              obligations returned for this loan.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLoan}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Status hero */}
        <section
          className={`rounded-3xl border p-5 sm:p-7 ${styles.wrapper}`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
            >
              <StatusIcon className="h-7 w-7" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={`text-sm font-semibold ${styles.text}`}>
                    {productName}
                  </p>

                  <h2
                    className={`mt-1 text-xl font-bold ${styles.title} sm:text-2xl`}
                  >
                    {config?.label || formatStatus(status)}
                  </h2>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${styles.badge}`}
                >
                  {formatStatus(status)}
                </span>
              </div>

              <p className={`mt-3 max-w-3xl text-sm leading-6 ${styles.text}`}>
                {config?.description ||
                  "Your current loan information is available below."}
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {applicationReference && (
                  <button
                    type="button"
                    onClick={() =>
                      copyValue(applicationReference, "reference")
                    }
                    className={`inline-flex items-center gap-2 text-xs font-bold ${styles.text}`}
                  >
                    <span className="font-normal opacity-80">
                      Reference:
                    </span>

                    <span className="break-all">
                      {applicationReference}
                    </span>

                    {copied === "reference" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}

                {loan?.id && (
                  <button
                    type="button"
                    onClick={() => copyValue(loan.id, "id")}
                    className={`inline-flex items-center gap-2 text-xs font-bold ${styles.text}`}
                  >
                    <span className="font-normal opacity-80">Loan ID:</span>

                    <span className="max-w-[220px] truncate">
                      {loan.id}
                    </span>

                    {copied === "id" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Financial summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <Banknote className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Principal
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {formatMoney(principal, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Wallet className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Outstanding
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {formatMoney(outstanding, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Paid
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {formatMoney(calculatedPaid, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                <Percent className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Interest rate
                </p>

                <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {formatPercentage(interestRate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Repayment progress */}
        {repaymentProgress !== null && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Repayment progress
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Based on the principal and outstanding balance returned by
                  the banking API.
                </p>
              </div>

              <span className="text-lg font-bold text-slate-950 dark:text-white">
                {repaymentProgress.toFixed(1)}%
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${repaymentProgress}%`,
                }}
              />
            </div>

            <div className="mt-3 flex justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Paid: {formatMoney(calculatedPaid, currency)}
              </span>

              <span>
                Remaining: {formatMoney(outstanding, currency)}
              </span>
            </div>
          </section>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {/* Loan terms */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Loan terms
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Terms currently associated with this loan.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Product
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {productName}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Currency
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {currency}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Principal
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {formatMoney(principal, currency)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total repayable
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {formatMoney(totalRepayable, currency)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Interest
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {formatMoney(interest, currency)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Fees
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {formatMoney(fees, currency)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Interest rate
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {formatPercentage(interestRate)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Term
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {termMonths !== null
                      ? `${termMonths} month${
                          termMonths === 1 ? "" : "s"
                        }`
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* Account and purpose */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-3">
                    <Landmark className="h-5 w-5 text-blue-700 dark:text-blue-400" />

                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Linked account
                    </h2>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Account number
                    </p>

                    {accountNumber ? (
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(accountNumber, "account")
                        }
                        className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-left text-sm font-bold text-slate-950 dark:text-white"
                      >
                        {accountNumber}

                        {copied === "account" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                        Not provided
                      </p>
                    )}

                    {accountId && (
                      <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
                        Account ID: {accountId}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-blue-700 dark:text-blue-400" />

                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Loan purpose
                    </h2>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {purpose || "No purpose information was provided."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Dates */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-blue-700 dark:text-blue-400" />

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Important dates
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Dates supplied by the loan record.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Application date
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                    {formatDate(
                      loan?.applicationDate ??
                        loan?.submittedAt ??
                        loan?.createdAt,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Approval date
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                    {formatDate(
                      loan?.approvedAt ??
                        loan?.approvalDate,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Disbursement date
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                    {formatDate(
                      loan?.disbursedAt ??
                        loan?.disbursementDate,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    First payment
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                    {formatDateOnly(
                      loan?.firstPaymentDate ??
                        loan?.firstRepaymentDate,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Maturity date
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                    {formatDateOnly(
                      loan?.maturityDate ??
                        loan?.endDate ??
                        loan?.loanEndDate,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last updated
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                    {formatDate(
                      loan?.updatedAt ??
                        loan?.lastUpdatedAt,
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Repayment schedule */}
            {schedule.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-blue-700 dark:text-blue-400" />

                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Repayment schedule
                    </h2>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Scheduled repayments returned by the banking API.
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400 md:grid">
                    <span>Due date</span>
                    <span>Amount</span>
                    <span>Principal</span>
                    <span>Interest</span>
                    <span>Status</span>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {schedule.map((item, index) => {
                      const installmentStatus =
                        getInstallmentStatus(item);

                      const installmentStyles =
                        ["PAID", "COMPLETED", "SETTLED"].includes(
                          installmentStatus,
                        )
                          ? "text-emerald-700 dark:text-emerald-400"
                          : ["OVERDUE", "FAILED"].includes(
                                installmentStatus,
                              )
                            ? "text-red-700 dark:text-red-400"
                            : "text-slate-700 dark:text-slate-300";

                      return (
                        <div
                          key={
                            item?.id ??
                            item?.installmentId ??
                            `${item?.dueDate ?? "installment"}-${index}`
                          }
                          className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_1fr_1fr] md:items-center md:gap-4"
                        >
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:hidden">
                              Due date
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white md:mt-0">
                              {formatDateOnly(
                                item?.dueDate ??
                                  item?.paymentDate ??
                                  item?.date,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:hidden">
                              Amount
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white md:mt-0">
                              {formatMoney(
                                getInstallmentAmount(item),
                                currency,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:hidden">
                              Principal
                            </p>

                            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 md:mt-0">
                              {formatMoney(
                                getInstallmentPrincipal(item),
                                currency,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:hidden">
                              Interest
                            </p>

                            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 md:mt-0">
                              {formatMoney(
                                getInstallmentInterest(item),
                                currency,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 md:hidden">
                              Status
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 md:mt-0">
                              <span
                                className={`text-sm font-bold ${installmentStyles}`}
                              >
                                {formatStatus(
                                  installmentStatus,
                                )}
                              </span>

                              {getInstallmentPaid(item) !== null && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Paid{" "}
                                  {formatMoney(
                                    getInstallmentPaid(item),
                                    currency,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24">
            {/* Next payment */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Next payment
                  </p>

                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Repayment
                  </h2>
                </div>
              </div>

              {nextPaymentAmount !== null || nextPaymentDate ? (
                <div className="mt-5">
                  {nextPaymentAmount !== null && (
                    <p className="text-2xl font-bold text-slate-950 dark:text-white">
                      {formatMoney(
                        nextPaymentAmount,
                        currency,
                      )}
                    </p>
                  )}

                  {nextPaymentDate && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Due {formatDateOnly(nextPaymentDate)}
                    </p>
                  )}

                  {nextPayment?.status && (
                    <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {formatStatus(nextPayment.status)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                    No upcoming repayment information was supplied by the
                    banking API.
                  </p>
                </div>
              )}
            </section>

            {/* Financial totals */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Financial summary
              </h2>

              <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Principal
                  </span>

                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    {formatMoney(principal, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Interest
                  </span>

                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    {formatMoney(interest, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Fees
                  </span>

                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    {formatMoney(fees, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Total repayable
                  </span>

                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    {formatMoney(totalRepayable, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Outstanding
                  </span>

                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    {formatMoney(outstanding, currency)}
                  </span>
                </div>
              </div>
            </section>

            {/* Loan dates */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Loan dates
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Submitted
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                    {formatDate(
                      loan?.submittedAt ??
                        loan?.applicationDate ??
                        loan?.createdAt,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Maturity
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                    {formatDateOnly(
                      loan?.maturityDate ??
                        loan?.endDate,
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Actions */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="space-y-3">
                <Link
                  to="/loans"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  All loans
                </Link>

                {status === "ACTIVE" &&
                  loan?.repaymentEnabled === true && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/loans/${encodeURIComponent(
                            loanId,
                          )}/repay`,
                        )
                      }
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      Make repayment
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
              </div>
            </section>

            {/* Security */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />

                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white">
                    Secure banking information
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Loan information is displayed from your authenticated
                    banking session. Never share passwords, OTPs, card PINs,
                    or security codes.
                  </p>
                </div>
              </div>
            </section>

            {/* Review note */}
            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                <div>
                  <h3 className="font-bold text-blue-950 dark:text-blue-300">
                    Official loan record
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-blue-800 dark:text-blue-400">
                    Amounts, rates, balances, dates, and repayment information
                    shown on this page are taken from the loan record returned
                    by Epex Bank.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LoanDetails;