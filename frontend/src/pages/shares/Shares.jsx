import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpToLine,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
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

const normalizeArray = (
  payload,
  keys = [],
) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  for (const key of keys) {
    if (Array.isArray(root?.[key])) {
      return root[key];
    }

    if (
      Array.isArray(
        root?.data?.[key],
      )
    ) {
      return root.data[key];
    }
  }

  if (Array.isArray(root?.data)) {
    return root.data;
  }

  return [];
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
  holding?.investmentName ??
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
  holding?.product?.price ??
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
  holding?.purchaseValue ??
  holding?.totalCost ??
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

const getStatus = (
  holding,
) =>
  String(
    holding?.status ??
      holding?.holdingStatus ??
      "ACTIVE",
  ).toUpperCase();

const isActiveHolding = (
  holding,
) =>
  [
    "ACTIVE",
    "AVAILABLE",
    "OPEN",
  ].includes(
    getStatus(holding),
  );

const getProductId = (
  product,
) =>
  product?.id ??
  product?.productId ??
  product?.shareProductId ??
  "";

const getProductName = (
  product,
) =>
  product?.name ??
  product?.shareName ??
  product?.productName ??
  product?.securityName ??
  "Share product";

const getProductType = (
  product,
) =>
  product?.type ??
  product?.shareType ??
  product?.category ??
  "Equity";

const getProductCurrency = (
  product,
) =>
  product?.currency?.code ??
  product?.currencyCode ??
  product?.currency ??
  "USD";

const getProductStatus = (
  product,
) =>
  String(
    product?.status ??
      "ACTIVE",
  ).toUpperCase();

const Shares = () => {
  const [holdings, setHoldings] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const loadShares =
    useCallback(
      async ({
        background = false,
      } = {}) => {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const [
            holdingsResult,
            productsResult,
            ordersResult,
          ] =
            await Promise.allSettled([
              loadHoldings(),
              loadProducts(),
              loadOrders(),
            ]);

          const failures = [
            holdingsResult,
            productsResult,
            ordersResult,
          ].filter(
            (result) =>
              result.status ===
              "rejected",
          );

          if (
            failures.length === 3
          ) {
            throw (
              failures[0].reason ||
              new Error(
                "Unable to load share data.",
              )
            );
          }

          if (
            holdingsResult.status ===
            "fulfilled"
          ) {
            setHoldings(
              holdingsResult.value,
            );
          }

          if (
            productsResult.status ===
            "fulfilled"
          ) {
            setProducts(
              productsResult.value,
            );
          }

          if (
            ordersResult.status ===
            "fulfilled"
          ) {
            setOrders(
              ordersResult.value,
            );
          }
        } catch (requestError) {
          const status =
            requestError?.response
              ?.status;

          if (
            status === 404 ||
            status === 501
          ) {
            setError(
              "Share portfolio data is not available from the banking API yet.",
            );
          } else {
            setError(
              getApiMessage(
                requestError,
                "Unable to load your share portfolio.",
              ),
            );
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  const loadHoldings =
    async () => {
      try {
        const response =
          await api.get(
            "/shares/holdings",
          );

        return normalizeArray(
          response?.data,
          [
            "holdings",
            "investments",
          ],
        );
      } catch (requestError) {
        if (
          ![404, 501].includes(
            requestError?.response
              ?.status,
          )
        ) {
          throw requestError;
        }

        const response =
          await api.get(
            "/shares",
          );

        return normalizeArray(
          response?.data,
          [
            "holdings",
            "investments",
            "shares",
          ],
        );
      }
    };

  const loadProducts =
    async () => {
      try {
        const response =
          await api.get(
            "/shares/products",
          );

        return normalizeArray(
          response?.data,
          [
            "products",
            "shareProducts",
          ],
        );
      } catch (requestError) {
        if (
          ![404, 501].includes(
            requestError?.response
              ?.status,
          )
        ) {
          throw requestError;
        }

        try {
          const response =
            await api.get(
              "/shares?products=true",
            );

          return normalizeArray(
            response?.data,
            [
              "products",
              "shareProducts",
            ],
          );
        } catch (fallbackError) {
          if (
            [404, 501].includes(
              fallbackError
                ?.response?.status,
            )
          ) {
            return [];
          }

          throw fallbackError;
        }
      }
    };

  const loadOrders =
    async () => {
      try {
        const response =
          await api.get(
            "/shares/orders",
            {
              params: {
                limit: 5,
              },
            },
          );

        return normalizeArray(
          response?.data,
          [
            "orders",
            "items",
            "records",
          ],
        ).slice(0, 5);
      } catch (requestError) {
        if (
          [404, 501].includes(
            requestError?.response
              ?.status,
          )
        ) {
          return [];
        }

        throw requestError;
      }
    };

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  const activeHoldings =
    useMemo(
      () =>
        holdings.filter(
          (holding) =>
            isActiveHolding(
              holding,
            ),
        ),
      [holdings],
    );

  const filteredHoldings =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return activeHoldings;
      }

      return activeHoldings.filter(
        (holding) => {
          const searchable = [
            getHoldingName(
              holding,
            ),
            getHoldingType(
              holding,
            ),
            getCurrency(
              holding,
            ),
            getHoldingId(
              holding,
            ),
            getInvestmentId(
              holding,
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query,
          );
        },
      );
    }, [
      activeHoldings,
      search,
    ]);

  const portfolio =
    useMemo(() => {
      let currentValue = 0;
      let investedValue = 0;
      let profitLoss = 0;
      let units = 0;
      let sellableUnits = 0;

      for (const holding of activeHoldings) {
        const holdingUnits =
          numberValue(
            getUnits(
              holding,
            ),
          );

        const currentRaw =
          getCurrentValue(
            holding,
          );

        const investedRaw =
          getInvestedValue(
            holding,
          );

        const current =
          currentRaw === null ||
          currentRaw === undefined
            ? holdingUnits *
              numberValue(
                getUnitPrice(
                  holding,
                ),
              )
            : numberValue(
                currentRaw,
              );

        const invested =
          investedRaw === null ||
          investedRaw === undefined
            ? 0
            : numberValue(
                investedRaw,
              );

        const profitRaw =
          getProfitLoss(
            holding,
          );

        const profit =
          profitRaw === null ||
          profitRaw === undefined
            ? current - invested
            : numberValue(
                profitRaw,
              );

        currentValue += current;
        investedValue += invested;
        profitLoss += profit;
        units += holdingUnits;
        sellableUnits +=
          numberValue(
            getAvailableUnits(
              holding,
            ),
          );
      }

      const returnPercent =
        investedValue > 0
          ? (profitLoss /
              investedValue) *
            100
          : 0;

      const currencies =
        [
          ...new Set(
            activeHoldings.map(
              getCurrency,
            ),
          ),
        ];

      return {
        currentValue,
        investedValue,
        profitLoss,
        returnPercent,
        units,
        sellableUnits,
        currencies,
      };
    }, [activeHoldings]);

  const currency =
    portfolio.currencies.length ===
    1
      ? portfolio.currencies[0]
      : activeHoldings[0]
        ? getCurrency(
            activeHoldings[0],
          )
        : "USD";

  const completedOrders =
    orders.filter(
      (order) =>
        String(
          order?.status ??
            "",
        ).toUpperCase() ===
        "COMPLETED",
    );

  const pendingOrders =
    orders.filter((order) =>
      [
        "PENDING",
        "PROCESSING",
      ].includes(
        String(
          order?.status ??
            "",
        ).toUpperCase(),
      ),
    );

  const positive =
    portfolio.profitLoss >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Shares
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Manage your share holdings, review supported products and
                monitor your investment activity.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadShares({
              background: true,
            })
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
              Share service unavailable
            </p>

            <p className="mt-1 text-xs leading-5 text-red-800 dark:text-red-400">
              {error}
            </p>
          </div>
        </section>
      )}

      {/* Portfolio hero */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm dark:border dark:border-slate-800">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Share portfolio
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {loading
                  ? "Loading..."
                  : formatMoney(
                      portfolio.currentValue,
                      currency,
                    )}
              </p>

              <div
                className={`mt-3 inline-flex items-center gap-2 text-sm font-bold ${
                  positive
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {positive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}

                {formatMoney(
                  portfolio.profitLoss,
                  currency,
                )}{" "}
                (
                {formatPercent(
                  portfolio.returnPercent,
                )}
                )
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <HeroValue
                label="Holdings"
                value={
                  activeHoldings.length
                }
              />

              <HeroValue
                label="Units"
                value={formatNumber(
                  portfolio.units,
                )}
              />

              <HeroValue
                label="Sellable"
                value={formatNumber(
                  portfolio.sellableUnits,
                )}
              />
            </div>
          </div>
        </div>

        <div className="grid border-t border-white/10 sm:grid-cols-2">
          <HeroMetric
            label="Invested value"
            value={formatMoney(
              portfolio.investedValue,
              currency,
            )}
          />

          <HeroMetric
            label="Supported currencies"
            value={
              portfolio.currencies
                .length
                ? portfolio.currencies.join(
                    ", ",
                  )
                : "—"
            }
          />
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          to="/shares/buy"
          icon={ArrowUpToLine}
          title="Buy shares"
          description="Create a purchase order."
        />

        <ActionCard
          to="/shares/sell"
          icon={ArrowDownToLine}
          title="Sell shares"
          description="Create a sale instruction."
        />

        <ActionCard
          to="/shares/orders"
          icon={BriefcaseBusiness}
          title="Share orders"
          description="Review order processing."
        />

        <ActionCard
          to="/shares/dividends"
          icon={Banknote}
          title="Dividends"
          description="Review dividend activity."
        />
      </section>

      {/* Holdings */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Your holdings
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Active share positions returned by your investment account.
            </p>
          </div>

          <label className="relative block sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search holdings..."
              className="min-h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:ring-slate-800"
            />
          </label>
        </div>

        {loading ? (
          <LoadingHoldings />
        ) : filteredHoldings.length ===
          0 ? (
          <EmptyHoldings
            hasHoldings={
              activeHoldings.length >
              0
            }
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Share
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Units
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Unit price
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Value
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Performance
                    </th>

                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-4" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredHoldings.map(
                    (
                      holding,
                      index,
                    ) => (
                      <HoldingRow
                        key={
                          getHoldingId(
                            holding,
                          ) ||
                          getInvestmentId(
                            holding,
                          ) ||
                          index
                        }
                        holding={
                          holding
                        }
                      />
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="space-y-3 p-4 lg:hidden">
              {filteredHoldings.map(
                (
                  holding,
                  index,
                ) => (
                  <HoldingCard
                    key={
                      getHoldingId(
                        holding,
                      ) ||
                      getInvestmentId(
                        holding,
                      ) ||
                      index
                    }
                    holding={
                      holding
                    }
                  />
                ),
              )}
            </div>
          </>
        )}
      </section>

      {/* Products */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Supported share products
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Products currently returned by the investment service.
            </p>
          </div>

          <Link
            to="/shares/products"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            View all products
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : products.length ===
          0 ? (
          <div className="p-8 text-center">
            <BriefcaseBusiness className="mx-auto h-7 w-7 text-slate-400" />

            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              No share products returned
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Supported products will appear here when provided by the
              investment service.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {products
              .filter(
                (product) =>
                  getProductStatus(
                    product,
                  ) !==
                  "INACTIVE",
              )
              .slice(0, 6)
              .map(
                (
                  product,
                  index,
                ) => (
                  <ProductCard
                    key={
                      getProductId(
                        product,
                      ) ||
                      index
                    }
                    product={
                      product
                    }
                  />
                ),
              )}
          </div>
        )}
      </section>

      {/* Recent orders */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Recent share orders
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The latest order activity returned for your account.
            </p>
          </div>

          <Link
            to="/shares/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            View orders
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {orders.length ===
        0 ? (
          <div className="p-8 text-center">
            <Clock3 className="mx-auto h-7 w-7 text-slate-400" />

            <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              No recent orders
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Share orders returned by the API will appear here.
            </p>
          </div>
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
                />
              ),
            )}
          </div>
        )}
      </section>

      {/* Activity summary */}
      <section className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Completed orders"
          value={
            completedOrders.length
          }
          icon={CheckCircle2}
          valueClass="text-emerald-700 dark:text-emerald-400"
        />

        <SummaryCard
          label="Pending orders"
          value={
            pendingOrders.length
          }
          icon={Clock3}
          valueClass="text-amber-700 dark:text-amber-400"
        />
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Portfolio information
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Holdings, prices, balances, products and order activity shown
              here come from the authenticated Epex Bank investment service.
              The frontend does not fabricate holdings or alter investment
              balances locally.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const HeroValue = ({
  label,
  value,
}) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {label}
    </p>

    <p className="mt-1 text-sm font-bold text-white">
      {value}
    </p>
  </div>
);

const HeroMetric = ({
  label,
  value,
}) => (
  <div className="border-white/10 px-5 py-4 sm:px-7">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {label}
    </p>

    <p className="mt-1 text-sm font-bold text-white">
      {value}
    </p>
  </div>
);

const ActionCard = ({
  to,
  icon: Icon,
  title,
  description,
}) => (
  <Link
    to={to}
    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" />
      </div>

      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
    </div>

    <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
      {title}
    </h3>

    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
      {description}
    </p>
  </Link>
);

const HoldingRow = ({
  holding,
}) => {
  const currency =
    getCurrency(holding);

  const units =
    numberValue(
      getUnits(holding),
    );

  const unitPrice =
    numberValue(
      getUnitPrice(
        holding,
      ),
    );

  const currentRaw =
    getCurrentValue(
      holding,
    );

  const currentValue =
    currentRaw === null ||
    currentRaw === undefined
      ? units * unitPrice
      : numberValue(
          currentRaw,
        );

  const investedRaw =
    getInvestedValue(
      holding,
    );

  const investedValue =
    investedRaw === null ||
    investedRaw === undefined
      ? 0
      : numberValue(
          investedRaw,
        );

  const profitRaw =
    getProfitLoss(
      holding,
    );

  const profit =
    profitRaw === null ||
    profitRaw === undefined
      ? currentValue -
        investedValue
      : numberValue(
          profitRaw,
        );

  const returnRaw =
    getReturnPercent(
      holding,
    );

  const returnPercent =
    returnRaw === null ||
    returnRaw === undefined
      ? investedValue > 0
        ? (profit /
            investedValue) *
          100
        : 0
      : numberValue(
          returnRaw,
        );

  const positive =
    profit >= 0;

  const holdingId =
    getHoldingId(holding);

  return (
    <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50">
      <td className="px-6 py-5">
        <div>
          <p className="max-w-[230px] truncate text-sm font-bold text-slate-950 dark:text-white">
            {getHoldingName(
              holding,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {getHoldingType(
              holding,
            )}{" "}
            · {currency}
          </p>
        </div>
      </td>

      <td className="px-6 py-5 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {formatNumber(units)}
      </td>

      <td className="px-6 py-5 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {formatMoney(
          unitPrice,
          currency,
        )}
      </td>

      <td className="px-6 py-5 text-sm font-bold text-slate-950 dark:text-white">
        {formatMoney(
          currentValue,
          currency,
        )}
      </td>

      <td className="px-6 py-5">
        <div
          className={`text-sm font-bold ${
            positive
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-700 dark:text-red-400"
          }`}
        >
          {formatMoney(
            profit,
            currency,
          )}
        </div>

        <div
          className={`mt-1 text-xs ${
            positive
              ? "text-emerald-600 dark:text-emerald-500"
              : "text-red-600 dark:text-red-500"
          }`}
        >
          {formatPercent(
            returnPercent,
          )}
        </div>
      </td>

      <td className="px-6 py-5">
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          {formatStatus(
            getStatus(
              holding,
            ),
          )}
        </span>
      </td>

      <td className="px-6 py-5 text-right">
        {holdingId ? (
          <Link
            to={`/shares/${encodeURIComponent(
              holdingId,
            )}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="View share holding"
          >
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
};

const HoldingCard = ({
  holding,
}) => {
  const currency =
    getCurrency(holding);

  const units =
    numberValue(
      getUnits(holding),
    );

  const currentRaw =
    getCurrentValue(
      holding,
    );

  const currentValue =
    currentRaw === null ||
    currentRaw === undefined
      ? units *
        numberValue(
          getUnitPrice(
            holding,
          ),
        )
      : numberValue(
          currentRaw,
        );

  const investedRaw =
    getInvestedValue(
      holding,
    );

  const investedValue =
    investedRaw === null ||
    investedRaw === undefined
      ? 0
      : numberValue(
          investedRaw,
        );

  const profitRaw =
    getProfitLoss(
      holding,
    );

  const profit =
    profitRaw === null ||
    profitRaw === undefined
      ? currentValue -
        investedValue
      : numberValue(
          profitRaw,
        );

  const returnRaw =
    getReturnPercent(
      holding,
    );

  const returnPercent =
    returnRaw === null ||
    returnRaw === undefined
      ? investedValue > 0
        ? (profit /
            investedValue) *
          100
        : 0
      : numberValue(
          returnRaw,
        );

  const positive =
    profit >= 0;

  const holdingId =
    getHoldingId(holding);

  return (
    <article className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-950 dark:text-white">
            {getHoldingName(
              holding,
            )}
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {getHoldingType(
              holding,
            )}{" "}
            · {currency}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          {formatStatus(
            getStatus(
              holding,
            ),
          )}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <MobileValue
          label="Units"
          value={formatNumber(
            units,
          )}
        />

        <MobileValue
          label="Unit price"
          value={formatMoney(
            getUnitPrice(
              holding,
            ),
            currency,
          )}
        />

        <MobileValue
          label="Current value"
          value={formatMoney(
            currentValue,
            currency,
          )}
        />

        <MobileValue
          label="Performance"
          value={`${formatMoney(
            profit,
            currency,
          )} (${formatPercent(
            returnPercent,
          )})`}
          positive={
            positive
          }
        />
      </div>

      {holdingId && (
        <Link
          to={`/shares/${encodeURIComponent(
            holdingId,
          )}`}
          className="mt-5 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          View holding
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </article>
  );
};

const ProductCard = ({
  product,
}) => {
  const productId =
    getProductId(product);

  const currency =
    getProductCurrency(
      product,
    );

  const minimumUnits =
    product?.minimumUnits ??
    product?.minUnits ??
    null;

  const minimumAmount =
    product?.minimumAmount ??
    product?.minAmount ??
    null;

  const price =
    product?.unitPrice ??
    product?.sharePrice ??
    product?.price ??
    null;

  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <BriefcaseBusiness className="h-4 w-4" />
        </div>

        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          {formatStatus(
            getProductStatus(
              product,
            ),
          )}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
        {getProductName(
          product,
        )}
      </h3>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {formatStatus(
          getProductType(
            product,
          ),
        )}{" "}
        · {currency}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {price !== null &&
          price !== undefined && (
            <MobileValue
              label="Unit price"
              value={formatMoney(
                price,
                currency,
              )}
            />
          )}

        {minimumUnits !==
          null &&
          minimumUnits !==
            undefined && (
            <MobileValue
              label="Minimum units"
              value={formatNumber(
                minimumUnits,
              )}
            />
          )}

        {minimumAmount !==
          null &&
          minimumAmount !==
            undefined && (
            <MobileValue
              label="Minimum amount"
              value={formatMoney(
                minimumAmount,
                currency,
              )}
            />
          )}
      </div>

      {productId && (
        <Link
          to={`/shares/buy?productId=${encodeURIComponent(
            productId,
          )}`}
          className="mt-5 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          Buy shares
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
};

const OrderRow = ({
  order,
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

  const currency =
    order?.currency?.code ??
    order?.currencyCode ??
    order?.currency ??
    "USD";

  const amount =
    order?.executedAmount ??
    order?.amount ??
    order?.totalAmount ??
    0;

  const units =
    order?.executedUnits ??
    order?.units ??
    order?.quantity ??
    0;

  const reference =
    order?.reference ??
    order?.orderReference ??
    order?.id ??
    "—";

  const date =
    order?.executedAt ??
    order?.submittedAt ??
    order?.createdAt ??
    null;

  const orderId =
    order?.id ??
    order?.orderId ??
    "";

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
          {side ===
          "SELL" ? (
            <TrendingDown className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {order?.shareName ??
              order?.productName ??
              order?.investmentName ??
              "Share order"}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {side} · {reference}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:min-w-[360px] sm:grid-cols-4">
        <MobileValue
          label="Units"
          value={formatNumber(
            units,
          )}
        />

        <MobileValue
          label="Amount"
          value={formatMoney(
            amount,
            currency,
          )}
        />

        <MobileValue
          label="Status"
          value={formatStatus(
            status,
          )}
        />

        <MobileValue
          label="Date"
          value={formatDate(
            date,
          )}
        />
      </div>

      {orderId && (
        <Link
          to={`/shares/orders/${encodeURIComponent(
            orderId,
          )}`}
          className="inline-flex items-center justify-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
        >
          Review
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
};

const MobileValue = ({
  label,
  value,
  positive = null,
}) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <p
      className={`mt-1 truncate text-xs font-bold ${
        positive === true
          ? "text-emerald-700 dark:text-emerald-400"
          : positive === false
            ? "text-red-700 dark:text-red-400"
            : "text-slate-700 dark:text-slate-300"
      }`}
    >
      {value}
    </p>
  </div>
);

const SummaryCard = ({
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

const LoadingHoldings = () => (
  <div className="space-y-3 p-5">
    {Array.from({
      length: 3,
    }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
      >
        <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />

        <div className="flex-1 space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

          <div className="h-2.5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyHoldings = ({
  hasHoldings,
}) => (
  <div className="p-10 text-center">
    <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-400" />

    <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
      {hasHoldings
        ? "No holdings match your search"
        : "You do not have any active share holdings"}
    </p>

    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
      {hasHoldings
        ? "Try a different holding name, product or identifier."
        : "If supported share products are available, you can review them below and create a purchase order."}
    </p>

    {!hasHoldings && (
      <Link
        to="/shares/products"
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
      >
        View share products
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    )}
  </div>
);

export default Shares;