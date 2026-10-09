import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const normalizeProducts = (payload) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.products ??
    root?.shares ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.products ??
    root?.data?.shares ??
    []
  );
};

const getApiMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : 0;
};

const formatMoney = (
  amount,
  currency = "USD",
) => {
  const numericAmount =
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
    ).format(numericAmount);
  } catch {
    return `${currency || "USD"} ${numericAmount.toFixed(
      2,
    )}`;
  }
};

const formatNumber = (
  amount,
) => {
  const numericAmount =
    numberValue(amount);

  return new Intl.NumberFormat(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    },
  ).format(numericAmount);
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

const getProductId = (
  product,
) =>
  product?.id ??
  product?.shareProductId ??
  product?.productId ??
  "";

const getProductName = (
  product,
) =>
  product?.name ??
  product?.title ??
  product?.productName ??
  product?.shareName ??
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

const getUnitPrice = (
  product,
) =>
  product?.unitPrice ??
  product?.sharePrice ??
  product?.price ??
  product?.currentPrice ??
  0;

const getMinimumUnits = (
  product,
) =>
  product?.minimumUnits ??
  product?.minUnits ??
  product?.minimumQuantity ??
  product?.minQuantity ??
  1;

const getMaximumUnits = (
  product,
) =>
  product?.maximumUnits ??
  product?.maxUnits ??
  product?.maximumQuantity ??
  product?.maxQuantity ??
  null;

const getMinimumAmount = (
  product,
) =>
  product?.minimumAmount ??
  product?.minAmount ??
  null;

const getMaximumAmount = (
  product,
) =>
  product?.maximumAmount ??
  product?.maxAmount ??
  null;

const BuyShares = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const productFromUrl =
    searchParams.get(
      "productId",
    );

  const {
    accounts,
    primaryAccount,
    loading: accountsLoading,
    refresh: refreshAccounts,
  } = useAccounts();

  const [products, setProducts] =
    useState([]);

  const [productsLoading, setProductsLoading] =
    useState(true);

  const [productsError, setProductsError] =
    useState("");

  const [selectedProductId, setSelectedProductId] =
    useState(productFromUrl || "");

  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [units, setUnits] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(null);

  const loadProducts = async (
    background = false,
  ) => {
    if (background) {
      setRefreshing(true);
    } else {
      setProductsLoading(true);
    }

    setProductsError("");

    try {
      let response;

      try {
        response = await api.get(
          "/shares/products",
        );
      } catch (requestError) {
        if (
          [404, 501].includes(
            requestError?.response?.status,
          )
        ) {
          response = await api.get(
            "/shares",
            {
              params: {
                products: true,
              },
            },
          );
        } else {
          throw requestError;
        }
      }

      const nextProducts =
        normalizeProducts(
          response?.data,
        );

      setProducts(
        nextProducts,
      );

      if (
        productFromUrl &&
        nextProducts.some(
          (product) =>
            String(
              getProductId(
                product,
              ),
            ) ===
            String(productFromUrl),
        )
      ) {
        setSelectedProductId(
          productFromUrl,
        );
      }
    } catch (requestError) {
      const status =
        requestError?.response?.status;

      if (
        status === 404 ||
        status === 501
      ) {
        setProductsError(
          "Share products are not available from the banking API yet.",
        );
      } else {
        setProductsError(
          getApiMessage(
            requestError,
            "Unable to load available share products.",
          ),
        );
      }

      setProducts([]);
    } finally {
      setProductsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [productFromUrl]);

  useEffect(() => {
    if (
      !selectedAccountId &&
      primaryAccount?.id
    ) {
      setSelectedAccountId(
        primaryAccount.id,
      );
    }
  }, [
    primaryAccount,
    selectedAccountId,
  ]);

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (product) =>
            String(
              getProductId(
                product,
              ),
            ) ===
            String(
              selectedProductId,
            ),
        ) || null,
      [
        products,
        selectedProductId,
      ],
    );

  const activeAccounts =
    useMemo(
      () =>
        accounts.filter(
          (account) =>
            String(
              account?.status ??
                "",
            ).toUpperCase() ===
            "ACTIVE",
        ),
      [accounts],
    );

  const selectedAccount =
    useMemo(
      () =>
        accounts.find(
          (account) =>
            String(account?.id) ===
            String(
              selectedAccountId,
            ),
        ) || null,
      [
        accounts,
        selectedAccountId,
      ],
    );

  const currency =
    getProductCurrency(
      selectedProduct,
    );

  const unitPrice =
    numberValue(
      getUnitPrice(
        selectedProduct,
      ),
    );

  const requestedUnits =
    numberValue(units);

  const estimatedAmount =
    requestedUnits *
    unitPrice;

  const minimumUnits =
    numberValue(
      getMinimumUnits(
        selectedProduct,
      ),
    );

  const maximumUnitsRaw =
    getMaximumUnits(
      selectedProduct,
    );

  const maximumUnits =
    maximumUnitsRaw === null ||
    maximumUnitsRaw === undefined ||
    maximumUnitsRaw === ""
      ? null
      : numberValue(
          maximumUnitsRaw,
        );

  const minimumAmountRaw =
    getMinimumAmount(
      selectedProduct,
    );

  const maximumAmountRaw =
    getMaximumAmount(
      selectedProduct,
    );

  const minimumAmount =
    minimumAmountRaw === null ||
    minimumAmountRaw === undefined ||
    minimumAmountRaw === ""
      ? null
      : numberValue(
          minimumAmountRaw,
        );

  const maximumAmount =
    maximumAmountRaw === null ||
    maximumAmountRaw === undefined ||
    maximumAmountRaw === ""
      ? null
      : numberValue(
          maximumAmountRaw,
        );

  const availableBalance =
    numberValue(
      selectedAccount?.availableBalance ??
        selectedAccount?.balance,
    );

  const accountCurrency =
    selectedAccount?.currency
      ?.code ??
    selectedAccount?.currencyCode ??
    selectedAccount?.currency ??
    "USD";

  const currencyMismatch =
    Boolean(
      selectedProduct &&
        selectedAccount &&
        String(
          accountCurrency,
        ).toUpperCase() !==
          String(
            currency,
          ).toUpperCase(),
    );

  const insufficientFunds =
    Boolean(
      selectedAccount &&
        estimatedAmount >
          availableBalance,
    );

  const validateForm = () => {
    if (!selectedProduct) {
      return "Select a share product.";
    }

    if (!selectedAccount) {
      return "Select the account you want to use for this purchase.";
    }

    if (
      !Number.isFinite(
        requestedUnits,
      ) ||
      requestedUnits <= 0
    ) {
      return "Enter a valid number of shares.";
    }

    if (
      requestedUnits <
      minimumUnits
    ) {
      return `The minimum purchase is ${formatNumber(
        minimumUnits,
      )} share${
        minimumUnits === 1
          ? ""
          : "s"
      }.`;
    }

    if (
      maximumUnits !== null &&
      requestedUnits >
        maximumUnits
    ) {
      return `The maximum purchase is ${formatNumber(
        maximumUnits,
      )} shares.`;
    }

    if (
      minimumAmount !== null &&
      estimatedAmount <
        minimumAmount
    ) {
      return `The minimum purchase amount is ${formatMoney(
        minimumAmount,
        currency,
      )}.`;
    }

    if (
      maximumAmount !== null &&
      estimatedAmount >
        maximumAmount
    ) {
      return `The maximum purchase amount is ${formatMoney(
        maximumAmount,
        currency,
      )}.`;
    }

    if (currencyMismatch) {
      return `Your selected account is denominated in ${accountCurrency}, while this share product is priced in ${currency}.`;
    }

    if (insufficientFunds) {
      return "The selected account does not have enough available funds for this purchase.";
    }

    if (
      String(
        selectedProduct?.status ??
          "ACTIVE",
      ).toUpperCase() !==
      "ACTIVE"
    ) {
      return "This share product is not currently available for purchase.";
    }

    return "";
  };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const validationError =
        validateForm();

      if (validationError) {
        setError(
          validationError,
        );
        return;
      }

      if (submitting) return;

      setSubmitting(true);
      setError("");
      setSuccess(null);

      const payload = {
        shareProductId:
          getProductId(
            selectedProduct,
          ),
        productId:
          getProductId(
            selectedProduct,
          ),
        accountId:
          selectedAccountId,
        units: requestedUnits,
        quantity: requestedUnits,
        side: "BUY",
        currency,
      };

      try {
        let response;

        try {
          response = await api.post(
            "/shares/orders",
            payload,
          );
        } catch (requestError) {
          if (
            [404, 501].includes(
              requestError?.response?.status,
            )
          ) {
            response = await api.post(
              "/shares/purchase",
              payload,
            );
          } else {
            throw requestError;
          }
        }

        const data =
          getRoot(
            response?.data,
          );

        setSuccess({
          reference:
            data?.reference ??
            data?.orderReference ??
            data?.transactionReference ??
            data?.order?.reference ??
            data?.data?.reference ??
            null,

          orderId:
            data?.id ??
            data?.orderId ??
            data?.order?.id ??
            data?.data?.id ??
            null,

          status:
            data?.status ??
            data?.order?.status ??
            "PENDING",

          message:
            data?.message ??
            response?.data?.message ??
            "Your share purchase instruction has been submitted.",
        });

        setUnits("");

        await refreshAccounts();
      } catch (requestError) {
        const status =
          requestError?.response?.status;

        if (
          status === 404 ||
          status === 501
        ) {
          setError(
            "Share purchasing is not available from the banking API yet.",
          );
        } else {
          setError(
            getApiMessage(
              requestError,
              "Unable to submit the share purchase instruction.",
            ),
          );
        }
      } finally {
        setSubmitting(false);
      }
    };

  const handleRefresh =
    async () => {
      setError("");
      setSuccess(null);

      await Promise.all([
        loadProducts(true),
        refreshAccounts(),
      ]);
    };

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
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Buy shares
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create a real share purchase instruction using an eligible
                Epex Bank account.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={
            refreshing ||
            accountsLoading
          }
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

      {/* Product loading/error */}
      {productsError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />

          <div>
            <p className="text-sm font-bold text-amber-950 dark:text-amber-300">
              Share products unavailable
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-400">
              {productsError}
            </p>
          </div>
        </div>
      )}

      {/* API error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

          <div>
            <p className="text-sm font-bold text-red-950 dark:text-red-300">
              Purchase could not be submitted
            </p>

            <p className="mt-1 text-xs leading-5 text-red-800 dark:text-red-400">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <section
          role="status"
          className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-300">
                Purchase instruction submitted
              </h2>

              <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-400">
                {success.message}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {success.reference && (
                  <ResultItem
                    label="Reference"
                    value={
                      success.reference
                    }
                  />
                )}

                {success.orderId && (
                  <ResultItem
                    label="Order ID"
                    value={
                      success.orderId
                    }
                  />
                )}

                <ResultItem
                  label="Status"
                  value={formatStatus(
                    success.status,
                  )}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/shares/orders"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  View share orders
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setSuccess(
                      null,
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                >
                  Make another purchase
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Purchase form */}
      {!success && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Purchase details
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select the share product, funding account and number of shares.
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              {/* Product */}
              <div>
                <label
                  htmlFor="share-product"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  Share product
                </label>

                <div className="relative mt-2">
                  <select
                    id="share-product"
                    value={
                      selectedProductId
                    }
                    onChange={(event) => {
                      setSelectedProductId(
                        event.target
                          .value,
                      );
                      setError("");
                    }}
                    disabled={
                      productsLoading
                    }
                    className="min-h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:disabled:bg-slate-900"
                  >
                    <option value="">
                      {productsLoading
                        ? "Loading share products..."
                        : "Select a share product"}
                    </option>

                    {products.map(
                      (product) => {
                        const id =
                          getProductId(
                            product,
                          );

                        return (
                          <option
                            key={id}
                            value={id}
                          >
                            {getProductName(
                              product,
                            )}{" "}
                            —{" "}
                            {formatMoney(
                              getUnitPrice(
                                product,
                              ),
                              getProductCurrency(
                                product,
                              ),
                            )}
                          </option>
                        );
                      },
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Product information */}
              {selectedProduct && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-950 dark:text-white">
                        {getProductName(
                          selectedProduct,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {getProductType(
                          selectedProduct,
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        String(
                          selectedProduct?.status ??
                            "ACTIVE",
                        ).toUpperCase() ===
                        "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {formatStatus(
                        selectedProduct?.status ??
                          "ACTIVE",
                      )}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InfoItem
                      label="Unit price"
                      value={formatMoney(
                        unitPrice,
                        currency,
                      )}
                    />

                    <InfoItem
                      label="Minimum units"
                      value={formatNumber(
                        minimumUnits,
                      )}
                    />

                    <InfoItem
                      label="Currency"
                      value={currency}
                    />
                  </div>
                </div>
              )}

              {/* Account */}
              <div>
                <label
                  htmlFor="funding-account"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  Funding account
                </label>

                <div className="relative mt-2">
                  <select
                    id="funding-account"
                    value={
                      selectedAccountId
                    }
                    onChange={(event) => {
                      setSelectedAccountId(
                        event.target
                          .value,
                      );
                      setError("");
                    }}
                    disabled={
                      accountsLoading
                    }
                    className="min-h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:disabled:bg-slate-900"
                  >
                    <option value="">
                      {accountsLoading
                        ? "Loading accounts..."
                        : "Select funding account"}
                    </option>

                    {activeAccounts.map(
                      (account) => {
                        const accountCurrency =
                          account
                            ?.currency
                            ?.code ??
                          account?.currencyCode ??
                          account?.currency ??
                          "USD";

                        return (
                          <option
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                          >
                            {account.accountNumber ||
                              "Account"}{" "}
                            —{" "}
                            {formatMoney(
                              account.availableBalance ??
                                account.balance,
                              accountCurrency,
                            )}
                          </option>
                        );
                      },
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {selectedAccount && (
                  <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950/50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Available balance
                      </span>

                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatMoney(
                          availableBalance,
                          accountCurrency,
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Units */}
              <div>
                <label
                  htmlFor="share-units"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  Number of shares
                </label>

                <input
                  id="share-units"
                  name="units"
                  type="number"
                  min={
                    minimumUnits ||
                    1
                  }
                  max={
                    maximumUnits ??
                    undefined
                  }
                  step="any"
                  value={units}
                  onChange={(event) => {
                    setUnits(
                      event.target
                        .value,
                    );
                    setError("");
                  }}
                  placeholder="Enter number of shares"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-white"
                />

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Minimum:{" "}
                  {formatNumber(
                    minimumUnits,
                  )}
                  {maximumUnits !==
                    null &&
                    ` • Maximum: ${formatNumber(
                      maximumUnits,
                    )}`}
                </p>
              </div>

              {/* Currency mismatch */}
              {currencyMismatch && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />

                  <p className="text-xs leading-5 text-amber-800 dark:text-amber-400">
                    The selected account uses{" "}
                    <strong>
                      {accountCurrency}
                    </strong>
                    , while this share product uses{" "}
                    <strong>
                      {currency}
                    </strong>
                    . Select an account using the matching currency.
                  </p>
                </div>
              )}

              {/* Insufficient balance */}
              {insufficientFunds &&
                !currencyMismatch && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

                    <p className="text-xs leading-5 text-red-800 dark:text-red-400">
                      The estimated purchase amount exceeds the available
                      balance in the selected account.
                    </p>
                  </div>
                )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  productsLoading ||
                  accountsLoading ||
                  !selectedProduct ||
                  !selectedAccount
                }
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {submitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}

                {submitting
                  ? "Submitting purchase..."
                  : "Submit share purchase"}
              </button>
            </div>
          </section>

          {/* Order summary */}
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Purchase summary
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Estimated order value before any applicable charges.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <SummaryRow
                label="Share product"
                value={
                  selectedProduct
                    ? getProductName(
                        selectedProduct,
                      )
                    : "Not selected"
                }
              />

              <SummaryRow
                label="Units"
                value={
                  requestedUnits > 0
                    ? formatNumber(
                        requestedUnits,
                      )
                    : "—"
                }
              />

              <SummaryRow
                label="Unit price"
                value={
                  selectedProduct
                    ? formatMoney(
                        unitPrice,
                        currency,
                      )
                    : "—"
                }
              />

              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    Estimated total
                  </span>

                  <span className="text-xl font-bold text-slate-950 dark:text-white">
                    {formatMoney(
                      estimatedAmount,
                      currency,
                    )}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />

                  <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    Submitting this form creates a purchase instruction. The
                    final execution price, fees and settlement status are
                    determined by the banking investment service.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
};

const InfoItem = ({
  label,
  value,
}) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
      {value}
    </p>
  </div>
);

const SummaryRow = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-slate-500 dark:text-slate-400">
      {label}
    </span>

    <span className="max-w-[60%] text-right text-xs font-bold text-slate-800 dark:text-slate-200">
      {value}
    </span>
  </div>
);

const ResultItem = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 dark:border-emerald-900/50 dark:bg-slate-900/50">
    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
      {label}
    </p>

    <p className="mt-1 break-all text-xs font-bold text-emerald-900 dark:text-emerald-300">
      {value}
    </p>
  </div>
);

export default BuyShares;