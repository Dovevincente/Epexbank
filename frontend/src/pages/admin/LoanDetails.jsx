import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const getLoan = (payload) => {
  if (!payload) return null;

  if (payload?.loan) return payload.loan;
  if (payload?.data?.loan) return payload.data.loan;
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;

  return payload;
};

const getBorrower = (loan) =>
  loan?.user ||
  loan?.customer ||
  loan?.borrower ||
  loan?.applicant ||
  {};

const getBorrowerName = (loan) => {
  const borrower = getBorrower(loan);

  return (
    borrower?.name ||
    borrower?.fullName ||
    [borrower?.firstName, borrower?.lastName].filter(Boolean).join(" ") ||
    loan?.borrowerName ||
    loan?.customerName ||
    "Customer"
  );
};

const getBorrowerEmail = (loan) => {
  const borrower = getBorrower(loan);

  return borrower?.email || loan?.email || loan?.customerEmail || "—";
};

const getLoanId = (loan) =>
  loan?.id ||
  loan?.loanId ||
  loan?.applicationId ||
  loan?.reference ||
  "";

const getStatus = (loan) =>
  String(
    loan?.status ||
      loan?.loanStatus ||
      loan?.applicationStatus ||
      "PENDING",
  )
    .trim()
    .toUpperCase();

const normalizeStatus = (status) => {
  const value = String(status ?? "")
    .trim()
    .toUpperCase();

  if (
    value === "SUBMITTED" ||
    value === "PENDING_REVIEW" ||
    value === "AWAITING_REVIEW"
  ) {
    return "PENDING";
  }

  if (
    value === "REVIEWING" ||
    value === "UNDER_REVIEW" ||
    value === "PROCESSING"
  ) {
    return "IN_REVIEW";
  }

  if (
    value === "APPROVED" ||
    value === "ACTIVE" ||
    value === "DISBURSED"
  ) {
    return value;
  }

  if (
    value === "DECLINED" ||
    value === "DENIED" ||
    value === "REJECTED"
  ) {
    return "REJECTED";
  }

  if (value === "COMPLETED" || value === "PAID") {
    return "COMPLETED";
  }

  if (value === "OVERDUE" || value === "DEFAULTED") {
    return value;
  }

  return value || "PENDING";
};

const getStatusMeta = (status) => {
  switch (normalizeStatus(status)) {
    case "APPROVED":
    case "ACTIVE":
    case "DISBURSED":
      return {
        label:
          normalizeStatus(status) === "DISBURSED"
            ? "Disbursed"
            : normalizeStatus(status) === "ACTIVE"
              ? "Active"
              : "Approved",
        icon: CheckCircle2,
        className:
          "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      };

    case "COMPLETED":
      return {
        label: "Completed",
        icon: CheckCircle2,
        className:
          "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
      };

    case "REJECTED":
      return {
        label: "Rejected",
        icon: XCircle,
        className:
          "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      };

    case "OVERDUE":
    case "DEFAULTED":
      return {
        label:
          normalizeStatus(status) === "DEFAULTED" ? "Defaulted" : "Overdue",
        icon: AlertCircle,
        className:
          "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      };

    case "IN_REVIEW":
      return {
        label: "In review",
        icon: FileText,
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

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value, currency = "USD") => {
  const amount = toNumber(value);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
};

const formatNumber = (value) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
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

const formatDateOnly = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const getCurrency = (loan) =>
  loan?.currency?.code ||
  loan?.currencyCode ||
  loan?.currency ||
  getBorrower(loan)?.currency?.code ||
  "USD";

const getPrincipal = (loan) =>
  loan?.principalAmount ??
  loan?.amount ??
  loan?.requestedAmount ??
  loan?.loanAmount ??
  0;

const getOutstanding = (loan) =>
  loan?.outstandingBalance ??
  loan?.outstandingAmount ??
  loan?.remainingBalance ??
  loan?.remainingAmount ??
  loan?.balance ??
  0;

const getPaidAmount = (loan) =>
  loan?.paidAmount ??
  loan?.amountPaid ??
  loan?.repaidAmount ??
  loan?.totalRepaid ??
  0;

const getInterestAmount = (loan) =>
  loan?.interestAmount ??
  loan?.totalInterest ??
  loan?.interest ??
  0;

const getFeeAmount = (loan) =>
  loan?.feeAmount ??
  loan?.processingFee ??
  loan?.originationFee ??
  loan?.fees ??
  0;

const getTotalRepayable = (loan) =>
  loan?.totalRepayable ??
  loan?.repaymentAmount ??
  loan?.totalRepayment ??
  null;

const getInterestRate = (loan) =>
  loan?.interestRate ??
  loan?.annualInterestRate ??
  loan?.rate ??
  null;

const getTerm = (loan) =>
  loan?.termMonths ??
  loan?.durationMonths ??
  loan?.tenureMonths ??
  loan?.term ??
  loan?.duration ??
  null;

const getPurpose = (loan) =>
  loan?.purpose ||
  loan?.loanPurpose ||
  loan?.reason ||
  loan?.description ||
  "—";

const getApplicationDate = (loan) =>
  loan?.applicationDate ||
  loan?.submittedAt ||
  loan?.createdAt ||
  loan?.appliedAt ||
  null;

const getApprovalDate = (loan) =>
  loan?.approvedAt ||
  loan?.approvalDate ||
  loan?.reviewedAt ||
  null;

const getDisbursementDate = (loan) =>
  loan?.disbursedAt ||
  loan?.disbursementDate ||
  null;

const getDueDate = (loan) =>
  loan?.dueDate ||
  loan?.maturityDate ||
  loan?.repaymentDueDate ||
  null;

const getAccount = (loan) =>
  loan?.account ||
  loan?.debitAccount ||
  loan?.customerAccount ||
  {};

const getAccountNumber = (loan) =>
  getAccount(loan)?.accountNumber ||
  loan?.accountNumber ||
  loan?.debitAccountNumber ||
  "—";

const getProgress = (loan) => {
  const principal = toNumber(getPrincipal(loan));
  const outstanding = toNumber(getOutstanding(loan));
  const paid = toNumber(getPaidAmount(loan));

  if (principal <= 0) return 0;

  if (paid > 0) {
    return Math.min(100, Math.max(0, (paid / principal) * 100));
  }

  if (outstanding >= 0 && outstanding < principal) {
    return Math.min(
      100,
      Math.max(0, ((principal - outstanding) / principal) * 100),
    );
  }

  return 0;
};

const DetailRow = ({ label, value, mono = false }) => (
  <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd
      className={`break-all text-sm font-semibold text-slate-900 sm:text-right ${
        mono ? "font-mono" : ""
      }`}
    >
      {value || "—"}
    </dd>
  </div>
);

const AdminLoanDetails = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const loadLoan = useCallback(
    async ({ refresh = false } = {}) => {
      if (!loanId) {
        setError("No loan identifier was provided.");
        setLoading(false);
        return;
      }

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.get(
          `/admin/loans/${encodeURIComponent(loanId)}`,
        );

        const record = getLoan(response?.data);

        if (!record) {
          throw new Error("The loan record was not returned by the server.");
        }

        setLoan(record);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load the loan details.";

        setError(message);
        setLoan(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loanId],
  );

  useEffect(() => {
    loadLoan();
  }, [loadLoan]);

  const currency = useMemo(() => getCurrency(loan), [loan]);

  const statusMeta = useMemo(
    () => getStatusMeta(loan?.status || loan?.loanStatus),
    [loan],
  );

  const StatusIcon = statusMeta.icon;

  const principal = toNumber(getPrincipal(loan));
  const outstanding = toNumber(getOutstanding(loan));
  const paid = toNumber(getPaidAmount(loan));
  const interest = toNumber(getInterestAmount(loan));
  const fees = toNumber(getFeeAmount(loan));

  const totalRepayable = getTotalRepayable(loan);

  const progress = getProgress(loan);

  const copyValue = async (label, value) => {
    if (!value || value === "—") return;

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(label);

      window.setTimeout(() => {
        setCopied("");
      }, 1800);
    } catch {
      setCopied("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-44 animate-pulse rounded-2xl bg-white shadow-sm" />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
          <button
            type="button"
            onClick={() => navigate("/admin/loans")}
            className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to loans
          </button>

          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Unable to load loan
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error || "The requested loan could not be found."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadLoan()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/loans")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to loans
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate("/admin/loans")}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to loans
          </button>

          <button
            type="button"
            onClick={() => loadLoan({ refresh: true })}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <CreditCard className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Loan application
                  </p>

                  <h1 className="mt-1 break-all text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {getLoanId(loan) || "Loan Details"}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusMeta.label}
                    </span>

                    {getLoanId(loan) && (
                      <button
                        type="button"
                        onClick={() =>
                          copyValue("loanId", getLoanId(loan))
                        }
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied === "loanId" ? "Copied" : "Copy ID"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 lg:min-w-64">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Borrower
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {getBorrowerName(loan)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {getBorrowerEmail(loan)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">
                  Principal
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(principal, currency)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">
                  Outstanding
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(outstanding, currency)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">
                  Amount paid
                </p>
                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {formatMoney(paid, currency)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">
                  Repayment progress
                </p>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">
                      {formatNumber(progress)}%
                    </span>
                    <span className="text-slate-700">
                      {formatMoney(paid, currency)}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, progress))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Loan information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Application terms and financial details returned by the
                    banking system.
                  </p>
                </div>
              </div>
            </div>

            <dl className="divide-y divide-slate-100 px-5 sm:px-6">
              <DetailRow label="Loan type" value={loan?.type || loan?.loanType} />
              <DetailRow label="Purpose" value={getPurpose(loan)} />
              <DetailRow
                label="Currency"
                value={`${currency}${
                  loan?.currency?.name ? ` — ${loan.currency.name}` : ""
                }`}
              />
              <DetailRow
                label="Interest rate"
                value={
                  getInterestRate(loan) !== null
                    ? `${formatNumber(getInterestRate(loan))}%`
                    : "—"
                }
              />
              <DetailRow
                label="Term"
                value={
                  getTerm(loan) !== null
                    ? `${formatNumber(getTerm(loan))} ${
                        Number(getTerm(loan)) === 1 ? "month" : "months"
                      }`
                    : "—"
                }
              />
              <DetailRow
                label="Principal amount"
                value={formatMoney(principal, currency)}
              />
              <DetailRow
                label="Interest amount"
                value={formatMoney(interest, currency)}
              />
              <DetailRow
                label="Processing / other fees"
                value={formatMoney(fees, currency)}
              />
              <DetailRow
                label="Total repayable"
                value={
                  totalRepayable !== null
                    ? formatMoney(totalRepayable, currency)
                    : "—"
                }
              />
              <DetailRow
                label="Outstanding balance"
                value={formatMoney(outstanding, currency)}
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Loan timeline
                  </h2>
                  <p className="text-xs text-slate-500">
                    Important application and repayment dates.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <FileText className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Application submitted
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(getApplicationDate(loan))}
                  </p>
                </div>
              </div>

              <div className="ml-4 h-5 border-l border-dashed border-slate-200" />

              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Reviewed / approved
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(getApprovalDate(loan))}
                  </p>
                </div>
              </div>

              <div className="ml-4 h-5 border-l border-dashed border-slate-200" />

              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <CreditCard className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Disbursed
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(getDisbursementDate(loan))}
                  </p>
                </div>
              </div>

              <div className="ml-4 h-5 border-l border-dashed border-slate-200" />

              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <CalendarDays className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Repayment due
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateOnly(getDueDate(loan))}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Borrower information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Customer information associated with this loan.
                  </p>
                </div>
              </div>
            </div>

            <dl className="divide-y divide-slate-100 px-5 sm:px-6">
              <DetailRow label="Name" value={getBorrowerName(loan)} />
              <DetailRow label="Email" value={getBorrowerEmail(loan)} />
              <DetailRow
                label="Phone"
                value={getBorrower(loan)?.phone || loan?.phone}
              />
              <DetailRow
                label="Customer ID"
                value={
                  getBorrower(loan)?.id ||
                  loan?.userId ||
                  loan?.customerId ||
                  "—"
                }
                mono
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Linked account
                  </h2>
                  <p className="text-xs text-slate-500">
                    Account associated with loan repayment or disbursement.
                  </p>
                </div>
              </div>
            </div>

            <dl className="divide-y divide-slate-100 px-5 sm:px-6">
              <DetailRow
                label="Account number"
                value={getAccountNumber(loan)}
                mono
              />
              <DetailRow
                label="Account type"
                value={
                  getAccount(loan)?.type ||
                  getAccount(loan)?.accountType ||
                  "—"
                }
              />
              <DetailRow
                label="Account currency"
                value={
                  getAccount(loan)?.currency?.code ||
                  getAccount(loan)?.currencyCode ||
                  currency
                }
              />
              <DetailRow
                label="Account status"
                value={getAccount(loan)?.status || "—"}
              />
            </dl>
          </section>
        </div>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Administrative review
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Loan decisions, disbursements, repayment adjustments and other
                financial actions must be performed through authorized
                server-side workflows with appropriate audit controls.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/admin/loans"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to loan applications
          </Link>

          <p className="text-center text-xs text-slate-400 sm:text-right">
            Last record update: {formatDate(loan?.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoanDetails;