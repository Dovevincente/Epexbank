export const formatNumber = (
  value,
  {
    locale = "en-US",
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false,
  } = {},
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
    notation: compact ? "compact" : "standard",
  }).format(numericValue);
};

export const formatPercentage = (
  value,
  {
    locale = "en-US",
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = {},
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0%";
  }

  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue / 100);
};

export const formatInteger = (
  value,
  options = {},
) => {
  return formatNumber(value, {
    ...options,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};