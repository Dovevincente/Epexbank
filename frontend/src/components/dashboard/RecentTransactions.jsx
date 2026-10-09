import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ReceiptText,
  RefreshCw,
  XCircle,
} from "lucide-react";

const formatCurrency = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  } catch {
    return `${currency} ${Math.abs(amount).toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getStatus = (transaction) =>
  String(
    transaction?.status ??
      transaction?.transactionStatus ??
      "PENDING",
  ).toUpperCase();

const getDirection = (transaction) => {
  const direction = String(
    transaction?.direction ??
      transaction?.type ??
      "",
  ).toUpperCase();

  if (
    direction.includes("CREDIT") ||
    direction.includes("RECEIVED") ||
    direction.includes("DEPOSIT") ||
    direction.includes("INCOMING")
  ) {
    return "CREDIT";
  }

  if (
    direction.includes("DEBIT") ||
    direction.includes("SENT") ||
    direction.includes("WITHDRAW") ||
    direction.includes("OUTGOING")
  ) {
    return "DEBIT";
  }

  return Number(transaction?.amount ?? 0) >= 0
    ? "CREDIT"
    : "DEBIT";
};

const getTransactionTitle = (transaction) =>
  transaction?.description ??
  transaction?.title ??
  transaction?.type ??
  transaction?.category ??
  "Bank transaction";

const getTransactionReference = (transaction) =>
  transaction?.reference ??
  transaction?.transactionReference ??
  transaction?.referenceNumber ??
  transaction?.id ??
  "";

const StatusIcon = ({ status }) => {
  if (
    status === "COMPLETED" ||
    status === "SUCCESS" ||
    status === "SUCCESSFUL"
  ) {
    return (
      <CheckCircle2
        size={14}
        className="text-emerald-600 dark:text-emerald-400"
      />
    );
  }

  if (
    status === "FAILED" ||
    status === "REJECTED" ||
    status === "CANCELLED"
  ) {
    return (
      <XCircle
        size={14}
        className="text-red-600 dark:text-red-400"
      />
    );
  }

  return (
    <Clock3
      size={14}
      className="text-amber-600 dark:text-amber-400"
    />
  );
};

const TransactionItem = ({
  transaction,
  currency,
  onSelect,
}) => {
  const direction = getDirection(transaction);
  const status = getStatus(transaction);
  const amount = Number(transaction?.amount ?? 0);

  const isCredit = direction === "CREDIT";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(transaction)}
      className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isCredit
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        }`}
      >
        {isCredit ? (
          <ArrowDownLeft size={18} />
        ) : (
          <ArrowUpRight size={18} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {getTransactionTitle(transaction)}
        </p>

        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(
              transaction?.createdAt ??
                transaction?.date ??
                transaction?.transactionDate,
            )}
          </span>

          <span className="text-slate-300 dark:text-slate-700">
            •
          </span>

          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <StatusIcon status={status} />
            {status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-bold ${
            isCredit
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {isCredit ? "+" : "-"}
          {formatCurrency(
            Math.abs(amount),
            transaction?.currency?.code ??
              transaction?.currency ??
              currency,
          )}
        </p>

        <p className="mt-1 max-w-24 truncate text-[10px] text-slate-400 dark:text-slate-500">
          {getTransactionReference(transaction)}
        </p>
      </div>

      <ExternalLink
        size={15}
        className="hidden shrink-0 text-slate-300 transition group-hover:text-slate-500 sm:block dark:text-slate-700 dark:group-hover:text-slate-400"
      />
    </button>
  );
};

const RecentTransactions = ({
  transactions = [],
  loading = false,
  error = "",
  currency = "USD",
  maxItems = 5,
  onSelect,
  onViewAll,
  onRetry,
  title = "Recent Transactions",
  description = "Your latest account activity.",
}) => {
  const recentTransactions = Array.isArray(transactions)
    ? transactions.slice(0, maxItems)
    : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ReceiptText size={19} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 text-xs font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View all
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="flex animate-pulse items-center gap-3 rounded-xl p-3"
              >
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />

                <div className="min-w-0 flex-1">
                  <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
                </div>

                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-500/5">
            <div className="flex items-start gap-3">
              <XCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Unable to load transactions
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600/80 dark:text-red-400/70">
                  {error}
                </p>

                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <RefreshCw size={13} />
                    Try again
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <ReceiptText size={19} />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              No recent transactions
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
              Transactions will appear here after activity is recorded on
              your account.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map((transaction, index) => (
              <TransactionItem
                key={
                  transaction?.id ??
                  transaction?.reference ??
                  `transaction-${index}`
                }
                transaction={transaction}
                currency={currency}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecentTransactions;