const INVALID_DATE = "—";

const toDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date
    ? value
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (
  value,
  {
    locale = "en-US",
    dateStyle = "medium",
  } = {},
) => {
  const date = toDate(value);

  if (!date) return INVALID_DATE;

  return new Intl.DateTimeFormat(locale, {
    dateStyle,
  }).format(date);
};

export const formatDateTime = (
  value,
  {
    locale = "en-US",
    dateStyle = "medium",
    timeStyle = "short",
  } = {},
) => {
  const date = toDate(value);

  if (!date) return INVALID_DATE;

  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    timeStyle,
  }).format(date);
};

export const formatTime = (
  value,
  {
    locale = "en-US",
    timeStyle = "short",
  } = {},
) => {
  const date = toDate(value);

  if (!date) return INVALID_DATE;

  return new Intl.DateTimeFormat(locale, {
    timeStyle,
  }).format(date);
};

export const formatRelativeTime = (
  value,
  {
    locale = "en-US",
  } = {},
) => {
  const date = toDate(value);

  if (!date) return INVALID_DATE;

  const difference =
    date.getTime() - Date.now();

  const seconds = Math.round(difference / 1000);
  const absoluteSeconds = Math.abs(seconds);

  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });

  if (absoluteSeconds < 60) {
    return formatter.format(seconds, "second");
  }

  const minutes = Math.round(seconds / 60);

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);

  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);

  if (Math.abs(days) < 30) {
    return formatter.format(days, "day");
  }

  const months = Math.round(days / 30);

  if (Math.abs(months) < 12) {
    return formatter.format(months, "month");
  }

  const years = Math.round(months / 12);

  return formatter.format(years, "year");
};

export const isDateInPast = (value) => {
  const date = toDate(value);

  return Boolean(date && date.getTime() < Date.now());
};

export const isDateInFuture = (value) => {
  const date = toDate(value);

  return Boolean(date && date.getTime() > Date.now());
};