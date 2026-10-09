import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  ExternalLink,
  ReceiptText,
} from "lucide-react";
import CurrencyAmount from "../common/CurrencyAmount.jsx";
import TransactionStatus from "./TransactionStatus.jsx";

const normalizeDirection = (transaction) => {
  const direction = String(
    transaction?.direction ??
      transaction?.transactionDirection ??
      "",
  ).toUpperCase();

  if (
    direction === "CREDIT" ||
    direction === "INCOMING" ||
    direction === "RECEIVED"
  ) {
    return "credit";
  }

  if (
    direction === "DEBIT" ||
    direction === "OUTGOING" ||
    direction === "SENT"
  ) {
    return "debit";
  }

  const amount = Number(
    transaction?.amount ??
      transaction?.value ??
      0,
  );

  return amount < 0 ? "debit" : "credit";
};

const formatTransactionType = (value) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "Transaction";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getDescription = (transaction) =>
  transaction?.description ||
  transaction?.narration ||
  transaction?.title ||
  transaction?.type ||
  "Banking transaction";

const getReference = (transaction) =>
  transaction?.reference ||
  transaction?.transactionReference ||
  transaction?.referenceNumber ||
  transaction?.id ||
  "";

const TransactionRow = ({
  transaction,
  onClick,
  showReference = false,
  showAccount = false,
  compact = false,
  className = "",
}) => {
  const direction = normalizeDirection(transaction);

  const amount = Math.abs(
    Number(
      transaction?.amount ??
        transaction?.value ??
        transaction?.creditAmount ??
        transaction?.debitAmount ??
        0,
    ),
  );

  const currency =
    transaction?.currency ||
    transaction?.account?.currency ||
    "USD";

  const transactionType = formatTransactionType(
    transaction?.type ??
      transaction?.transactionType,
  );

  const description = getDescription(transaction);
  const reference = getReference(transaction);

  const Icon =
    direction === "credit"
      ? ArrowDownLeft
      : ArrowUpRight;

  const TypeIcon =
    transaction?.type?.toString().toUpperCase().includes(
      "CARD",
    )
      ? CreditCard
      : transaction?.type
          ?.toString()
          .toUpperCase()
          .includes("TRANSFER")
        ? Banknote
        : ReceiptText;

  const handleClick = () => {
    onClick?.(transaction);
  };

  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            direction === "credit"
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          <Icon
            className="h-4.5 w-4.5"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {description}
            </p>

            {onClick ? (
              <ExternalLink
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                aria-hidden="true"
              />
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <TypeIcon
                className="h-3 w-3"
                aria-hidden="true"
              />
              {transactionType}
            </span>

            <span aria-hidden="true">•</span>

            <span>
              {formatDate(
                transaction?.createdAt ??
                  transaction?.date ??
                  transaction?.transactionDate,
              )}
            </span>
          </div>

          {showReference && reference ? (
            <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
              Ref: {reference}
            </p>
          ) : null}

          {showAccount && transaction?.account ? (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Account ending in{" "}
              {String(
                transaction.account.accountNumber || "",
              ).slice(-4)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p
          className={`text-sm font-semibold tabular-nums ${
            direction === "credit"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {direction === "credit" ? "+" : "-"}
          <CurrencyAmount
            amount={amount}
            currency={currency}
            minimumFractionDigits={2}
            maximumFractionDigits={2}
          />
        </p>

        <TransactionStatus
          status={transaction?.status}
          size="xs"
        />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-4 rounded-2xl border border-transparent p-3 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900/70 ${
          compact ? "py-2.5" : "py-3.5"
        } ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`flex w-full items-center gap-4 rounded-2xl p-3 ${
        compact ? "py-2.5" : "py-3.5"
      } ${className}`}
    >
      {content}
    </div>
  );
};

export default TransactionRow;