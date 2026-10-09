/*
 * ============================================================
 * EPEX BANK — SAVINGS PRODUCTS
 * ============================================================
 *
 * Backend-authoritative product configuration.
 *
 * The frontend must never be trusted to determine:
 * - interest rate
 * - product type
 * - currency
 * - product requirements
 *
 * These values are validated again when a savings account
 * is opened.
 * ============================================================
 */

const SAVINGS_PRODUCTS = Object.freeze({
  REGULAR: Object.freeze({
    id: "REGULAR",
    type: "REGULAR",
    name: "Regular Savings",
    currencyCode: "USD",
    interestRate: 4.0,
    minimumOpeningAmount: 0,
    requiresTargetAmount: false,
    requiresMaturityDate: false,
    withdrawalsAllowed: true,
    description:
      "Flexible savings for everyday saving with access to your funds when needed.",
  }),

  FIXED: Object.freeze({
    id: "FIXED",
    type: "FIXED",
    name: "Fixed Savings",
    currencyCode: "USD",
    interestRate: 7.0,
    minimumOpeningAmount: 0,
    requiresTargetAmount: false,
    requiresMaturityDate: true,
    withdrawalsAllowed: false,
    description:
      "Lock your savings until the selected maturity date and earn a higher interest rate.",
  }),

  GOAL: Object.freeze({
    id: "GOAL",
    type: "GOAL",
    name: "Goal Savings",
    currencyCode: "USD",
    interestRate: 5.0,
    minimumOpeningAmount: 0,
    requiresTargetAmount: true,
    requiresMaturityDate: false,
    withdrawalsAllowed: true,
    description:
      "Save toward a specific financial target while tracking your progress.",
  }),
});

export const getSavingsProducts = () =>
  Object.values(SAVINGS_PRODUCTS).map((product) => ({
    ...product,
  }));

export const getSavingsProduct = (productId) => {
  if (!productId) {
    const error = new Error("Savings product is required.");
    error.statusCode = 400;
    throw error;
  }

  const normalized = String(productId)
    .trim()
    .toUpperCase();

  const product = SAVINGS_PRODUCTS[normalized];

  if (!product) {
    const error = new Error(
      `Unknown savings product: ${normalized}.`,
    );

    error.statusCode = 400;
    throw error;
  }

  return {
    ...product,
  };
};

export const getSavingsProductByType = (type) =>
  getSavingsProduct(type);

export default {
  getSavingsProducts,
  getSavingsProduct,
  getSavingsProductByType,
};
