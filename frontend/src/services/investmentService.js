import api from "./api.js";

/**
 * Epex Bank — Investment API service
 *
 * Investment orders and portfolio balances are authoritative
 * backend data. The frontend never fabricates execution results.
 */

const unwrap = (response) => response?.data ?? response;

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

const requireId = (value, label) => {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
};

/* =========================================================
   INVESTMENT PRODUCTS
========================================================= */

export const getInvestmentProducts = async (
  params = {},
) => {
  const response = await api.get(
    `/investments/products${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const listInvestmentProducts =
  getInvestmentProducts;

export const getInvestmentProduct = async (
  productId,
) => {
  requireId(productId, "Investment product ID");

  const response = await api.get(
    `/investments/products/${encodeURIComponent(
      productId,
    )}`,
  );

  return unwrap(response);
};

/* =========================================================
   CUSTOMER PORTFOLIO
========================================================= */

export const getInvestments = async (params = {}) => {
  const response = await api.get(
    `/investments${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const getInvestmentPortfolio =
  getInvestments;

export const getInvestment = async (
  investmentId,
) => {
  requireId(investmentId, "Investment ID");

  const response = await api.get(
    `/investments/${encodeURIComponent(
      investmentId,
    )}`,
  );

  return unwrap(response);
};

/* =========================================================
   BUY / SELL
========================================================= */

export const buyInvestment = async (
  investmentId,
  orderData,
) => {
  requireId(investmentId, "Investment ID");

  if (
    !orderData ||
    typeof orderData !== "object"
  ) {
    throw new Error("Investment order information is required.");
  }

  const response = await api.post(
    `/investments/${encodeURIComponent(
      investmentId,
    )}/buy`,
    orderData,
  );

  return unwrap(response);
};

export const sellInvestment = async (
  investmentId,
  orderData,
) => {
  requireId(investmentId, "Investment ID");

  if (
    !orderData ||
    typeof orderData !== "object"
  ) {
    throw new Error("Investment sell information is required.");
  }

  const response = await api.post(
    `/investments/${encodeURIComponent(
      investmentId,
    )}/sell`,
    orderData,
  );

  return unwrap(response);
};

/* =========================================================
   ORDERS
========================================================= */

export const getInvestmentOrders = async (
  params = {},
) => {
  const response = await api.get(
    `/investments/orders${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const listInvestmentOrders =
  getInvestmentOrders;

export const getInvestmentOrder = async (
  orderId,
) => {
  requireId(orderId, "Investment order ID");

  const response = await api.get(
    `/investments/orders/${encodeURIComponent(
      orderId,
    )}`,
  );

  return unwrap(response);
};

/* =========================================================
   HISTORY
========================================================= */

export const getInvestmentHistory = async (
  investmentId,
  params = {},
) => {
  requireId(investmentId, "Investment ID");

  const response = await api.get(
    `/investments/${encodeURIComponent(
      investmentId,
    )}/history${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* =========================================================
   PERFORMANCE
========================================================= */

export const getInvestmentPerformance = async (
  investmentId,
  params = {},
) => {
  requireId(investmentId, "Investment ID");

  const response = await api.get(
    `/investments/${encodeURIComponent(
      investmentId,
    )}/performance${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* =========================================================
   TRANSACTION / ORDER CANCELLATION
========================================================= */

export const cancelInvestmentOrder = async (
  orderId,
) => {
  requireId(orderId, "Investment order ID");

  const response = await api.post(
    `/investments/orders/${encodeURIComponent(
      orderId,
    )}/cancel`,
  );

  return unwrap(response);
};

/* =========================================================
   ERROR HELPER
========================================================= */

export const getInvestmentErrorMessage = (
  error,
  fallback = "Unable to complete the investment request.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getInvestmentProducts,
  listInvestmentProducts,
  getInvestmentProduct,
  getInvestments,
  getInvestmentPortfolio,
  getInvestment,
  buyInvestment,
  sellInvestment,
  getInvestmentOrders,
  listInvestmentOrders,
  getInvestmentOrder,
  getInvestmentHistory,
  getInvestmentPerformance,
  cancelInvestmentOrder,
  getInvestmentErrorMessage,
};