import { APP_CONFIG } from "./constants.js";

const isValidNumericValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  return Number.isFinite(Number(value));
};

export const formatCurrency = (
  value,
  {
    currency = APP_CONFIG.currency,
    locale = APP_CONFIG.currencyLocale,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    compact = false,
    showCurrency = true,
  } = {},
) => {
  if (!isValidNumericValue(value)) {
    return showCurrency ? "$0.00" : "0.00";
  }

  const numericValue = Number(value);

  try {
    return new Intl.NumberFormat(locale, {
      style: showCurrency ? "currency" : "decimal",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
      notation: compact ? "compact" : "standard",
    }).format(numericValue);
  } catch {
    return `${showCurrency ? currency + " " : ""}${numericValue.toFixed(
      maximumFractionDigits,
    )}`;
  }
};

export const formatSignedCurrency = (
  value,
  options = {},
) => {
  if (!isValidNumericValue(value)) {
    return formatCurrency(0, options);
  }

  const numericValue = Number(value);

  if (numericValue > 0) {
    return `+${formatCurrency(numericValue, options)}`;
  }

  if (numericValue < 0) {
    return `-${formatCurrency(Math.abs(numericValue), options)}`;
  }

  return formatCurrency(0, options);
};

export const parseCurrency = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
};