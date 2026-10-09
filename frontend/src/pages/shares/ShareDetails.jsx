import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpToLine,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../../services/api.js";

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const getApiMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const normalizeHolding = (
  payload,
) => {
  const root = getRoot(payload);

  if (
    root?.holding &&
    typeof root.holding === "object"
  ) {
    return root.holding;
  }

  if (
    root?.investment &&
    typeof root.investment === "object"
  ) {
    return root.investment;
  }

  if (
    root?.data?.holding &&
    typeof root.data.holding === "object"
  ) {
    return root.data.holding;
  }

  return root;
};

const normalizeOrders = (
  payload,
) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.orders ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.orders ??
    []
  );
};

const normalizeDividends = (
  payload,
) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.dividends ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.dividends ??
    []
  );
};

const numberValue = (
  value,
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const formatMoney = (
  amount,
  currency = "USD",
) => {
  const value =
    numberValue(amount);

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency:
          currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(
      2,
    )}`;
  }
};

const formatNumber = (
  value,
) =>
  new Intl.NumberFormat(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    },
  ).format(numberValue(value));

const formatPercent = (
  value,
) => {
  const number =
    numberValue(value);

  return `${number >= 0 ? "+" : ""}${number.toFixed(
    2,
  )}%`;
};

const formatDate = (
  value,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
    },
  ).format(date);
};

const formatDateTime = (
  value,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
};

const formatStatus = (
  value,
) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const getHoldingId = (
  holding,
) =>
  holding?.id ??
  holding?.holdingId ??
  holding?.shareHoldingId ??
  "";

const getInvestmentId = (
  holding,
) =>
  holding?.investmentId ??
  holding?.shareProductId ??
  holding?.productId ??
  holding?.share?.id ??
  holding?.product?.id ??
  "";

const getHoldingName = (
  holding,
) =>
  holding?.shareName ??
  holding?.productName ??
  holding?.share?.name ??
  holding?.product?.name ??
  holding?.securityName ??
  "Share holding";

const getHoldingType = (
  holding,
) =>
  holding?.shareType ??
  holding?.type ??
  holding?.share?.type ??
  holding?.product?.type ??
  "Equity";

const getCurrency = (
  holding,
) =>
  holding?.currency?.code ??
  holding?.currencyCode ??
  holding?.currency ??
  holding?.share?.currency?.code ??
  holding?.product?.currency?.code ??
  "USD";

const getUnits = (
  holding,
) =>
  holding?.units ??
  holding?.quantity ??
  holding?.shares ??
  holding?.unitsHeld ??
  0;

const getAvailableUnits = (
  holding,
) =>
  holding?.availableUnits ??
  holding?.sellableUnits ??
  holding?.unitsAvailable ??
  holding?.units ??
  holding?.quantity ??
  holding?.shares ??
  0;

const getUnitPrice = (
  holding,
) =>
  holding?.unitPrice ??
  holding?.currentPrice ??
  holding?.sharePrice ??
  holding?.marketPrice ??
  holding?.price ??
  holding?.share?.unitPrice ??
  holding?.product?.unitPrice ??
  0;

const getPurchasePrice = (
  holding,
) =>
  holding?.purchasePrice ??
  holding?.averagePurchasePrice ??
  holding?.averageCost ??
  holding?.costPerUnit ??
  0;

const getCurrentValue = (
  holding,
) =>
  holding?.currentValue ??
  holding?.marketValue ??
  holding?.value ??
  null;

const getInvestedValue = (
  holding,
) =>
  holding?.investedAmount ??
  holding?.costBasis ??
  holding?.totalCost ??
  holding?.purchaseValue ??
  null;

const getProfitLoss = (
  holding,
) =>
  holding?.profitLoss ??
  holding?.unrealizedProfitLoss ??
  holding?.gainLoss ??
  null;

const getReturnPercent = (
  holding,
) =>
  holding?.returnPercentage ??
  holding?.returnPercent ??
  holding?.performancePercentage ??
  holding?.roi ??
  null;

const getHoldingStatus = (
  holding,
) =>
  String(
    holding?.status ??
      holding?.holdingStatus ??
      "ACTIVE",
  ).toUpperCase();

const getAccountNumber = (
  holding,
) =>
  holding?.account?.accountNumber ??
  holding?.accountNumber ??
  holding?.settlementAccountNumber ??
  null;

const getAccountId = (
  holding,
) =>
  holding?.accountId ??
  holding?.settlementAccountId ??
  holding?.account?.id ??
  "";

const getOpenedAt = (
  holding,
) =>
  holding?.openedAt ??
  holding?.acquiredAt ??
  holding?.purchaseDate ??
  holding?.createdAt ??
  null;

const getDividendTotal = (
  holding,
) =>
  holding?.totalDividends ??
  holding?.dividendsReceived ??
  holding?.dividendIncome ??
  0;

const getStatusClasses = (
  status,
) => {
  switch (status) {
    case "ACTIVE":
    case "AVAILABLE":
    case "OPEN":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";

    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";

    case "SUSPENDED":
    case "RESTRICTED":
    case "CLOSED":
      return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

const ShareDetails = () => {
  const { shareId, holdingId, investmentId } =
    useParams();

  const [
    searchParams,
  ] = useSearchParams();

  const identifier =
    holdingId ||
    shareId ||
    investmentId ||
    searchParams.get("holdingId") ||
    searchParams.get("investmentId");

  const [holding, setHolding] =
    useState(null);

  const [orders, setOrders] =
    useState([]);

  const [dividends, setDividends] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadHolding =
    useCallback(
      async (background = false) => {
        if (!identifier) {
          setLoading(false);
          setError(
            "No share holding identifier was provided.",
          );
          return;
        }

        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          let response;

          const endpoints = [
            `/shares/holdings/${identifier}`,
            `/shares/${identifier}`,
          ];

          let lastError = null;

          for (const endpoint of endpoints) {
            try {
              response =
                await api.get(
                  endpoint,
                );
                lastError = null;
                break;
            } catch (requestError) {
              lastError =
                requestError;

              if (
                ![404, 501].includes(
                  requestError?.response
                    ?.status,
                )
              ) {
                throw requestError;
              }
            }
          }

          if (!response) {
            throw (
              lastError ||
              new Error(
                "Share holding could not be found.",
              )
            );
          }

          setHolding(
            normalizeHolding(
              response?.data,
            ),
          );
        } catch (requestError) {
          const status =
            requestError?.response
              ?.status;

          if (
            status === 404 ||
            status === 501
          ) {
            setError(
              "Share holding details are not available from the banking API yet.",
            );
          } else {
            setError(
              getApiMessage(
                requestError,
                "Unable to load the share holding.",
              ),
            );
          }

          setHolding(null);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [identifier],
    );

  const loadRelatedActivity =
    useCallback(
      async () => {
        if (!identifier) {
          return;
        }

        const holdingIdentifier =
          getHoldingId(
            holding,
          ) || identifier;

        const investmentIdentifier =
          getInvestmentId(
            holding,
          );

        try {
          let orderResponse;

          try {
            orderResponse =
              await api.get(
                "/shares/orders",
                {
                  params: {
                    holdingId:
                      holdingIdentifier,
                    investmentId:
                      investmentIdentifier ||
                      undefined,
                    limit: 5,
                  },
                },
              );
          } catch (requestError) {
            if (
              [404, 501].includes(
                requestError?.response
                  ?.status,
              )
            ) {
              orderResponse =
                await api.get(
                  "/shares/orders",
                  {
                    params: {
                      shareHoldingId:
                        holdingIdentifier,
                      limit: 5,
                    },
                  },
                );
            } else {
              throw requestError;
            }
          }

          setOrders(
            normalizeOrders(
              orderResponse?.data,
            ).slice(0, 5),
          );
        } catch {
          /*
           * Related activity is supplementary.
           * Do not fail the main holding page if
           * the optional endpoint is unavailable.
           */
          setOrders([]);
        }

        try {
          let dividendResponse;

          try {
            dividendResponse =
              await api.get(
                "/shares/dividends",
                {
                  params: {
                    holdingId:
                      holdingIdentifier,
                    investmentId:
                      investmentIdentifier ||
                      undefined,
                    limit: 5,
                  },
                },
              );
          } catch (requestError) {
            if (
              [404, 501].includes(
                requestError?.response
                  ?.status,
              )
            ) {
              dividendResponse =
                await api.get(
                  "/dividends",
                  {
                    params: {
                      holdingId:
                        holdingIdentifier,
                      limit: 5,
                    },
                  },
                );
            } else {
              throw requestError;
            }
          }

          setDividends(
            normalizeDividends(
              dividendResponse?.data,
            ).slice(0, 5),
          );
        } catch {
          setDividends([]);
        }
      },
      [
        holding,
        identifier,
      ],
    );

  useEffect(() => {
    loadHolding();
  }, [loadHolding]);

  useEffect(() => {
    if (!holding) return;

    loadRelatedActivity();
  }, [
    holding,
    loadRelatedActivity,
  ]);

  const currency =
    getCurrency(holding);

  const units =
    numberValue(
      getUnits(holding),
    );

  const availableUnits =
    numberValue(
      getAvailableUnits(
        holding,
      ),
    );

  const unitPrice =
    numberValue(
      getUnitPrice(holding),
    );

  const purchasePrice =
    numberValue(
      getPurchasePrice(
        holding,
      ),
    );

  const calculatedCurrentValue =
    units * unitPrice;

  const currentValueRaw =
    getCurrentValue(
      holding,
    );

  const currentValue =
    currentValueRaw === null ||
    currentValueRaw === undefined
      ? calculatedCurrentValue
      : numberValue(
          currentValueRaw,
        );

  const investedValueRaw =
    getInvestedValue(
      holding,
    );

  const investedValue =
    investedValueRaw === null ||
    investedValueRaw === undefined
      ? units * purchasePrice
      : numberValue(
          investedValueRaw,
        );

  const profitLossRaw =
    getProfitLoss(holding);

  const profitLoss =
    profitLossRaw === null ||
    profitLossRaw === undefined
      ? currentValue -
        investedValue
      : numberValue(
          profitLossRaw,
        );

  const returnPercentRaw =
    getReturnPercent(
      holding,
    );

  const returnPercent =
    returnPercentRaw === null ||
    returnPercentRaw === undefined
      ? investedValue > 0
        ? (profitLoss /
            investedValue) *
          100
        : 0
      : numberValue(
          returnPercentRaw,
        );

  const status =
    getHoldingStatus(holding);

  const isPositive =
    profitLoss >= 0;

  const canSell =
    Boolean(
      holding &&
        (status === "ACTIVE" ||
          status === "AVAILABLE" ||
          status === "OPEN") &&
        availableUnits > 0,
    );

  const canBuy =
    Boolean(
      holding &&
        (status === "ACTIVE" ||
          status === "AVAILABLE" ||
          status === "OPEN"),
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/shares"
            className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to shares
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {holding
                  ? getHoldingName(
                      holding,
                    )
                  : "Share details"}
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review your share holding, value, performance and related
                activity.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadHolding(true)
          }
          disabled={refreshing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />
          Refresh
        </button>
      </section>

      {/* Error */}
      {error && (
        <section
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

          <div>
            <p className="text-sm font-bold text-red-950 dark:text-red-300">
              Unable to load share details
            </p>

            <p className="mt-1 text-xs leading-5 text-red-800 dark:text-red-400">
              {error}
            </p>
          </div>
        </section>
      )}

      {/* Loading */}
      {loading ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-emerald-700 dark:text-emerald-400" />

          <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading share holding...
          </p>
        </section>
      ) : holding ? (
        <>
          {/* Holding hero */}
          <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm dark:border dark:border-slate-800">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${getStatusClasses(
                        status,
                      )}`}
                    >
                      {formatStatus(
                        status,
                      )}
                    </span>

                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-slate-300">
                      {getHoldingType(
                        holding,
                      )}
                    </span>
                  </div>

                  <h2 className="mt-5 text-2xl font-bold sm:text-3xl">
                    {getHoldingName(
                      holding,
                    )}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    {currency} share holding
                  </p>
                </div>

                <div className="lg:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current value
                  </p>

                  <p className="mt-1 text-3xl font-bold sm:text-4xl">
                    {formatMoney(
                      currentValue,
                      currency,
                    )}
                  </p>

                  <div
                    className={`mt-2 inline-flex items-center gap-1.5 text-sm font-bold ${
                      isPositive
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}

                    {formatMoney(
                      profitLoss,
                      currency,
                    )}{" "}
                    (
                    {formatPercent(
                      returnPercent,
                    )}
                    )
                  </div>
                </div>
              </div>
            </div>

            <div className="grid border-t border-white/10 sm:grid-cols-3">
              <HeroMetric
                label="Shares held"
                value={formatNumber(
                  units,
                )}
              />

              <HeroMetric
                label="Sellable shares"
                value={formatNumber(
                  availableUnits,
                )}
              />

              <HeroMetric
                label="Current price"
                value={formatMoney(
                  unitPrice,
                  currency,
                )}
              />
            </div>
          </section>

          {/* Actions */}
          <section className="flex flex-col gap-3 sm:flex-row">
            {canBuy && (
              <Link
                to={`/shares/buy?productId=${encodeURIComponent(
                  getInvestmentId(
                    holding,
                  ),
                )}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <ArrowUpToLine className="h-4 w-4" />
                Buy more
              </Link>
            )}

            {canSell && (
              <Link
                to={`/shares/sell?holdingId=${encodeURIComponent(
                  getHoldingId(
                    holding,
                  ),
                )}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Sell shares
              </Link>
            )}

            <Link
              to="/shares/orders"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              View orders
            </Link>
          </section>

          {/* Portfolio metrics */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Invested value"
              value={formatMoney(
                investedValue,
                currency,
              )}
              icon={CircleDollarSign}
            />

            <MetricCard
              label="Current value"
              value={formatMoney(
                currentValue,
                currency,
              )}
              icon={BriefcaseBusiness}
            />

            <MetricCard
              label="Profit / loss"
              value={formatMoney(
                profitLoss,
                currency,
              )}
              icon={
                isPositive
                  ? TrendingUp
                  : TrendingDown
              }
              valueClass={
                isPositive
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }
            />

            <MetricCard
              label="Return"
              value={formatPercent(
                returnPercent,
              )}
              icon={
                isPositive
                  ? TrendingUp
                  : TrendingDown
              }
              valueClass={
                isPositive
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }
            />
          </section>

          {/* Holding information */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Holding information
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Information returned by the authenticated investment service.
              </p>
            </div>

            <div className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-2">
              <DetailItem
                label="Holding ID"
                value={
                  getHoldingId(
                    holding,
                  ) || "Not provided"
                }
              />

              <DetailItem
                label="Investment ID"
                value={
                  getInvestmentId(
                    holding,
                  ) || "Not provided"
                }
              />

              <DetailItem
                label="Account"
                value={
                  getAccountNumber(
                    holding,
                  ) || "Not provided"
                }
              />

              <DetailItem
                label="Currency"
                value={currency}
              />

              <DetailItem
                label="Average purchase price"
                value={
                  purchasePrice
                    ? formatMoney(
                        purchasePrice,
                        currency,
                      )
                    : "Not provided"
                }
              />

              <DetailItem
                label="Current unit price"
                value={formatMoney(
                  unitPrice,
                  currency,
                )}
              />

              <DetailItem
                label="Opened / acquired"
                value={formatDate(
                  getOpenedAt(
                    holding,
                  ),
                )}
              />

              <DetailItem
                label="Dividends received"
                value={formatMoney(
                  getDividendTotal(
                    holding,
                  ),
                  currency,
                )}
              />
            </div>
          </section>

          {/* Orders */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Recent share orders
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Recent purchase and sale instructions related to this holding.
                </p>
              </div>

              <Link
                to="/shares/orders"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              >
                View all
                <ArrowUpToLine className="h-3.5 w-3.5 rotate-45" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <EmptyActivity
                icon={Clock3}
                text="No related share orders were returned."
              />
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {orders.map(
                  (order, index) => (
                    <OrderRow
                      key={
                        order?.id ||
                        order?.orderId ||
                        index
                      }
                      order={order}
                      currency={
                        getCurrency(
                          holding,
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}
          </section>

          {/* Dividends */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Dividend activity
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Dividend records associated with this share holding.
                </p>
              </div>

              <Link
                to="/shares/dividends"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              >
                View all
                <ArrowUpToLine className="h-3.5 w-3.5 rotate-45" />
              </Link>
            </div>

            {dividends.length === 0 ? (
              <EmptyActivity
                icon={Banknote}
                text="No related dividend records were returned."
              />
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {dividends.map(
                  (
                    dividend,
                    index,
                  ) => (
                    <DividendRow
                      key={
                        dividend?.id ||
                        dividend?.dividendId ||
                        index
                      }
                      dividend={
                        dividend
                      }
                    />
                  ),
                )}
              </div>
            )}
          </section>

          {/* Security */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Investment information
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Values, performance, prices, holdings and dividend activity
                  shown here are returned by the authenticated Epex Bank
                  investment service. This page does not create or modify
                  investment records locally.
                </p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

const HeroMetric = ({
  label,
  value,
}) => (
  <div className="border-white/10 px-5 py-4 first:border-t-0 sm:border-l sm:px-6">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {label}
    </p>

    <p className="mt-1 text-sm font-bold text-white">
      {value}
    </p>
  </div>
);

const MetricCard = ({
  label,
  value,
  icon: Icon,
  valueClass = "text-slate-950 dark:text-white",
}) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" />
      </div>
    </div>

    <p
      className={`mt-4 truncate text-xl font-bold ${valueClass}`}
    >
      {value}
    </p>
  </div>
);

const DetailItem = ({
  label,
  value,
}) => (
  <div className="bg-white p-5 dark:bg-slate-900">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <p className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-200">
      {value}
    </p>
  </div>
);

const EmptyActivity = ({
  icon: Icon,
  text,
}) => (
  <div className="p-8 text-center">
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Icon className="h-5 w-5" />
    </div>

    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
      {text}
    </p>
  </div>
);

const OrderRow = ({
  order,
  currency,
}) => {
  const side =
    String(
      order?.side ??
        order?.type ??
        "BUY",
    ).toUpperCase();

  const status =
    String(
      order?.status ??
        "PENDING",
    ).toUpperCase();

  const units =
    order?.units ??
    order?.quantity ??
    order?.executedUnits ??
    null;

  const amount =
    order?.amount ??
    order?.totalAmount ??
    order?.executedAmount ??
    0;

  const reference =
    order?.reference ??
    order?.orderReference ??
    "—";

  const date =
    order?.executedAt ??
    order?.submittedAt ??
    order?.createdAt ??
    null;

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            side === "SELL"
              ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
          }`}
        >
          {side === "SELL" ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {formatStatus(side)} order
          </p>

          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {reference}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:min-w-[340px]">
        <ActivityValue
          label="Units"
          value={
            units !== null
              ? formatNumber(
                  units,
                )
              : "—"
          }
        />

        <ActivityValue
          label="Amount"
          value={formatMoney(
            amount,
            currency,
          )}
        />

        <ActivityValue
          label="Status"
          value={formatStatus(
            status,
          )}
        />

        <ActivityValue
          label="Date"
          value={formatDate(
            date,
          )}
        />
      </div>
    </div>
  );
};

const DividendRow = ({
  dividend,
}) => {
  const amount =
    dividend?.amount ??
    dividend?.dividendAmount ??
    dividend?.paymentAmount ??
    0;

  const currency =
    dividend?.currency?.code ??
    dividend?.currencyCode ??
    dividend?.currency ??
    "USD";

  const status =
    String(
      dividend?.status ??
        dividend?.paymentStatus ??
        "PENDING",
    ).toUpperCase();

  const date =
    dividend?.paidAt ??
    dividend?.paymentDate ??
    dividend?.createdAt ??
    null;

  const reference =
    dividend?.reference ??
    dividend?.dividendReference ??
    dividend?.paymentReference ??
    "—";

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <Banknote className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Dividend payment
          </p>

          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {reference}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:min-w-[340px]">
        <ActivityValue
          label="Amount"
          value={formatMoney(
            amount,
            currency,
          )}
        />

        <ActivityValue
          label="Status"
          value={formatStatus(
            status,
          )}
        />

        <ActivityValue
          label="Payment date"
          value={formatDate(
            date,
          )}
        />

        <ActivityValue
          label="Currency"
          value={currency}
        />
      </div>
    </div>
  );
};

const ActivityValue = ({
  label,
  value,
}) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300">
      {value}
    </p>
  </div>
);

export default ShareDetails;