import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";

const PAGE_SIZE = 12;

const normalizeInvestments = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.investments)) {
    return payload.investments;
  }

  if (Array.isArray(payload?.orders)) {
    return payload.orders;
  }

  if (Array.isArray(payload?.holdings)) {
    return payload.holdings;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.investments)) {
    return payload.data.investments;
  }

  if (Array.isArray(payload?.data?.orders)) {
    return payload.data.orders;
  }

  if (Array.isArray(payload?.data?.holdings)) {
    return payload.data.holdings;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.records)) {
    return payload.records;
  }

  return [];
};

const getCustomer = (investment) => {
  const customer =
    investment?.user ||
    investment?.customer ||
    investment?.owner ||
    investment?.account?.user ||
    investment?.account?.customer ||
    null;

  return {
    id:
      customer?.id ||
      investment?.userId ||
      investment?.customerId ||
      investment?.account?.userId ||
      "",
    name:
      customer?.name ||
      customer?.fullName ||
      [customer?.firstName, customer?.lastName]
        .filter(Boolean)
        .join(" ") ||
      customer?.email ||
      "Customer",
    email: customer?.email || "",
  };
};

const getInvestmentId = (investment) =>
  investment?.id ||
  investment?.investmentId ||
  investment?.orderId ||
  investment?.holdingId ||
  "";

const getProductName = (investment) =>
  investment?.plan?.name ||
  investment?.investmentPlan?.name ||
  investment?.product?.name ||
  investment?.investmentProduct?.name ||
  investment?.productName ||
  investment?.investmentName ||
  investment?.name ||
  "Investment";

const getProductType = (investment) => {
  if (
    investment?.fundingMethod ||
    investment?.paymentStatus ||
    investment?.btcAddress ||
    investment?.btcAmount ||
    investment?.transactionHash
  ) {
    return "BTC FIXED TERM";
  }

  return String(
    investment?.product?.type ||
      investment?.investmentProduct?.type ||
      investment?.type ||
      investment?.investmentType ||
      "INVESTMENT",
  ).toUpperCase();
};

const getStatus = (investment) =>
  String(
    investment?.status ||
      investment?.orderStatus ||
      investment?.holdingStatus ||
      "UNKNOWN",
  ).toUpperCase();

const getPaymentStatus = (investment) =>
  String(
    investment?.paymentStatus ||
      investment?.payment?.status ||
      "",
  ).toUpperCase();

const isBtcInvestment = (investment) =>
  String(investment?.fundingMethod || "").toUpperCase() === "BTC" ||
  Boolean(
    investment?.btcAddress ||
      investment?.btcAmount ||
      investment?.transactionHash ||
      investment?.paymentStatus,
  );

const requiresBtcReview = (investment) => {
  const status = getStatus(investment);
  const paymentStatus = getPaymentStatus(investment);

  return (
    isBtcInvestment(investment) &&
    (status === "PAYMENT_SUBMITTED" ||
      status === "UNDER_REVIEW" ||
      paymentStatus === "SUBMITTED")
  );
};

const getCurrency = (investment) => {
  if (typeof investment?.currency === "string") {
    return investment.currency.toUpperCase();
  }

  return String(
    investment?.currency?.code ||
      investment?.currencyCode ||
      investment?.plan?.currencyCode ||
      investment?.investmentPlan?.currencyCode ||
      investment?.product?.currency?.code ||
      investment?.investmentProduct?.currency?.code ||
      "USD",
  ).toUpperCase();
};

const getAmount = (investment) => {
  const amount = Number(
    investment?.amount ??
      investment?.principal ??
      investment?.investedAmount ??
      investment?.purchaseAmount ??
      investment?.orderAmount ??
      investment?.currentValue ??
      0,
  );

  return Number.isFinite(amount) ? amount : 0;
};

const getCurrentValue = (investment) => {
  const value = Number(
    investment?.totalMaturityValue ??
      investment?.currentValue ??
      investment?.marketValue ??
      investment?.value ??
      investment?.holdingValue ??
      investment?.principal ??
      investment?.amount ??
      0,
  );

  return Number.isFinite(value) ? value : 0;
};

const getQuantity = (investment) => {
  const quantity = Number(
    investment?.quantity ??
      investment?.units ??
      investment?.shares ??
      investment?.unitsHeld ??
      0,
  );

  return Number.isFinite(quantity) ? quantity : 0;
};

const getReference = (investment) =>
  investment?.reference ||
  investment?.orderReference ||
  investment?.investmentReference ||
  investment?.transactionReference ||
  "—";

const getTimestamp = (investment) =>
  investment?.paymentSubmittedAt ||
  investment?.createdAt ||
  investment?.orderedAt ||
  investment?.purchasedAt ||
  investment?.updatedAt ||
  null;

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency).toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatNumber = (value, maximumFractionDigits = 8) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(amount);
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatLabel = (value) =>
  String(value || "—")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const statusClass = (status) => {
  switch (String(status).toUpperCase()) {
    case "ACTIVE":
    case "COMPLETED":
    case "EXECUTED":
    case "SETTLED":
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PAYMENT_SUBMITTED":
    case "UNDER_REVIEW":
    case "PENDING_PAYMENT":
    case "PENDING":
    case "PROCESSING":
    case "SUBMITTED":
    case "AWAITING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FAILED":
    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
    case "SUSPENDED":
      return "border-red-200 bg-red-50 text-red-700";

    case "CLOSED":
    case "MATURED":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const paymentStatusClass = (status) => {
  switch (String(status).toUpperCase()) {
    case "VERIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "SUBMITTED":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const normalizeBtcConfig = (payload) => {
  const source =
    payload?.data ??
    payload?.config ??
    payload?.paymentConfig ??
    payload ??
    {};

  return {
    id: source?.id || "",
    btcAddress: source?.btcAddress || "",
    btcRate: source?.btcRate ?? "",
    instructions: source?.instructions || "",
    isActive: Boolean(source?.isActive),
    updatedAt: source?.updatedAt || source?.createdAt || null,
  };
};

const AdminInvestments = () => {
  const navigate = useNavigate();

  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [btcConfig, setBtcConfig] = useState(null);
  const [btcConfigLoading, setBtcConfigLoading] = useState(true);
  const [btcConfigSaving, setBtcConfigSaving] = useState(false);
  const [btcConfigError, setBtcConfigError] = useState("");
  const [btcConfigMessage, setBtcConfigMessage] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [btcRate, setBtcRate] = useState("");
  const [btcInstructions, setBtcInstructions] = useState("");
  const [btcEnabled, setBtcEnabled] = useState(false);

  const loadInvestments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/admin/investments");

      const records = normalizeInvestments(response?.data);

      setInvestments(records);
      setPage(1);
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to load investment records.";

      setError(message);
      setInvestments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadBtcConfig = useCallback(async () => {
    setBtcConfigLoading(true);
    setBtcConfigError("");
    setBtcConfigMessage("");

    try {
      const response = await api.get("/admin/investments/btc/payment-config");
      const config = normalizeBtcConfig(response?.data);

      setBtcConfig(config);
      setBtcAddress(config.btcAddress);
      setBtcRate(config.btcRate === "" ? "" : String(config.btcRate));
      setBtcInstructions(config.instructions);
      setBtcEnabled(config.isActive);
    } catch (requestError) {
      const status = requestError?.response?.status;
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to load Bitcoin payment configuration.";

      if (status === 404) {
        setBtcConfig(null);
        setBtcAddress("");
        setBtcRate("");
        setBtcInstructions("");
        setBtcEnabled(false);
        setBtcConfigError(
          "No Bitcoin payment configuration is currently active. Configure the receiving address and rate below.",
        );
      } else {
        setBtcConfigError(message);
      }
    } finally {
      setBtcConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvestments();
    loadBtcConfig();
  }, [loadInvestments, loadBtcConfig]);

  const saveBtcConfig = async (event) => {
    event.preventDefault();

    setBtcConfigSaving(true);
    setBtcConfigError("");
    setBtcConfigMessage("");

    const trimmedAddress = btcAddress.trim();
    const trimmedRate = String(btcRate).trim();
    const numericRate = Number(trimmedRate);

    if (btcEnabled && !trimmedAddress) {
      setBtcConfigError(
        "A Bitcoin receiving address is required when Bitcoin investment payments are enabled.",
      );
      setBtcConfigSaving(false);
      return;
    }

    if (
      btcEnabled &&
      (!trimmedRate ||
        !Number.isFinite(numericRate) ||
        numericRate <= 0)
    ) {
      setBtcConfigError(
        "Enter a valid positive BTC rate before enabling Bitcoin investment payments.",
      );
      setBtcConfigSaving(false);
      return;
    }

    try {
      const response = await api.put(
        "/admin/investments/btc/payment-config",
        {
          btcAddress: trimmedAddress,
          btcRate: trimmedRate,
          instructions: btcInstructions.trim(),
          isActive: btcEnabled,
        },
      );

      const config = normalizeBtcConfig(response?.data);

      setBtcConfig(config);
      setBtcAddress(config.btcAddress);
      setBtcRate(config.btcRate === "" ? "" : String(config.btcRate));
      setBtcInstructions(config.instructions);
      setBtcEnabled(config.isActive);
      setBtcConfigMessage(
        "Bitcoin investment payment configuration updated successfully.",
      );
    } catch (requestError) {
      setBtcConfigError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to update Bitcoin payment configuration.",
      );
    } finally {
      setBtcConfigSaving(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, paymentFilter]);

  const statuses = useMemo(() => {
    const values = new Set();

    investments.forEach((investment) => {
      const status = getStatus(investment);

      if (status) {
        values.add(status);
      }
    });

    return Array.from(values).sort();
  }, [investments]);

  const productTypes = useMemo(() => {
    const values = new Set();

    investments.forEach((investment) => {
      const type = getProductType(investment);

      if (type) {
        values.add(type);
      }
    });

    return Array.from(values).sort();
  }, [investments]);

  const filteredInvestments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return investments.filter((investment) => {
      const customer = getCustomer(investment);
      const product = getProductName(investment);
      const type = getProductType(investment);
      const status = getStatus(investment);
      const paymentStatus = getPaymentStatus(investment);
      const reference = getReference(investment);
      const investmentId = getInvestmentId(investment);

      const searchableText = [
        customer.name,
        customer.email,
        product,
        type,
        status,
        paymentStatus,
        reference,
        investmentId,
        investment?.productId,
        investment?.planId,
        investment?.accountNumber,
        investment?.account?.accountNumber,
        investment?.transactionHash,
        investment?.btcAddress,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      const matchesType =
        typeFilter === "ALL" || type === typeFilter;

      const matchesPayment =
        paymentFilter === "ALL" ||
        paymentStatus === paymentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesPayment
      );
    });
  }, [
    investments,
    search,
    statusFilter,
    typeFilter,
    paymentFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvestments.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleInvestments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredInvestments.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [currentPage, filteredInvestments]);

  const summary = useMemo(() => {
    let active = 0;
    let pending = 0;
    let completed = 0;
    let restricted = 0;
    let btcPendingReview = 0;

    const valuesByCurrency = new Map();

    investments.forEach((investment) => {
      const status = getStatus(investment);
      const currency = getCurrency(investment);
      const amount = getCurrentValue(investment);

      if (
        status === "ACTIVE" ||
        status === "EXECUTED" ||
        status === "SETTLED"
      ) {
        active += 1;
      }

      if (
        status === "PENDING" ||
        status === "PENDING_PAYMENT" ||
        status === "PAYMENT_SUBMITTED" ||
        status === "UNDER_REVIEW" ||
        status === "PROCESSING" ||
        status === "SUBMITTED" ||
        status === "AWAITING"
      ) {
        pending += 1;
      }

      if (
        status === "COMPLETED" ||
        status === "SETTLED" ||
        status === "EXECUTED" ||
        status === "MATURED"
      ) {
        completed += 1;
      }

      if (
        status === "SUSPENDED" ||
        status === "CANCELLED" ||
        status === "CANCELED" ||
        status === "REJECTED"
      ) {
        restricted += 1;
      }

      if (requiresBtcReview(investment)) {
        btcPendingReview += 1;
      }

      if (amount > 0) {
        valuesByCurrency.set(
          currency,
          (valuesByCurrency.get(currency) || 0) + amount,
        );
      }
    });

    return {
      total: investments.length,
      active,
      pending,
      completed,
      restricted,
      btcPendingReview,
      valuesByCurrency,
    };
  }, [investments]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setPaymentFilter("ALL");
    setPage(1);
  };

  const openInvestment = (investment) => {
    const investmentId = getInvestmentId(investment);

    if (!investmentId) {
      return;
    }

    navigate(
      `/admin/investments/${encodeURIComponent(
        investmentId,
      )}`,
    );
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />

              <p className="mt-4 font-semibold text-slate-950">
                Loading investments
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Retrieving live investment records from the Epex Bank API.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !investments.length) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              Investments unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadInvestments()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Protected investment administration
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Investments
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Manage investment products, customer investments,
                BTC payment submissions and investment activity using
                live records from the Epex Bank platform.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadInvestments(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </section>

        {summary.btcPendingReview > 0 ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold text-amber-900">
                    BTC payment review required
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {summary.btcPendingReview} BTC investment
                    {summary.btcPendingReview === 1 ? "" : "s"} have
                    submitted payment information and require admin
                    verification before activation.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Investment data warning
              </p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Investment records
              </p>

              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {investments.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Active / settled
              </p>

              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.active}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Pending
              </p>

              <Clock3 className="h-5 w-5 text-amber-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                BTC review
              </p>

              <WalletCards className="h-5 w-5 text-amber-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.btcPendingReview}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Restricted
              </p>

              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.restricted}
            </p>
          </div>
        </section>

        {summary.valuesByCurrency.size > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from(summary.valuesByCurrency.entries())
              .slice(0, 4)
              .map(([currency, amount]) => (
                <div
                  key={currency}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Investment value
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatMoney(amount, currency)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {currency} records returned by the API
                  </p>
                </div>
              ))}
          </section>
        ) : null}

        <section className="rounded-3xl border border-orange-200 bg-white shadow-sm">
          <div className="border-b border-orange-100 bg-orange-50/60 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                  <WalletCards className="h-5 w-5" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-950">
                      Bitcoin payment configuration
                    </h2>

                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        btcEnabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {btcEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    Configure the Bitcoin receiving details shown to customers
                    when they create a BTC-funded investment. Only use a
                    receiving address your business controls or is authorized
                    to use.
                  </p>
                </div>
              </div>

              {btcConfig?.updatedAt ? (
                <p className="text-xs text-slate-500">
                  Last updated {formatDateTime(btcConfig.updatedAt)}
                </p>
              ) : null}
            </div>
          </div>

          {btcConfigLoading ? (
            <div className="flex min-h-48 items-center justify-center p-6">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading Bitcoin payment configuration...
              </div>
            </div>
          ) : (
            <form onSubmit={saveBtcConfig} className="p-5 sm:p-6">
              {btcConfigError ? (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="leading-6">{btcConfigError}</p>
                </div>
              ) : null}

              {btcConfigMessage ? (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="leading-6">{btcConfigMessage}</p>
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor="admin-btc-address"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Bitcoin receiving address
                  </label>
                  <input
                    id="admin-btc-address"
                    type="text"
                    value={btcAddress}
                    onChange={(event) => setBtcAddress(event.target.value)}
                    placeholder="Enter your authorized BTC receiving address"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-mono text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Customers will be instructed to send their investment
                    payment to this address.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="admin-btc-rate"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    BTC rate
                  </label>
                  <input
                    id="admin-btc-rate"
                    type="number"
                    min="0"
                    step="any"
                    value={btcRate}
                    onChange={(event) => setBtcRate(event.target.value)}
                    placeholder="Example: 65000"
                    inputMode="decimal"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    This rate is used by the investment service to calculate
                    the BTC amount required for a customer investment.
                  </p>
                </div>

                <div className="lg:col-span-2">
                  <label
                    htmlFor="admin-btc-instructions"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Customer payment instructions
                  </label>
                  <textarea
                    id="admin-btc-instructions"
                    value={btcInstructions}
                    onChange={(event) =>
                      setBtcInstructions(event.target.value)
                    }
                    rows={5}
                    placeholder="Enter the instructions customers should follow when making a BTC investment payment."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    Accept new BTC investment payments
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Disable this when BTC payments should not be available to
                    customers. Existing submitted payments remain subject to
                    normal admin verification.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={btcEnabled}
                  onClick={() => setBtcEnabled((current) => !current)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                    btcEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                      btcEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-xs leading-5 text-slate-500">
                  Saving this configuration changes the server-side BTC
                  payment settings. A customer transaction hash is only a
                  payment submission and must still be independently verified
                  by an authorized administrator before activation.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => loadBtcConfig()}
                    disabled={btcConfigSaving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload
                  </button>

                  <button
                    type="submit"
                    disabled={btcConfigSaving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {btcConfigSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {btcConfigSaving ? "Saving..." : "Save BTC configuration"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Investment activity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredInvestments.length} investment
                  {filteredInvestments.length === 1 ? "" : "s"} match
                  the current filters.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <div className="relative min-w-0 sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search customer, reference..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All statuses</option>

                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">
                    All investment types
                  </option>

                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>

                <select
                  value={paymentFilter}
                  onChange={(event) =>
                    setPaymentFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">
                    All payment statuses
                  </option>

                  <option value="PENDING">Pending</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                {(search ||
                  statusFilter !== "ALL" ||
                  typeFilter !== "ALL" ||
                  paymentFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {visibleInvestments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <BarChart3 className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-950">
                No investment records found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                No investment activity matches the current search
                and filter settings.
              </p>

              {(search ||
                statusFilter !== "ALL" ||
                typeFilter !== "ALL" ||
                paymentFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">
                        Customer
                      </th>

                      <th className="px-5 py-4">
                        Investment
                      </th>

                      <th className="px-5 py-4">
                        Type
                      </th>

                      <th className="px-5 py-4">
                        Value
                      </th>

                      <th className="px-5 py-4">
                        Payment
                      </th>

                      <th className="px-5 py-4">
                        Status
                      </th>

                      <th className="px-5 py-4">
                        Date
                      </th>

                      <th className="px-5 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleInvestments.map((investment) => {
                      const customer = getCustomer(investment);
                      const status = getStatus(investment);
                      const paymentStatus =
                        getPaymentStatus(investment);
                      const currency = getCurrency(investment);
                      const timestamp =
                        getTimestamp(investment);
                      const btcReview =
                        requiresBtcReview(investment);

                      return (
                        <tr
                          key={getInvestmentId(investment)}
                          className={`transition hover:bg-slate-50/80 ${
                            btcReview
                              ? "bg-amber-50/30"
                              : ""
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[210px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {customer.name}
                                </p>

                                {customer.email ? (
                                  <p className="truncate text-xs text-slate-500">
                                    {customer.email}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {getProductName(investment)}
                            </p>

                            <p className="mt-1 max-w-[180px] truncate font-mono text-xs text-slate-400">
                              {getReference(investment)}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            <div className="flex flex-col gap-1">
                              <span>
                                {formatLabel(
                                  getProductType(
                                    investment,
                                  ),
                                )}
                              </span>

                              {isBtcInvestment(
                                investment,
                              ) ? (
                                <span className="inline-flex w-fit rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                                  BTC
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">
                              {formatMoney(
                                getAmount(
                                  investment,
                                ),
                                currency,
                              )}
                            </p>

                            {investment?.totalMaturityValue ? (
                              <p className="mt-1 text-xs text-slate-400">
                                Maturity{" "}
                                {formatMoney(
                                  investment.totalMaturityValue,
                                  currency,
                                )}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4">
                            {isBtcInvestment(
                              investment,
                            ) ? (
                              <div className="min-w-[125px]">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(
                                    paymentStatus,
                                  )}`}
                                >
                                  {formatLabel(
                                    paymentStatus ||
                                      "PENDING",
                                  )}
                                </span>

                                {investment?.btcAmount ? (
                                  <p className="mt-1 text-xs font-medium text-slate-500">
                                    BTC{" "}
                                    {formatNumber(
                                      investment.btcAmount,
                                      8,
                                    )}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-col items-start gap-1.5">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                  status,
                                )}`}
                              >
                                {formatLabel(status)}
                              </span>

                              {btcReview ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                  <Clock3 className="h-3 w-3" />
                                  Admin review
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                            {formatDateTime(timestamp)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                openInvestment(
                                  investment,
                                )
                              }
                              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                btcReview
                                  ? "bg-amber-600 text-white hover:bg-amber-700"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <Eye className="h-4 w-4" />

                              {btcReview
                                ? "Review BTC"
                                : "Review"}

                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {visibleInvestments.map(
                  (investment) => {
                    const customer =
                      getCustomer(investment);
                    const status =
                      getStatus(investment);
                    const paymentStatus =
                      getPaymentStatus(investment);
                    const currency =
                      getCurrency(investment);
                    const timestamp =
                      getTimestamp(investment);
                    const btcReview =
                      requiresBtcReview(
                        investment,
                      );

                    return (
                      <article
                        key={getInvestmentId(
                          investment,
                        )}
                        className={`p-4 sm:p-5 ${
                          btcReview
                            ? "bg-amber-50/30"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              {isBtcInvestment(
                                investment,
                              ) ? (
                                <WalletCards className="h-5 w-5" />
                              ) : (
                                <TrendingUp className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-slate-950">
                                {getProductName(
                                  investment,
                                )}
                              </h3>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {customer.name}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                              status,
                            )}`}
                          >
                            {formatLabel(status)}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">
                              Principal
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-950">
                              {formatMoney(
                                getAmount(
                                  investment,
                                ),
                                currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">
                              Type
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatLabel(
                                getProductType(
                                  investment,
                                ),
                              )}
                            </p>
                          </div>

                          {isBtcInvestment(
                            investment,
                          ) ? (
                            <div className="rounded-2xl bg-orange-50 p-3">
                              <p className="text-xs font-medium text-orange-700">
                                BTC payment
                              </p>

                              <p className="mt-1 text-sm font-bold text-orange-900">
                                {investment?.btcAmount
                                  ? `${formatNumber(
                                      investment.btcAmount,
                                      8,
                                    )} BTC`
                                  : formatLabel(
                                      paymentStatus ||
                                        "PENDING",
                                    )}
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-2xl bg-slate-50 p-3">
                              <p className="text-xs font-medium text-slate-500">
                                Units
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {getQuantity(
                                  investment,
                                ) > 0
                                  ? formatNumber(
                                      getQuantity(
                                        investment,
                                      ),
                                    )
                                  : "—"}
                              </p>
                            </div>
                          )}

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">
                              Date
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatDateTime(
                                timestamp,
                              )}
                            </p>
                          </div>
                        </div>

                        {isBtcInvestment(
                          investment,
                        ) &&
                        investment?.transactionHash ? (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium text-slate-500">
                              Transaction hash
                            </p>

                            <p className="mt-1 break-all font-mono text-xs text-slate-700">
                              {
                                investment.transactionHash
                              }
                            </p>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            openInvestment(
                              investment,
                            )
                          }
                          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            btcReview
                              ? "bg-amber-600 text-white hover:bg-amber-700"
                              : "bg-slate-950 text-white hover:bg-slate-800"
                          }`}
                        >
                          <Eye className="h-4 w-4" />

                          {btcReview
                            ? "Review BTC payment"
                            : "Review investment"}

                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </article>
                    );
                  },
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredInvestments.length === 0
                      ? 0
                      : (currentPage - 1) *
                          PAGE_SIZE +
                        1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredInvestments.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredInvestments.length}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />

                    <span className="hidden sm:inline">
                      Previous
                    </span>
                  </button>

                  <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(
                          totalPages,
                          current + 1,
                        ),
                      )
                    }
                    disabled={
                      currentPage === totalPages
                    }
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">
                      Next
                    </span>

                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

          <p>
            BTC investments remain pending until an authorized
            administrator independently verifies the submitted
            transaction. A transaction hash submitted by a customer
            does not automatically activate the investment. Product
            configuration, payment verification, activation,
            settlement and other investment operations remain
            server-authorized and auditable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminInvestments;