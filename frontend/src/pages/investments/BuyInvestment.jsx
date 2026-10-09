import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Copy,
  FileCheck2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  WalletCards,
} from "lucide-react";

import api from "../../services/api.js";

/* =========================================================
   HELPERS
========================================================= */

const normalizePlans = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.plans)) {
    return payload.plans;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }

  if (Array.isArray(payload?.data?.plans)) {
    return payload.data.plans;
  }

  return [];
};

const getPlanId = (plan) =>
  plan?.id ?? null;

const getPlanName = (plan) =>
  plan?.name ??
  plan?.title ??
  "Investment Plan";

const getPlanDescription = (plan) =>
  plan?.description ??
  "Fixed-term investment plan available through EpexBank.";

const getPlanCurrency = (plan) =>
  plan?.currencyCode ??
  plan?.currency?.code ??
  plan?.currency ??
  "USD";

const getPlanMinimum = (plan) => {
  const value =
    plan?.minimumAmount ??
    plan?.minimumInvestment ??
    0;

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
};

const getPlanMaximum = (plan) => {
  const value =
    plan?.maximumAmount ??
    plan?.maximumInvestment ??
    null;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
};

const getPlanReturnRate = (plan) => {
  const value =
    plan?.returnRate ??
    plan?.expectedReturn ??
    plan?.rate ??
    null;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
};

const getPlanDuration = (plan) => {
  const value =
    plan?.durationDays ??
    plan?.duration ??
    plan?.termDays ??
    null;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
};

const formatAmount = (
  amount,
  currency = "USD",
) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      },
    ).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 2,
      },
    )}`;
  }
};

const formatBtc = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  return `${numericAmount.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 8,
    },
  )} BTC`;
};

const formatPercent = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return `${numericValue}%`;
};

const getApiErrorMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

/* =========================================================
   COMPONENT
========================================================= */

const BuyInvestment = () => {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] =
    useState(true);
  const [plansError, setPlansError] =
    useState("");

  const [selectedPlanId, setSelectedPlanId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  /*
   * STEP 1:
   * Choose investment plan and amount.
   *
   * STEP 2:
   * Investment has been created and the customer
   * receives BTC payment instructions.
   *
   * STEP 3:
   * Customer submits transaction hash + payment proof.
   */
  const [step, setStep] = useState(1);

  const [investment, setInvestment] =
    useState(null);

  const [transactionHash, setTransactionHash] =
    useState("");

  const [paymentProof, setPaymentProof] =
    useState(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [copied, setCopied] =
    useState("");

  /* =========================================================
     LOAD INVESTMENT PLANS
  ========================================================= */

  const loadPlans = useCallback(
    async () => {
      setPlansLoading(true);
      setPlansError("");

      try {
        const response =
          await api.get(
            "/investments/plans",
          );

        const normalized =
          normalizePlans(
            response?.data,
          ).filter(
            (plan) =>
              plan?.isActive !== false,
          );

        setPlans(normalized);

        setSelectedPlanId(
          (current) => {
            const exists =
              normalized.some(
                (plan) =>
                  String(
                    getPlanId(plan),
                  ) ===
                  String(current),
              );

            if (exists) {
              return current;
            }

            return normalized.length > 0
              ? String(
                  getPlanId(
                    normalized[0],
                  ),
                )
              : "";
          },
        );
      } catch (error) {
        setPlans([]);
        setSelectedPlanId("");

        setPlansError(
          getApiErrorMessage(
            error,
            "Unable to load investment plans.",
          ),
        );
      } finally {
        setPlansLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  /* =========================================================
     SELECTED PLAN
  ========================================================= */

  const selectedPlan = useMemo(
    () =>
      plans.find(
        (plan) =>
          String(
            getPlanId(plan),
          ) ===
          String(selectedPlanId),
      ) || null,
    [plans, selectedPlanId],
  );

  const investmentCurrency =
    getPlanCurrency(
      selectedPlan,
    );

  const minimumAmount =
    getPlanMinimum(
      selectedPlan,
    );

  const maximumAmount =
    getPlanMaximum(
      selectedPlan,
    );

  const returnRate =
    getPlanReturnRate(
      selectedPlan,
    );

  const durationDays =
    getPlanDuration(
      selectedPlan,
    );

  const numericAmount =
    Number(amount);

  const amountIsValid =
    amount !== "" &&
    Number.isFinite(
      numericAmount,
    ) &&
    numericAmount > 0 &&
    numericAmount >=
      minimumAmount &&
    (
      maximumAmount === null ||
      numericAmount <=
        maximumAmount
    );

  const amountValidationMessage =
    useMemo(() => {
      if (
        !selectedPlan ||
        amount === ""
      ) {
        return "";
      }

      if (
        !Number.isFinite(
          numericAmount,
        ) ||
        numericAmount <= 0
      ) {
        return "Enter a valid investment amount.";
      }

      if (
        numericAmount <
        minimumAmount
      ) {
        return `Minimum investment is ${formatAmount(
          minimumAmount,
          investmentCurrency,
        )}.`;
      }

      if (
        maximumAmount !== null &&
        numericAmount >
          maximumAmount
      ) {
        return `Maximum investment is ${formatAmount(
          maximumAmount,
          investmentCurrency,
        )}.`;
      }

      return "";
    }, [
      amount,
      investmentCurrency,
      maximumAmount,
      minimumAmount,
      numericAmount,
      selectedPlan,
    ]);

  /* =========================================================
     CREATE INVESTMENT
  ========================================================= */

  const createInvestment =
    async () => {
      setSubmitError("");

      if (!selectedPlan) {
        setSubmitError(
          "Please select an investment plan.",
        );
        return;
      }

      if (!amountIsValid) {
        setSubmitError(
          amountValidationMessage ||
            "Enter a valid investment amount.",
        );
        return;
      }

      setSubmitting(true);

      try {
        const response =
          await api.post(
            "/investments/fixed",
            {
              planId:
                getPlanId(
                  selectedPlan,
                ),
              amount:
                numericAmount,
            },
          );

        const createdInvestment =
          response?.data
            ?.investment ||
          response?.data
            ?.data
            ?.investment ||
          response?.data
            ?.data ||
          null;

        if (
          !createdInvestment?.id
        ) {
          throw new Error(
            "The investment was created, but the investment details were not returned by the server.",
          );
        }

        setInvestment(
          createdInvestment,
        );

        setTransactionHash("");
        setPaymentProof(null);

        setStep(2);
      } catch (error) {
        setSubmitError(
          getApiErrorMessage(
            error,
            "Unable to create the investment.",
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =========================================================
     COPY TO CLIPBOARD
  ========================================================= */

  const copyValue = async (
    value,
    label,
  ) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        String(value),
      );

      setCopied(label);

      window.setTimeout(() => {
        setCopied("");
      }, 1800);
    } catch {
      setSubmitError(
        `Unable to copy the ${label}. Please copy it manually.`,
      );
    }
  };

  /* =========================================================
     PAYMENT PROOF FILE
  ========================================================= */

  const handlePaymentProofChange =
    (event) => {
      setSubmitError("");

      const file =
        event.target.files?.[0] ||
        null;

      if (!file) {
        setPaymentProof(null);
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
      ];

      if (
        !allowedTypes.includes(
          file.type,
        )
      ) {
        event.target.value = "";

        setPaymentProof(null);

        setSubmitError(
          "Only JPG, PNG, and PDF payment proof files are allowed.",
        );

        return;
      }

      const maxSize =
        10 * 1024 * 1024;

      if (file.size > maxSize) {
        event.target.value = "";

        setPaymentProof(null);

        setSubmitError(
          "Payment proof must not exceed 10 MB.",
        );

        return;
      }

      setPaymentProof(file);
    };

  /* =========================================================
     SUBMIT BTC PAYMENT
  ========================================================= */

  const submitPayment =
    async () => {
      setSubmitError("");

      if (!investment?.id) {
        setSubmitError(
          "Investment details are unavailable. Please restart the investment process.",
        );
        return;
      }

      const normalizedHash =
        transactionHash.trim();

      if (!normalizedHash) {
        setSubmitError(
          "Please enter the Bitcoin transaction hash.",
        );
        return;
      }

      if (
        normalizedHash.length <
        20
      ) {
        setSubmitError(
          "Please provide a valid Bitcoin transaction hash.",
        );
        return;
      }

      if (!paymentProof) {
        setSubmitError(
          "Please upload your payment proof.",
        );
        return;
      }

      setSubmitting(true);

      try {
        const formData =
          new FormData();

        formData.append(
          "transactionHash",
          normalizedHash,
        );

        formData.append(
          "paymentProof",
          paymentProof,
        );

        const response =
          await api.post(
            `/investments/fixed/${investment.id}/payment`,
            formData,
          );

        const submittedInvestment =
          response?.data
            ?.investment ||
          response?.data
            ?.data
            ?.investment ||
          response?.data
            ?.data ||
          investment;

        setInvestment(
          submittedInvestment,
        );

        setSuccess(true);
        setStep(3);
      } catch (error) {
        setSubmitError(
          getApiErrorMessage(
            error,
            "Unable to submit your payment proof.",
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =========================================================
     RESET
  ========================================================= */

  const startNewInvestment =
    () => {
      setStep(1);
      setInvestment(null);
      setAmount("");
      setTransactionHash("");
      setPaymentProof(null);
      setSubmitError("");
      setSuccess(false);
    };

  /* =========================================================
     SUCCESS SCREEN
  ========================================================= */

  if (
    success &&
    investment
  ) {
    const principal =
      investment?.principal ??
      numericAmount;

    const currency =
      investment?.currencyCode ||
      investmentCurrency;

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/investments"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to investments
          </Link>

          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900 sm:p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 size={34} />
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
              Payment submitted
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your investment payment proof has been
              submitted successfully. The payment will
              be reviewed before the investment becomes
              active.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Investment amount
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatAmount(
                    principal,
                    currency,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Payment status
                </p>

                <p className="mt-1 font-bold text-amber-600 dark:text-amber-400">
                  {investment?.paymentStatus ||
                    "SUBMITTED"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Investment status
                </p>

                <p className="mt-1 font-bold">
                  {investment?.status ||
                    "PAYMENT_SUBMITTED"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Reference
                </p>

                <p className="mt-1 break-all font-mono text-sm font-semibold">
                  {investment?.reference ||
                    investment?.id ||
                    "—"}
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <p>
                  Your submitted transaction hash and
                  payment proof are now attached to this
                  investment. Submission does not
                  automatically verify the Bitcoin payment.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/investments",
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                View my investments
                <ChevronRight size={17} />
              </button>

              <button
                type="button"
                onClick={
                  startNewInvestment
                }
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Make another investment
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/investments"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to investments
        </Link>

        <div className="mb-8 mt-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <WalletCards size={28} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            Make an investment
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Select a fixed-term investment plan, enter
            your investment amount, then complete the
            Bitcoin payment and submit your payment proof.
          </p>
        </div>

        {/* =====================================================
            STEP INDICATOR
        ====================================================== */}

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <div
            className={`rounded-2xl border p-4 ${
              step >= 1
                ? "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30"
                : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Step 1
            </p>

            <p className="mt-1 font-semibold">
              Choose investment
            </p>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              step >= 2
                ? "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30"
                : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Step 2
            </p>

            <p className="mt-1 font-semibold">
              Make BTC payment
            </p>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              step >= 3
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                : step >= 2
                  ? "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Step 3
            </p>

            <p className="mt-1 font-semibold">
              Submit payment proof
            </p>
          </div>
        </div>

        {plansError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Unable to load investment plans
              </p>

              <p className="mt-1 leading-6">
                {plansError}
              </p>
            </div>

            <button
              type="button"
              onClick={loadPlans}
              disabled={plansLoading}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
            >
              <RefreshCw
                size={15}
                className={
                  plansLoading
                    ? "animate-spin"
                    : ""
                }
              />
              Retry
            </button>
          </div>
        )}

        {submitError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <p className="leading-6">
              {submitError}
            </p>
          </div>
        )}

        {/* =====================================================
            STEP 1
        ====================================================== */}

        {step === 1 && (
          <div className="grid gap-6 lg:grid-cols-[1fr_370px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold">
                  Available investment plans
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Choose the fixed-term plan you want to
                  invest in.
                </p>
              </div>

              {plansLoading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <Loader2
                    size={29}
                    className="animate-spin text-slate-500"
                  />
                </div>
              ) : plans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <WalletCards
                    size={32}
                    className="mx-auto text-slate-400"
                  />

                  <h3 className="mt-3 font-semibold">
                    No investment plans available
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    There are currently no active fixed-term
                    investment plans available.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan) => {
                    const planId =
                      getPlanId(plan);

                    const selected =
                      String(planId) ===
                      String(
                        selectedPlanId,
                      );

                    const currency =
                      getPlanCurrency(
                        plan,
                      );

                    const minimum =
                      getPlanMinimum(
                        plan,
                      );

                    const maximum =
                      getPlanMaximum(
                        plan,
                      );

                    const rate =
                      getPlanReturnRate(
                        plan,
                      );

                    const duration =
                      getPlanDuration(
                        plan,
                      );

                    return (
                      <button
                        key={String(
                          planId,
                        )}
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(
                            String(
                              planId,
                            ),
                          );

                          setAmount("");
                          setSubmitError("");
                        }}
                        className={`w-full rounded-2xl border p-5 text-left transition ${
                          selected
                            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-500/10"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                              selected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <WalletCards
                              size={23}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold">
                                  {getPlanName(
                                    plan,
                                  )}
                                </h3>

                                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  {currency} fixed-term investment
                                </p>
                              </div>

                              {selected && (
                                <CheckCircle2
                                  size={20}
                                  className="shrink-0 text-blue-600 dark:text-blue-400"
                                />
                              )}
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                              {getPlanDescription(
                                plan,
                              )}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Min:{" "}
                                {formatAmount(
                                  minimum,
                                  currency,
                                )}
                              </span>

                              {maximum !==
                                null && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  Max:{" "}
                                  {formatAmount(
                                    maximum,
                                    currency,
                                  )}
                                </span>
                              )}

                              {rate !==
                                null && (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                  Return:{" "}
                                  {formatPercent(
                                    rate,
                                  )}
                                </span>
                              )}

                              {duration !==
                                null && (
                                <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                  {duration} days
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <ShieldCheck
                    size={22}
                  />
                </div>

                <div>
                  <h2 className="font-bold">
                    Investment details
                  </h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review before continuing
                  </p>
                </div>
              </div>

              <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Selected plan
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedPlan
                      ? getPlanName(
                          selectedPlan,
                        )
                      : "Not selected"}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="investment-amount"
                    className="text-xs font-medium text-slate-500 dark:text-slate-400"
                  >
                    Investment amount
                  </label>

                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-slate-500">
                      {investmentCurrency}
                    </span>

                    <input
                      id="investment-amount"
                      type="number"
                      min={
                        minimumAmount ||
                        0
                      }
                      max={
                        maximumAmount ??
                        undefined
                      }
                      step="0.01"
                      inputMode="decimal"
                      value={amount}
                      onChange={(
                        event,
                      ) => {
                        setAmount(
                          event.target
                            .value,
                        );
                        setSubmitError(
                          "",
                        );
                      }}
                      placeholder="0.00"
                      disabled={
                        !selectedPlan ||
                        submitting
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-16 pr-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-500/10 dark:disabled:bg-slate-800"
                    />
                  </div>

                  {amountValidationMessage && (
                    <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                      {amountValidationMessage}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Amount
                    </span>

                    <strong className="text-lg">
                      {amountIsValid
                        ? formatAmount(
                            numericAmount,
                            investmentCurrency,
                          )
                        : "—"}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    createInvestment
                  }
                  disabled={
                    !selectedPlan ||
                    !amountIsValid ||
                    submitting ||
                    plansLoading
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Creating investment...
                    </>
                  ) : (
                    <>
                      Continue to Bitcoin payment
                      <ChevronRight
                        size={18}
                      />
                    </>
                  )}
                </button>

                <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Your investment amount is recorded on
                  the investment itself. No payment is
                  marked as verified at this stage.
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* =====================================================
            STEP 2 / 3 PAYMENT
        ====================================================== */}

        {step >= 2 &&
          investment && (
            <div className="grid gap-6 lg:grid-cols-[1fr_370px]">
              <div className="space-y-6">
                {/* INVESTMENT SUMMARY */}

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold">
                        Your investment
                      </h2>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        This is the investment record that
                        will receive your payment proof.
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      {investment?.status ||
                        "PENDING_PAYMENT"}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Investment amount
                      </p>

                      <p className="mt-1 text-xl font-bold">
                        {formatAmount(
                          investment?.principal,
                          investment?.currencyCode ||
                            investmentCurrency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        BTC amount required
                      </p>

                      <p className="mt-1 text-xl font-bold">
                        {formatBtc(
                          investment?.btcAmount,
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        BTC rate
                      </p>

                      <p className="mt-1 font-semibold">
                        {formatAmount(
                          investment?.btcRate,
                          investment?.currencyCode ||
                            investmentCurrency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Reference
                      </p>

                      <p className="mt-1 break-all font-mono text-sm font-semibold">
                        {investment?.reference ||
                          investment?.id ||
                          "—"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* BTC PAYMENT DETAILS */}

                <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-sm dark:border-orange-900/50 dark:bg-slate-900 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                      <WalletCards
                        size={22}
                      />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold">
                        Bitcoin payment
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Send exactly the required Bitcoin amount
                        to the configured receiving address.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          BTC receiving address
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            copyValue(
                              investment?.btcAddress,
                              "BTC address",
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          {copied ===
                          "BTC address" ? (
                            <>
                              <CheckCircle2
                                size={14}
                              />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy
                                size={14}
                              />
                              Copy
                            </>
                          )}
                        </button>
                      </div>

                      <div className="break-all rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
                        {investment?.btcAddress ||
                          "Bitcoin receiving address unavailable."}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                        Send exactly
                      </p>

                      <p className="mt-1 text-2xl font-bold text-orange-900 dark:text-orange-200">
                        {formatBtc(
                          investment?.btcAmount,
                        )}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-orange-800 dark:text-orange-300">
                        Make sure the Bitcoin amount and
                        receiving address are correct before
                        sending the payment.
                      </p>
                    </div>

                    {investment?.btcRate !==
                      null &&
                      investment?.btcRate !==
                        undefined && (
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-500 dark:text-slate-400">
                            BTC rate
                          </span>

                          <span className="font-semibold">
                            {formatAmount(
                              investment.btcRate,
                              investment?.currencyCode ||
                                investmentCurrency,
                            )}
                          </span>
                        </div>
                      )}

                    {investment?.paymentInstructions && (
                      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Payment instructions
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {investment.paymentInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* PAYMENT PROOF */}

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      <FileCheck2
                        size={22}
                      />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold">
                        I Have Made Payment
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Enter your Bitcoin transaction hash and
                        upload the payment slip or screenshot.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label
                        htmlFor="transaction-hash"
                        className="text-sm font-semibold"
                      >
                        Bitcoin transaction hash
                      </label>

                      <input
                        id="transaction-hash"
                        type="text"
                        value={
                          transactionHash
                        }
                        onChange={(
                          event,
                        ) => {
                          setTransactionHash(
                            event.target
                              .value,
                          );
                          setSubmitError(
                            "",
                          );
                        }}
                        placeholder="Enter your BTC transaction hash"
                        disabled={
                          submitting
                        }
                        autoComplete="off"
                        spellCheck="false"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-500/10 dark:disabled:bg-slate-800"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        The transaction hash is used as payment
                        evidence. It does not automatically verify
                        the payment.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="payment-proof"
                        className="text-sm font-semibold"
                      >
                        Payment proof
                      </label>

                      <label
                        htmlFor="payment-proof"
                        className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition ${
                          paymentProof
                            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
                            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-600 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Upload
                          size={28}
                          className={
                            paymentProof
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400"
                          }
                        />

                        <span className="mt-3 text-sm font-semibold">
                          {paymentProof
                            ? paymentProof.name
                            : "Upload payment slip"}
                        </span>

                        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          JPG, PNG or PDF • Maximum 10 MB
                        </span>

                        <input
                          id="payment-proof"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          onChange={
                            handlePaymentProofChange
                          }
                          disabled={
                            submitting
                          }
                          className="sr-only"
                        />
                      </label>

                      {paymentProof && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {
                                paymentProof.name
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {(
                                paymentProof.size /
                                1024 /
                                1024
                              ).toFixed(
                                2,
                              )}{" "}
                              MB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setPaymentProof(
                                null,
                              )
                            }
                            disabled={
                              submitting
                            }
                            className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={
                        submitPayment
                      }
                      disabled={
                        submitting ||
                        !transactionHash.trim() ||
                        !paymentProof
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      {submitting ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                          Submitting payment proof...
                        </>
                      ) : (
                        <>
                          I Have Made Payment
                          <ChevronRight
                            size={18}
                          />
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>

              {/* RIGHT SUMMARY */}

              <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Clipboard
                      size={22}
                    />
                  </div>

                  <div>
                    <h2 className="font-bold">
                      Payment summary
                    </h2>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Verify these details before payment
                    </p>
                  </div>
                </div>

                <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Investment
                    </p>

                    <p className="mt-1 font-semibold">
                      {investment?.plan?.name ||
                        getPlanName(
                          selectedPlan,
                        )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Principal
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {formatAmount(
                        investment?.principal,
                        investment?.currencyCode ||
                          investmentCurrency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      BTC required
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {formatBtc(
                        investment?.btcAmount,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Payment status
                    </p>

                    <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">
                      {investment?.paymentStatus ||
                        "PENDING"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Investment status
                    </p>

                    <p className="mt-1 font-semibold">
                      {investment?.status ||
                        "PENDING_PAYMENT"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Investment reference
                    </p>

                    <p className="mt-1 break-all font-mono text-xs font-semibold">
                      {investment?.reference ||
                        investment?.id ||
                        "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
                    />

                    <p className="text-xs leading-5 text-blue-800 dark:text-blue-300">
                      EpexBank will review the submitted
                      transaction hash and payment proof.
                      The investment will only become active
                      after authorized verification.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          )}
      </div>
    </div>
  );
};

export default BuyInvestment;