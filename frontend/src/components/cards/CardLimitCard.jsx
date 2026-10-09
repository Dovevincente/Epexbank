import {
  AlertCircle,
  ArrowDownToLine,
  CreditCard,
  ShoppingCart,
} from "lucide-react";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatMoney = (value, currency = "USD") => {
  const amount = toNumber(value);

  if (amount === null) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const getCurrency = (limits) =>
  limits?.currency?.code ||
  limits?.currencyCode ||
  limits?.currency ||
  "USD";

const LimitRow = ({
  icon: Icon,
  label,
  used,
  limit,
  currency,
}) => {
  const numericUsed = toNumber(used);
  const numericLimit = toNumber(limit);

  const hasValues =
    numericUsed !== null &&
    numericLimit !== null &&
    numericLimit > 0;

  const percentage = hasValues
    ? Math.min(
        100,
        Math.max(0, (numericUsed / numericLimit) * 100),
      )
    : 0;

  const isHighUsage = percentage >= 80;
  const isExceeded =
    numericUsed !== null &&
    numericLimit !== null &&
    numericUsed > numericLimit;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {label}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Used this period
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {formatMoney(numericUsed, currency)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            of {formatMoney(numericLimit, currency)}
          </p>
        </div>
      </div>

      {hasValues && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={[
                "h-full rounded-full transition-all",
                isExceeded
                  ? "bg-red-500"
                  : isHighUsage
                    ? "bg-amber-500"
                    : "bg-blue-600",
              ].join(" ")}
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
            <span
              className={
                isExceeded
                  ? "text-red-600"
                  : isHighUsage
                    ? "text-amber-600"
                    : "text-slate-500 dark:text-slate-400"
              }
            >
              {percentage.toFixed(0)}% used
            </span>

            <span className="text-slate-400">
              {formatMoney(
                Math.max(
                  0,
                  numericLimit - numericUsed,
                ),
                currency,
              )}{" "}
              remaining
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const CardLimitCard = ({
  limits = null,
  loading = false,
  error = "",
  className = "",
}) => {
  const currency = getCurrency(limits);

  const dailyPurchaseUsed =
    limits?.dailyPurchaseUsed ??
    limits?.purchase?.used ??
    limits?.daily?.purchaseUsed ??
    limits?.used?.dailyPurchase;

  const dailyPurchaseLimit =
    limits?.dailyPurchaseLimit ??
    limits?.purchase?.limit ??
    limits?.daily?.purchaseLimit ??
    limits?.limits?.dailyPurchase;

  const dailyWithdrawalUsed =
    limits?.dailyWithdrawalUsed ??
    limits?.withdrawal?.used ??
    limits?.daily?.withdrawalUsed ??
    limits?.used?.dailyWithdrawal;

  const dailyWithdrawalLimit =
    limits?.dailyWithdrawalLimit ??
    limits?.withdrawal?.limit ??
    limits?.daily?.withdrawalLimit ??
    limits?.limits?.dailyWithdrawal;

  return (
    <section
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <CreditCard className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Card limits
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Monitor the limits supplied for this card.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : error ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-950 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

          <p className="text-sm leading-6 text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <LimitRow
            icon={ShoppingCart}
            label="Daily purchases"
            used={dailyPurchaseUsed}
            limit={dailyPurchaseLimit}
            currency={currency}
          />

          <LimitRow
            icon={ArrowDownToLine}
            label="Daily cash withdrawals"
            used={dailyWithdrawalUsed}
            limit={dailyWithdrawalLimit}
            currency={currency}
          />
        </div>
      )}
    </section>
  );
};

export default CardLimitCard;