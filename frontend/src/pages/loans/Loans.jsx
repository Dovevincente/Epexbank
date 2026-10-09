import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Landmark,
  Percent,
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
  "SUBMITTED",
  "PROCESSING",
  "UNDER_REVIEW",
  "APPROVED",
  "ACTIVE",
  "DISBURSED",
  "COMPLETED",
  "PAID",
  "REJECTED",
  "DECLINED",
  "CANCELLED",
  "DEFAULTED",
  "OVERDUE",
];

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    tone: "warning",
    icon: Clock3,
  },
  SUBMITTED: {
    label: "Submitted",
    tone: "warning",
    icon: Clock3,
  },
  PROCESSING: {
    label: "Processing",
    tone: "warning",
    icon: Clock3,
  },
  UNDER_REVIEW: {
    label: "Under review",
    tone: "warning",
    icon: Clock3,
  },
  APPROVED: {
    label: "Approved",
    tone: "success",
    icon: CheckCircle2,
  },
  ACTIVE: {
    label: "Active",
    tone: "success",
    icon: CheckCircle2,
  },
  DISBURSED: {
    label: "Disbursed",
    tone: "success",
    icon: CheckCircle2,
  },
  COMPLETED: {
    label: "Completed",
    tone: "success",
    icon: CheckCircle2,
  },
  PAID: {
    label: "Paid",
    tone: "success",
    icon: CheckCircle2,
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
    tone: "danger",
    icon: XCircle,
  },
  DEFAULTED: {
    label: "Defaulted",
    tone: "danger",
    icon: AlertCircle,
  },
  OVERDUE: {
    label: "Overdue",
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

const normalizeList = (responseData, keys = []) => {
  const root = responseData?.data ?? responseData ?? {};

  if (Array.isArray(root)) return root;

  for (const key of keys) {
    if (Array.isArray(root?.[key])) {
      return root[key];
    }
  }

  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root?.records)) return root.records;

  return [];
};

const getLoanId = (loan) =>
  loan?.id ??
  loan?.loanId ??
  loan?.applicationId ??
  loan?.loanApplicationId ??
  "";

const getLoanStatus = (loan) =>
  String(
    loan?.status ??
      loan?.loanStatus ??
      loan?.applicationStatus ??
      "",
  ).toUpperCase();

const getLoanName = (loan) =>
  loan?.product?.name ??
  loan?.productName ??
  loan?.loanProduct?.name ??
  loan?.loanType ??
  "Loan";

const getCurrency = (loan) =>
  loan?.currency?.code ??
  loan?.currencyCode ??
  loan?.currency ??
  "USD";

const getAmount = (loan) => {
  const value =
    loan?.principalAmount ??
    loan?.principal ??
    loan?.approvedAmount ??
    loan?.amount;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getOutstanding = (loan) => {
  const value =
    loan?.outstandingBalance ??
    loan?.outstandingPrincipal ??
    loan?.remainingBalance ??
    loan?.balanceOutstanding;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getPaid = (loan) => {
  const value =
    loan?.amountPaid ??
    loan?.paidAmount ??
    loan?.totalPaid ??
    loan?.repaidAmount;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getRate = (loan) => {
  const value =
    loan?.interestRate ??
    loan?.annualInterestRate ??
    loan?.apr ??
    loan?.rate;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getTerm = (loan) => {
  const value =
    loan?.termMonths ??
    loan?.term ??
    loan?.durationMonths;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getMinimumAmount = (product) => {
  const value =
    product?.minimumAmount ??
    product?.minAmount ??
    product?.minimumLoanAmount;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getMaximumAmount = (product) => {
  const value =
    product?.maximumAmount ??
    product?.maxAmount ??
    product?.maximumLoanAmount;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getMinimumTerm = (product) => {
  const value =
    product?.minimumTermMonths ??
    product?.minTermMonths ??
    product?.minimumTerm ??
    product?.minTerm;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getMaximumTerm = (product) => {
  const value =
    product?.maximumTermMonths ??
    product?.maxTermMonths ??
    product?.maximumTerm ??
    product?.maxTerm;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getProductRate = (product) => {
  const value =
    product?.interestRate ??
    product?.annualInterestRate ??
    product?.apr ??
    product?.rate;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const getProductStatus = (product) =>
  String(
    product?.status ??
      product?.productStatus ??
      (product?.active === false ? "INACTIVE" : "ACTIVE"),
  ).toUpperCase();

const getProductId = (product) =>
  product?.id ??
  product?.productId ??
  product?.loanProductId ??
  product?.code ??
  "";

const getProductName = (product) =>
  product?.name ??
  product?.title ??
  product?.productName ??
  product?.loanType ??
  "Loan product";

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

const formatPercentage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return `${number.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const formatStatus = (value) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const isActiveLoan = (loan) =>
  ["ACTIVE", "DISBURSED"].includes(getLoanStatus(loan));

const isPendingLoan = (loan) =>
  [
    "PENDING",
    "SUBMITTED",
    "PROCESSING",
    "UNDER_REVIEW",
    "APPROVED",
  ].includes(getLoanStatus(loan));

const isRestrictedLoan = (loan) =>
  [
    "REJECTED",
    "DECLINED",
    "CANCELLED",
    "DEFAULTED",
    "OVERDUE",
  ].includes(getLoanStatus(loan));

const Loans = () => {
  const [products, setProducts] = useState([]);
  const [loans, setLoans] = useState([]);

  const [productsLoading, setProductsLoading] = useState(true);
  const [loansLoading, setLoansLoading] = useState(true);

  const [productsError, setProductsError] = useState("");
  const [loansError, setLoansError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");

    try {
      const response = await api.get("/loans/products");

      setProducts(
        normalizeList(response?.data, [
          "products",
          "loanProducts",
          "loans",
        ]),
      );
    } catch (requestError) {
      const status = requestError?.response?.status;

      setProducts([]);

      if (status === 404 || status === 501) {
        setProductsError(
          "Loan products are not currently available through the banking API.",
        );
      } else {
        setProductsError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load loan products.",
        );
      }
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadLoans = useCallback(async () => {
    setLoansLoading(true);
    setLoansError("");

    try {
      const response = await api.get("/loans");

      setLoans(
        normalizeList(response?.data, [
          "loans",
          "applications",
          "loanApplications",
        ]),
      );
    } catch (requestError) {
      const status = requestError?.response?.status;

      setLoans([]);

      if (status === 404 || status === 501) {
        setLoansError(
          "Your loan records are not currently available through the banking API.",
        );
      } else {
        setLoansError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load your loans.",
        );
      }
    } finally {
      setLoansLoading(false);
    }
  }, []);

  const loadAll = useCallback(() => {
    loadProducts();
    loadLoans();
  }, [loadProducts, loadLoans]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return loans.filter((loan) => {
      const status = getLoanStatus(loan);

      if (statusFilter !== "ALL" && status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const searchable = [
        getLoanId(loan),
        getLoanName(loan),
        loan?.reference,
        loan?.loanReference,
        loan?.applicationReference,
        loan?.purpose,
        loan?.accountNumber,
        loan?.currencyCode,
        getCurrency(loan),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [loans, search, statusFilter]);

  const summary = useMemo(() => {
    const active = loans.filter(isActiveLoan);
    const pending = loans.filter(isPendingLoan);
    const restricted = loans.filter(isRestrictedLoan);

    const outstandingByCurrency = {};

    for (const loan of active) {
      const currency = getCurrency(loan);
      const outstanding = getOutstanding(loan);

      if (outstanding === null) continue;

      outstandingByCurrency[currency] =
        (outstandingByCurrency[currency] ?? 0) + outstanding;
    }

    return {
      total: loans.length,
      active: active.length,
      pending: pending.length,
      restricted: restricted.length,
      outstandingByCurrency,
    };
  }, [loans]);

  const availableProducts = useMemo(
    () =>
      products.filter((product) =>
        ["ACTIVE", "AVAILABLE", "ENABLED", "OPEN"].includes(
          getProductStatus(product),
        ),
      ),
    [products],
  );

  const retry = () => {
    loadAll();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <Banknote className="h-4 w-4" />
              Lending
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Loans
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              View eligible lending products, applications, active loans,
              repayment information, and outstanding obligations.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={retry}
              disabled={productsLoading || loansLoading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  productsLoading || loansLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            <Link
              to="/loans/apply"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Apply for a loan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Errors */}
        {(productsError || loansError) && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

              <div className="min-w-0">
                <p className="font-bold text-red-950 dark:text-red-300">
                  Some lending information could not be loaded
                </p>

                {productsError && (
                  <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                    {productsError}
                  </p>
                )}

                {loansError && (
                  <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                    {loansError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Total records
                </p>

                <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {loansLoading ? "—" : summary.total}
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
                  Active loans
                </p>

                <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {loansLoading ? "—" : summary.active}
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
                  {loansLoading ? "—" : summary.pending}
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
                  Outstanding
                </p>

                {Object.keys(summary.outstandingByCurrency).length === 0 ? (
                  <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    —
                  </p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(summary.outstandingByCurrency).map(
                      ([currency, amount]) => (
                        <p
                          key={currency}
                          className="text-sm font-bold text-slate-950 dark:text-white"
                        >
                          {formatMoney(amount, currency)}
                        </p>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Available products */}
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Available loan products
              </h2>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Lending products currently returned as available by the
                banking API.
              </p>
            </div>

            {availableProducts.length > 0 && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {availableProducts.length} available
              </span>
            )}
          </div>

          {productsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <Banknote className="mx-auto h-9 w-9 text-slate-400" />

              <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                No loan products available
              </h3>

              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                Epex Bank has not returned an active lending product that is
                currently available for application.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableProducts.map((product) => {
                const id = getProductId(product);
                const currency =
                  product?.currency?.code ??
                  product?.currencyCode ??
                  product?.currency ??
                  "USD";

                const minimumAmount = getMinimumAmount(product);
                const maximumAmount = getMaximumAmount(product);
                const minimumTerm = getMinimumTerm(product);
                const maximumTerm = getMaximumTerm(product);
                const rate = getProductRate(product);

                return (
                  <article
                    key={String(id)}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        <Banknote className="h-5 w-5" />
                      </div>

                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Available
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                      {getProductName(product)}
                    </h3>

                    {product?.description && (
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Amount
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {minimumAmount !== null
                            ? formatMoney(minimumAmount, currency)
                            : "—"}
                        </p>

                        {maximumAmount !== null && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            up to {formatMoney(maximumAmount, currency)}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Rate
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {formatPercentage(rate)}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Term
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                          {minimumTerm !== null
                            ? `${minimumTerm} month${
                                minimumTerm === 1 ? "" : "s"
                              }`
                            : "—"}
                          {maximumTerm !== null
                            ? ` – ${maximumTerm} months`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/loans/apply?productId=${encodeURIComponent(
                        String(id),
                      )}`}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      Apply for this product
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Existing loans */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Your loans and applications
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Review applications and loan records associated with your
              authenticated Epex Bank profile.
            </p>
          </div>

          {/* Filters */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by loan, reference, account or purpose..."
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All statuses" : formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loansLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading your loan records...
              </p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <FileText className="mx-auto h-9 w-9 text-slate-400" />

              <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                {loans.length === 0
                  ? "No loan records"
                  : "No matching loan records"}
              </h3>

              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                {loans.length === 0
                  ? "You do not currently have loan applications or loan records returned by the banking API."
                  : "Try changing the search text or status filter."}
              </p>

              {loans.length === 0 && availableProducts.length > 0 && (
                <Link
                  to="/loans/apply"
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Start an application
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Loan
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Amount
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Outstanding
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Rate / term
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Status
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredLoans.map((loan) => {
                        const loanId = getLoanId(loan);
                        const status = getLoanStatus(loan);
                        const config =
                          STATUS_CONFIG[status] ?? {
                            label: formatStatus(status),
                            tone: "neutral",
                            icon: FileText,
                          };

                        const StatusIcon = config.icon;
                        const toneStyles =
                          TONE_STYLES[config.tone] ??
                          TONE_STYLES.neutral;

                        const currency = getCurrency(loan);
                        const amount = getAmount(loan);
                        const outstanding = getOutstanding(loan);
                        const rate = getRate(loan);
                        const term = getTerm(loan);

                        return (
                          <tr
                            key={String(loanId)}
                            className="transition hover:bg-slate-50 dark:hover:bg-slate-950/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneStyles.icon}`}
                                >
                                  <StatusIcon className="h-5 w-5" />
                                </div>

                                <div className="min-w-0">
                                  <p className="font-bold text-slate-950 dark:text-white">
                                    {getLoanName(loan)}
                                  </p>

                                  <p className="mt-1 max-w-[230px] truncate text-xs text-slate-500 dark:text-slate-400">
                                    {loan?.reference ??
                                      loan?.loanReference ??
                                      loan?.applicationReference ??
                                      loanId}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-slate-950 dark:text-white">
                                {formatMoney(amount, currency)}
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {currency}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-slate-950 dark:text-white">
                                {formatMoney(
                                  outstanding,
                                  currency,
                                )}
                              </p>

                              {getPaid(loan) !== null && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Paid{" "}
                                  {formatMoney(
                                    getPaid(loan),
                                    currency,
                                  )}
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-slate-950 dark:text-white">
                                {formatPercentage(rate)}
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {term !== null
                                  ? `${term} month${
                                      term === 1 ? "" : "s"
                                    }`
                                  : "Term unavailable"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-bold ${toneStyles.badge}`}
                              >
                                {config.label}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              {loanId ? (
                                <Link
                                  to={`/loans/${encodeURIComponent(
                                    String(loanId),
                                  )}`}
                                  className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline dark:text-blue-400"
                                >
                                  View details
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Details unavailable
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile / tablet cards */}
              <div className="grid gap-4 lg:hidden">
                {filteredLoans.map((loan) => {
                  const loanId = getLoanId(loan);
                  const status = getLoanStatus(loan);

                  const config =
                    STATUS_CONFIG[status] ?? {
                      label: formatStatus(status),
                      tone: "neutral",
                      icon: FileText,
                    };

                  const StatusIcon = config.icon;
                  const toneStyles =
                    TONE_STYLES[config.tone] ??
                    TONE_STYLES.neutral;

                  const currency = getCurrency(loan);
                  const amount = getAmount(loan);
                  const outstanding = getOutstanding(loan);
                  const rate = getRate(loan);
                  const term = getTerm(loan);

                  return (
                    <article
                      key={String(loanId)}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneStyles.icon}`}
                          >
                            <StatusIcon className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-slate-950 dark:text-white">
                              {getLoanName(loan)}
                            </h3>

                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {loan?.reference ??
                                loan?.loanReference ??
                                loan?.applicationReference ??
                                loanId}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold ${toneStyles.badge}`}
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
                            {formatMoney(amount, currency)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Outstanding
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                            {formatMoney(
                              outstanding,
                              currency,
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Interest
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                            {formatPercentage(rate)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Term
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                            {term !== null
                              ? `${term} month${
                                  term === 1 ? "" : "s"
                                }`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {loan?.nextPaymentDate && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <CalendarDays className="h-4 w-4" />
                          Next payment:{" "}
                          {formatDate(loan.nextPaymentDate)}
                        </div>
                      )}

                      {loanId && (
                        <Link
                          to={`/loans/${encodeURIComponent(
                            String(loanId),
                          )}`}
                          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          View loan details
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Lending information */}
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
              Eligibility
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Available loan products and eligibility requirements are
              determined by the banking system and applicable lending rules.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
              <Percent className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
              Loan terms
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Interest rates, limits, fees, and repayment periods should always
              be confirmed from the actual loan product and approved loan
              record.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
              Secure lending
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Never share your password, OTP, card PIN, or security codes when
              applying for or managing a loan.
            </p>
          </div>
        </section>

        {/* Footer action */}
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                <Landmark className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-blue-950 dark:text-blue-300">
                  Need a new loan?
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-400">
                  Review the available lending products and submit an
                  application using your authenticated Epex Bank account.
                </p>
              </div>
            </div>

            <Link
              to="/loans/apply"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Start application
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Security note */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />

            <div>
              <h3 className="font-bold text-slate-950 dark:text-white">
                Loan information is API-driven
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                This page does not create or invent loan records in the
                browser. Products, applications, balances, rates, statuses,
                and repayment information are displayed only when returned by
                the authenticated banking API.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Loans;