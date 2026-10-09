import {
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react";

const formatValue = (
  value,
  {
    type = "number",
    currency = "USD",
    decimals = 2,
  } = {},
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  if (type === "currency") {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(numericValue);
    } catch {
      return `${currency} ${numericValue.toFixed(decimals)}`;
    }
  }

  if (type === "percent") {
    return `${numericValue.toFixed(decimals)}%`;
  }

  if (type === "integer") {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
    }).format(numericValue);
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimals,
  }).format(numericValue);
};

const DashboardStat = ({
  label,
  value,
  icon: Icon,
  type = "number",
  currency = "USD",
  decimals = 2,
  change,
  changeLabel = "vs. previous period",
  positiveIsGood = true,
  loading = false,
  onClick,
  className = "",
}) => {
  const numericChange =
    change === null ||
    change === undefined ||
    change === ""
      ? null
      : Number(change);

  const hasChange =
    Number.isFinite(numericChange);

  const isPositive =
    hasChange && numericChange > 0;

  const isNegative =
    hasChange && numericChange < 0;

  const changeIsGood =
    positiveIsGood
      ? isPositive
      : isNegative;

  const changeIsBad =
    positiveIsGood
      ? isNegative
      : isPositive;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ) : (
            <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {formatValue(value, {
                type,
                currency,
                decimals,
              })}
            </p>
          )}
        </div>

        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {hasChange && !loading && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold",
              changeIsGood
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : changeIsBad
                  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            ].join(" ")}
          >
            {isPositive ? (
              <ArrowUp className="h-3 w-3" />
            ) : isNegative ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}

            {Math.abs(numericChange).toFixed(1)}%
          </span>

          <span className="text-[11px] text-slate-400">
            {changeLabel}
          </span>
        </div>
      )}
    </>
  );

  const classes = [
    "rounded-2xl border border-slate-200 bg-white p-5",
    "dark:border-slate-800 dark:bg-slate-900",
    "transition",
    onClick
      ? "cursor-pointer hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          classes,
          "w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        ].join(" ")}
      >
        {content}
      </button>
    );
  }

  return (
    <section className={classes}>
      {content}
    </section>
  );
};

export default DashboardStat;