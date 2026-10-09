import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  XCircle,
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

import api from "../../services/api.js";

const CREDIT_TYPES = new Set([
  "DEPOSIT",
  "CREDIT",
  "REFUND",
  "LOAN_DISBURSEMENT",
  "DIVIDEND",
  "INTEREST",
  "INTEREST_CREDIT",
  "ADJUSTMENT",
  "CASHBACK",
  "TRANSFER_IN",
  "BANK_TRANSFER_IN",
]);

const DEBIT_TYPES = new Set([
  "WITHDRAWAL",
  "DEBIT",
  "PAYMENT",
  "CARD_PAYMENT",
  "TRANSFER",
  "TRANSFER_OUT",
  "BANK_TRANSFER",
  "BANK_TRANSFER_OUT",
  "FEE",
  "LOAN_REPAYMENT",
  "PURCHASE",
  "SHARE_PURCHASE",
]);

const STATUS_CLASSES = {
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50",

  PENDING:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50",

  PROCESSING:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/50",

  FAILED:
    "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50",

  REVERSED:
    "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/50",

  CANCELLED:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};

const formatType = (value) =>
  String(value || "")
    .replace(/-/g, "_")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ") || "Transaction";

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

const getCurrencyCode = (
  currency,
  fallback = "USD",
) => {
  if (
    currency &&
    typeof currency === "object"
  ) {
    return (
      currency.code ||
      currency.currencyCode ||
      fallback
    );
  }

  return (
    currency ||
    fallback
  );
};

const getCurrencyDecimals = (
  currency,
) => {
  if (
    currency &&
    typeof currency === "object" &&
    Number.isInteger(
      Number(currency.decimals),
    )
  ) {
    return Number(
      currency.decimals,
    );
  }

  return 2;
};

const formatAmount = (
  amount,
  currency,
) => {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount,
    )
  ) {
    return "—";
  }

  const currencyCode =
    getCurrencyCode(
      currency,
    );

  const decimals =
    getCurrencyDecimals(
      currency,
    );

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency:
          currencyCode,
        minimumFractionDigits:
          decimals,
        maximumFractionDigits:
          decimals,
      },
    ).format(
      numericAmount,
    );
  } catch {
    return `${currencyCode} ${numericAmount.toFixed(
      decimals,
    )}`;
  }
};

const getTransactionDirection = (
  transaction,
) => {
  const explicitDirection =
    String(
      transaction?.direction ??
        transaction?.entryType ??
        transaction?.flow ??
        "",
    ).toUpperCase();

  if (
    [
      "CREDIT",
      "IN",
      "INCOMING",
    ].includes(
      explicitDirection,
    )
  ) {
    return "CREDIT";
  }

  if (
    [
      "DEBIT",
      "OUT",
      "OUTGOING",
    ].includes(
      explicitDirection,
    )
  ) {
    return "DEBIT";
  }

  const type =
    String(
      transaction?.type ??
        "",
    ).toUpperCase();

  if (CREDIT_TYPES.has(type)) {
    return "CREDIT";
  }

  if (DEBIT_TYPES.has(type)) {
    return "DEBIT";
  }

  /*
   * Some transaction records expose a
   * signed amount instead of a direction.
   */
  const amount =
    Number(
      transaction?.amount,
    );

  if (
    Number.isFinite(amount) &&
    amount < 0
  ) {
    return "DEBIT";
  }

  return "CREDIT";
};

const getDisplayAmount = (
  transaction,
) => {
  const amount =
    Number(
      transaction?.amount,
    );

  if (
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return Math.abs(amount);
};

const getStatusIcon = (
  status,
) => {
  if (status === "COMPLETED") {
    return CheckCircle2;
  }

  if (
    status === "FAILED" ||
    status === "CANCELLED"
  ) {
    return XCircle;
  }

  return Clock3;
};

const getStatusClasses = (
  status,
) =>
  STATUS_CLASSES[
    status
  ] ||
  "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";

const getApiMessage = (
  error,
) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load transaction details.";

const extractTransaction = (
  payload,
) => {
  const root =
    payload?.data ??
    payload ??
    {};

  return (
    root?.transaction ??
    root?.data?.transaction ??
    root
  );
};

const DetailRow = ({
  label,
  value,
  mono = false,
}) => (
  <div className="flex flex-col gap-1 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <span className="text-sm text-slate-500 dark:text-slate-400">
      {label}
    </span>

    <span
      className={[
        "break-all text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-right",
        mono
          ? "font-mono text-xs sm:text-sm"
          : "",
      ].join(" ")}
    >
      {value || "—"}
    </span>
  </div>
);

const TransactionDetails = () => {
  const navigate =
    useNavigate();

  const {
    transactionId,
  } = useParams();

  const [
    transaction,
    setTransaction,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  const loadTransaction =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!transactionId) {
          setError(
            "A transaction reference was not provided.",
          );
          setTransaction(null);
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
          const response =
            await api.get(
              `/transactions/${encodeURIComponent(
                transactionId,
              )}`,
            );

          const transactionData =
            extractTransaction(
              response?.data,
            );

          if (
            !transactionData ||
            !transactionData.id
          ) {
            throw new Error(
              "The transaction could not be found.",
            );
          }

          setTransaction(
            transactionData,
          );
        } catch (requestError) {
          setTransaction(null);
          setError(
            getApiMessage(
              requestError,
            ),
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [transactionId],
    );

  useEffect(() => {
    loadTransaction().catch(
      () => {},
    );
  }, [
    loadTransaction,
  ]);

  const direction =
    useMemo(
      () =>
        getTransactionDirection(
          transaction,
        ),
      [transaction],
    );

  const isCredit =
    direction === "CREDIT";

  const status =
    String(
      transaction?.status ??
        "UNKNOWN",
    ).toUpperCase();

  const statusClass =
    getStatusClasses(status);

  const StatusIcon =
    getStatusIcon(status);

  const currency =
    transaction?.currency ??
    transaction?.currencyCode ??
    transaction?.account
      ?.currency ??
    "USD";

  const displayAmount =
    getDisplayAmount(
      transaction,
    );

  const accountNumber =
    transaction?.account
      ?.accountNumber ??
    transaction?.accountNumber ??
    transaction?.account
      ?.number ??
    "—";

  const transactionType =
    formatType(
      transaction?.type,
    );

  const feeAmount =
    Number(
      transaction?.fee ?? 0,
    );

  const hasFee =
    Number.isFinite(
      feeAmount,
    ) &&
    feeAmount !== 0;

  const copyReference =
    async () => {
      const reference =
        transaction?.reference;

      if (!reference) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          String(
            reference,
          ),
        );

        setCopied(true);

        window.setTimeout(
          () => {
            setCopied(false);
          },
          1800,
        );
      } catch {
        setCopied(false);
      }
    };

  if (loading) {
    return (
      <LoadingState />
    );
  }

  if (
    error ||
    !transaction
  ) {
    return (
      <ErrorState
        error={error}
        retry={() =>
          loadTransaction().catch(
            () => {},
          )
        }
        goBack={() =>
          navigate(
            "/transactions",
          )
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <Link
          to="/transactions"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to transactions
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ReceiptText className="h-3.5 w-3.5" />
              Transaction
            </span>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Transaction details
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review the complete information associated with this
              transaction.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadTransaction({
                silent: true,
              }).catch(
                () => {},
              )
            }
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={[
                "h-4 w-4",
                refreshing
                  ? "animate-spin"
                  : "",
              ].join(" ")}
            />

            Refresh
          </button>
        </div>
      </section>

      {/* Summary */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={[
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  isCredit
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
                ].join(" ")}
              >
                {isCredit ? (
                  <ArrowDownLeft className="h-7 w-7" />
                ) : (
                  <ArrowUpRight className="h-7 w-7" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {transactionType}
                </p>

                <p
                  className={[
                    "mt-1 text-3xl font-bold tracking-tight sm:text-4xl",
                    isCredit
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-950 dark:text-white",
                  ].join(" ")}
                >
                  {isCredit
                    ? "+"
                    : "-"}
                  {formatAmount(
                    displayAmount,
                    currency,
                  )}
                </p>
              </div>
            </div>

            <span
              className={[
                "inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-sm font-bold",
                statusClass,
              ].join(" ")}
            >
              <StatusIcon className="h-4 w-4" />

              {formatType(
                status,
              )}
            </span>
          </div>

          {/* Reference */}
          <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Reference
              </p>

              <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                {transaction.reference ||
                  "—"}
              </p>
            </div>

            {transaction.reference && (
              <button
                type="button"
                onClick={
                  copyReference
                }
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Copy className="h-3.5 w-3.5" />

                {copied
                  ? "Copied"
                  : "Copy reference"}
              </button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="border-t border-slate-100 p-6 dark:border-slate-800 sm:p-8">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Transaction information
          </h2>

          <div className="mt-3">
            <DetailRow
              label="Transaction type"
              value={
                transactionType
              }
            />

            <DetailRow
              label="Direction"
              value={
                isCredit
                  ? "Credit"
                  : "Debit"
              }
            />

            <DetailRow
              label="Status"
              value={formatType(
                status,
              )}
            />

            <DetailRow
              label="Amount"
              value={formatAmount(
                displayAmount,
                currency,
              )}
            />

            <DetailRow
              label="Fee"
              value={
                hasFee
                  ? formatAmount(
                      Math.abs(
                        feeAmount,
                      ),
                      currency,
                    )
                  : "No fee"
              }
            />

            <DetailRow
              label="Account"
              value={
                accountNumber
              }
              mono
            />

            <DetailRow
              label="Currency"
              value={getCurrencyCode(
                currency,
              )}
            />

            <DetailRow
              label="Description"
              value={
                transaction.description ||
                "No description provided"
              }
            />

            <DetailRow
              label="Created"
              value={formatDate(
                transaction.createdAt,
              )}
            />

            <DetailRow
              label="Processed"
              value={formatDate(
                transaction.processedAt ||
                  transaction.completedAt,
              )}
            />

            <DetailRow
              label="Transaction ID"
              value={
                transaction.id
              }
              mono
            />
          </div>
        </div>
      </section>

      {/* Balance information */}
      {(transaction.balanceBefore !=
        null ||
        transaction.balanceAfter !=
          null ||
        transaction.account
          ?.availableBalance !=
          null ||
        transaction.account
          ?.ledgerBalance !=
          null) && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Balance information
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {transaction.balanceBefore !=
              null && (
              <BalanceCard
                label="Balance before"
                value={formatAmount(
                  transaction.balanceBefore,
                  currency,
                )}
              />
            )}

            {transaction.balanceAfter !=
              null && (
              <BalanceCard
                label="Balance after"
                value={formatAmount(
                  transaction.balanceAfter,
                  currency,
                )}
              />
            )}

            {transaction.account
              ?.availableBalance !=
              null && (
              <BalanceCard
                label="Available balance"
                value={formatAmount(
                  transaction
                    .account
                    .availableBalance,
                  currency,
                )}
                highlighted
              />
            )}

            {transaction.account
              ?.ledgerBalance !=
              null && (
              <BalanceCard
                label="Ledger balance"
                value={formatAmount(
                  transaction
                    .account
                    .ledgerBalance,
                  currency,
                )}
              />
            )}
          </div>
        </section>
      )}

      {/* Additional metadata */}
      {transaction.metadata &&
        typeof transaction.metadata ===
          "object" &&
        !Array.isArray(
          transaction.metadata,
        ) && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <FileText className="h-4 w-4" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Additional information
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Additional transaction data returned by the banking service.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              {Object.entries(
                transaction.metadata,
              )
                .filter(
                  ([, value]) =>
                    value !==
                      null &&
                    value !==
                      undefined &&
                    value !== "",
                )
                .map(
                  ([
                    key,
                    value,
                  ]) => (
                    <DetailRow
                      key={key}
                      label={formatType(
                        key,
                      )}
                      value={
                        typeof value ===
                        "object"
                          ? JSON.stringify(
                              value,
                            )
                          : String(
                              value,
                            )
                      }
                    />
                  ),
                )}
            </div>
          </section>
        )}

      {/* Description */}
      {transaction.description && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Description
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
            {transaction.description}
          </p>
        </section>
      )}

      {/* Security notice */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-300">
              Keep your transaction reference
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-700 dark:text-blue-400">
              Your transaction reference can be used by Epex Bank support to
              locate this transaction if you need assistance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const BalanceCard = ({
  label,
  value,
  highlighted = false,
}) => (
  <div
    className={[
      "rounded-2xl p-4",
      highlighted
        ? "bg-blue-50 dark:bg-blue-950/30"
        : "bg-slate-50 dark:bg-slate-950",
    ].join(" ")}
  >
    <p
      className={[
        "text-xs font-semibold",
        highlighted
          ? "text-blue-500 dark:text-blue-400"
          : "text-slate-400 dark:text-slate-500",
      ].join(" ")}
    >
      {label}
    </p>

    <p
      className={[
        "mt-2 text-lg font-bold",
        highlighted
          ? "text-blue-700 dark:text-blue-300"
          : "text-slate-900 dark:text-white",
      ].join(" ")}
    >
      {value}
    </p>
  </div>
);

const LoadingState = () => (
  <div className="space-y-6">
    <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />

          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

            <div className="h-10 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        <div className="mt-7 h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-950" />
      </div>

      <div className="border-t border-slate-100 p-6 dark:border-slate-800 sm:p-8">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

        <div className="mt-5 space-y-1">
          {Array.from({
            length: 8,
          }).map(
            (_, index) => (
              <div
                key={index}
                className="flex justify-between gap-6 border-b border-slate-100 py-4 dark:border-slate-800"
              >
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />

                <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  </div>
);

const ErrorState = ({
  error,
  retry,
  goBack,
}) => (
  <div className="space-y-6">
    <button
      type="button"
      onClick={goBack}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to transactions
    </button>

    <section className="rounded-3xl border border-red-100 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm dark:bg-red-950/50 dark:text-red-400">
          <XCircle className="h-5 w-5" />
        </div>

        <div>
          <h1 className="text-lg font-bold text-red-900 dark:text-red-300">
            Transaction unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-400">
            {error ||
              "The requested transaction could not be found."}
          </p>

          <button
            type="button"
            onClick={retry}
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </section>
  </div>
);

export default TransactionDetails;