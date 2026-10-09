import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Info,
  Landmark,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const PURPOSE_OPTIONS = [
  { value: "PERSONAL", label: "Personal expenses" },
  { value: "EDUCATION", label: "Education" },
  { value: "MEDICAL", label: "Medical expenses" },
  { value: "HOME_IMPROVEMENT", label: "Home improvement" },
  { value: "BUSINESS", label: "Business" },
  { value: "DEBT_CONSOLIDATION", label: "Debt consolidation" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "TRAVEL", label: "Travel" },
  { value: "EMERGENCY", label: "Emergency expenses" },
  { value: "OTHER", label: "Other" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "BUSINESS_OWNER", label: "Business owner" },
  { value: "CONTRACTOR", label: "Contractor / freelancer" },
  { value: "RETIRED", label: "Retired" },
  { value: "STUDENT", label: "Student" },
  { value: "UNEMPLOYED", label: "Not currently employed" },
  { value: "OTHER", label: "Other" },
];

const INITIAL_FORM = {
  productId: "",
  accountId: "",
  amount: "",
  termMonths: "",
  purpose: "",
  purposeDescription: "",
  employmentStatus: "",
  employerName: "",
  monthlyIncome: "",
  monthlyExpenses: "",
};

const normalizeProducts = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.products)) return root.products;
  if (Array.isArray(root?.loans)) return root.loans;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root?.records)) return root.records;

  return [];
};

const normalizeApplication = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  return (
    root?.application ??
    root?.loan ??
    root?.loanApplication ??
    root?.result ??
    root
  );
};

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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

const getProductStatus = (product) =>
  String(
    product?.status ??
      product?.productStatus ??
      (product?.active === false ? "INACTIVE" : "ACTIVE"),
  ).toUpperCase();

const getProductCurrency = (product) =>
  product?.currency?.code ??
  product?.currencyCode ??
  product?.currency ??
  "";

const getMinimumAmount = (product) =>
  numberOrNull(
    product?.minimumAmount ??
      product?.minAmount ??
      product?.minimumLoanAmount,
  );

const getMaximumAmount = (product) =>
  numberOrNull(
    product?.maximumAmount ??
      product?.maxAmount ??
      product?.maximumLoanAmount,
  );

const getMinimumTerm = (product) =>
  numberOrNull(
    product?.minimumTermMonths ??
      product?.minTermMonths ??
      product?.minimumTerm ??
      product?.minTerm,
  );

const getMaximumTerm = (product) =>
  numberOrNull(
    product?.maximumTermMonths ??
      product?.maxTermMonths ??
      product?.maximumTerm ??
      product?.maxTerm,
  );

const getInterestRate = (product) =>
  numberOrNull(
    product?.interestRate ??
      product?.annualInterestRate ??
      product?.apr ??
      product?.rate,
  );

const getAccountCurrency = (account) =>
  account?.currency?.code ??
  account?.currencyCode ??
  account?.currency ??
  "";

const getAccountBalance = (account) =>
  numberOrNull(
    account?.availableBalance ??
      account?.balance ??
      account?.ledgerBalance,
  ) ?? 0;

const getAccountLabel = (account) => {
  const type = String(account?.type ?? "Account")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

  const number = String(account?.accountNumber ?? "");

  if (!number) return type;

  return `${type} •••• ${number.slice(-4)}`;
};

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

const formatStatus = (value) => {
  if (!value) return "Submitted";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const LoanApplication = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedApplication, setSubmittedApplication] = useState(null);

  const requestedProductId =
    searchParams.get("productId") ??
    searchParams.get("loanProductId") ??
    "";

  const activeProducts = useMemo(
    () =>
      products.filter((product) =>
        ["ACTIVE", "AVAILABLE", "ENABLED", "OPEN"].includes(
          getProductStatus(product),
        ),
      ),
    [products],
  );

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          String(account?.status ?? "").toUpperCase() === "ACTIVE",
      ),
    [accounts],
  );

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          String(getProductId(product)) === String(form.productId),
      ) ?? null,
    [products, form.productId],
  );

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) => String(account?.id) === String(form.accountId),
      ) ?? null,
    [accounts, form.accountId],
  );

  const productCurrency = selectedProduct
    ? getProductCurrency(selectedProduct)
    : "";

  const accountCurrency = selectedAccount
    ? getAccountCurrency(selectedAccount)
    : "";

  const currency = productCurrency || accountCurrency || "USD";

  const minimumAmount = selectedProduct
    ? getMinimumAmount(selectedProduct)
    : null;

  const maximumAmount = selectedProduct
    ? getMaximumAmount(selectedProduct)
    : null;

  const minimumTerm = selectedProduct
    ? getMinimumTerm(selectedProduct)
    : null;

  const maximumTerm = selectedProduct
    ? getMaximumTerm(selectedProduct)
    : null;

  const interestRate = selectedProduct
    ? getInterestRate(selectedProduct)
    : null;

  const requestedAmount = numberOrNull(form.amount);
  const requestedTerm = numberOrNull(form.termMonths);
  const monthlyIncome = numberOrNull(form.monthlyIncome);
  const monthlyExpenses = numberOrNull(form.monthlyExpenses);

  const estimatedDisposableIncome = useMemo(() => {
    if (monthlyIncome === null || monthlyExpenses === null) {
      return null;
    }

    return monthlyIncome - monthlyExpenses;
  }, [monthlyIncome, monthlyExpenses]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");

    try {
      const response = await api.get("/loans/products");
      setProducts(normalizeProducts(response?.data));
    } catch (requestError) {
      setProducts([]);

      const status = requestError?.response?.status;

      if (status === 404 || status === 501) {
        setProductsError(
          "Loan products are not currently available through the banking API.",
        );
      } else {
        setProductsError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load available loan products.",
        );
      }
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!activeProducts.length || form.productId) return;

    const requestedProduct = activeProducts.find(
      (product) =>
        String(getProductId(product)) === String(requestedProductId),
    );

    const product = requestedProduct ?? activeProducts[0];

    if (!product) return;

    setForm((current) => ({
      ...current,
      productId: String(getProductId(product)),
    }));
  }, [activeProducts, form.productId, requestedProductId]);

  useEffect(() => {
    if (!activeAccounts.length || form.accountId) return;

    setForm((current) => ({
      ...current,
      accountId: String(activeAccounts[0]?.id ?? ""),
    }));
  }, [activeAccounts, form.accountId]);

  useEffect(() => {
    if (!selectedProduct) return;

    const suggestedTerm =
      selectedProduct?.defaultTermMonths ??
      selectedProduct?.termMonths ??
      minimumTerm ??
      "";

    setForm((current) => {
      if (current.termMonths) return current;

      return {
        ...current,
        termMonths: suggestedTerm ? String(suggestedTerm) : "",
      };
    });
  }, [selectedProduct, minimumTerm]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setSubmitError("");
  };

  const selectProduct = (product) => {
    const id = String(getProductId(product));

    setForm((current) => ({
      ...current,
      productId: id,
      termMonths: "",
    }));

    setErrors((current) => ({
      ...current,
      productId: "",
      amount: "",
      termMonths: "",
    }));

    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.productId) {
      nextErrors.productId = "Select a loan product.";
    }

    if (!form.accountId) {
      nextErrors.accountId =
        "Select the account that should receive the loan if approved.";
    }

    if (requestedAmount === null || requestedAmount <= 0) {
      nextErrors.amount = "Enter a valid loan amount.";
    } else {
      if (minimumAmount !== null && requestedAmount < minimumAmount) {
        nextErrors.amount = `The minimum amount for this product is ${formatMoney(
          minimumAmount,
          currency,
        )}.`;
      }

      if (maximumAmount !== null && requestedAmount > maximumAmount) {
        nextErrors.amount = `The maximum amount for this product is ${formatMoney(
          maximumAmount,
          currency,
        )}.`;
      }
    }

    if (requestedTerm === null || requestedTerm <= 0) {
      nextErrors.termMonths = "Enter a valid repayment term.";
    } else {
      if (minimumTerm !== null && requestedTerm < minimumTerm) {
        nextErrors.termMonths = `The minimum term is ${minimumTerm} month${
          minimumTerm === 1 ? "" : "s"
        }.`;
      }

      if (maximumTerm !== null && requestedTerm > maximumTerm) {
        nextErrors.termMonths = `The maximum term is ${maximumTerm} months.`;
      }
    }

    if (!form.purpose) {
      nextErrors.purpose = "Select the purpose of the loan.";
    }

    if (
      form.purpose === "OTHER" &&
      form.purposeDescription.trim().length < 5
    ) {
      nextErrors.purposeDescription =
        "Briefly describe the purpose of the loan.";
    }

    if (!form.employmentStatus) {
      nextErrors.employmentStatus =
        "Select your current employment status.";
    }

    if (
      ["EMPLOYED", "SELF_EMPLOYED", "BUSINESS_OWNER", "CONTRACTOR"].includes(
        form.employmentStatus,
      ) &&
      !form.employerName.trim()
    ) {
      nextErrors.employerName =
        form.employmentStatus === "EMPLOYED"
          ? "Enter your employer name."
          : "Enter your business or work name.";
    }

    if (monthlyIncome === null || monthlyIncome < 0) {
      nextErrors.monthlyIncome = "Enter a valid monthly income.";
    }

    if (monthlyExpenses === null || monthlyExpenses < 0) {
      nextErrors.monthlyExpenses = "Enter valid monthly expenses.";
    }

    if (
      selectedProduct &&
      selectedAccount &&
      productCurrency &&
      accountCurrency &&
      productCurrency !== accountCurrency
    ) {
      nextErrors.accountId = `This loan product uses ${productCurrency}, but the selected account uses ${accountCurrency}. Select a compatible account.`;
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitError("");

    if (!validate()) return;

    setSubmitting(true);

    try {
      const payload = {
        productId: form.productId,
        loanProductId: form.productId,
        accountId: form.accountId,
        amount: requestedAmount,
        termMonths: requestedTerm,
        purpose: form.purpose,
        purposeDescription:
          form.purpose === "OTHER" || form.purposeDescription.trim()
            ? form.purposeDescription.trim()
            : undefined,
        employmentStatus: form.employmentStatus,
        employerName: form.employerName.trim() || undefined,
        monthlyIncome,
        monthlyExpenses,
        currency,
      };

      const response = await api.post("/loans/applications", payload);

      const application = normalizeApplication(response?.data);

      setSubmittedApplication(application);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404 || status === 501) {
        setSubmitError(
          "Loan applications are not currently available through the banking API.",
        );
      } else {
        setSubmitError(
          requestError?.response?.data?.message ||
            requestError?.response?.data?.error ||
            requestError?.message ||
            "Unable to submit your loan application.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetApplication = () => {
    setSubmittedApplication(null);
    setSubmitError("");
    setErrors({});
    setForm((current) => ({
      ...INITIAL_FORM,
      productId: current.productId,
      accountId: current.accountId,
    }));
  };

  const loading = productsLoading || accountsLoading;

  if (submittedApplication) {
    const applicationId =
      submittedApplication?.id ??
      submittedApplication?.applicationId ??
      submittedApplication?.loanId ??
      "";

    const reference =
      submittedApplication?.reference ??
      submittedApplication?.applicationReference ??
      submittedApplication?.loanReference ??
      "";

    const applicationStatus =
      submittedApplication?.status ??
      submittedApplication?.applicationStatus ??
      "SUBMITTED";

    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <h1 className="mt-5 text-2xl font-bold text-emerald-950 dark:text-emerald-300 sm:text-3xl">
                Application submitted
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-800 dark:text-emerald-400 sm:text-base">
                Your loan application was accepted by the Epex Bank API for
                processing. Submission does not mean the loan has been
                approved.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {formatStatus(applicationStatus)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Requested amount
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {formatMoney(
                      submittedApplication?.amount ?? requestedAmount,
                      submittedApplication?.currency ?? currency,
                    )}
                  </p>
                </div>

                {reference && (
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Application reference
                    </p>

                    <p className="mt-2 break-all font-mono text-sm font-bold text-slate-950 dark:text-white">
                      {reference}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                  <div>
                    <p className="font-bold text-blue-950 dark:text-blue-300">
                      Application review
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-400">
                      The application remains subject to eligibility,
                      verification, lending checks, and approval before any
                      funds are made available.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {applicationId ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/loans/${encodeURIComponent(applicationId)}`)
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    View application
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    to="/loans"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    View loans
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={resetApplication}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  New application
                </button>
              </div>
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
              <Banknote className="h-4 w-4" />
              Lending
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Loan application
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Apply for an eligible Epex Bank lending product. Applications
              are subject to verification, eligibility checks, and approval.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadProducts();
              refreshAccounts().catch(() => {});
            }}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* API errors */}
        {(productsError || accountsError) && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

              <div>
                <p className="font-bold text-red-950 dark:text-red-300">
                  Some application information could not be loaded
                </p>

                {productsError && (
                  <p className="mt-1 text-sm text-red-800 dark:text-red-400">
                    {productsError}
                  </p>
                )}

                {accountsError && (
                  <p className="mt-1 text-sm text-red-800 dark:text-red-400">
                    {accountsError}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <div className="h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-96 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
          >
            <div className="space-y-6">
              {/* Loan products */}
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    1. Choose a loan product
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Only lending products currently returned as available by
                    Epex Bank are shown.
                  </p>
                </div>

                {activeProducts.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                    <Banknote className="mx-auto h-8 w-8 text-slate-400" />

                    <p className="mt-3 font-bold text-slate-900 dark:text-white">
                      No loan products available
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      There are currently no active loan products available for
                      application.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {activeProducts.map((product) => {
                      const id = String(getProductId(product));
                      const selected = String(form.productId) === id;

                      const productMin = getMinimumAmount(product);
                      const productMax = getMaximumAmount(product);
                      const productMinTerm = getMinimumTerm(product);
                      const productMaxTerm = getMaximumTerm(product);
                      const productRate = getInterestRate(product);
                      const productCurrencyCode =
                        getProductCurrency(product) || "USD";

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => selectProduct(product)}
                          className={`rounded-2xl border p-5 text-left transition ${
                            selected
                              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10 dark:border-blue-500 dark:bg-blue-950/20"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                              <Banknote className="h-5 w-5" />
                            </div>

                            {selected && (
                              <CheckCircle2 className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                            )}
                          </div>

                          <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                            {getProductName(product)}
                          </h3>

                          {product?.description && (
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-400">
                              {product.description}
                            </p>
                          )}

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Amount
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                {productMin !== null
                                  ? formatMoney(
                                      productMin,
                                      productCurrencyCode,
                                    )
                                  : "—"}
                                {productMax !== null
                                  ? ` – ${formatMoney(
                                      productMax,
                                      productCurrencyCode,
                                    )}`
                                  : ""}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Interest rate
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                {formatPercentage(productRate)}
                              </p>
                            </div>

                            <div className="col-span-2">
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Term
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                {productMinTerm !== null
                                  ? `${productMinTerm} month${
                                      productMinTerm === 1 ? "" : "s"
                                    }`
                                  : "—"}
                                {productMaxTerm !== null
                                  ? ` – ${productMaxTerm} months`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {errors.productId && (
                  <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                    {errors.productId}
                  </p>
                )}
              </section>

              {/* Loan details */}
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    2. Loan details
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Enter the amount, repayment period, and purpose of your
                    application.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="amount"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Loan amount
                    </label>

                    <div className="relative mt-2">
                      <CircleDollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="amount"
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.amount}
                        onChange={updateField}
                        placeholder="0.00"
                        className={`min-h-12 w-full rounded-xl border bg-white py-3 pl-11 pr-16 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white ${
                          errors.amount
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 dark:border-slate-700"
                        }`}
                      />

                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        {currency}
                      </span>
                    </div>

                    {errors.amount ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.amount}
                      </p>
                    ) : selectedProduct ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {minimumAmount !== null &&
                          `Minimum ${formatMoney(
                            minimumAmount,
                            currency,
                          )}`}
                        {minimumAmount !== null &&
                          maximumAmount !== null &&
                          " • "}
                        {maximumAmount !== null &&
                          `Maximum ${formatMoney(
                            maximumAmount,
                            currency,
                          )}`}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label
                      htmlFor="termMonths"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Repayment term
                    </label>

                    <div className="relative mt-2">
                      <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="termMonths"
                        name="termMonths"
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={form.termMonths}
                        onChange={updateField}
                        placeholder="Months"
                        className={`min-h-12 w-full rounded-xl border bg-white py-3 pl-11 pr-16 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white ${
                          errors.termMonths
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 dark:border-slate-700"
                        }`}
                      />

                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        MONTHS
                      </span>
                    </div>

                    {errors.termMonths ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.termMonths}
                      </p>
                    ) : selectedProduct ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {minimumTerm !== null &&
                          `Minimum ${minimumTerm} months`}
                        {minimumTerm !== null &&
                          maximumTerm !== null &&
                          " • "}
                        {maximumTerm !== null &&
                          `Maximum ${maximumTerm} months`}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="purpose"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Loan purpose
                    </label>

                    <div className="relative mt-2">
                      <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <select
                        id="purpose"
                        name="purpose"
                        value={form.purpose}
                        onChange={updateField}
                        className={`min-h-12 w-full appearance-none rounded-xl border bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-950 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${
                          errors.purpose
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 dark:border-slate-700"
                        }`}
                      >
                        <option value="">Select purpose</option>

                        {PURPOSE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    {errors.purpose && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.purpose}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="purposeDescription"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Additional purpose details
                      <span className="ml-1 font-normal text-slate-400">
                        {form.purpose === "OTHER"
                          ? "(required)"
                          : "(optional)"}
                      </span>
                    </label>

                    <textarea
                      id="purposeDescription"
                      name="purposeDescription"
                      rows="4"
                      maxLength="500"
                      value={form.purposeDescription}
                      onChange={updateField}
                      placeholder="Provide any additional information relevant to the purpose of this loan."
                      className={`mt-2 w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white ${
                        errors.purposeDescription
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 dark:border-slate-700"
                      }`}
                    />

                    <div className="mt-1 flex justify-between gap-4">
                      {errors.purposeDescription ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {errors.purposeDescription}
                        </p>
                      ) : (
                        <span />
                      )}

                      <span className="text-xs text-slate-400">
                        {form.purposeDescription.length}/500
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Disbursement account */}
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    3. Disbursement account
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    If the application is approved, this is the account linked
                    to the loan.
                  </p>
                </div>

                {activeAccounts.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                    <Wallet className="mx-auto h-8 w-8 text-slate-400" />

                    <p className="mt-3 font-bold text-slate-900 dark:text-white">
                      No active account available
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      An active account is required to submit a loan
                      application.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {activeAccounts.map((account) => {
                      const selected =
                        String(form.accountId) === String(account?.id);

                      return (
                        <button
                          key={account?.id}
                          type="button"
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              accountId: String(account?.id),
                            }));

                            setErrors((current) => ({
                              ...current,
                              accountId: "",
                            }));
                          }}
                          className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10 dark:border-blue-500 dark:bg-blue-950/20"
                              : "border-slate-200 hover:border-blue-300 dark:border-slate-800 dark:hover:border-blue-800"
                          }`}
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Landmark className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-950 dark:text-white">
                              {getAccountLabel(account)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Available balance:{" "}
                              {formatMoney(
                                getAccountBalance(account),
                                getAccountCurrency(account) || "USD",
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="hidden text-xs font-bold text-slate-500 sm:inline">
                              {getAccountCurrency(account)}
                            </span>

                            {selected && (
                              <CheckCircle2 className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {errors.accountId && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {errors.accountId}
                  </p>
                )}
              </section>

              {/* Financial information */}
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    4. Financial information
                  </h2>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Provide accurate information to support the lending review.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="employmentStatus"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Employment status
                    </label>

                    <div className="relative mt-2">
                      <select
                        id="employmentStatus"
                        name="employmentStatus"
                        value={form.employmentStatus}
                        onChange={updateField}
                        className={`min-h-12 w-full appearance-none rounded-xl border bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-950 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${
                          errors.employmentStatus
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 dark:border-slate-700"
                        }`}
                      >
                        <option value="">Select status</option>

                        {EMPLOYMENT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    {errors.employmentStatus && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.employmentStatus}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="employerName"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Employer / business name
                    </label>

                    <input
                      id="employerName"
                      name="employerName"
                      type="text"
                      maxLength="150"
                      value={form.employerName}
                      onChange={updateField}
                      placeholder="Enter name"
                      className={`mt-2 min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white ${
                        errors.employerName
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                          : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 dark:border-slate-700"
                      }`}
                    />

                    {errors.employerName && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.employerName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="monthlyIncome"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Monthly income
                    </label>

                    <div className="relative mt-2">
                      <CircleDollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="monthlyIncome"
                        name="monthlyIncome"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.monthlyIncome}
                        onChange={updateField}
                        placeholder="0.00"
                        className={`min-h-12 w-full rounded-xl border bg-white py-3 pl-11 pr-16 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white ${
                          errors.monthlyIncome
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 dark:border-slate-700"
                        }`}
                      />

                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        {currency}
                      </span>
                    </div>

                    {errors.monthlyIncome && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.monthlyIncome}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="monthlyExpenses"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Monthly expenses
                    </label>

                    <div className="relative mt-2">
                      <CircleDollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="monthlyExpenses"
                        name="monthlyExpenses"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={form.monthlyExpenses}
                        onChange={updateField}
                        placeholder="0.00"
                        className={`min-h-12 w-full rounded-xl border bg-white py-3 pl-11 pr-16 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-950 dark:text-white ${
                          errors.monthlyExpenses
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-300 focus:border-blue-600 focus:ring-blue-600/10 dark:border-slate-700"
                        }`}
                      />

                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        {currency}
                      </span>
                    </div>

                    {errors.monthlyExpenses && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.monthlyExpenses}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

                  <div>
                    <p className="font-bold text-red-950 dark:text-red-300">
                      Application could not be submitted
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                      {submitError}
                    </p>
                  </div>
                </div>
              )}

              {/* Mobile submit */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    activeProducts.length === 0 ||
                    activeAccounts.length === 0
                  }
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting application...
                    </>
                  ) : (
                    <>
                      Submit application
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Summary */}
            <aside className="space-y-5 lg:sticky lg:top-24">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Application
                    </p>

                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Summary
                    </h2>
                  </div>
                </div>

                <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Product
                    </span>

                    <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                      {selectedProduct
                        ? getProductName(selectedProduct)
                        : "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Amount
                    </span>

                    <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                      {requestedAmount !== null
                        ? formatMoney(requestedAmount, currency)
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Term
                    </span>

                    <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                      {requestedTerm
                        ? `${requestedTerm} month${
                            requestedTerm === 1 ? "" : "s"
                          }`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Rate
                    </span>

                    <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                      {formatPercentage(interestRate)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Account
                    </span>

                    <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                      {selectedAccount
                        ? getAccountLabel(selectedAccount)
                        : "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Disposable income
                    </span>

                    <span
                      className={`text-right text-sm font-bold ${
                        estimatedDisposableIncome !== null &&
                        estimatedDisposableIncome < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-950 dark:text-white"
                      }`}
                    >
                      {estimatedDisposableIncome !== null
                        ? formatMoney(
                            estimatedDisposableIncome,
                            currency,
                          )
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />

                    <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                      Product rates and limits shown here come from the banking
                      API. Final lending terms must come from the approved loan
                      record, not from a browser-side calculation.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    activeProducts.length === 0 ||
                    activeAccounts.length === 0
                  }
                  className="mt-5 hidden min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 lg:inline-flex"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit application
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                  <div>
                    <h3 className="font-bold text-slate-950 dark:text-white">
                      Lending review
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      Submitting an application does not guarantee approval.
                      Eligibility, identity verification, affordability,
                      account standing, and applicable lending requirements
                      must be reviewed before approval.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />

                  <div>
                    <h3 className="font-bold text-slate-950 dark:text-white">
                      Secure application
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      Never include passwords, card PINs, OTPs, or security
                      codes in a loan application.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                  <div>
                    <h3 className="font-bold text-blue-950 dark:text-blue-300">
                      Use accurate information
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-blue-800 dark:text-blue-400">
                      Financial and employment information should be complete
                      and accurate. Epex Bank can request supporting
                      documentation during review.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoanApplication;