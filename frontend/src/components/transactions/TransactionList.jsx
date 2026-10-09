import {
  AlertCircle,
  ArrowRight,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import TransactionRow from "./TransactionRow.jsx";

const SkeletonRow = () => (
  <div className="flex items-center gap-3 rounded-2xl p-3.5">
    <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />

    <div className="min-w-0 flex-1 space-y-2">
      <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    </div>

    <div className="space-y-2">
      <div className="ml-auto h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
    </div>
  </div>
);

const TransactionList = ({
  transactions = [],
  loading = false,
  error = "",
  onRetry,
  onTransactionClick,
  emptyTitle = "No transactions yet",
  emptyDescription = "Your transaction activity will appear here.",
  showReference = false,
  showAccount = false,
  compact = false,
  limit,
  viewAllHref,
  onViewAll,
  className = "",
}) => {
  const visibleTransactions =
    typeof limit === "number"
      ? transactions.slice(0, Math.max(0, limit))
      : transactions;

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5 ${className}`}
    >
      {loading ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map(
            (_, index) => (
              <SkeletonRow key={index} />
            ),
          )}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
          </div>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Unable to load transactions
          </h3>

          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {error}
          </p>

          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          ) : null}
        </div>
      ) : visibleTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <ReceiptText className="h-5 w-5" />
          </div>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {emptyTitle}
          </h3>

          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {visibleTransactions.map(
              (transaction, index) => (
                <TransactionRow
                  key={
                    transaction?.id ||
                    transaction?.reference ||
                    `transaction-${index}`
                  }
                  transaction={transaction}
                  onClick={
                    onTransactionClick
                      ? () =>
                          onTransactionClick(
                            transaction,
                          )
                      : undefined
                  }
                  showReference={showReference}
                  showAccount={showAccount}
                  compact={compact}
                />
              ),
            )}
          </div>

          {(viewAllHref || onViewAll) &&
          transactions.length > visibleTransactions.length ? (
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              {onViewAll ? (
                <button
                  type="button"
                  onClick={onViewAll}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  View all transactions
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <a
                  href={viewAllHref}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  View all transactions
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};

export default TransactionList;