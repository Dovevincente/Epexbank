const DEFAULT_CURRENCY = "USD";

const CurrencyAmount = ({
  amount = 0,
  currency = DEFAULT_CURRENCY,
  locale = "en-US",
  minimumFractionDigits,
  maximumFractionDigits,
  showSign = false,
  compact = false,
  className = "",
  muted = false,
}) => {
  const numericAmount = Number(amount);

  const safeAmount = Number.isFinite(numericAmount)
    ? numericAmount
    : 0;

  const currencyCode =
    typeof currency === "object"
      ? currency?.code || DEFAULT_CURRENCY
      : currency || DEFAULT_CURRENCY;

  const decimals =
    typeof currency === "object"
      ? Number(currency?.decimals)
      : undefined;

  const resolvedMinimum =
    minimumFractionDigits ??
    (Number.isFinite(decimals) ? decimals : 2);

  const resolvedMaximum =
    maximumFractionDigits ??
    (Number.isFinite(decimals)
      ? decimals
      : Math.max(resolvedMinimum, 2));

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: String(currencyCode).toUpperCase(),
    minimumFractionDigits: resolvedMinimum,
    maximumFractionDigits: resolvedMaximum,
    notation: compact ? "compact" : "standard",
    signDisplay: showSign
      ? "exceptZero"
      : "auto",
  }).format(safeAmount);

  return (
    <span
      className={`tabular-nums ${muted ? "text-slate-500 dark:text-slate-400" : ""} ${className}`}
    >
      {formatted}
    </span>
  );
};

export default CurrencyAmount;