export const formatAccountNumber = (
  accountNumber,
  {
    masked = false,
    visibleDigits = 4,
    separator = " ",
  } = {},
) => {
  if (!accountNumber) {
    return "—";
  }

  const value = String(accountNumber).replace(
    /\s+/g,
    "",
  );

  if (masked) {
    const visible = value.slice(-visibleDigits);
    const hiddenLength = Math.max(
      value.length - visibleDigits,
      0,
    );

    return `${"•".repeat(hiddenLength)}${visible}`;
  }

  return value.match(/.{1,4}/g)?.join(separator) || value;
};

export const maskAccountNumber = (
  accountNumber,
  visibleDigits = 4,
) => {
  return formatAccountNumber(accountNumber, {
    masked: true,
    visibleDigits,
  });
};