import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  Wallet,
} from "lucide-react";

import api from "../../services/api.js";

const normalizeHoldings = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.holdings)) return payload.holdings;
  if (Array.isArray(payload?.investments)) return payload.investments;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.records)) return payload.records;

  if (Array.isArray(payload?.data)) return payload.data;

  if (Array.isArray(payload?.data?.holdings)) {
    return payload.data.holdings;
  }

  if (Array.isArray(payload?.data?.investments)) {
    return payload.data.investments;
  }

  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }

  return [];
};

const getHoldingId = (holding) =>
  holding?.id ||
  holding?.holdingId ||
  holding?.investmentId ||
  holding?.positionId ||
  null;

const getHoldingName = (holding) =>
  holding?.name ||
  holding?.investmentName ||
  holding?.productName ||
  holding?.title ||
  holding?.investment?.name ||
  holding?.product?.name ||
  "Investment";

const getCurrency = (holding) =>
  holding?.currency?.code ||
  holding?.currencyCode ||
  (typeof holding?.currency === "string" ? holding.currency : null) ||
  holding?.investment?.currency?.code ||
  "USD";

const getUnits = (holding) =>
  holding?.units ??
  holding?.quantity ??
  holding?.shares ??
  holding?.availableUnits ??
  null;

const getAvailableUnits = (holding) =>
  holding?.availableUnits ??
  holding?.sellableUnits ??
  holding?.unitsAvailable ??
  holding?.units ??
  holding?.quantity ??
  holding?.shares ??
  null;

const getCurrentValue = (holding) =>
  holding?.currentValue ??
  holding?.marketValue ??
  holding?.value ??
  holding?.currentAmount ??
  null;

const getUnitPrice = (holding) =>
  holding?.unitPrice ??
  holding?.currentUnitPrice ??
  holding?.price ??
  holding?.marketPrice ??
  null;

const getStatus = (holding) =>
  String(holding?.status || holding?.state || "ACTIVE").toUpperCase();

const getAccountId = (holding) =>
  holding?.accountId ||
  holding?.fundingAccountId ||
  holding?.account?.id ||
  holding?.investment?.accountId ||
  null;

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

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

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
};

const SellInvestment = () => {
  const [searchParams] = useSearchParams();
  const initialHoldingId =
    searchParams.get("holdingId") ||
    searchParams.get("investmentId") ||
    "";

  const [holdings, setHoldings] = useState([]);
  const [selectedHoldingId, setSelectedHoldingId] =
    useState(initialHoldingId);

  const [units, setUnits] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const fetchHoldings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/investments");
      const nextHoldings = normalizeHoldings(response?.data);

      setHoldings(nextHoldings);

      if (nextHoldings.length > 0) {
        const requested = initialHoldingId
          ? nextHoldings.find(
              (holding) =>
                String(getHoldingId(holding)) ===
                String(initialHoldingId),
            )
          : null;

        if (requested) {
          setSelectedHoldingId(String(getHoldingId(requested)));
        } else if (
          !selectedHoldingId ||
          !nextHoldings.some(
            (holding) =>
              String(getHoldingId(holding)) ===
              String(selectedHoldingId),
          )
        ) {
          setSelectedHoldingId(String(getHoldingId(nextHoldings[0])));
        }
      } else {
        setSelectedHoldingId("");
      }
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404 || status === 501) {
        setError(
          "Investment holdings are not available from the banking API yet.",
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load your investment holdings.",
        );
      }

      setHoldings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initialHoldingId, selectedHoldingId]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const selectedHolding = useMemo(
    () =>
      holdings.find(
        (holding) =>
          String(getHoldingId(holding)) ===
          String(selectedHoldingId),
      ) || null,
    [holdings, selectedHoldingId],
  );

  const currency = selectedHolding
    ? getCurrency(selectedHolding)
    : "USD";

  const availableUnits = selectedHolding
    ? Number(getAvailableUnits(selectedHolding))
    : 0;

  const unitPrice = selectedHolding
    ? Number(getUnitPrice(selectedHolding))
    : 0;

  const requestedUnits = Number(units);

  const estimatedValue =
    Number.isFinite(requestedUnits) &&
    requestedUnits > 0 &&
    Number.isFinite(unitPrice) &&
    unitPrice > 0
      ? requestedUnits * unitPrice
      : null;

  const unitsError = useMemo(() => {
    if (!units) return "";

    if (!Number.isFinite(requestedUnits) || requestedUnits <= 0) {
      return "Enter a valid number of units greater than zero.";
    }

    if (
      Number.isFinite(availableUnits) &&
      availableUnits >= 0 &&
      requestedUnits > availableUnits
    ) {
      return `You can sell up to ${formatNumber(availableUnits)} units.`;
    }

    return "";
  }, [units, requestedUnits, availableUnits]);

  const canSubmit =
    Boolean(selectedHolding) &&
    Boolean(getHoldingId(selectedHolding)) &&
    Boolean(units) &&
    !unitsError &&
    requestedUnits > 0 &&
    !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess(null);

    if (!selectedHolding) {
      setError("Select an investment holding.");
      return;
    }

    if (!units || unitsError || requestedUnits <= 0) {
      setError(unitsError || "Enter the number of units you want to sell.");
      return;
    }

    const holdingId = getHoldingId(selectedHolding);

    if (!holdingId) {
      setError("This investment holding cannot be identified.");
      return;
    }

    setSubmitting(true);

    try {
      /*
       * The backend receives the sell instruction.
       * The frontend does not modify balances or holdings locally.
       *
       * `investmentId` is used as the primary identifier because this
       * matches the existing investment order architecture. `holdingId`
       * is also included when available so the backend can resolve the
       * customer's actual position.
       */
      const payload = {
        investmentId: holdingId,
        holdingId,
        units: requestedUnits,
        side: "SELL",
        currency,
      };

      const response = await api.post("/investments/orders", payload);

      const responseData = response?.data;

      setSuccess({
        order:
          responseData?.order ||
          responseData?.data?.order ||
          responseData?.data ||
          responseData,
        message:
          responseData?.message ||
          "Your investment sale instruction has been submitted.",
      });

      setUnits("");
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404 || status === 501) {
        setError(
          "Investment sale orders are not available from the banking API yet.",
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to submit the investment sale instruction.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const order = success.order;

    const orderId =
      order?.id ||
      order?.orderId ||
      order?.reference ||
      order?.orderReference ||
      null;

    const orderStatus = String(
      order?.status || "PENDING",
    ).toUpperCase();

    return (
      <div className="min-h-full bg-slate-50 px-4 py-5 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-6 text-center sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 size={32} />
              </div>

              <h1 className="mt-5 text-2xl font-bold">
                Sale instruction submitted
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
                {success.message}
              </p>

              <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-left dark:bg-slate-950">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Investment
                  </span>
                  <span className="text-sm font-bold">
                    {getHoldingName(selectedHolding)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-4 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Units
                  </span>
                  <span className="text-sm font-bold">
                    {formatNumber(requestedUnits)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Order status
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {orderStatus.replaceAll("_", " ")}
                  </span>
                </div>

                {orderId && (
                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Reference
                    </span>
                    <span className="max-w-[60%] truncate text-right text-sm font-bold">
                      {orderId}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {order?.id || order?.orderId ? (
                  <Link
                    to={`/investments/orders/${encodeURIComponent(
                      order.id || order.orderId,
                    )}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    View order
                    <ArrowRight size={17} />
                  </Link>
                ) : (
                  <Link
                    to="/investments/orders"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    View orders
                    <ArrowRight size={17} />
                  </Link>
                )}

                <Link
                  to="/investments"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Back to investments
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-rose-100/70 blur-3xl dark:bg-rose-950/30" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <Link
                  to="/investments"
                  className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Back to investments"
                >
                  <ArrowLeft size={18} />
                </Link>

                <div>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                    <TrendingDown size={22} />
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Sell investment
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Submit a sale instruction against one of your existing
                    investment holdings.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchHoldings(true)}
                disabled={loading || refreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-start gap-3">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="space-y-5">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          </section>
        ) : holdings.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Wallet size={26} />
            </div>

            <h2 className="mt-5 text-lg font-bold">
              No investment holdings available
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
              You need an existing investment holding before you can submit a
              sale instruction.
            </p>

            <Link
              to="/investments"
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Back to investments
              <ArrowRight size={17} />
            </Link>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Form */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                    <TrendingDown size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold">Sale instruction</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select your holding and enter the units to sell.
                    </p>
                  </div>
                </div>

                <div className="mt-7 space-y-5">
                  <div>
                    <label
                      htmlFor="investment-holding"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Investment holding
                    </label>

                    <select
                      id="investment-holding"
                      value={selectedHoldingId}
                      onChange={(event) => {
                        setSelectedHoldingId(event.target.value);
                        setUnits("");
                        setError("");
                      }}
                      disabled={submitting}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">Select an investment</option>

                      {holdings.map((holding) => {
                        const id = getHoldingId(holding);

                        if (!id) return null;

                        return (
                          <option key={id} value={id}>
                            {getHoldingName(holding)} ·{" "}
                            {formatNumber(getAvailableUnits(holding))} units
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedHolding && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Selected investment
                          </p>

                          <h3 className="mt-1 font-bold">
                            {getHoldingName(selectedHolding)}
                          </h3>
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {getStatus(selectedHolding).replaceAll("_", " ")}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Available units
                          </p>
                          <p className="mt-1 text-sm font-bold">
                            {formatNumber(availableUnits)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Current value
                          </p>
                          <p className="mt-1 text-sm font-bold">
                            {formatMoney(
                              getCurrentValue(selectedHolding),
                              currency,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Unit price
                          </p>
                          <p className="mt-1 text-sm font-bold">
                            {formatMoney(unitPrice, currency)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Currency
                          </p>
                          <p className="mt-1 text-sm font-bold">
                            {currency}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="sale-units"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Units to sell
                    </label>

                    <input
                      id="sale-units"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={units}
                      onChange={(event) => {
                        setUnits(event.target.value);
                        setError("");
                      }}
                      disabled={!selectedHolding || submitting}
                      placeholder="Enter units"
                      className={[
                        "h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none transition dark:bg-slate-950",
                        unitsError
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700",
                      ].join(" ")}
                    />

                    {unitsError && (
                      <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                        {unitsError}
                      </p>
                    )}

                    {selectedHolding &&
                      Number.isFinite(availableUnits) &&
                      availableUnits > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setUnits(String(availableUnits))
                          }
                          disabled={submitting}
                          className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Sell all available units
                        </button>
                      )}
                  </div>

                  {estimatedValue !== null && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <CircleDollarSign
                            size={18}
                            className="text-blue-600 dark:text-blue-400"
                          />
                          <span className="text-sm font-semibold">
                            Indicative value
                          </span>
                        </div>

                        <span className="text-lg font-bold">
                          {formatMoney(estimatedValue, currency)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        This is an indicative value based on the current unit
                        price returned by the investment service. The final
                        execution value may differ according to the applicable
                        product terms and execution price.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <CircleDollarSign size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold">Review sale</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Confirm the instruction before submission.
                    </p>
                  </div>
                </div>

                <div className="mt-7 space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Investment
                    </span>
                    <span className="max-w-[60%] truncate text-right text-sm font-bold">
                      {selectedHolding
                        ? getHoldingName(selectedHolding)
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Units
                    </span>
                    <span className="text-sm font-bold">
                      {units ? formatNumber(units) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Indicative value
                    </span>
                    <span className="text-sm font-bold">
                      {estimatedValue !== null
                        ? formatMoney(estimatedValue, currency)
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Order side
                    </span>
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      SELL
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit sale instruction
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Submitting creates an investment order. It does not
                  guarantee immediate execution.
                </p>
              </div>
            </section>

            {/* Security notice */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>
                  <h3 className="text-sm font-bold">
                    Investment order information
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Sale instructions are submitted to the investment service
                    for processing. The application does not modify your
                    holdings or account balance locally. Final execution,
                    pricing, settlement, fees, and timing are determined by
                    the applicable investment product and backend processing
                    rules.
                  </p>
                </div>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
};

export default SellInvestment;