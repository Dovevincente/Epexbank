import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bitcoin,
  CalendarDays,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  History,
  Loader2,
  LockKeyhole,
  PackageOpen,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import api from "../../services/api.js";

/* =========================================================
   HELPERS
========================================================= */

const normalizePayload = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }

    if (Array.isArray(payload?.data?.[key])) {
      return payload.data[key];
    }
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (payload?.data && typeof payload.data === "object") {
    return payload.data;
  }

  return [];
};

const getPayloadData = (response) => {
  return response?.data?.data ?? response?.data ?? {};
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "â€”";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  }
};

const formatNumber = (value, maximumFractionDigits = 8) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "â€”";
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits,
  });
};

const formatPercentage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "â€”";
  }

  return `${number.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
};

const formatDate = (value) => {
  if (!value) {
    return "â€”";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "â€”";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return "â€”";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "â€”";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getStatus = (investment) =>
  String(
    investment?.status ||
      investment?.state ||
      "PENDING_PAYMENT",
  ).toUpperCase();

const getStatusClasses = (status) => {
  if (["ACTIVE", "MATURED", "VERIFIED"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (
    [
      "PENDING_PAYMENT",
      "PAYMENT_SUBMITTED",
      "UNDER_REVIEW",
      "PENDING",
    ].includes(status)
  ) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (
    [
      "REJECTED",
      "CANCELLED",
      "CANCELED",
      "FAILED",
    ].includes(status)
  ) {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
};

const getStatusLabel = (status) => {
  const labels = {
    PENDING_PAYMENT: "Payment pending",
    PAYMENT_SUBMITTED: "Payment submitted",
    UNDER_REVIEW: "Under review",
    ACTIVE: "Active",
    MATURED: "Matured",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    CANCELED: "Cancelled",
  };

  return (
    labels[status] ||
    status.replaceAll("_", " ").replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    )
  );
};

const getInvestmentId = (investment) =>
  investment?.id ||
  investment?.investmentId ||
  null;

const getInvestmentReference = (investment) =>
  investment?.reference ||
  investment?.investmentReference ||
  "Investment";

const getPlanName = (investment) =>
  investment?.plan?.name ||
  investment?.planName ||
  "Investment Plan";

const getCurrency = (item) =>
  item?.currencyCode ||
  item?.currency?.code ||
  item?.plan?.currencyCode ||
  "USD";

const getPrincipal = (investment) =>
  investment?.principal ??
  investment?.amount ??
  investment?.investedAmount ??
  null;

const getExpectedReturn = (investment) =>
  investment?.expectedReturn ??
  investment?.profit ??
  investment?.expectedProfit ??
  null;

const getMaturityValue = (investment) =>
  investment?.totalMaturityValue ??
  investment?.maturityValue ??
  null;

const getReturnRate = (plan) =>
  plan?.returnRate ??
  plan?.rate ??
  plan?.interestRate ??
  null;

const getMinimumAmount = (plan) =>
  plan?.minimumAmount ??
  plan?.minAmount ??
  null;

const getMaximumAmount = (plan) =>
  plan?.maximumAmount ??
  plan?.maxAmount ??
  null;

const getDurationDays = (plan) =>
  plan?.durationDays ??
  plan?.duration ??
  plan?.termDays ??
  null;

/* =========================================================
   COMPONENT
========================================================= */

const Investments = () => {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [btcConfig, setBtcConfig] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [plansLoading, setPlansLoading] = useState(true);
  const [btcLoading, setBtcLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [amount, setAmount] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedInvestment, setSelectedInvestment] =
    useState(null);

  const [transactionHash, setTransactionHash] = useState("");
  const [paymentProof, setPaymentProof] = useState(null);
  const [submittingPayment, setSubmittingPayment] =
    useState(false);

  const [copiedField, setCopiedField] = useState("");

  /* =======================================================
     COPY TO CLIPBOARD
  ======================================================= */

  const copyToClipboard = async (value, field) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedField(field);

      window.setTimeout(() => {
        setCopiedField("");
      }, 1800);
    } catch {
      setError("Unable to copy to clipboard.");
    }
  };

  /* =======================================================
     LOAD INVESTMENT PLANS
  ======================================================= */

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);

    try {
      const response = await api.get("/investments/plans", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const payload = getPayloadData(response);

      const items = normalizePayload(payload, [
        "items",
        "plans",
        "results",
        "records",
      ]);

      setPlans(Array.isArray(items) ? items : []);
    } catch (requestError) {
      setPlans([]);

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load investment plans.",
      );
    } finally {
      setPlansLoading(false);
    }
  }, []);

  /* =======================================================
     LOAD BTC PAYMENT CONFIG
  ======================================================= */

  const fetchBitcoinConfig = useCallback(async () => {
    setBtcLoading(true);

    try {
      const response = await api.get(
        "/investments/btc/payment-config",
      );

      const payload = getPayloadData(response);

      setBtcConfig(payload || null);
    } catch (requestError) {
      setBtcConfig(null);

      const status = requestError?.response?.status;

      if (status !== 404) {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load Bitcoin payment configuration.",
        );
      }
    } finally {
      setBtcLoading(false);
    }
  }, []);

  /* =======================================================
     LOAD USER INVESTMENTS
  ======================================================= */

  const fetchInvestments = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.get("/investments/fixed", {
          params: {
            page: 1,
            limit: 100,
          },
        });

        const payload = getPayloadData(response);

        const items = normalizePayload(payload, [
          "items",
          "investments",
          "results",
          "records",
        ]);

        setInvestments(Array.isArray(items) ? items : []);
      } catch (requestError) {
        setInvestments([]);

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load your investments.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    fetchPlans();
    fetchBitcoinConfig();
    fetchInvestments();
  }, [
    fetchPlans,
    fetchBitcoinConfig,
    fetchInvestments,
  ]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshAll = async () => {
    setRefreshing(true);
    setError("");
    setSuccess("");

    await Promise.all([
      fetchPlans(),
      fetchBitcoinConfig(),
      fetchInvestments(true),
    ]);

    setRefreshing(false);
  };

  /* =======================================================
     CREATE INVESTMENT
  ======================================================= */

  const openCreateInvestment = (plan) => {
    setError("");
    setSuccess("");
    setSelectedPlan(plan);
    setAmount("");
    setShowCreateForm(true);
  };

  const closeCreateInvestment = () => {
    if (creating) {
      return;
    }

    setShowCreateForm(false);
    setSelectedPlan(null);
    setAmount("");
  };

  const handleCreateInvestment = async (event) => {
    event.preventDefault();

    if (!selectedPlan?.id) {
      setError("Please select an investment plan.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid investment amount.");
      return;
    }

    const minimum = Number(
      getMinimumAmount(selectedPlan),
    );

    const maximum = Number(
      getMaximumAmount(selectedPlan),
    );

    if (Number.isFinite(minimum) && numericAmount < minimum) {
      setError(
        `Minimum investment amount is ${formatMoney(
          minimum,
          getCurrency(selectedPlan),
        )}.`,
      );
      return;
    }

    if (Number.isFinite(maximum) && numericAmount > maximum) {
      setError(
        `Maximum investment amount is ${formatMoney(
          maximum,
          getCurrency(selectedPlan),
        )}.`,
      );
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        "/investments/fixed",
        {
          planId: selectedPlan.id,
          amount: numericAmount,
        },
      );

      const payload = getPayloadData(response);

      const createdInvestment =
        payload?.investment ||
        payload?.item ||
        payload;

      setShowCreateForm(false);
      setSelectedPlan(null);
      setAmount("");

      setSuccess(
        "Investment created successfully. Complete the Bitcoin payment to continue.",
      );

      await fetchInvestments(true);

      if (createdInvestment?.id) {
        setSelectedInvestment(createdInvestment);
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to create the investment.",
      );
    } finally {
      setCreating(false);
    }
  };

  /* =======================================================
     SUBMIT BTC PAYMENT
  ======================================================= */

  const openPayment = (investment) => {
    setError("");
    setSuccess("");
    setTransactionHash("");
    setPaymentProof(null);
    setSelectedInvestment(investment);
  };

  const closePayment = () => {
    if (submittingPayment) {
      return;
    }

    setSelectedInvestment(null);
    setTransactionHash("");
    setPaymentProof(null);
  };

  const handlePaymentProofChange = (event) => {
    const file =
      event.target.files?.[0] || null;

    setError("");

    if (!file) {
      setPaymentProof(null);
      return;
    }

    const maxFileSize =
      10 * 1024 * 1024;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (file.size > maxFileSize) {
      event.target.value = "";
      setPaymentProof(null);
      setError(
        "Payment proof must be 10 MB or smaller.",
      );
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      event.target.value = "";
      setPaymentProof(null);
      setError(
        "Please upload a JPG, PNG, WebP, or PDF payment proof.",
      );
      return;
    }

    setPaymentProof(file);
  };

  const handleSubmitPayment = async (event) => {
    event.preventDefault();

    const investmentId =
      getInvestmentId(selectedInvestment);

    const normalizedHash =
      transactionHash.trim();

    if (!investmentId) {
      setError("Investment ID is missing.");
      return;
    }

    if (!normalizedHash) {
      setError(
        "Please enter your Bitcoin transaction hash.",
      );
      return;
    }

    if (normalizedHash.length < 20) {
      setError(
        "Please provide a valid Bitcoin transaction hash.",
      );
      return;
    }

    if (!paymentProof) {
      setError(
        "Please upload a screenshot or photo of your payment proof.",
      );
      return;
    }

    const maxFileSize =
      10 * 1024 * 1024;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (paymentProof.size > maxFileSize) {
      setError(
        "Payment proof must be 10 MB or smaller.",
      );
      return;
    }

    if (!allowedTypes.includes(paymentProof.type)) {
      setError(
        "Please upload a JPG, PNG, WebP, or PDF payment proof.",
      );
      return;
    }

    setSubmittingPayment(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      formData.append(
        "transactionHash",
        normalizedHash,
      );

      formData.append(
        "paymentProof",
        paymentProof,
      );

      await api.post(
        `/investments/fixed/${encodeURIComponent(
          investmentId,
        )}/payment`,
        formData,
      );

      setSelectedInvestment(null);
      setTransactionHash("");
      setPaymentProof(null);

      setSuccess(
        "Bitcoin payment proof submitted successfully. Your payment will be reviewed before the investment becomes active.",
      );

      await fetchInvestments(true);
    } catch (requestError) {
      const status =
        requestError?.response?.status;

      if (status === 401) {
        setError(
          "Your login session has expired. Please log out and log back in, then submit the payment proof again.",
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to submit Bitcoin payment proof.",
        );
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    let principal = 0;
    let expectedReturn = 0;
    let maturityValue = 0;

    let pendingPayment = 0;
    let submitted = 0;
    let active = 0;
    let matured = 0;

    const currencies = new Set();

    investments.forEach((investment) => {
      const principalValue = Number(
        getPrincipal(investment),
      );

      const returnValue = Number(
        getExpectedReturn(investment),
      );

      const maturityValueNumber = Number(
        getMaturityValue(investment),
      );

      if (Number.isFinite(principalValue)) {
        principal += principalValue;
      }

      if (Number.isFinite(returnValue)) {
        expectedReturn += returnValue;
      }

      if (Number.isFinite(maturityValueNumber)) {
        maturityValue += maturityValueNumber;
      }

      const currency = getCurrency(investment);

      if (currency) {
        currencies.add(currency);
      }

      const status = getStatus(investment);

      if (status === "PENDING_PAYMENT") {
        pendingPayment += 1;
      }

      if (
        status === "PAYMENT_SUBMITTED" ||
        status === "UNDER_REVIEW"
      ) {
        submitted += 1;
      }

      if (status === "ACTIVE") {
        active += 1;
      }

      if (status === "MATURED") {
        matured += 1;
      }
    });

    return {
      principal,
      expectedReturn,
      maturityValue,
      pendingPayment,
      submitted,
      active,
      matured,
      currencies: Array.from(currencies),
    };
  }, [investments]);

  const primaryCurrency =
    summary.currencies[0] || "USD";

  /* =======================================================
     BTC CALCULATION PREVIEW
  ======================================================= */

  const previewBtcAmount = useMemo(() => {
    const principal = Number(amount);
    const btcRate = Number(btcConfig?.btcRate);

    if (
      !Number.isFinite(principal) ||
      principal <= 0 ||
      !Number.isFinite(btcRate) ||
      btcRate <= 0
    ) {
      return null;
    }

    return principal / btcRate;
  }, [amount, btcConfig]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-100/70 blur-3xl dark:bg-orange-950/30" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                  <Bitcoin size={25} />
                </div>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Investments
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                  Choose a fixed-term investment plan, fund
                  it with Bitcoin, and track its progress from
                  your Epex Bank account.
                </p>
              </div>

              <button
                type="button"
                onClick={refreshAll}
                disabled={loading || refreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing ? "animate-spin" : ""
                  }
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-start justify-between gap-4">
              <p>{error}</p>

              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          </section>
        )}

        {success && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <p>{success}</p>
              </div>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="shrink-0 rounded-lg p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                aria-label="Dismiss success message"
              >
                <X size={16} />
              </button>
            </div>
          </section>
        )}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Invested principal
              </p>

              <Wallet
                size={19}
                className="text-blue-600"
              />
            </div>

            <p className="mt-3 text-2xl font-bold">
              {loading
                ? "â€”"
                : formatMoney(
                    summary.principal,
                    primaryCurrency,
                  )}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Across your fixed-term investments
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Expected return
              </p>

              <CheckCircle2
                size={19}
                className="text-emerald-600"
              />
            </div>

            <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading
                ? "â€”"
                : formatMoney(
                    summary.expectedReturn,
                    primaryCurrency,
                  )}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Based on your investment plans
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Maturity value
              </p>

              <CalendarDays
                size={19}
                className="text-violet-600"
              />
            </div>

            <p className="mt-3 text-2xl font-bold">
              {loading
                ? "â€”"
                : formatMoney(
                    summary.maturityValue,
                    primaryCurrency,
                  )}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Principal plus expected return
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Investment status
              </p>

              <Clock3
                size={19}
                className="text-amber-600"
              />
            </div>

            <p className="mt-3 text-2xl font-bold">
              {loading
                ? "â€”"
                : summary.active}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {summary.pendingPayment} awaiting payment Â·{" "}
              {summary.submitted} submitted
            </p>
          </div>
        </section>

        {/* =================================================
            BTC PAYMENT CONFIG
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-sm dark:border-orange-900/40 dark:bg-slate-900">
          <div className="border-b border-orange-100 bg-orange-50/70 p-5 dark:border-orange-900/30 dark:bg-orange-950/20 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                <Bitcoin size={22} />
              </div>

              <div>
                <h2 className="text-lg font-bold">
                  Bitcoin investment funding
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Bitcoin payments are sent externally to the
                  configured receiving address. After sending
                  the payment, submit your transaction hash for
                  review.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {btcLoading ? (
              <div className="space-y-3">
                <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : btcConfig?.btcAddress ? (
              <div className="space-y-4">

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bitcoin receiving address
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm break-all dark:border-slate-700 dark:bg-slate-950">
                      {btcConfig.btcAddress}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          btcConfig.btcAddress,
                          "address",
                        )
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {copiedField === "address" ? (
                        <>
                          <Check size={16} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy address
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {btcConfig.btcRate && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Configured BTC rate
                      </span>

                      <span className="font-bold">
                        {formatMoney(
                          btcConfig.btcRate,
                          primaryCurrency,
                        )}{" "}
                        / BTC
                      </span>
                    </div>
                  </div>
                )}

                {btcConfig.instructions && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                    <p className="font-bold">
                      Payment instructions
                    </p>

                    <p className="mt-1 whitespace-pre-wrap">
                      {btcConfig.instructions}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <p>
                    Your investment is not activated merely
                    because a transaction hash is submitted.
                    Bitcoin payment verification is required
                    before the investment can become active.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                Bitcoin investment funding is currently
                unavailable because the payment configuration
                has not been completed.
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            INVESTMENT PLANS
        ================================================= */}

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Investment plans
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose an available fixed-term plan and fund
                it with Bitcoin.
              </p>
            </div>

            <Link
              to="/investments/history"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <History size={16} />
              Investment history
            </Link>
          </div>

          {plansLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800"
                  />
                ),
              )}
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <PackageOpen size={26} />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                No investment plans available
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                There are currently no active fixed-term
                investment plans available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => {
                const currency = getCurrency(plan);
                const minimum = getMinimumAmount(plan);
                const maximum = getMaximumAmount(plan);
                const rate = getReturnRate(plan);
                const duration = getDurationDays(plan);

                return (
                  <article
                    key={plan.id}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
                  >
                    <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            <LockKeyhole size={20} />
                          </div>

                          <h3 className="mt-4 text-lg font-bold">
                            {plan.name}
                          </h3>
                        </div>

                        {rate !== null &&
                          rate !== undefined && (
                            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-950/30">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Return
                              </p>

                              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                {formatPercentage(rate)}
                              </p>
                            </div>
                          )}
                      </div>

                      {plan.description && (
                        <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 p-5">

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Minimum
                        </span>

                        <span className="text-sm font-bold">
                          {minimum !== null &&
                          minimum !== undefined
                            ? formatMoney(
                                minimum,
                                currency,
                              )
                            : "No minimum"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Maximum
                        </span>

                        <span className="text-sm font-bold">
                          {maximum !== null &&
                          maximum !== undefined
                            ? formatMoney(
                                maximum,
                                currency,
                              )
                            : "No maximum"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Duration
                        </span>

                        <span className="text-sm font-bold">
                          {duration
                            ? `${formatNumber(
                                duration,
                                0,
                              )} days`
                            : "â€”"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate("/investments/buy")}
                        disabled={!btcConfig?.btcAddress}
                        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus size={17} />
                        Start investment
                      </button>

                      {!btcConfig?.btcAddress && (
                        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
                          Bitcoin payment configuration is
                          unavailable.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* =================================================
            USER INVESTMENTS
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold">
                Your investments
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Track your fixed-term investment applications,
                payments, and maturity.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchInvestments(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 p-5 sm:p-6">
              {Array.from({ length: 3 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                  />
                ),
              )}
            </div>
          ) : investments.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Wallet size={26} />
              </div>

              <h3 className="mt-5 text-lg font-bold">
                No fixed-term investments yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Choose one of the investment plans above to
                create your first fixed-term investment.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1000px] text-left">
                  <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Investment
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Principal
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        BTC
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Maturity
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {investments.map(
                      (investment) => {
                        const id =
                          getInvestmentId(
                            investment,
                          );

                        const status =
                          getStatus(
                            investment,
                          );

                        const currency =
                          getCurrency(
                            investment,
                          );

                        return (
                          <tr
                            key={
                              id ||
                              getInvestmentReference(
                                investment,
                              )
                            }
                            className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50"
                          >
                            <td className="px-6 py-5">
                              <p className="font-semibold">
                                {getPlanName(
                                  investment,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {getInvestmentReference(
                                  investment,
                                )}
                              </p>
                            </td>

                            <td className="px-6 py-5 text-sm font-semibold">
                              {formatMoney(
                                getPrincipal(
                                  investment,
                                ),
                                currency,
                              )}
                            </td>

                            <td className="px-6 py-5">
                              <p className="font-mono text-sm font-semibold">
                                {formatNumber(
                                  investment?.btcAmount,
                                  8,
                                )}{" "}
                                BTC
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {investment?.btcAddress
                                  ? "Payment address assigned"
                                  : "â€”"}
                              </p>
                            </td>

                            <td className="px-6 py-5 text-sm">
                              {investment?.maturityDate
                                ? formatDate(
                                    investment.maturityDate,
                                  )
                                : "Not active yet"}
                            </td>

                            <td className="px-6 py-5">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                                  status,
                                )}`}
                              >
                                {getStatusLabel(
                                  status,
                                )}
                              </span>
                            </td>

                            <td className="px-6 py-5 text-right">
                              {status ===
                                "PENDING_PAYMENT" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openPayment(
                                      investment,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
                                >
                                  Pay / Submit
                                  <ArrowRight
                                    size={15}
                                  />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedInvestment(
                                      investment,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                  Details
                                  <ArrowRight
                                    size={15}
                                  />
                                </button>
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
              <div className="space-y-3 p-4 md:hidden">
                {investments.map(
                  (investment) => {
                    const id =
                      getInvestmentId(
                        investment,
                      );

                    const status =
                      getStatus(
                        investment,
                      );

                    const currency =
                      getCurrency(
                        investment,
                      );

                    return (
                      <div
                        key={
                          id ||
                          getInvestmentReference(
                            investment,
                          )
                        }
                        className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-bold">
                              {getPlanName(
                                investment,
                              )}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {getInvestmentReference(
                                investment,
                              )}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
                              status,
                            )}`}
                          >
                            {getStatusLabel(
                              status,
                            )}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                            <p className="text-[11px] font-medium text-slate-500">
                              Principal
                            </p>

                            <p className="mt-1 text-sm font-bold">
                              {formatMoney(
                                getPrincipal(
                                  investment,
                                ),
                                currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                            <p className="text-[11px] font-medium text-slate-500">
                              Expected return
                            </p>

                            <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(
                                getExpectedReturn(
                                  investment,
                                ),
                                currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                            <p className="text-[11px] font-medium text-slate-500">
                              BTC required
                            </p>

                            <p className="mt-1 break-all font-mono text-sm font-bold">
                              {formatNumber(
                                investment?.btcAmount,
                                8,
                              )}{" "}
                              BTC
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                            <p className="text-[11px] font-medium text-slate-500">
                              Maturity
                            </p>

                            <p className="mt-1 text-sm font-bold">
                              {investment?.maturityDate
                                ? formatDate(
                                    investment.maturityDate,
                                  )
                                : "Pending"}
                            </p>
                          </div>
                        </div>

                        {status ===
                          "PENDING_PAYMENT" && (
                          <button
                            type="button"
                            onClick={() =>
                              openPayment(
                                investment,
                              )
                            }
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
                          >
                            <Bitcoin size={17} />
                            Complete Bitcoin payment
                          </button>
                        )}

                        {status !==
                          "PENDING_PAYMENT" && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedInvestment(
                                investment,
                              )
                            }
                            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                          >
                            View investment details
                            <ArrowRight
                              size={16}
                            />
                          </button>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}
        </section>

        {/* =================================================
            INFORMATION
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <h3 className="text-sm font-bold">
                Investment information
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Fixed-term investments are subject to the
                applicable plan terms. Bitcoin payments are
                reviewed before an investment becomes active.
                Always confirm the amount and receiving address
                before sending cryptocurrency.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ===================================================
          CREATE INVESTMENT MODAL
      =================================================== */}

      {showCreateForm && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <LockKeyhole size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold">
                      Start investment
                    </h2>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedPlan.name}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateInvestment}
                disabled={creating}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={handleCreateInvestment}
              className="space-y-5 p-5 sm:p-6"
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Return
                    </p>

                    <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPercentage(
                        getReturnRate(
                          selectedPlan,
                        ),
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Duration
                    </p>

                    <p className="mt-1 font-bold">
                      {getDurationDays(
                        selectedPlan,
                      )
                        ? `${formatNumber(
                            getDurationDays(
                              selectedPlan,
                            ),
                            0,
                          )} days`
                        : "â€”"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="investment-amount"
                  className="mb-2 block text-sm font-bold"
                >
                  Investment amount
                </label>

                <div className="relative">
                  <input
                    id="investment-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value,
                      )
                    }
                    placeholder="Enter amount"
                    disabled={creating}
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-base font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    {getCurrency(
                      selectedPlan,
                    )}
                  </span>
                </div>

                <div className="mt-2 flex justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Minimum:{" "}
                    {getMinimumAmount(
                      selectedPlan,
                    ) !== null &&
                    getMinimumAmount(
                      selectedPlan,
                    ) !== undefined
                      ? formatMoney(
                          getMinimumAmount(
                            selectedPlan,
                          ),
                          getCurrency(
                            selectedPlan,
                          ),
                        )
                      : "â€”"}
                  </span>

                  <span>
                    Maximum:{" "}
                    {getMaximumAmount(
                      selectedPlan,
                    ) !== null &&
                    getMaximumAmount(
                      selectedPlan,
                    ) !== undefined
                      ? formatMoney(
                          getMaximumAmount(
                            selectedPlan,
                          ),
                          getCurrency(
                            selectedPlan,
                          ),
                        )
                      : "No limit"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
                <div className="flex items-start gap-3">
                  <Bitcoin
                    size={20}
                    className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      Estimated Bitcoin payment
                    </p>

                    <p className="mt-1 break-all font-mono text-lg font-bold text-orange-700 dark:text-orange-300">
                      {previewBtcAmount !== null
                        ? `${formatNumber(
                            previewBtcAmount,
                            8,
                          )} BTC`
                        : "Enter an amount"}
                    </p>

                    {btcConfig?.btcRate && (
                      <p className="mt-1 text-xs leading-5 text-orange-700/80 dark:text-orange-300/80">
                        Based on the currently configured
                        BTC rate of{" "}
                        {formatMoney(
                          btcConfig.btcRate,
                          getCurrency(
                            selectedPlan,
                          ),
                        )}{" "}
                        per BTC.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Creating this investment does not activate
                  it immediately. You will receive the Bitcoin
                  payment details after creation and must
                  submit your transaction hash for payment
                  review.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateInvestment}
                  disabled={creating}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creating ||
                    !amount ||
                    !btcConfig?.btcAddress
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create investment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          INVESTMENT / PAYMENT DETAILS MODAL
      =================================================== */}

      {selectedInvestment && !showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <div>
                <h2 className="text-lg font-bold">
                  Investment details
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {getInvestmentReference(
                    selectedInvestment,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={closePayment}
                disabled={submittingPayment}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">

              {/* Status */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Current status
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {getStatusLabel(
                      getStatus(
                        selectedInvestment,
                      ),
                    )}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                    getStatus(
                      selectedInvestment,
                    ),
                  )}`}
                >
                  {getStatusLabel(
                    getStatus(
                      selectedInvestment,
                    ),
                  )}
                </span>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-[11px] text-slate-500">
                    Plan
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {getPlanName(
                      selectedInvestment,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-[11px] text-slate-500">
                    Principal
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {formatMoney(
                      getPrincipal(
                        selectedInvestment,
                      ),
                      getCurrency(
                        selectedInvestment,
                      ),
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-[11px] text-slate-500">
                    Expected return
                  </p>

                  <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(
                      getExpectedReturn(
                        selectedInvestment,
                      ),
                      getCurrency(
                        selectedInvestment,
                      ),
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-[11px] text-slate-500">
                    Maturity value
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {formatMoney(
                      getMaturityValue(
                        selectedInvestment,
                      ),
                      getCurrency(
                        selectedInvestment,
                      ),
                    )}
                  </p>
                </div>
              </div>

              {/* Pending payment */}
              {getStatus(
                selectedInvestment,
              ) === "PENDING_PAYMENT" && (
                <div className="space-y-5 rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/40 dark:bg-orange-950/20">

                  <div>
                    <div className="flex items-center gap-2">
                      <Bitcoin
                        size={20}
                        className="text-orange-600 dark:text-orange-400"
                      />

                      <h3 className="font-bold">
                        Complete Bitcoin payment
                      </h3>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-orange-800/80 dark:text-orange-300/80">
                      Send the exact Bitcoin amount shown
                      below to the assigned receiving address.
                      After sending it externally, enter the
                      transaction hash and submit it for review.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                      BTC amount required
                    </p>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-white p-4 dark:border-orange-900/40 dark:bg-slate-900">
                      <span className="break-all font-mono text-lg font-bold">
                        {formatNumber(
                          selectedInvestment?.btcAmount,
                          8,
                        )}{" "}
                        BTC
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            selectedInvestment?.btcAmount,
                            "btcAmount",
                          )
                        }
                        className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Copy BTC amount"
                      >
                        {copiedField ===
                        "btcAmount" ? (
                          <Check size={16} />
                        ) : (
                          <Clipboard size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                      Send BTC to
                    </p>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-white px-4 py-3 font-mono text-sm break-all dark:border-orange-900/40 dark:bg-slate-900">
                        {selectedInvestment?.btcAddress ||
                          btcConfig?.btcAddress ||
                          "â€”"}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            selectedInvestment?.btcAddress ||
                              btcConfig?.btcAddress,
                            "investmentAddress",
                          )
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {copiedField ===
                        "investmentAddress" ? (
                          <>
                            <Check size={16} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={
                      handleSubmitPayment
                    }
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="payment-proof"
                        className="mb-2 block text-sm font-bold"
                      >
                        Payment screenshot / photo
                      </label>

                      <input
                        id="payment-proof"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        disabled={
                          submittingPayment
                        }
                        onChange={
                          handlePaymentProofChange
                        }
                        className="block min-h-12 w-full cursor-pointer rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-orange-700 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-orange-900/40 dark:bg-slate-900 dark:file:bg-orange-950/40 dark:file:text-orange-300"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Upload a screenshot or photo showing
                        your Bitcoin payment. JPG, PNG, WebP,
                        and PDF are accepted. Maximum 10 MB.
                      </p>

                      {paymentProof && (
                        <p className="mt-2 break-all text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Selected:{" "}
                          {paymentProof.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="transaction-hash"
                        className="mb-2 block text-sm font-bold"
                      >
                        Bitcoin transaction hash
                      </label>

                      <textarea
                        id="transaction-hash"
                        value={transactionHash}
                        onChange={(event) =>
                          setTransactionHash(
                            event.target.value,
                          )
                        }
                        placeholder="Paste your Bitcoin transaction hash here"
                        rows={3}
                        disabled={
                          submittingPayment
                        }
                        className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-orange-900/40 dark:bg-slate-900"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        The transaction hash is used as
                        payment proof. It does not by itself
                        mean the payment has been verified.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        submittingPayment ||
                        transactionHash.trim()
                          .length < 20 ||
                        !paymentProof
                      }
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingPayment ? (
                        <>
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                          Submitting payment proof...
                        </>
                      ) : (
                        <>
                          <Check size={17} />
                          Submit payment proof
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Payment submitted */}
              {[
                "PAYMENT_SUBMITTED",
                "UNDER_REVIEW",
              ].includes(
                getStatus(
                  selectedInvestment,
                ),
              ) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <Clock3
                      size={20}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>
                      <h3 className="font-bold">
                        Payment submitted
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-amber-800/80 dark:text-amber-300/80">
                        Your Bitcoin transaction hash has
                        been submitted successfully. The
                        payment must be reviewed before the
                        investment can become active.
                      </p>

                      {selectedInvestment?.transactionHash && (
                        <div className="mt-4 rounded-xl bg-white p-3 dark:bg-slate-900">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Transaction hash
                          </p>

                          <p className="mt-1 break-all font-mono text-xs">
                            {
                              selectedInvestment.transactionHash
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Active */}
              {getStatus(
                selectedInvestment,
              ) === "ACTIVE" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div>
                      <h3 className="font-bold">
                        Investment is active
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-emerald-800/80 dark:text-emerald-300/80">
                        Your payment has been processed and
                        the investment is currently active.
                      </p>

                      {selectedInvestment?.startDate && (
                        <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Started:{" "}
                          {formatDate(
                            selectedInvestment.startDate,
                          )}
                        </p>
                      )}

                      {selectedInvestment?.maturityDate && (
                        <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Maturity:{" "}
                          {formatDate(
                            selectedInvestment.maturityDate,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Matured */}
              {getStatus(
                selectedInvestment,
              ) === "MATURED" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />

                    <div>
                      <h3 className="font-bold">
                        Investment matured
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-blue-800/80 dark:text-blue-300/80">
                        This fixed-term investment has reached
                        its maturity date.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejected */}
              {getStatus(
                selectedInvestment,
              ) === "REJECTED" && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <div className="flex items-start gap-3">
                    <XCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-rose-600"
                    />

                    <div>
                      <h3 className="font-bold">
                        Investment rejected
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-rose-800/80 dark:text-rose-300/80">
                        This investment was rejected during
                        review.
                      </p>

                      {selectedInvestment?.rejectionReason && (
                        <div className="mt-3 rounded-xl bg-white p-3 text-sm dark:bg-slate-900">
                          <p className="font-bold">
                            Reason
                          </p>

                          <p className="mt-1 text-slate-600 dark:text-slate-400">
                            {
                              selectedInvestment.rejectionReason
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Created
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {formatDateTime(
                      selectedInvestment?.createdAt,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last updated
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {formatDateTime(
                      selectedInvestment?.updatedAt,
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closePayment}
                disabled={submittingPayment}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;