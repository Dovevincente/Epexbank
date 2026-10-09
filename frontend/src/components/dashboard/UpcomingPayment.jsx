import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  ReceiptText,
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
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getDaysUntil = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const target = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  return Math.ceil(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );
};

const getPaymentTitle = (payment) =>
  payment?.title ??
  payment?.name ??
  payment?.description ??
  payment?.merchantName ??
  payment?.payee ??
  payment?.type ??
  "Upcoming payment";

const UpcomingPayment = ({
  payment = null,
  loading = false,
  error = "",
  currency = "USD",
  onView,
  onRetry,
  title = "Upcoming Payment",
}) => {
  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-5 h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h2>

        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-500/5">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Unable to load upcoming payments.
          </p>

          <p className="mt-1 text-xs leading-5 text-red-600/80 dark:text-red-400/70">
            {error}
          </p>

          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (!payment) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <CalendarClock size={19} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              No upcoming payments are currently available.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-slate-700">
          <CheckCircle2
            size={24}
            className="mx-auto text-emerald-500"
          />

          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            You are up to date
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Scheduled obligations will appear here when available.
          </p>
        </div>
      </section>
    );
  }

  const amount = Number(
    payment?.amount ??
      payment?.totalAmount ??
      payment?.dueAmount ??
      payment?.value ??
      0,
  );

  const paymentDate =
    payment?.dueDate ??
    payment?.scheduledDate ??
    payment?.paymentDate ??
    payment?.date;

  const daysUntil = getDaysUntil(paymentDate);

  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDueToday = daysUntil === 0;

  const paymentStatus = String(
    payment?.status ?? "PENDING",
  ).toUpperCase();

  const statusIsComplete = [
    "PAID",
    "COMPLETED",
    "SUCCESS",
    "SUCCESSFUL",
  ].includes(paymentStatus);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your next scheduled financial obligation.
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <CalendarClock size={19} />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
              <CreditCard size={19} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {getPaymentTitle(payment)}
              </p>

              {payment?.reference ? (
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  Ref: {payment.reference}
                </p>
              ) : null}
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(
                amount,
                payment?.currency?.code ??
                  payment?.currency ??
                  currency,
              )}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Amount due
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Due date
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {formatDate(paymentDate)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Status
            </p>

            <div className="mt-1 flex items-center gap-2">
              {statusIsComplete ? (
                <CheckCircle2
                  size={15}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              ) : isOverdue ? (
                <Clock3
                  size={15}
                  className="text-red-600 dark:text-red-400"
                />
              ) : (
                <Clock3
                  size={15}
                  className="text-amber-600 dark:text-amber-400"
                />
              )}

              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {statusIsComplete
                  ? "Paid"
                  : isOverdue
                    ? "Overdue"
                    : isDueToday
                      ? "Due today"
                      : paymentStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {daysUntil !== null && !statusIsComplete ? (
          <p
            className={`text-xs font-medium ${
              isOverdue
                ? "text-red-600 dark:text-red-400"
                : isDueToday
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {isOverdue
              ? `${Math.abs(daysUntil)} day${
                  Math.abs(daysUntil) === 1 ? "" : "s"
                } overdue`
              : isDueToday
                ? "Due today"
                : `${daysUntil} day${
                    daysUntil === 1 ? "" : "s"
                  } remaining`}
          </p>
        ) : (
          <span />
        )}

        {onView ? (
          <button
            type="button"
            onClick={() => onView(payment)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ReceiptText size={16} />
            View payment
            <ArrowRight size={15} />
          </button>
        ) : null}
      </div>

      {payment?.href ? (
        <a
          href={payment.href}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Open payment
          <ExternalLink size={12} />
        </a>
      ) : null}
    </section>
  );
};

export default UpcomingPayment;