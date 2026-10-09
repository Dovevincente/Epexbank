import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";

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

const normalizeHoldings = (
  payload,
) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.holdings ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.investments ??
    root?.data?.holdings ??
    root?.data?.items ??
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
  holding?.availableUnits ??
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

const getAccountId = (
  holding,
) =>
  holding?.accountId ??
  holding?.fundingAccountId ??
  holding?.account?.id ??
  "";

const getAccountNumber = (
  holding,
) =>
  holding?.account?.accountNumber ??
  holding?.accountNumber ??
  null;

const getHoldingStatus = (
  holding,
) =>
  String(
    holding?.status ??
      holding?.holdingStatus ??
      "ACTIVE",
  ).toUpperCase();

const SellShares = () => {
  const [
    searchParams,
  ] = useSearchParams();

  const holdingFromUrl =
    searchParams.get(
      "holdingId",
    );

  const investmentFromUrl =
    searchParams.get(
      "investmentId",
    );

  const [holdings, setHoldings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(null);

  const [selectedHoldingId, setSelectedHoldingId] =
    useState(
      holdingFromUrl || "",
    );

  const [units, setUnits] =
    useState("");

  const loadHoldings =
    async (
      background = false,
    ) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        let response;

        try {
          response = await api.get(
            "/shares/holdings",
          );
        } catch (requestError) {
          if (
            [404, 501].includes(
              requestError?.response?.status,
            )
          ) {
            response = await api.get(
              "/shares",
            );
          } else {
            throw requestError;
          }
        }

        const nextHoldings =
          normalizeHoldings(
            response?.data,
          );

        const sellableHoldings =
          nextHoldings.filter(
            (holding) => {
              const status =
                getHoldingStatus(
                  holding,
                );

              return (
                status ===
                  "ACTIVE" ||
                status ===
                  "AVAILABLE" ||
                status ===
                  "OPEN"
              );
            },
          );

        setHoldings(
          sellableHoldings,
        );

        if (
          holdingFromUrl &&
          sellableHoldings.some(
            (holding) =>
              String(
                getHoldingId(
                  holding,
                ),
              ) ===
              String(
                holdingFromUrl,
              ),
          )
        ) {
          setSelectedHoldingId(
            holdingFromUrl,
          );
        } else if (
          investmentFromUrl
        ) {
          const matched =
            sellableHoldings.find(
              (holding) =>
                String(
                  getInvestmentId(
                    holding,
                  ),
                ) ===
                String(
                  investmentFromUrl,
                ),
            );

          if (matched) {
            setSelectedHoldingId(
              getHoldingId(
                matched,
              ),
            );
          }
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
            "Share holdings are not available from the banking API yet.",
          );
        } else {
          setError(
            getApiMessage(
              requestError,
              "Unable to load your share holdings.",
            ),
          );
        }

        setHoldings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
    loadHoldings();
  }, [
    holdingFromUrl,
    investmentFromUrl,
  ]);

  const selectedHolding =
    useMemo(
      () =>
        holdings.find(
          (holding) =>
            String(
              getHoldingId(
                holding,
              ),
            ) ===
            String(
              selectedHoldingId,
            ),
        ) || null,
      [
        holdings,
        selectedHoldingId,
      ],
    );

  const currency =
    getCurrency(
      selectedHolding,
    );

  const availableUnits =
    numberValue(
      getAvailableUnits(
        selectedHolding,
      ),
    );

  const unitPrice =
    numberValue(
      getUnitPrice(
        selectedHolding,
      ),
    );

  const requestedUnits =
    numberValue(units);

  const estimatedValue =
    requestedUnits *
    unitPrice;

  const unitsExceedHolding =
    Boolean(
      selectedHolding &&
        requestedUnits >
          availableUnits,
    );

  const holdingStatus =
    getHoldingStatus(
      selectedHolding,
    );

  const canSell =
    Boolean(
      selectedHolding &&
        holdingStatus ===
          "ACTIVE",
    );

  const validateForm = () => {
    if (!selectedHolding) {
      return "Select a share holding to sell.";
    }

    if (!canSell) {
      return "This share holding is not currently available for sale.";
    }

    if (
      !Number.isFinite(
        requestedUnits,
      ) ||
      requestedUnits <= 0
    ) {
      return "Enter a valid number of shares to sell.";
    }

    if (
      requestedUnits >
      availableUnits
    ) {
      return `You only have ${formatNumber(
        availableUnits,
      )} sellable shares in this holding.`;
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

      const holdingId =
        getHoldingId(
          selectedHolding,
        );

      const investmentId =
        getInvestmentId(
          selectedHolding,
        );

      const payload = {
        holdingId,
        shareHoldingId:
          holdingId,
        investmentId,
        shareProductId:
          investmentId,
        units: requestedUnits,
        quantity: requestedUnits,
        side: "SELL",
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
              "/shares/sell",
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
            "Your share sale instruction has been submitted.",
        });

        setUnits("");
      } catch (requestError) {
        const status =
          requestError?.response
            ?.status;

        if (
          status === 404 ||
          status === 501
        ) {
          setError(
            "Share selling is not available from the banking API yet.",
          );
        } else {
          setError(
            getApiMessage(
              requestError,
              "Unable to submit the share sale instruction.",
            ),
          );
        }
      } finally {
        setSubmitting(false);
      }
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
              <TrendingDown className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Sell shares
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create a sale instruction from an eligible share holding.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadHoldings(true)
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
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

          <div>
            <p className="text-sm font-bold text-red-950 dark:text-red-300">
              Sale could not be submitted
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
                Sale instruction submitted
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
                  Sell another holding
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main form */}
      {!success && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Sale details
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select the holding and specify the number of shares you want to
                sell.
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              {/* Holding */}
              <div>
                <label
                  htmlFor="share-holding"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  Share holding
                </label>

                <div className="relative mt-2">
                  <select
                    id="share-holding"
                    value={
                      selectedHoldingId
                    }
                    onChange={(event) => {
                      setSelectedHoldingId(
                        event.target
                          .value,
                      );
                      setUnits("");
                      setError("");
                    }}
                    disabled={loading}
                    className="min-h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:disabled:bg-slate-900"
                  >
                    <option value="">
                      {loading
                        ? "Loading holdings..."
                        : holdings.length
                          ? "Select share holding"
                          : "No sellable holdings"}
                    </option>

                    {holdings.map(
                      (holding) => {
                        const id =
                          getHoldingId(
                            holding,
                          );

                        return (
                          <option
                            key={id}
                            value={id}
                          >
                            {getHoldingName(
                              holding,
                            )}{" "}
                            —{" "}
                            {formatNumber(
                              getAvailableUnits(
                                holding,
                              ),
                            )}{" "}
                            shares
                          </option>
                        );
                      },
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Holding summary */}
              {selectedHolding && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-950 dark:text-white">
                        {getHoldingName(
                          selectedHolding,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {getHoldingType(
                          selectedHolding,
                        )}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {formatStatus(
                        holdingStatus,
                      )}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InfoItem
                      label="Total units"
                      value={formatNumber(
                        getUnits(
                          selectedHolding,
                        ),
                      )}
                    />

                    <InfoItem
                      label="Sellable units"
                      value={formatNumber(
                        availableUnits,
                      )}
                    />

                    <InfoItem
                      label="Current price"
                      value={formatMoney(
                        unitPrice,
                        currency,
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Units */}
              <div>
                <label
                  htmlFor="sale-units"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  Number of shares to sell
                </label>

                <input
                  id="sale-units"
                  name="units"
                  type="number"
                  min="0"
                  max={
                    availableUnits ||
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
                  disabled={
                    !selectedHolding
                  }
                  placeholder="Enter number of shares"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-white dark:disabled:bg-slate-900"
                />

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Maximum available to sell:{" "}
                  <span className="font-bold">
                    {formatNumber(
                      availableUnits,
                    )}
                  </span>
                </p>
              </div>

              {/* Exceeds available */}
              {unitsExceedHolding && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

                  <p className="text-xs leading-5 text-red-800 dark:text-red-400">
                    You cannot sell more than the available sellable quantity
                    of{" "}
                    <strong>
                      {formatNumber(
                        availableUnits,
                      )}
                    </strong>{" "}
                    shares.
                  </p>
                </div>
              )}

              {/* Account */}
              {getAccountNumber(
                selectedHolding,
              ) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Settlement account
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                    {getAccountNumber(
                      selectedHolding,
                    )}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  loading ||
                  !selectedHolding ||
                  unitsExceedHolding
                }
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}

                {submitting
                  ? "Submitting sale..."
                  : "Submit share sale"}
              </button>
            </div>
          </section>

          {/* Summary */}
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Sale summary
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Estimated value based on the currently available unit price.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <SummaryRow
                label="Holding"
                value={
                  selectedHolding
                    ? getHoldingName(
                        selectedHolding,
                      )
                    : "Not selected"
                }
              />

              <SummaryRow
                label="Units"
                value={
                  requestedUnits >
                  0
                    ? formatNumber(
                        requestedUnits,
                      )
                    : "—"
                }
              />

              <SummaryRow
                label="Current price"
                value={
                  selectedHolding
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
                    Estimated value
                  </span>

                  <span className="text-xl font-bold text-slate-950 dark:text-white">
                    {formatMoney(
                      estimatedValue,
                      currency,
                    )}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />

                  <p className="text-[11px] leading-5 text-amber-800 dark:text-amber-400">
                    The displayed value is an estimate only. Final execution
                    price, applicable fees, settlement and proceeds are
                    determined by the banking investment service.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </form>
      )}

      {/* Security notice */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Share-sale security
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              This page submits a sale instruction to the authenticated
              banking service. It does not locally modify your share balance or
              create a completed sale.
            </p>
          </div>
        </div>
      </section>
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

export default SellShares;