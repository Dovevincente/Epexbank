import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api.js";

const getData = (response) => response?.data?.data ?? response?.data ?? null;

const getInvestment = (response) => {
  const data = getData(response);

  return (
    data?.investment ||
    data?.record ||
    data?.item ||
    data
  );
};

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
    return "—";
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

const getCurrency = (investment) =>
  String(
    investment?.currencyCode ||
      investment?.currency?.code ||
      investment?.plan?.currencyCode ||
      "USD",
  ).toUpperCase();

const getCustomer = (investment) => {
  const customer =
    investment?.user ||
    investment?.customer ||
    investment?.owner ||
    null;

  return {
    name:
      customer?.name ||
      customer?.fullName ||
      [customer?.firstName, customer?.lastName]
        .filter(Boolean)
        .join(" ") ||
      customer?.email ||
      investment?.userId ||
      "Customer",
    email: customer?.email || "",
    id: customer?.id || investment?.userId || "",
  };
};

const statusClass = (status) => {
  switch (String(status).toUpperCase()) {
    case "ACTIVE":
    case "VERIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PAYMENT_SUBMITTED":
    case "UNDER_REVIEW":
    case "PENDING_PAYMENT":
    case "SUBMITTED":
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
      return "border-red-200 bg-red-50 text-red-700";

    case "MATURED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const AdminInvestmentDetails = () => {
  const navigate = useNavigate();
  const { investmentId } = useParams();

  const [investment, setInvestment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [copied, setCopied] = useState("");

  const loadInvestment = useCallback(
    async (isRefresh = false) => {
      if (!investmentId) {
        setError("Investment ID is missing.");
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setSuccess("");

      try {
        const response = await api.get(
          `/admin/investments/${encodeURIComponent(investmentId)}`,
        );

        const record = getInvestment(response);

        if (!record || !record.id) {
          throw new Error("Investment record was not returned by the server.");
        }

        setInvestment(record);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to load investment details.";

        setError(message);
        setInvestment(null);
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

  const status = String(investment?.status || "").toUpperCase();
  const paymentStatus = String(
    investment?.paymentStatus || "",
  ).toUpperCase();

  const currency = getCurrency(investment);
  const customer = getCustomer(investment);

  const isBtc =
    String(investment?.fundingMethod || "").toUpperCase() === "BTC" ||
    Boolean(
      investment?.btcAddress ||
        investment?.btcAmount ||
        investment?.transactionHash ||
        investment?.paymentStatus,
    );

  const needsReview =
    isBtc &&
    (status === "PAYMENT_SUBMITTED" ||
      status === "UNDER_REVIEW" ||
      paymentStatus === "SUBMITTED");

  const canMarkUnderReview =
    status === "PAYMENT_SUBMITTED" &&
    paymentStatus === "SUBMITTED";

  const canVerify =
    isBtc &&
    paymentStatus === "SUBMITTED" &&
    (status === "PAYMENT_SUBMITTED" || status === "UNDER_REVIEW");

  const canReject =
    isBtc &&
    paymentStatus === "SUBMITTED" &&
    (status === "PAYMENT_SUBMITTED" || status === "UNDER_REVIEW");

  const maturityDate = investment?.maturityDate;

  const copyValue = async (value, label) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(label);

      window.setTimeout(() => {
        setCopied("");
      }, 1800);
    } catch {
      setError(`Unable to copy ${label}.`);
    }
  };

  const runAction = async (action, callback) => {
    setActionLoading(action);
    setError("");
    setSuccess("");

    try {
      await callback();

      await loadInvestment(true);

      if (action === "verify") {
        setSuccess(
          "BTC payment verified successfully. The investment is now active.",
        );
      }

      if (action === "review") {
        setSuccess("Investment moved to admin review.");
      }

      if (action === "reject") {
        setSuccess("BTC payment rejected and investment marked as rejected.");
        setShowRejectForm(false);
        setRejectionReason("");
      }
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "The requested admin action could not be completed.";

      setError(message);
    } finally {
      setActionLoading("");
    }
  };

  const markUnderReview = async () => {
    await runAction("review", async () => {
      await api.patch(
        `/admin/investments/${encodeURIComponent(
          investmentId,
        )}/review`,
      );
    });
  };

  const verifyPayment = async () => {
    const confirmed = window.confirm(
      "Confirm that you have independently verified the BTC transaction on the appropriate Bitcoin network/explorer. This will activate the investment.",
    );

    if (!confirmed) {
      return;
    }

    await runAction("verify", async () => {
      await api.post(
        `/admin/investments/${encodeURIComponent(
          investmentId,
        )}/verify`,
      );
    });
  };

  const rejectPayment = async () => {
    const reason = rejectionReason.trim();

    if (!reason) {
      setError("Please enter a reason before rejecting the payment.");
      return;
    }

    const confirmed = window.confirm(
      "Reject this BTC payment and mark the investment as rejected?",
    );

    if (!confirmed) {
      return;
    }

    await runAction("reject", async () => {
      await api.post(
        `/admin/investments/${encodeURIComponent(
          investmentId,
        )}/reject`,
        {
          reason,
        },
      );
    });
  };

  const pageTitle = useMemo(() => {
    if (!investment) {
      return "Investment Details";
    }

    return (
      investment?.plan?.name ||
      investment?.investmentPlan?.name ||
      "Investment Details"
    );
  }, [investment]);

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex min-h-[500px] max-w-5xl items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-700" />

            <p className="mt-4 font-semibold text-slate-950">
              Loading investment
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Retrieving the investment record and payment information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !investment) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-950">
              Investment unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadInvestment()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/investments")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to investments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/investments")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to investments
          </button>

          <button
            type="button"
            onClick={() => loadInvestment(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {success ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Action completed</p>
              <p className="mt-1">{success}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">Action failed</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Protected investment administration
                </div>

                <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  {pageTitle}
                </h1>

                <p className="mt-2 font-mono text-xs text-slate-400">
                  {investment?.reference || investment?.id}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusClass(
                    status,
                  )}`}
                >
                  {formatLabel(status)}
                </span>

                {isBtc ? (
                  <span className="rounded-full bg-orange-500/15 px-3 py-1.5 text-xs font-bold text-orange-300">
                    BTC
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {needsReview ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-amber-950">
                  BTC payment requires admin verification
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  The customer has submitted a transaction hash. Verify the
                  transaction independently before activating this investment.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-950">
              Investment information
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {customer.name}
                </p>

                {customer.email ? (
                  <p className="mt-1 break-all text-sm text-slate-500">
                    {customer.email}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  User ID
                </p>

                <p className="mt-2 break-all font-mono text-xs text-slate-700">
                  {customer.id || "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Principal
                </p>

                <p className="mt-2 text-xl font-bold text-slate-950">
                  {formatMoney(investment?.principal, currency)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Expected return
                </p>

                <p className="mt-2 text-xl font-bold text-emerald-700">
                  {formatMoney(investment?.expectedReturn, currency)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Maturity value
                </p>

                <p className="mt-2 text-xl font-bold text-slate-950">
                  {formatMoney(
                    investment?.totalMaturityValue,
                    currency,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Maturity date
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {formatDateTime(maturityDate)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {formatDateTime(investment?.createdAt)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment submitted
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {formatDateTime(investment?.paymentSubmittedAt)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">
              Status
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Investment status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                    status,
                  )}`}
                >
                  {formatLabel(status)}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                    paymentStatus,
                  )}`}
                >
                  {formatLabel(paymentStatus || "PENDING")}
                </span>
              </div>

              {investment?.paymentVerifiedAt ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Payment verified
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDateTime(investment.paymentVerifiedAt)}
                  </p>
                </div>
              ) : null}

              {investment?.rejectionReason ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    Rejection reason
                  </p>

                  <p className="mt-2 text-sm leading-6 text-red-800">
                    {investment.rejectionReason}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {isBtc ? (
          <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Bitcoin payment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review the submitted BTC payment information before activation.
                </p>
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
                Bitcoin
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      BTC amount
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-950">
                      {investment?.btcAmount
                        ? `${formatNumber(
                            investment.btcAmount,
                            8,
                          )} BTC`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  BTC rate
                </p>

                <p className="mt-2 font-semibold text-slate-950">
                  {investment?.btcRate
                    ? formatMoney(
                        investment.btcRate,
                        currency,
                      )
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Receiving address
                    </p>

                    <p className="mt-2 break-all font-mono text-xs leading-6 text-slate-800">
                      {investment?.btcAddress || "Not configured"}
                    </p>
                  </div>

                  {investment?.btcAddress ? (
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(
                          investment.btcAddress,
                          "BTC address",
                        )
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="h-3.5 w-3.5" />

                      {copied === "BTC address"
                        ? "Copied"
                        : "Copy"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                      Transaction hash
                    </p>

                    {investment?.transactionHash ? (
                      <p className="mt-2 break-all font-mono text-xs leading-6 text-orange-950">
                        {investment.transactionHash}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-orange-800">
                        Customer has not submitted a transaction hash yet.
                      </p>
                    )}
                  </div>

                  {investment?.transactionHash ? (
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(
                          investment.transactionHash,
                          "transaction hash",
                        )
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-2.5 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-50"
                    >
                      <Copy className="h-3.5 w-3.5" />

                      {copied === "transaction hash"
                        ? "Copied"
                        : "Copy"}
                    </button>
                  ) : null}
                </div>

                {investment?.transactionHash ? (
                  <div className="mt-4 flex items-center gap-2 text-xs text-orange-800">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>
                      Verify this transaction independently before activation.
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {canMarkUnderReview ? (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-blue-950">
                  Start payment review
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Move this payment into the explicit admin review state before
                  verification.
                </p>
              </div>

              <button
                type="button"
                onClick={markUnderReview}
                disabled={Boolean(actionLoading)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "review" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}

                Mark Under Review
              </button>
            </div>
          </section>
        ) : null}

        {canVerify || canReject ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">
              Administrator action
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Only activate this investment after independently confirming that
              the submitted transaction corresponds to the required BTC payment.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {canVerify ? (
                <button
                  type="button"
                  onClick={verifyPayment}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "verify" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}

                  Verify Payment & Activate
                </button>
              ) : null}

              {canReject ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectForm((current) => !current);
                    setError("");
                  }}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Payment
                </button>
              ) : null}
            </div>

            {showRejectForm ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <label
                  htmlFor="rejectionReason"
                  className="text-sm font-bold text-red-900"
                >
                  Reason for rejection
                </label>

                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(event) =>
                    setRejectionReason(event.target.value)
                  }
                  rows={4}
                  placeholder="Explain why the BTC payment is being rejected..."
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={rejectPayment}
                    disabled={
                      Boolean(actionLoading) ||
                      !rejectionReason.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}

                    Confirm Rejection
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

            <p>
              Administrative investment actions are server-authorized. A
              customer-submitted transaction hash is payment evidence only and
              does not independently prove that funds were received.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInvestmentDetails;