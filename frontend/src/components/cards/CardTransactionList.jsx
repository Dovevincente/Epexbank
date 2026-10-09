import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";

const normalizeStatus = (status) =>
  String(status || "UNKNOWN").trim().toUpperCase();

const formatAmount = (amount, currency = "USD") => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  const currencyCode =
    currency?.code ||
    currency?.currencyCode ||
    currency ||
    "USD";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(numericAmount));
  } catch {
    return `${currencyCode} ${Math.abs(numericAmount).toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const formatType = (value) => {
  const text = String(value || "Card transaction")
    .replace(/_/g, " ")
    .trim();

  return text.replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
};

const getTransactionId = (transaction) =>
  transaction?.id ||
  transaction?.transactionId ||
  transaction?.reference ||
  null;

const getDescription = (transaction) =>
  transaction?.description ||
  transaction?.merchantName ||
  transaction?.merchant?.name ||
  transaction?.name ||
  transaction?.type ||
  "Card transaction";

const getAmount = (transaction) =>
  transaction?.amount ??
  transaction?.value ??
  transaction?.total ??
  0;

const getCurrency = (transaction) =>
  transaction?.currency ||
  transaction?.currencyCode ||
  transaction?.currency?.code ||
  "USD";

const getDirection = (transaction) => {
  const direction = String(
    transaction?.direction || "",
  ).toLowerCase();

  if (
    direction === "credit" ||
    direction === "in" ||
    direction === "incoming" ||
    direction === "received"
  ) {
    return "credit";
  }

  if (
    direction === "debit" ||
    direction === "out" ||
    direction === "outgoing" ||
    direction === "sent"
  ) {
    return "debit";
  }

  const type = String(
    transaction?.type || "",
  ).toUpperCase();

  if (
    type.includes("REFUND") ||
    type.includes("REVERSAL") ||
    type.includes("CREDIT")
  ) {
    return "credit";
  }

  return "debit";
};

const StatusIcon = ({ status }) => {
  if (status === "COMPLETED" || status === "SUCCESS") {
    return (
      <CheckCircle2 className="h-3.5 w-3.5" />
    );
  }

  if (
    status === "FAILED" ||
    status === "DECLINED" ||
    status === "CANCELLED"
  ) {
    return (
      <XCircle className="h-3.5 w-3.5" />
    );
  }

  return <Clock3 className="h-3.5 w-3.5" />;
};

const getStatusClasses = (status) => {
  if (
    status === "COMPLETED" ||
    status === "SUCCESS"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "FAILED" ||
    status === "DECLINED" ||
    status === "CANCELLED"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
};

const TransactionItem = ({
  transaction,
  onSelect,
}) => {
  const status = normalizeStatus(
    transaction?.status,
  );

  const direction = getDirection(transaction);

  const amount = Number(getAmount(transaction));

  const isCredit = direction === "credit";

  const transactionId =
    getTransactionId(transaction);

  const currency = getCurrency(transaction);

  const handleClick = () => {
    if (
      typeof onSelect === "function" &&
      transactionId
    ) {
      onSelect(transaction);
    }
  };

  const handleKeyDown = (event) => {
    if (!handleClick || !onSelect) {
      return;
    }

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className={[
        "group flex flex-col gap-4 border-b border-slate-100 p-4 last:border-b-0",
        "transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between",
        "dark:border-slate-800 dark:hover:bg-slate-800/50",
        onSelect && transactionId
          ? "cursor-pointer"
          : "",
      ].join(" ")}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={
        onSelect && transactionId
          ? "button"
          : undefined
      }
      tabIndex={
        onSelect && transactionId
          ? 0
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            isCredit
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
          ].join(" ")}
        >
          {isCredit ? (
            <ArrowDownLeft className="h-5 w-5" />
          ) : (
            <ArrowUpRight className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {getDescription(transaction)}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-xs text-slate-400">
              {formatType(transaction?.type)}
            </span>

            {transaction?.reference && (
              <>
                <span className="text-slate-300">
                  •
                </span>

                <span className="max-w-[180px] truncate font-mono text-[11px] text-slate-400">
                  {transaction.reference}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="sm:text-right">
          <p
            className={[
              "whitespace-nowrap text-sm font-bold",
              isCredit
                ? "text-emerald-600"
                : "text-slate-900 dark:text-white",
            ].join(" ")}
          >
            {isCredit ? "+" : "-"}
            {formatAmount(
              Number.isFinite(amount)
                ? amount
                : 0,
              currency,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatDate(
              transaction?.createdAt ||
                transaction?.date ||
                transaction?.transactionDate,
            )}
          </p>
        </div>

        <span
          className={[
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1",
            "text-[10px] font-bold uppercase tracking-wide",
            getStatusClasses(status),
          ].join(" ")}
        >
          <StatusIcon status={status} />
          {formatType(status)}
        </span>

        {onSelect && transactionId && (
          <ExternalLink className="hidden h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-blue-600 sm:block" />
        )}
      </div>
    </article>
  );
};

const CardTransactionList = ({
  transactions = [],
  loading = false,
  error = "",
  onRetry,
  onSelect,
  limit,
  showHeader = true,
  title = "Recent card transactions",
  emptyMessage = "No card transactions are available yet.",
  className = "",
}) => {
  const normalizedTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) {
      return [];
    }

    const seen = new Set();

    return transactions.filter((transaction) => {
      const id =
        getTransactionId(transaction) ||
        JSON.stringify(transaction);

      if (seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });
  }, [transactions]);

  const visibleTransactions =
    Number.isInteger(limit) && limit > 0
      ? normalizedTransactions.slice(0, limit)
      : normalizedTransactions;

  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border border-slate-200 bg-white",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      {showHeader && (
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />

              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Card activity returned by Epex Bank.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4"
              >
                <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />

                <div className="flex-1">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />

                  <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>

                <div className="h-5 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ),
          )}
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <XCircle className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
            Card transactions unavailable
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {error}
          </p>

          {typeof onRetry === "function" && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Try again
            </button>
          )}
        </div>
      ) : visibleTransactions.length === 0 ? (
        <div className="p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <CreditCard className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
            No card transactions
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div>
          {visibleTransactions.map(
            (transaction, index) => (
              <TransactionItem
                key={
                  getTransactionId(
                    transaction,
                  ) || index
                }
                transaction={transaction}
                onSelect={onSelect}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
};

export default CardTransactionList;