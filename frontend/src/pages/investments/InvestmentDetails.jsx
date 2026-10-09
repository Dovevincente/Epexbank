import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import api from "../../services/api.js";

const formatAmount = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (value, maximumFractionDigits = 4) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(number);
};

const formatPercent = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
};

const formatDate = (value, includeTime = false) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(date);
};

const normalizeInvestment = (payload) => {
  if (payload?.investment) return payload.investment;
  if (payload?.holding) return payload.holding;
  if (payload?.data?.investment) return payload.data.investment;
  if (payload?.data?.holding) return payload.data.holding;
  if (payload?.data && typeof payload.data === "object") {
    return payload.data;
  }

  return payload;
};

const getCurrency = (investment) =>
  investment?.currency?.code ??
  investment?.currencyCode ??
  investment?.currency ??
  investment?.product?.currency?.code ??
  "USD";

const getName = (investment) =>
  investment?.name ??
  investment?.investmentName ??
  investment?.product?.name ??
  investment?.productName ??
  investment?.title ??
  "Investment";

const getType = (investment) =>
  investment?.type ??
  investment?.investmentType ??
  investment?.product?.type ??
  investment?.category ??
  "INVESTMENT";

const getStatus = (investment) =>
  String(
    investment?.status ??
      investment?.holdingStatus ??
      "ACTIVE",
  ).toUpperCase();

const getInvestedAmount = (investment) =>
  investment?.investedAmount ??
  investment?.principal ??
  investment?.amountInvested ??
  investment?.costBasis ??
  investment?.purchaseAmount ??
  null;

const getCurrentValue = (investment) =>
  investment?.currentValue ??
  investment?.marketValue ??
  investment?.value ??
  investment?.valuation ??
  null;

const getProfitLoss = (investment) =>
  investment?.profitLoss ??
  investment?.unrealizedProfitLoss ??
  investment?.gainLoss ??
  null;

const getProfitLossPercent = (investment) =>
  investment?.profitLossPercent ??
  investment?.returnPercent ??
  investment?.performancePercent ??
  investment?.percentageReturn ??
  null;

const getUnits = (investment) =>
  investment?.units ??
  investment?.quantity ??
  investment?.shares ??
  investment?.unitsHeld ??
  null;

const getUnitPrice = (investment) =>
  investment?.unitPrice ??
  investment?.currentPrice ??
  investment?.price ??
  investment?.pricePerUnit ??
  null;

const getPurchasePrice = (investment) =>
  investment?.purchasePrice ??
  investment?.averagePrice ??
  investment?.averageCost ??
  null;

const getReference = (investment) =>
  investment?.reference ??
  investment?.investmentReference ??
  investment?.holdingReference ??
  investment?.orderReference ??
  investment?.id ??
  null;

const getAccountNumber = (investment) =>
  investment?.account?.accountNumber ??
  investment?.accountNumber ??
  null;

const getAccountName = (investment) =>
  investment?.account?.name ??
  investment?.account?.type ??
  investment?.accountType ??
  null;

const InvestmentDetails = () => {
  const { investmentId } = useParams();
  const navigate = useNavigate();

  const [investment, setInvestment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const loadInvestment = useCallback(
    async ({ silent = false } = {}) => {
      if (!investmentId) {
        setError("Investment ID is missing.");
        setLoading(false);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.get(
          `/investments/${investmentId}`,
        );

        const normalized = normalizeInvestment(response?.data);

        if (!normalized || typeof normalized !== "object") {
          throw new Error(
            "The investment service returned an invalid investment record.",
          );
        }

        setInvestment(normalized);
      } catch (requestError) {
        setInvestment(null);

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load this investment.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [investmentId],
  );

  useEffect(() => {
    loadInvestment();
  }, [loadInvestment]);

  const currency = getCurrency(investment);
  const investedAmount = getInvestedAmount(investment);
  const currentValue = getCurrentValue(investment);
  const profitLoss = getProfitLoss(investment);
  const profitLossPercent = getProfitLossPercent(investment);

  const numericProfitLoss = Number(profitLoss);
  const numericProfitLossPercent = Number(
    profitLossPercent,
  );

  const performanceDirection = useMemo(() => {
    if (Number.isFinite(numericProfitLoss)) {
      if (numericProfitLoss > 0) return "positive";
      if (numericProfitLoss < 0) return "negative";
    }

    if (Number.isFinite(numericProfitLossPercent)) {
      if (numericProfitLossPercent > 0) return "positive";
      if (numericProfitLossPercent < 0) return "negative";
    }

    return "neutral";
  }, [numericProfitLoss, numericProfitLossPercent]);

  const copyValue = async (value, key) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(key);

      window.setTimeout(() => {
        setCopied("");
      }, 1800);
    } catch {
      // Clipboard access can be unavailable in some browser contexts.
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 size={30} className="animate-spin" />
          <p className="text-sm">Loading investment details...</p>
        </div>
      </div>
    );
  }

  if (error || !investment) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={() => navigate("/investments")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to investments
          </button>

          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={22}
                className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
              />

              <div className="flex-1">
                <h1 className="font-bold text-red-900 dark:text-red-200">
                  Unable to load investment
                </h1>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300">
                  {error || "Investment details are unavailable."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadInvestment()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </section>
        </div>
      </div>
    );
  }

  const reference = getReference(investment);
  const units = getUnits(investment);
  const unitPrice = getUnitPrice(investment);
  const purchasePrice = getPurchasePrice(investment);

  const description =
    investment?.description ??
    investment?.product?.description ??
    investment?.summary ??
    null;

  const purchaseDate =
    investment?.purchaseDate ??
    investment?.investedAt ??
    investment?.createdAt ??
    null;

  const maturityDate =
    investment?.maturityDate ??
    investment?.maturesAt ??
    investment?.endDate ??
    null;

  const lastUpdated =
    investment?.updatedAt ??
    investment?.lastUpdatedAt ??
    investment?.valuedAt ??
    null;

  const status = getStatus(investment);

  const statusClass =
    status === "ACTIVE" ||
    status === "COMPLETED" ||
    status === "MATURED"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : status === "PENDING" ||
          status === "PROCESSING" ||
          status === "OPEN"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  const performanceClass =
    performanceDirection === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : performanceDirection === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-slate-700 dark:text-slate-200";

  const performanceIcon =
    performanceDirection === "positive" ? (
      <ArrowUpRight size={20} />
    ) : performanceDirection === "negative" ? (
      <ArrowDownRight size={20} />
    ) : (
      <BarChart3 size={20} />
    );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate("/investments")}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to investments
          </button>

          <button
            type="button"
            onClick={() => loadInvestment({ silent: true })}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  <BarChart3 size={28} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {getName(investment)}
                    </h1>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                    >
                      {status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {getType(investment)}
                    {currency ? ` • ${currency}` : ""}
                  </p>

                  {description && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              <Link
                to="/investments/buy"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Buy investment
                <ChevronRight size={17} />
              </Link>
            </div>
          </div>

          <div className="grid gap-px border-b border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-5 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Current value
              </p>

              <p className="mt-2 text-xl font-bold">
                {formatAmount(currentValue, currency)}
              </p>
            </div>

            <div className="bg-white p-5 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Invested amount
              </p>

              <p className="mt-2 text-xl font-bold">
                {formatAmount(investedAmount, currency)}
              </p>
            </div>

            <div className="bg-white p-5 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Profit / loss
              </p>

              <div className={`mt-2 flex items-center gap-2 text-xl font-bold ${performanceClass}`}>
                {performanceIcon}
                {formatAmount(profitLoss, currency)}
              </div>
            </div>

            <div className="bg-white p-5 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Return
              </p>

              <p className={`mt-2 text-xl font-bold ${performanceClass}`}>
                {formatPercent(profitLossPercent)}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold">Holding information</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Details currently supplied by the investment service.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <CircleDollarSign size={17} />
                  <span className="text-xs font-medium">
                    Units held
                  </span>
                </div>

                <p className="mt-2 font-semibold">
                  {formatNumber(units)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <TrendingUp size={17} />
                  <span className="text-xs font-medium">
                    Current unit price
                  </span>
                </div>

                <p className="mt-2 font-semibold">
                  {formatAmount(unitPrice, currency)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <CircleDollarSign size={17} />
                  <span className="text-xs font-medium">
                    Purchase price
                  </span>
                </div>

                <p className="mt-2 font-semibold">
                  {formatAmount(purchasePrice, currency)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <BarChart3 size={17} />
                  <span className="text-xs font-medium">
                    Investment type
                  </span>
                </div>

                <p className="mt-2 font-semibold">
                  {getType(investment)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold">Timeline</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Important dates for this investment.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  <CalendarDays size={17} />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Purchase date
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatDate(purchaseDate, true)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Clock3 size={17} />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Maturity date
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatDate(maturityDate, true)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <RefreshCw size={17} />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Last updated
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatDate(lastUpdated, true)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold">Investment reference</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Use the reference when contacting Epex Bank support about this
              holding.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Investment reference
              </p>

              <div className="mt-2 flex items-center gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-sm font-semibold">
                  {reference || "—"}
                </p>

                {reference && (
                  <button
                    type="button"
                    onClick={() =>
                      copyValue(reference, "reference")
                    }
                    className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label="Copy investment reference"
                    title="Copy reference"
                  >
                    {copied === "reference" ? (
                      <ShieldCheck size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Linked account
              </p>

              <p className="mt-2 font-semibold">
                {getAccountName(investment) || "—"}
              </p>

              {getAccountNumber(investment) && (
                <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                  ••••{" "}
                  {String(getAccountNumber(investment)).slice(-4)}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Currency
              </p>

              <p className="mt-2 font-semibold">{currency}</p>
            </div>
          </div>
        </section>

        {investment?.orderId && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold">Related order</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Review the transaction/order associated with this investment.
                </p>
              </div>

              <Link
                to={`/investments/orders/${investment.orderId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View order
                <ExternalLink size={16} />
              </Link>
            </div>
          </section>
        )}

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {performanceDirection === "positive" ? (
            <TrendingUp className="mt-0.5 shrink-0" size={17} />
          ) : performanceDirection === "negative" ? (
            <TrendingDown className="mt-0.5 shrink-0" size={17} />
          ) : (
            <ShieldCheck className="mt-0.5 shrink-0" size={17} />
          )}

          <p>
            Investment performance shown on this page is supplied by the
            Epex Bank investment service. Investment values may rise or fall,
            and displayed performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvestmentDetails;