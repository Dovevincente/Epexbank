import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Copy,
  Hash,
  Landmark,
  ReceiptText,
  UserRound,
} from "lucide-react";
import CurrencyAmount from "../common/CurrencyAmount.jsx";
import CopyButton from "../common/CopyButton.jsx";
import TransactionStatus from "./TransactionStatus.jsx";

const formatLabel = (value) => {
  const text = String(value ?? "").trim();

  if (!text) {
    return "—";
  }

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getReference = (transaction) =>
  transaction?.reference ||
  transaction?.transactionReference ||
  transaction?.referenceNumber ||
  transaction?.id ||
  "";

const getDirection = (transaction) => {
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

  return Number(transaction?.amount ?? 0) < 0
    ? "debit"
    : "credit";
};

const DetailItem = ({
  icon: Icon,
  label,
  value,
  action,
}) => (
  <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Icon className="h-4 w-4" />
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>

      <div className="mt-1 flex min-w-0 items-center gap-2">
        <p className="min-w-0 break-words text-sm font-medium text-slate-800 dark:text-slate-200">
          {value || "—"}
        </p>

        {action}
      </div>
    </div>
  </div>
);

const TransactionDetails = ({
  transaction,
  onCopyReference,
  className = "",
}) => {
  if (!transaction) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
        <ReceiptText className="mx-auto h-8 w-8 text-slate-400" />

        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
          Transaction details unavailable
        </p>
      </div>
    );
  }

  const direction = getDirection(transaction);

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

  const reference = getReference(transaction);

  const description =
    transaction?.description ||
    transaction?.narration ||
    transaction?.title ||
    "Banking transaction";

  return (
    <div
      className={`space-y-5 ${className}`}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                direction === "credit"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              }`}
            >
              {direction === "credit" ? (
                <ArrowDownLeft className="h-5 w-5" />
              ) : (
                <ArrowUpRight className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatLabel(
                  transaction?.type ??
                    transaction?.transactionType,
                )}
              </p>

              <h2 className="mt-0.5 break-words text-lg font-bold text-slate-900 dark:text-white">
                {description}
              </h2>
            </div>
          </div>

          <div className="sm:text-right">
            <p
              className={`text-2xl font-bold tabular-nums ${
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

            <div className="mt-2 flex items-center gap-2 sm:justify-end">
              <TransactionStatus
                status={transaction?.status}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-slate-500" />

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Transaction information
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem
            icon={Hash}
            label="Reference"
            value={reference}
            action={
              reference ? (
                <CopyButton
                  value={reference}
                  showLabel={false}
                  size="xs"
                  onCopied={onCopyReference}
                />
              ) : null
            }
          />

          <DetailItem
            icon={CalendarDays}
            label="Date"
            value={formatDateTime(
              transaction?.createdAt ??
                transaction?.date ??
                transaction?.transactionDate,
            )}
          />

          <DetailItem
            icon={Landmark}
            label="Account"
            value={
              transaction?.account?.accountNumber
                ? `•••• ${String(
                    transaction.account.accountNumber,
                  ).slice(-4)}`
                : transaction?.accountId
            }
          />

          <DetailItem
            icon={UserRound}
            label="Direction"
            value={
              direction === "credit"
                ? "Money received"
                : "Money sent"
            }
          />
        </div>
      </div>

      {(transaction?.balanceAfter !== undefined ||
        transaction?.runningBalance !== undefined ||
        transaction?.availableBalance !== undefined) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Balance information
          </h3>

          <div className="grid gap-3 sm:grid-cols-3">
            {transaction?.balanceAfter !==
            undefined ? (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Balance after
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  <CurrencyAmount
                    amount={
                      transaction.balanceAfter
                    }
                    currency={currency}
                  />
                </p>
              </div>
            ) : null}

            {transaction?.runningBalance !==
            undefined ? (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Running balance
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  <CurrencyAmount
                    amount={
                      transaction.runningBalance
                    }
                    currency={currency}
                  />
                </p>
              </div>
            ) : null}

            {transaction?.availableBalance !==
            undefined ? (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Available balance
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  <CurrencyAmount
                    amount={
                      transaction.availableBalance
                    }
                    currency={currency}
                  />
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {transaction?.metadata &&
      typeof transaction.metadata === "object" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Additional information
          </h3>

          <div className="space-y-3">
            {Object.entries(transaction.metadata)
              .filter(
                ([, value]) =>
                  value !== null &&
                  value !== undefined &&
                  value !== "",
              )
              .map(([key, value]) => (
                <div
                  key={key}
                  className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800"
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {formatLabel(key)}
                  </span>

                  <span className="break-words text-sm text-slate-700 dark:text-slate-300">
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TransactionDetails;