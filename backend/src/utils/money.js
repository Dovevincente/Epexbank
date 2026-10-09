import { Prisma } from "@prisma/client";

export const ZERO = new Prisma.Decimal("0");

export const toDecimal = (value) => {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return new Prisma.Decimal(value ?? "0");
};

export const addMoney = (a, b) => {
  return toDecimal(a).plus(toDecimal(b));
};

export const subtractMoney = (a, b) => {
  return toDecimal(a).minus(toDecimal(b));
};

export const isPositiveMoney = (value) => {
  return toDecimal(value).greaterThan(ZERO);
};

export const isZeroMoney = (value) => {
  return toDecimal(value).equals(ZERO);
};

export const isNegativeMoney = (value) => {
  return toDecimal(value).lessThan(ZERO);
};

export const serializeMoney = (value) => {
  return toDecimal(value).toFixed(4);
};

export const assertPositiveMoney = (
  value,
  fieldName = "Amount",
) => {
  const amount = toDecimal(value);

  if (!amount.isFinite() || !amount.greaterThan(ZERO)) {
    const error = new Error(
      `${fieldName} must be greater than zero`,
    );

    error.statusCode = 400;
    throw error;
  }

  return amount;
};