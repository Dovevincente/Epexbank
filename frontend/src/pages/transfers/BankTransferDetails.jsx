import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getBankTransfer,
} from "../../services/bankTransferService.js";

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    icon: Clock3,
    className:
      "bg-amber-50 text-amber-700 ring-amber-200",
  },

  PROCESSING: {
    label: "Processing",
    icon: RefreshCw,
    className:
      "bg-blue-50 text-blue-700 ring-blue-200",
  },

  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },

  FAILED: {
    label: "Failed",
    icon: XCircle,
    className:
      "bg-red-50 text-red-700 ring-red-200",
  },

  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    className:
      "bg-slate-100 text-slate-700 ring-slate-200",
  },

  REVERSED: {
    label: "Reversed",
    icon: AlertTriangle,
    className:
      "bg-orange-50 text-orange-700 ring-orange-200",
  },
};

const formatMoney = (
  value,
  currency = "",
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return `${currency || ""} 0.00`.trim();
  }

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
    ).format(numericValue);
  } catch {
    return `${currency} ${numericValue.toFixed(
      2,
    )}`.trim();
  }
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
};

const maskAccountNumber = (
  accountNumber,
) => {
  if (!accountNumber) {
    return "—";
  }

  const value = String(
    accountNumber,
  );

  if (value.length <= 4) {
    return value;
  }

  return `•••• ${value.slice(-4)}`;
};

/*
 * ============================================================
 * STATUS BADGE
 * ============================================================
 */

const StatusBadge = ({
  status,
}) => {
  const normalizedStatus =
    String(status || "PENDING").toUpperCase();

  const config =
    STATUS_CONFIG[
      normalizedStatus
    ] || STATUS_CONFIG.PENDING;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${config.className}`}
    >
      <Icon
        size={14}
        className={
          normalizedStatus ===
          "PROCESSING"
            ? "animate-spin"
            : ""
        }
      />

      {config.label}
    </span>
  );
};

/*
 * ============================================================
 * DETAIL ROW
 * ============================================================
 */

const DetailRow = ({
  label,
  value,
  copyable = false,
}) => {
  const handleCopy =
    async () => {
      if (
        !value ||
        typeof navigator ===
          "undefined" ||
        !navigator.clipboard
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          String(value),
        );
      } catch {
        // Clipboard access may be unavailable.
      }
    };

  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2 sm:max-w-[65%] sm:justify-end">
        <span className="break-all text-sm font-semibold text-slate-800 sm:text-right">
          {value || "—"}
        </span>

        {copyable && value ? (
          <button
            type="button"
            onClick={handleCopy}
            title={`Copy ${label}`}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Copy size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

/*
 * ============================================================
 * TRANSFER STATUS TIMELINE
 * ============================================================
 */

const TransferTimeline = ({
  timeline = [],
}) => {
  if (!timeline.length) {
    return null;
  }

  return (
    <div className="space-y-0">
      {timeline.map(
        (
          item,
          index,
        ) => {
          const isLast =
            index ===
            timeline.length - 1;

          return (
            <div
              key={`${item.status}-${index}`}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    item.current
                      ? "bg-blue-600 text-white"
                      : item.completed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {item.current ? (
                    <RefreshCw
                      size={16}
                      className={
                        item.status ===
                        "PROCESSING"
                          ? "animate-spin"
                          : ""
                      }
                    />
                  ) : item.completed ? (
                    <CheckCircle2
                      size={17}
                    />
                  ) : (
                    <Clock3
                      size={17}
                    />
                  )}
                </div>

                {!isLast ? (
                  <div
                    className={`my-1 min-h-10 w-px ${
                      item.completed
                        ? "bg-emerald-200"
                        : "bg-slate-200"
                    }`}
                  />
                ) : null}
              </div>

              <div className="min-w-0 pb-7">
                <p
                  className={`text-sm font-semibold ${
                    item.current
                      ? "text-blue-700"
                      : item.completed
                        ? "text-slate-800"
                        : "text-slate-400"
                  }`}
                >
                  {item.label}
                </p>

                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                  {item.status}
                </p>

                {item.timestamp ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(
                      item.timestamp,
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          );
        },
      )}
    </div>
  );
};

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

const BankTransferDetails =
  () => {
    const {
      transferId,
    } = useParams();

    const navigate =
      useNavigate();

    const [
      transfer,
      setTransfer,
    ] = useState(null);

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      error,
      setError,
    ] = useState("");

    const [
      refreshing,
      setRefreshing,
    ] = useState(false);

    /*
     * ========================================================
     * LOAD TRANSFER
     * ========================================================
     */

    const loadTransfer =
      useCallback(
        async (
          isRefresh = false,
        ) => {
          if (!transferId) {
            setError(
              "Transfer ID is missing.",
            );

            setLoading(false);

            return;
          }

          try {
            if (isRefresh) {
              setRefreshing(true);
            } else {
              setLoading(true);
            }

            setError("");

            const response =
              await getBankTransfer(
                transferId,
              );

            const result =
              response?.data
                ?.transfer ||
              response?.data ||
              null;

            if (!result) {
              throw new Error(
                "Transfer details were not returned by the server.",
              );
            }

            setTransfer(
              result,
            );
          } catch (
            requestError
          ) {
            const message =
              requestError
                ?.response
                ?.data
                ?.message ||
              requestError?.message ||
              "Unable to load transfer details.";

            setError(
              message,
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [transferId],
      );

    /*
     * ========================================================
     * INITIAL LOAD
     * ========================================================
     */

    useEffect(() => {
      loadTransfer();
    }, [
      loadTransfer,
    ]);

    /*
     * ========================================================
     * DERIVED DATA
     * ========================================================
     */

    const currency =
      transfer?.currencyCode ||
      transfer?.transaction
        ?.currencyCode ||
      "USD";

    const status =
      String(
        transfer?.status ||
          "PENDING",
      ).toUpperCase();

    const beneficiary =
      transfer?.beneficiary ||
      null;

    const sourceAccount =
      transfer?.sourceAccount ||
      null;

    const transaction =
      transfer?.transaction ||
      null;

    const reversal =
      transfer?.reversalTransaction ||
      null;

    const resolution =
      transfer?.resolution ||
      null;

    const timeline =
      transfer?.timeline || [];

    const transferTitle =
      useMemo(
        () =>
          beneficiary?.name ||
          beneficiary?.accountName ||
          "Bank transfer",
        [beneficiary],
      );

    /*
     * ========================================================
     * LOADING STATE
     * ========================================================
     */

    if (loading) {
      return (
        <div className="space-y-5">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />

          <div className="h-52 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" />

            <div className="h-80 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" />
          </div>
        </div>
      );
    }

    /*
     * ========================================================
     * ERROR STATE
     * ========================================================
     */

    if (error || !transfer) {
      return (
        <div className="mx-auto max-w-2xl py-12">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle
                size={26}
              />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Unable to load transfer
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                "The requested transfer could not be found."}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  loadTransfer(
                    true,
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Try again
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    -1,
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft
                  size={16}
                />

                Go back
              </button>
            </div>
          </div>
        </div>
      );
    }

    /*
     * ========================================================
     * MAIN PAGE
     * ========================================================
     */

    return (
      <div className="space-y-5">
        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                navigate(
                  -1,
                )
              }
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft
                size={16}
              />

              Back
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Bank transfer
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review the details and current status of your transfer.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadTransfer(
                true,
              )
            }
            disabled={
              refreshing
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {/* ==================================================
            SUMMARY CARD
        ================================================== */}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Building2
                    size={24}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm text-slate-300">
                    Recipient
                  </p>

                  <h2 className="mt-1 truncate text-xl font-bold sm:text-2xl">
                    {transferTitle}
                  </h2>

                  <p className="mt-1 truncate text-sm text-slate-300">
                    {beneficiary?.bankName ||
                      "Bank transfer"}
                  </p>
                </div>
              </div>

              <div className="lg:text-right">
                <p className="text-sm text-slate-300">
                  Transfer amount
                </p>

                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {formatMoney(
                    transfer.amount,
                    currency,
                  )}
                </p>

                <div className="mt-3 lg:flex lg:justify-end">
                  <StatusBadge
                    status={
                      status
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Reference
              </p>

              <div className="mt-2 flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {transfer.reference ||
                    "—"}
                </p>

                {transfer.reference ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          transfer.reference,
                        );
                      } catch {
                        // Clipboard unavailable.
                      }
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Copy reference"
                  >
                    <Copy
                      size={15}
                    />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Submitted
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-800">
                {formatDate(
                  transfer.createdAt,
                )}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Total charged
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-800">
                {formatMoney(
                  transfer.total,
                  currency,
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================
            MAIN CONTENT
        ================================================== */}

        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
          {/* =================================================
              LEFT COLUMN
          ================================================= */}

          <div className="space-y-5">
            {/* ===============================================
                BENEFICIARY
            =============================================== */}

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Building2
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Beneficiary details
                  </h2>

                  <p className="text-xs text-slate-500">
                    Destination account information
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <DetailRow
                  label="Name"
                  value={
                    beneficiary?.name ||
                    beneficiary?.accountName
                  }
                />

                <DetailRow
                  label="Account name"
                  value={
                    beneficiary?.accountName
                  }
                />

                <DetailRow
                  label="Account number"
                  value={
                    maskAccountNumber(
                      beneficiary?.accountNumber,
                    )
                  }
                />

                <DetailRow
                  label="Bank"
                  value={
                    beneficiary?.bankName
                  }
                />

                <DetailRow
                  label="Bank code"
                  value={
                    beneficiary?.bankCode
                  }
                />

                <DetailRow
                  label="Country"
                  value={
                    beneficiary?.country
                  }
                />

                <DetailRow
                  label="Currency"
                  value={
                    beneficiary?.currencyCode
                  }
                />
              </div>
            </section>

            {/* ===============================================
                SOURCE ACCOUNT
            =============================================== */}

            {sourceAccount ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Source account</h2>
                    <p className="text-xs text-slate-500">Account used to fund this transfer</p>
                  </div>
                </div>
                <div className="mt-2">
                  <DetailRow label="Account number" value={sourceAccount.accountNumber} />
                  <DetailRow label="Account type" value={sourceAccount.accountType} />
                  <DetailRow label="Currency" value={sourceAccount.currencyCode} />
                  <DetailRow label="Account status" value={sourceAccount.status} />
                </div>
              </section>
            ) : null}

            {/* ===============================================
                PAYMENT BREAKDOWN
            =============================================== */}

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <CreditCard
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Payment breakdown
                  </h2>

                  <p className="text-xs text-slate-500">
                    Amount and applicable charges
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <DetailRow
                  label="Transfer amount"
                  value={formatMoney(
                    transfer.amount,
                    currency,
                  )}
                />

                <DetailRow
                  label="Transfer fee"
                  value={formatMoney(
                    transfer.fee,
                    currency,
                  )}
                />

                <div className="flex items-center justify-between border-t border-slate-200 py-4">
                  <span className="text-sm font-bold text-slate-900">
                    Total
                  </span>

                  <span className="text-base font-bold text-slate-900">
                    {formatMoney(
                      transfer.total,
                      currency,
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* ===============================================
                TRANSACTION
            =============================================== */}

            {transaction ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <FileText
                      size={20}
                    />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Transaction record
                    </h2>

                    <p className="text-xs text-slate-500">
                      Internal Epex transaction reference
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <DetailRow
                    label="Transaction reference"
                    value={
                      transaction.reference
                    }
                    copyable
                  />

                  <DetailRow
                    label="Transaction status"
                    value={
                      transaction.status
                    }
                  />

                  <DetailRow
                    label="Transaction type"
                    value={
                      transaction.type
                    }
                  />

                  <DetailRow
                    label="Transaction amount"
                    value={formatMoney(
                      transaction.amount,
                      currency,
                    )}
                  />

                  <DetailRow
                    label="Transaction fee"
                    value={formatMoney(
                      transaction.fee,
                      currency,
                    )}
                  />

                  <DetailRow
                    label="Transaction total"
                    value={formatMoney(
                      transaction.total,
                      currency,
                    )}
                  />

                  <DetailRow
                    label="Created"
                    value={formatDate(
                      transaction.createdAt,
                    )}
                  />
                </div>
              </section>
            ) : null}

            {/* ===============================================
                DESCRIPTION
            =============================================== */}

            {transfer.description ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <FileText
                      size={20}
                    />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Transfer note
                    </h2>

                    <p className="text-xs text-slate-500">
                      Description provided with the transfer
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {transfer.description}
                </div>
              </section>
            ) : null}
          </div>

          {/* =================================================
              RIGHT COLUMN
          ================================================= */}

          <div className="space-y-5">
            {/* ===============================================
                STATUS TIMELINE
            =============================================== */}

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <ShieldCheck
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Transfer progress
                  </h2>

                  <p className="text-xs text-slate-500">
                    Current processing stage
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <TransferTimeline
                  timeline={
                    timeline
                  }
                />
              </div>
            </section>

            {/* ===============================================
                STATUS NOTICE
            =============================================== */}

            {status ===
            "COMPLETED" ? (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex gap-3">
                  <CheckCircle2
                    size={21}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>
                    <h3 className="font-semibold text-emerald-900">
                      Transfer completed
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      The bank transfer has been marked as completed by Epex Bank.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {status ===
            "PROCESSING" ? (
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex gap-3">
                  <RefreshCw
                    size={21}
                    className="mt-0.5 shrink-0 animate-spin text-blue-600"
                  />

                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Transfer is processing
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      Your transfer is currently being processed. You can refresh this page for the latest status.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {status ===
            "PENDING" ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex gap-3">
                  <Clock3
                    size={21}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Transfer is pending
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Your transfer has been submitted and is awaiting processing.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {status ===
            "FAILED" ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex gap-3">
                  <XCircle
                    size={21}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>
                    <h3 className="font-semibold text-red-900">
                      Transfer failed
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-red-800">
                      This transfer could not be completed. Please contact Epex Bank support if you need assistance.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {status ===
            "CANCELLED" ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex gap-3">
                  <XCircle
                    size={21}
                    className="mt-0.5 shrink-0 text-slate-600"
                  />

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Transfer cancelled
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This bank transfer has been cancelled.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {status ===
            "REVERSED" ? (
              <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                <div className="flex gap-3">
                  <AlertTriangle
                    size={21}
                    className="mt-0.5 shrink-0 text-orange-600"
                  />

                  <div>
                    <h3 className="font-semibold text-orange-900">
                      Transfer reversed
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-orange-800">
                      This transfer was reversed. Any applicable reversal transaction is shown below.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {/* ===============================================
                RESOLUTION
            =============================================== */}

            {resolution ? (
              <section
                className={`rounded-2xl border p-5 sm:p-6 ${
                  resolution.status === "FAILED"
                    ? "border-red-200 bg-red-50"
                    : resolution.status === "CANCELLED"
                      ? "border-slate-200 bg-slate-50"
                      : "border-orange-200 bg-orange-50"
                }`}
              >
                <div className="flex gap-3">
                  {resolution.status === "FAILED" ? (
                    <XCircle size={21} className="mt-0.5 shrink-0 text-red-600" />
                  ) : resolution.status === "CANCELLED" ? (
                    <XCircle size={21} className="mt-0.5 shrink-0 text-slate-600" />
                  ) : (
                    <AlertTriangle size={21} className="mt-0.5 shrink-0 text-orange-600" />
                  )}

                  <div className="min-w-0 flex-1">
                    <h2 className={`font-bold ${
                      resolution.status === "FAILED"
                        ? "text-red-900"
                        : resolution.status === "CANCELLED"
                          ? "text-slate-900"
                          : "text-orange-900"
                    }`}>
                      Transfer resolution
                    </h2>

                    <p className={`mt-1 text-sm leading-6 ${
                      resolution.status === "FAILED"
                        ? "text-red-800"
                        : resolution.status === "CANCELLED"
                          ? "text-slate-600"
                          : "text-orange-800"
                    }`}>
                      This transfer reached a terminal resolution and the recorded outcome is shown below.
                    </p>

                    <div className="mt-4 rounded-xl bg-white/70 p-1 ring-1 ring-black/5">
                      <DetailRow label="Status" value={resolution.status} />
                      {resolution.reason ? (
                        <DetailRow label="Reason" value={resolution.reason} />
                      ) : null}
                      <DetailRow
                        label="Funds restored"
                        value={resolution.fundsRestored ? "Yes" : "No"}
                      />
                      {resolution.resolvedAt ? (
                        <DetailRow label="Resolved" value={formatDate(resolution.resolvedAt)} />
                      ) : null}
                      {resolution.reversalTransactionId ? (
                        <DetailRow
                          label="Reversal transaction"
                          value={resolution.reversalTransactionId}
                          copyable
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* ===============================================
                REVERSAL TRANSACTION
            =============================================== */}

            {reversal ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <h2 className="font-bold text-slate-900">
                  Reversal record
                </h2>

                <div className="mt-3">
                  <DetailRow
                    label="Reference"
                    value={
                      reversal.reference
                    }
                    copyable
                  />

                  <DetailRow
                    label="Status"
                    value={
                      reversal.status
                    }
                  />

                  <DetailRow
                    label="Amount"
                    value={formatMoney(
                      reversal.amount,
                      currency,
                    )}
                  />

                  <DetailRow
                    label="Created"
                    value={formatDate(
                      reversal.createdAt,
                    )}
                  />
                </div>
              </section>
            ) : null}

            {/* ===============================================
                LEDGER
            =============================================== */}

            {transaction?.ledgerEntries
              ?.length ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <h2 className="font-bold text-slate-900">
                  Ledger activity
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Account balance movement associated with this transaction.
                </p>

                <div className="mt-5 space-y-3">
                  {transaction.ledgerEntries.map(
                    (
                      entry,
                    ) => (
                      <div
                        key={
                          entry.id
                        }
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span
                            className={`text-xs font-bold uppercase tracking-wide ${
                              entry.type ===
                              "DEBIT"
                                ? "text-red-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {
                              entry.type
                            }
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {formatMoney(
                              entry.amount,
                              currency,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-slate-400">
                              Before
                            </p>

                            <p className="mt-1 font-semibold text-slate-700">
                              {formatMoney(
                                entry.balanceBefore,
                                currency,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              After
                            </p>

                            <p className="mt-1 font-semibold text-slate-700">
                              {formatMoney(
                                entry.balanceAfter,
                                currency,
                              )}
                            </p>
                          </div>
                        </div>

                        {entry.description ? (
                          <p className="mt-3 text-xs leading-5 text-slate-500">
                            {
                              entry.description
                            }
                          </p>
                        ) : null}

                        <p className="mt-2 text-[11px] text-slate-400">
                          {formatDate(
                            entry.createdAt,
                          )}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        {/* ==================================================
            FOOTER NAVIGATION
        ================================================== */}

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/transfers"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
          >
            <ArrowLeft
              size={16}
            />

            Back to transfers
          </Link>

          <p className="text-xs text-slate-400">
            Transfer reference:{" "}
            {transfer.reference ||
              "—"}
          </p>
        </div>
      </div>
    );
  };

export default BankTransferDetails;