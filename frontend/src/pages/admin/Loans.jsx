import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "APPROVED", label: "Approved" },
  { value: "ACTIVE", label: "Active" },
  { value: "DISBURSED", label: "Disbursed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DEFAULTED", label: "Defaulted" },
];

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.loans)) return payload.loans;
  if (Array.isArray(payload?.applications)) return payload.applications;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;

  if (Array.isArray(payload?.data?.loans)) return payload.data.loans;
  if (Array.isArray(payload?.data?.applications)) {
    return payload.data.applications;
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
    status === "PENDING_REVIEW" ||
    status === "AWAITING_REVIEW"
  ) {
    return "PENDING";
  }

  if (
    status === "REVIEWING" ||
    status === "UNDER_REVIEW" ||
    status === "PROCESSING"
  ) {
    return "IN_REVIEW";
  }

  if (status === "VERIFIED") return "APPROVED";
  if (status === "DECLINED" || status === "DENIED") return "REJECTED";
  if (status === "PAID") return "COMPLETED";

  return status || "PENDING";
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
    [borrower?.firstName, borrower?.lastName]
      .filter(Boolean)
      .join(" ") ||
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

const getLoanType = (loan) =>
  loan?.type ||
  loan?.loanType ||
  loan?.product?.name ||
  loan?.productName ||
  "Loan";

const getCurrency = (loan) =>
  loan?.currency?.code ||
  loan?.currencyCode ||
  loan?.currency ||
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

const getSubmittedAt = (loan) =>
  loan?.submittedAt ||
  loan?.applicationDate ||
  loan?.appliedAt ||
  loan?.createdAt ||
  null;

const getUpdatedAt = (loan) =>
  loan?.updatedAt ||
  loan?.reviewedAt ||
  loan?.modifiedAt ||
  null;

const getDueDate = (loan) =>
  loan?.dueDate ||
  loan?.maturityDate ||
  loan?.repaymentDueDate ||
  null;

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
    case "APPROVED":
    case "ACTIVE":
    case "DISBURSED":
      return {
        label:
          normalizeStatus(status) === "ACTIVE"
            ? "Active"
            : normalizeStatus(status) === "DISBURSED"
              ? "Disbursed"
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
          normalizeStatus(status) === "DEFAULTED"
            ? "Defaulted"
            : "Overdue",
        icon: AlertCircle,
        className:
          "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      };

    case "IN_REVIEW":
      return {
        label: "In review",
        icon: Eye,
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

const AdminLoans = () => {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(null);

  const loadLoans = useCallback(
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

        if (cursor) {
          params.cursor = cursor;
        }

        const trimmedSearch = search.trim();

        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        const response = await api.get("/admin/loans", { params });
        const payload = response?.data;

        const incomingLoans = normalizeCollection(payload);
        const pagination = getPagination(payload);

        setLoans((current) =>
          append ? [...current, ...incomingLoans] : incomingLoans,
        );

        setNextCursor(pagination.nextCursor);
        setHasNextPage(
          Boolean(
            pagination.hasNextPage ||
              pagination.nextCursor ||
              incomingLoans.length === PAGE_SIZE,
          ),
        );
        setTotal(pagination.total);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load loan applications.";

        setError(message);

        if (!append) {
          setLoans([]);
          setNextCursor(null);
          setHasNextPage(false);
          setTotal(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLoans();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadLoans]);

  const summary = useMemo(() => {
    return loans.reduce(
      (result, loan) => {
        const normalizedStatus = normalizeStatus(
          loan?.status || loan?.loanStatus,
        );

        const principal = toNumber(getPrincipal(loan));
        const outstanding = toNumber(getOutstanding(loan));

        result.total += 1;
        result.requested += principal;
        result.outstanding += outstanding;

        if (normalizedStatus === "PENDING") {
          result.pending += 1;
        }

        if (normalizedStatus === "IN_REVIEW") {
          result.inReview += 1;
        }

        if (
          normalizedStatus === "APPROVED" ||
          normalizedStatus === "ACTIVE" ||
          normalizedStatus === "DISBURSED"
        ) {
          result.approved += 1;
        }

        if (
          normalizedStatus === "OVERDUE" ||
          normalizedStatus === "DEFAULTED"
        ) {
          result.overdue += 1;
        }

        if (normalizedStatus === "COMPLETED") {
          result.completed += 1;
        }

        return result;
      },
      {
        total: 0,
        requested: 0,
        outstanding: 0,
        pending: 0,
        inReview: 0,
        approved: 0,
        overdue: 0,
        completed: 0,
      },
    );
  }, [loans]);

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return loans;

    return loans.filter((loan) => {
      const borrower = getBorrower(loan);

      const values = [
        getLoanId(loan),
        getBorrowerName(loan),
        getBorrowerEmail(loan),
        borrower?.phone,
        getLoanType(loan),
        loan?.reference,
        loan?.accountNumber,
        loan?.purpose,
      ];

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [loans, search]);

  const handleRefresh = () => {
    loadLoans();
  };

  const handleLoadMore = () => {
    if (!nextCursor || refreshing || loading) return;

    loadLoans({
      append: true,
      cursor: nextCursor,
    });
  };

  const summaryCards = [
    {
      label: "Total applications",
      value: total ?? summary.total,
      icon: FileText,
    },
    {
      label: "Pending",
      value: summary.pending,
      icon: Clock3,
    },
    {
      label: "In review",
      value: summary.inReview,
      icon: Eye,
    },
    {
      label: "Approved / active",
      value: summary.approved,
      icon: CheckCircle2,
    },
    {
      label: "Overdue / defaulted",
      value: summary.overdue,
      icon: AlertCircle,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <CreditCard className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Lending
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Loans
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review loan applications, approval status, repayment
                  progress and outstanding balances using live banking data.
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search borrower, email, loan ID, account or reference"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="relative lg:w-60">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter loans by status"
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
                <p className="font-semibold">
                  Unable to load loan applications
                </p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Requested volume
              </p>
              <CreditCard className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : formatMoney(summary.requested)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Sum of amounts returned by the current result set.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Outstanding
              </p>
              <AlertCircle className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : formatMoney(summary.outstanding)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Sum of outstanding balances returned by the current result set.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Completed
              </p>
              <CheckCircle2 className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : summary.completed}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Loans marked completed by the banking system.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Loan applications
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredLoans.length} record
                {filteredLoans.length === 1 ? "" : "s"} currently loaded
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
          ) : filteredLoans.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FileText className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No loan applications found
              </h3>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                No loan records match the current search and status filters.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Borrower
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Loan
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Amount
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Repayment
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
                    {filteredLoans.map((loan) => {
                      const id = getLoanId(loan);
                      const currency = getCurrency(loan);
                      const statusMeta = getStatusMeta(
                        loan?.status || loan?.loanStatus,
                      );
                      const StatusIcon = statusMeta.icon;
                      const progress = getProgress(loan);

                      return (
                        <tr
                          key={
                            id ||
                            `${getBorrowerEmail(loan)}-${getSubmittedAt(loan)}`
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
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
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {getLoanType(loan)}
                            </p>

                            <p className="mt-1 break-all text-xs text-slate-500">
                              {id || "No ID"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {formatMoney(getPrincipal(loan), currency)}
                            </p>

                            {getInterestRate(loan) !== null && (
                              <p className="mt-1 text-xs text-slate-500">
                                {formatNumber(getInterestRate(loan))}% interest
                              </p>
                            )}

                            {getTerm(loan) !== null && (
                              <p className="text-xs text-slate-500">
                                {formatNumber(getTerm(loan))}{" "}
                                {Number(getTerm(loan)) === 1
                                  ? "month"
                                  : "months"}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {formatMoney(getOutstanding(loan), currency)}
                            </p>

                            <div className="mt-2 w-32">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                <span>Paid</span>
                                <span>{formatNumber(progress)}%</span>
                              </div>

                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-slate-900"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(0, progress),
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusMeta.label}
                            </span>

                            <p className="mt-2 text-xs text-slate-500">
                              {formatRelativeDate(getUpdatedAt(loan))}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-right">
                            {id ? (
                              <Link
                                to={`/admin/loans/${encodeURIComponent(id)}`}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4" />
                                Review
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">
                                No loan ID
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
                {filteredLoans.map((loan) => {
                  const id = getLoanId(loan);
                  const currency = getCurrency(loan);
                  const statusMeta = getStatusMeta(
                    loan?.status || loan?.loanStatus,
                  );
                  const StatusIcon = statusMeta.icon;
                  const progress = getProgress(loan);

                  return (
                    <article
                      key={
                        id ||
                        `${getBorrowerEmail(loan)}-${getSubmittedAt(loan)}`
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
                              {getBorrowerName(loan)}
                            </h3>

                            <p className="truncate text-xs text-slate-500">
                              {getBorrowerEmail(loan)}
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
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Loan
                            </p>

                            <p className="mt-1 font-semibold text-slate-900">
                              {getLoanType(loan)}
                            </p>

                            <p className="mt-1 break-all text-xs text-slate-500">
                              {id || "No loan ID"}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Requested
                            </p>

                            <p className="mt-1 font-bold text-slate-900">
                              {formatMoney(
                                getPrincipal(loan),
                                currency,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Outstanding
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatMoney(
                                getOutstanding(loan),
                                currency,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Due date
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {getDueDate(loan)
                                ? formatDate(getDueDate(loan))
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                            <span>Repayment progress</span>
                            <span>{formatNumber(progress)}%</span>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-slate-900"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, progress),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {id && (
                        <Link
                          to={`/admin/loans/${encodeURIComponent(id)}`}
                          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <Eye className="h-4 w-4" />
                          Review loan
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
                Administrative lending controls
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Loan approval, disbursement, repayment adjustments and other
                financial actions must be handled by authorized server-side
                workflows with appropriate audit controls.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLoans;