import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";

const STATUS_STYLES = {
  COMPLETED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  SUCCESS:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  PENDING:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  PROCESSING:
    "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  FAILED:
    "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  REVERSED:
    "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
  CANCELLED:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const formatStatus = (value) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatAmount = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const TransactionDetailsModal = ({
  isOpen = false,
  onClose,
  transaction = null,
  loading = false,
  onViewFullDetails,
}) => {
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setCopied("");
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  const details = useMemo(() => {
    if (!transaction) {
      return null;
    }

    const direction = String(
      transaction.direction ||
        transaction.typeDirection ||
        transaction.metadata?.direction ||
        "",
    ).toUpperCase();

    const isCredit =
      direction === "CREDIT" ||
      direction === "INCOMING" ||
      direction === "IN";

    const currency =
      transaction.currency?.code ||
      transaction.currencyCode ||
      transaction.account?.currency?.code ||
      "USD";

    const status = String(transaction.status || "").toUpperCase();

    const reference =
      transaction.reference ||
      transaction.transactionReference ||
      transaction.id ||
      "";

    return {
      direction,
      isCredit,
      currency,
      status,
      reference,
      amount:
        transaction.amount ??
        transaction.value ??
        transaction.transactionAmount ??
        0,
      type: formatStatus(transaction.type || transaction.transactionType),
      description:
        transaction.description ||
        transaction.narration ||
        transaction.memo ||
        "Transaction",
      date:
        transaction.createdAt ||
        transaction.transactionDate ||
        transaction.date,
      balanceAfter:
        transaction.balanceAfter ??
        transaction.runningBalance ??
        transaction.accountBalance,
      accountNumber:
        transaction.account?.accountNumber ||
        transaction.accountNumber ||
        transaction.account?.number,
    };
  }, [transaction]);

  if (!isOpen) {
    return null;
  }

  const copyReference = async () => {
    if (!details?.reference) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(details.reference));
      setCopied("reference");

      window.setTimeout(() => {
        setCopied("");
      }, 1500);
    } catch {
      setCopied("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2
              id="transaction-details-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Transaction Details
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Transaction information and status
            </p>
          </div>

          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
            aria-label="Close transaction details"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <Loader2
                size={32}
                className="mx-auto animate-spin text-blue-600"
              />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Loading transaction...
              </p>
            </div>
          </div>
        ) : !details ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Transaction details are unavailable.
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
                    details.isCredit
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                  }`}
                >
                  {details.isCredit ? (
                    <ArrowDownLeft size={26} />
                  ) : (
                    <ArrowUpRight size={26} />
                  )}
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {details.isCredit ? "Money received" : "Money sent"}
                </p>

                <p
                  className={`mt-1 text-3xl font-bold ${
                    details.isCredit
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {details.isCredit ? "+" : "-"}
                  {formatAmount(details.amount, details.currency)}
                </p>

                <span
                  className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLES[details.status] ||
                    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {formatStatus(details.status)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Transaction information
                </h3>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Type
                  </span>
                  <span className="text-right text-sm font-medium text-slate-900 dark:text-white">
                    {details.type}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Description
                  </span>
                  <span className="max-w-[65%] text-right text-sm font-medium text-slate-900 dark:text-white">
                    {details.description}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Date
                  </span>
                  <span className="text-right text-sm font-medium text-slate-900 dark:text-white">
                    {formatDate(details.date)}
                  </span>
                </div>

                {details.accountNumber && (
                  <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Account
                    </span>
                    <span className="text-right text-sm font-medium text-slate-900 dark:text-white">
                      {details.accountNumber}
                    </span>
                  </div>
                )}

                {details.balanceAfter !== undefined &&
                  details.balanceAfter !== null && (
                    <div className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Balance after
                      </span>
                      <span className="text-right text-sm font-semibold text-slate-900 dark:text-white">
                        {formatAmount(
                          details.balanceAfter,
                          details.currency,
                        )}
                      </span>
                    </div>
                  )}

                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Reference
                  </span>

                  <div className="flex max-w-[65%] items-center gap-2">
                    <span className="truncate text-right text-sm font-medium text-slate-900 dark:text-white">
                      {details.reference || "—"}
                    </span>

                    {details.reference && (
                      <button
                        type="button"
                        onClick={copyReference}
                        className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Copy reference"
                        aria-label="Copy transaction reference"
                      >
                        {copied === "reference" ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => onClose?.()}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>

              {onViewFullDetails && (
                <button
                  type="button"
                  onClick={() => onViewFullDetails(transaction)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <ExternalLink size={17} />
                  View Full Details
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionDetailsModal;