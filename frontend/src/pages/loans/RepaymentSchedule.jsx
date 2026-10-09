import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "UPCOMING",
  "DUE",
  "PROCESSING",
  "PAID",
  "COMPLETED",
  "SETTLED",
  "OVERDUE",
  "MISSED",
  "FAILED",
  "CANCELLED",
];

const STATUS_CONFIG = {
  PAID: {
    label: "Paid",
    tone: "success",
    icon: CheckCircle2,
  },
  COMPLETED: {
    label: "Completed",
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
  UPCOMING: {
    label: "Upcoming",
    tone: "warning",
    icon: CalendarDays,
  },
  DUE: {
    label: "Due",
    tone: "warning",
    icon: Clock3,
  },
  PROCESSING: {
    label: "Processing",
    tone: "warning",
    icon: Clock3,
  },
  OVERDUE: {
    label: "Overdue",
    tone: "danger",
    icon: AlertCircle,
  },
  MISSED: {
    label: "Missed",
    tone: "danger",
    icon: AlertCircle,
  },
  FAILED: {
    label: "Failed",
    tone: "danger",
    icon: XCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "neutral",
    icon: XCircle,
  },
};

const TONE_STYLES = {
  success: {
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    icon:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  warning: {
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    icon:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  danger: {
    badge:
      "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
    icon:
      "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  neutral: {
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

const normalizeList = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  if (Array.isArray(root)) return root;

  const keys = [
    "schedule",
    "repaymentSchedule",
    "repayments",
    "installments",
    "items",
    "results",
    "records",
  ];

  for (const key of keys) {
    if (Array.isArray(root?.[key])) {
      return root[key];
    }
  }

  return [];
};

const getScheduleId = (item, index) =>
  item?.id ??
  item?.installmentId ??
  item?.repaymentId ??
  `repayment-${index}`;

const getLoanId = (item) =>
  item?.loan?.id ??
  item?.loanId ??
  item?.loanApplicationId ??
  "";

const getLoanName = (item) =>
  item?.loan?.product?.name ??
  item?.loan?.productName ??
  item?.product?.name ??
  item?.loanProduct?.name ??
  item?.loanType ??
  "Loan repayment";

const getCurrency = (item) =>
  item?.currency?.code ??
  item?.currencyCode ??
  item?.loan?.currency?.code ??
  item?.loan?.currencyCode ??
  item?.currency ??
  "USD";

const getAmount = (item) => {
  const value =
    item?.amount ??
    item?.installmentAmount ??
    item?.totalAmount ??
    item?.paymentAmount ??
    item?.scheduledAmount;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getPrincipal = (item) => {
  const value =
    item?.principalAmount ??
    item?.principal ??
    item?.principalPortion;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getInterest = (item) => {
  const value =
    item?.interestAmount ??
    item?.interest ??
    item?.interestPortion;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getFees = (item) => {
  const value =
    item?.feeAmount ??
    item?.fees ??
    item?.feesAmount;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getPaidAmount = (item) => {
  const value =
    item?.paidAmount ??
    item?.amountPaid ??
    item?.totalPaid;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getRemainingAmount = (item) => {
  const value =
    item?.remainingAmount ??
    item?.outstandingAmount ??
    item?.balanceRemaining;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getStatus = (item) =>
  String(
    item?.status ??
      item?.paymentStatus ??
      item?.repaymentStatus ??
      "",
  ).toUpperCase();

const getDueDate = (item) =>
  item?.dueDate ??
  item?.paymentDate ??
  item?.scheduledDate ??
  item?.date ??
  null;

const getPaidDate = (item) =>
  item?.paidAt ??
  item?.paymentCompletedAt ??
  item?.completedAt ??
  item?.settledAt ??
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

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

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
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const RepaymentSchedule = () => {
  const [searchParams] = useSearchParams();

  const loanId =
    searchParams.get("loanId") ||
    searchParams.get("loan") ||
    "";

  const [schedule, setSchedule] = useState([]);
  const [loan, setLoan] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let scheduleResponse;

      if (loanId) {
        scheduleResponse = await api.get(
          `/loans/${encodeURIComponent(loanId)}/repayment-schedule`,
        );

        const root =
          scheduleResponse?.data?.data ??
          scheduleResponse?.data ??
          {};

        setLoan(root?.loan ?? null);
        setSchedule(normalizeList(scheduleResponse?.data));

        return;
      }

      scheduleResponse = await api.get(
        "/loans/repayments/schedule",
      );

      const root =
        scheduleResponse?.data?.data ??
        scheduleResponse?.data ??
        {};

      setLoan(root?.loan ?? null);
      setSchedule(normalizeList(scheduleResponse?.data));
    } catch (requestError) {
      const status = requestError?.response?.status;

      /*
       * Some banking API implementations expose repayment schedules
       * through the loan details endpoint instead. If the dedicated
       * schedule endpoint is unavailable and a loanId was supplied,
       * make one authenticated fallback request to the loan record.
       */
      if (loanId && [404, 501].includes(status)) {
        try {
          const loanResponse = await api.get(
            `/loans/${encodeURIComponent(loanId)}`,
          );

          const root =
            loanResponse?.data?.data ??
            loanResponse?.data ??
            {};

          const loanRecord =
            root?.loan ??
            root?.application ??
            root?.loanApplication ??
            root;

          const fallbackSchedule =
            loanRecord?.repaymentSchedule ??
            loanRecord?.repayment_schedule ??
            loanRecord?.schedule ??
            loanRecord?.installments;

          if (Array.isArray(fallbackSchedule)) {
            setLoan(loanRecord);
            setSchedule(fallbackSchedule);
            setError("");
            return;
          }

          setLoan(loanRecord);
          setSchedule([]);
          setError(
            "This loan record does not currently include a repayment schedule.",
          );
          return;
        } catch (fallbackError) {
          setSchedule([]);
          setLoan(null);
          setError(
            fallbackError?.response?.data?.message ||
              fallbackError?.message ||
              "Unable to load the repayment schedule.",
          );
          return;
        }
      }

      setSchedule([]);
      setLoan(null);

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load the repayment schedule.",
      );
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const filteredSchedule = useMemo(() => {
    const query = search.trim().toLowerCase();

    return schedule.filter((item) => {
      const status = getStatus(item);

      if (
        statusFilter !== "ALL" &&
        status !== statusFilter
      ) {
        return false;
      }

      if (!query) return true;

      const searchable = [
        getScheduleId(item),
        getLoanId(item),
        getLoanName(item),
        item?.reference,
        item?.repaymentReference,
        item?.installmentNumber,
        item?.sequence,
        getStatus(item),
        getDueDate(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [schedule, search, statusFilter]);

  const summary = useMemo(() => {
    const paidStatuses = [
      "PAID",
      "COMPLETED",
      "SETTLED",
    ];

    const overdueStatuses = [
      "OVERDUE",
      "MISSED",
      "FAILED",
    ];

    const pendingStatuses = [
      "PENDING",
      "UPCOMING",
      "DUE",
      "PROCESSING",
    ];

    const paid = schedule.filter((item) =>
      paidStatuses.includes(getStatus(item)),
    );

    const overdue = schedule.filter((item) =>
      overdueStatuses.includes(getStatus(item)),
    );

    const pending = schedule.filter((item) =>
      pendingStatuses.includes(getStatus(item)),
    );

    const totalScheduled = schedule.reduce(
      (total, item) => {
        const amount = getAmount(item);

        return amount === null ? total : total + amount;
      },
      0,
    );

    const totalPaid = schedule.reduce(
      (total, item) => {
        const paidAmount = getPaidAmount(item);

        if (paidAmount !== null) {
          return total + paidAmount;
        }

        if (
          ["PAID", "COMPLETED", "SETTLED"].includes(
            getStatus(item),
          )
        ) {
          const amount = getAmount(item);

          return amount === null ? total : total + amount;
        }

        return total;
      },
      0,
    );

    const totalRemaining = schedule.reduce(
      (total, item) => {
        const remaining = getRemainingAmount(item);

        if (remaining !== null) {
          return total + remaining;
        }

        const amount = getAmount(item);
        const paidAmount = getPaidAmount(item);

        if (amount === null) return total;

        return (
          total +
          Math.max(
            amount - (paidAmount ?? 0),
            0,
          )
        );
      },
      0,
    );

    return {
      total: schedule.length,
      paid: paid.length,
      pending: pending.length,
      overdue: overdue.length,
      totalScheduled,
      totalPaid,
      totalRemaining,
    };
  }, [schedule]);

  const currency =
    loan?.currency?.code ??
    loan?.currencyCode ??
    loan?.currency ??
    (schedule.length > 0
      ? getCurrency(schedule[0])
      : "USD");

  const loanName =
    loan?.product?.name ??
    loan?.productName ??
    loan?.loanProduct?.name ??
    loan?.loanType ??
    (loanId ? "Loan repayment schedule" : "Repayment schedule");

  const loanReference =
    loan?.reference ??
    loan?.loanReference ??
    loan?.applicationReference ??
    "";

  const activeLoanId =
    loan?.id ??
    loan?.loanId ??
    loanId ??
    (schedule.length > 0
      ? getLoanId(schedule[0])
      : "");

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to={
                activeLoanId
                  ? `/loans/${encodeURIComponent(
                      String(activeLoanId),
                    )}`
                  : "/loans"
              }
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <ArrowLeft className="h-4 w-4" />
              {activeLoanId
                ? "Back to loan"
                : "Back to loans"}
            </Link>

            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <CalendarDays className="h-4 w-4" />
              Lending
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Repayment schedule
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Review scheduled loan repayments, due dates, payment status,
              principal, interest, and remaining obligations.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSchedule}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {/* Loan context */}
        {(loanId || loanReference || loanName) && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  <Banknote className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Loan
                  </p>

                  <h2 className="truncate text-lg font-bold text-slate-950 dark:text-white">
                    {loanName}
                  </h2>

                  {loanReference && (
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      Reference: {loanReference}
                    </p>
                  )}
                </div>
              </div>

              {activeLoanId && (
                <Link
                  to={`/loans/${encodeURIComponent(
                    String(activeLoanId),
                  )}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Loan details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Error */}
        {error && !loading && (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

              <div>
                <h2 className="font-bold text-red-950 dark:text-red-300">
                  Repayment schedule unavailable
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Installments
                </p>

                <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {loading ? "—" : summary.total}
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

                <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {loading ? "—" : summary.paid}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Pending
                </p>

                <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {loading ? "—" : summary.pending}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Overdue
                </p>

                <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {loading ? "—" : summary.overdue}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                <Wallet className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Scheduled value
                </p>

                <p className="mt-1 truncate text-lg font-bold text-slate-950 dark:text-white">
                  {loading
                    ? "—"
                    : formatMoney(
                        summary.totalScheduled,
                        currency,
                      )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />

            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading repayment schedule...
            </p>
          </section>
        ) : schedule.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />

            <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
              No repayment schedule available
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              The banking API did not return any scheduled repayments for this
              loan. No installment information has been created or estimated
              by this page.
            </p>

            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadSchedule}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <Link
                to={
                  activeLoanId
                    ? `/loans/${encodeURIComponent(
                        String(activeLoanId),
                      )}`
                    : "/loans"
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Filters */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search installments, references or status..."
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "ALL"
                        ? "All statuses"
                        : formatStatus(status)}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Desktop table */}
            <section className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Due date
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Amount
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Principal
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Interest
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Paid
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Loan
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredSchedule.map((item, index) => {
                      const status = getStatus(item);

                      const config =
                        STATUS_CONFIG[status] ?? {
                          label: formatStatus(status),
                          tone: "neutral",
                          icon: FileText,
                        };

                      const StatusIcon = config.icon;

                      const styles =
                        TONE_STYLES[config.tone] ??
                        TONE_STYLES.neutral;

                      const itemCurrency =
                        getCurrency(item);

                      const itemLoanId =
                        getLoanId(item);

                      return (
                        <tr
                          key={String(
                            getScheduleId(item, index),
                          )}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-950/40"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-xl ${styles.icon}`}
                              >
                                <StatusIcon className="h-4 w-4" />
                              </div>

                              <div>
                                <p className="text-sm font-bold text-slate-950 dark:text-white">
                                  {formatDate(
                                    getDueDate(item),
                                  )}
                                </p>

                                {item?.installmentNumber !==
                                  undefined && (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Installment{" "}
                                    {
                                      item.installmentNumber
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-950 dark:text-white">
                              {formatMoney(
                                getAmount(item),
                                itemCurrency,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {formatMoney(
                                getPrincipal(item),
                                itemCurrency,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {formatMoney(
                                getInterest(item),
                                itemCurrency,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-950 dark:text-white">
                              {formatMoney(
                                getPaidAmount(item),
                                itemCurrency,
                              )}
                            </p>

                            {getPaidDate(item) && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(
                                  getPaidDate(item),
                                )}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-bold ${styles.badge}`}
                            >
                              {config.label}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            {itemLoanId ? (
                              <Link
                                to={`/loans/${encodeURIComponent(
                                  String(itemLoanId),
                                )}`}
                                className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline dark:text-blue-400"
                              >
                                View
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
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Mobile cards */}
            <section className="grid gap-4 lg:hidden">
              {filteredSchedule.map((item, index) => {
                const status = getStatus(item);

                const config =
                  STATUS_CONFIG[status] ?? {
                    label: formatStatus(status),
                    tone: "neutral",
                    icon: FileText,
                  };

                const StatusIcon = config.icon;

                const styles =
                  TONE_STYLES[config.tone] ??
                  TONE_STYLES.neutral;

                const itemCurrency = getCurrency(item);
                const itemLoanId = getLoanId(item);

                return (
                  <article
                    key={String(
                      getScheduleId(item, index),
                    )}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                        >
                          <StatusIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Due date
                          </p>

                          <h3 className="mt-1 font-bold text-slate-950 dark:text-white">
                            {formatDate(
                              getDueDate(item),
                            )}
                          </h3>

                          {item?.installmentNumber !==
                            undefined && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Installment{" "}
                              {item.installmentNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold ${styles.badge}`}
                      >
                        {config.label}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Amount
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {formatMoney(
                            getAmount(item),
                            itemCurrency,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Paid
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {formatMoney(
                            getPaidAmount(item),
                            itemCurrency,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Principal
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {formatMoney(
                            getPrincipal(item),
                            itemCurrency,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Interest
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {formatMoney(
                            getInterest(item),
                            itemCurrency,
                          )}
                        </p>
                      </div>
                    </div>

                    {getPaidDate(item) && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Paid on {formatDateTime(getPaidDate(item))}
                      </div>
                    )}

                    {itemLoanId && (
                      <Link
                        to={`/loans/${encodeURIComponent(
                          String(itemLoanId),
                        )}`}
                        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        View loan
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </article>
                );
              })}
            </section>

            {/* No filtered results */}
            {filteredSchedule.length === 0 && (
              <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <Search className="mx-auto h-9 w-9 text-slate-400" />

                <h2 className="mt-4 font-bold text-slate-950 dark:text-white">
                  No matching repayments
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Try another search term or change the status filter.
                </p>
              </section>
            )}
          </>
        )}

        {/* Totals */}
        {!loading && schedule.length > 0 && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Scheduled
              </p>

              <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                {formatMoney(
                  summary.totalScheduled,
                  currency,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Total scheduled repayment value returned by the API.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Paid
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatMoney(
                  summary.totalPaid,
                  currency,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Amount explicitly reported as paid or settled.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Remaining
              </p>

              <p className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-400">
                {formatMoney(
                  summary.totalRemaining,
                  currency,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Remaining amount when supplied or calculable from the schedule.
              </p>
            </div>
          </section>
        )}

        {/* Information */}
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <CalendarDays className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
              Due dates
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Scheduled dates are displayed exactly from the repayment data
              returned by the banking system.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
              <Info className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
              Repayment amounts
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Principal, interest, fees, paid amounts, and remaining balances
              are shown only when supplied by the API.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
              Secure banking
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Keep your Epex Bank password, OTP, PIN, and other authentication
              credentials private.
            </p>
          </div>
        </section>

        {/* Security note */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />

            <div>
              <h3 className="font-bold text-slate-950 dark:text-white">
                Official repayment record
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                This page does not generate estimated installment dates or
                amounts. It displays the authenticated repayment schedule
                returned by Epex Bank.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RepaymentSchedule;