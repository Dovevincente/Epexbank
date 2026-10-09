import api from "./api.js";

/*
 * ============================================================
 * SHARE SERVICE
 * ============================================================
 *
 * Centralized API access for Epex Bank share products.
 *
 * Financial ownership, order execution, pricing, settlement,
 * holdings and dividends must always come from the backend.
 */

/* ============================================================
   INTERNAL HELPERS
============================================================ */

const unwrap = (response) => {
  return response?.data ?? response;
};

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (
          item !== undefined &&
          item !== null &&
          item !== ""
        ) {
          searchParams.append(key, String(item));
        }
      });

      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

const requireId = (value, name) => {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const requirePayload = (
  payload,
  name = "Share transaction data",
) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(`${name} is required.`);
  }

  return payload;
};

/* ============================================================
   ERROR HANDLING
============================================================ */

export const getShareErrorMessage = (
  error,
  fallback = "Unable to complete the share request.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
};

/* ============================================================
   SHARE PRODUCTS
============================================================ */

/**
 * GET /api/shares
 *
 * Retrieve available share products / listings.
 */
export const getShares = async (params = {}) => {
  const response = await api.get(
    `/shares${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const listShares = getShares;

/**
 * GET /api/shares/:shareId
 *
 * Retrieve one share product.
 */
export const getShare = async (shareId) => {
  requireId(shareId, "Share ID");

  const response = await api.get(
    `/shares/${encodeURIComponent(shareId)}`,
  );

  return unwrap(response);
};

/**
 * Alias used by share detail pages.
 */
export const getShareDetails = getShare;

/* ============================================================
   CUSTOMER HOLDINGS
============================================================ */

/**
 * GET /api/shares/holdings
 *
 * Retrieve the authenticated customer's holdings.
 */
export const getShareHoldings = async (
  params = {},
) => {
  const response = await api.get(
    `/shares/holdings${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const getHoldings = getShareHoldings;

/**
 * GET /api/shares/holdings/:holdingId
 */
export const getShareHolding = async (
 holdingId,
) => {
  requireId(holdingId, "Holding ID");

  const response = await api.get(
    `/shares/holdings/${encodeURIComponent(
      holdingId,
    )}`,
  );

  return unwrap(response);
};

/* ============================================================
   BUYING SHARES
============================================================ */

/**
 * POST /api/shares/buy
 *
 * Submit a buy order.
 */
export const buyShares = async (payload) => {
  requirePayload(payload, "Share purchase data");

  const response = await api.post(
    "/shares/buy",
    payload,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const purchaseShares = buyShares;

/**
 * POST /api/shares/orders
 *
 * Alternative order-creation endpoint.
 */
export const createShareOrder = async (payload) => {
  requirePayload(payload, "Share order data");

  const response = await api.post(
    "/shares/orders",
    payload,
  );

  return unwrap(response);
};

/* ============================================================
   SELLING SHARES
============================================================ */

/**
 * POST /api/shares/sell
 *
 * Submit a sell order.
 */
export const sellShares = async (payload) => {
  requirePayload(payload, "Share sale data");

  const response = await api.post(
    "/shares/sell",
    payload,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const createSellOrder = sellShares;

/* ============================================================
   SHARE ORDERS
============================================================ */

/**
 * GET /api/shares/orders
 */
export const getShareOrders = async (
  params = {},
) => {
  const response = await api.get(
    `/shares/orders${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const listShareOrders = getShareOrders;

/**
 * GET /api/shares/orders/:orderId
 */
export const getShareOrder = async (orderId) => {
  requireId(orderId, "Share order ID");

  const response = await api.get(
    `/shares/orders/${encodeURIComponent(orderId)}`,
  );

  return unwrap(response);
};

/**
 * POST /api/shares/orders/:orderId/cancel
 */
export const cancelShareOrder = async (
  orderId,
) => {
  requireId(orderId, "Share order ID");

  const response = await api.post(
    `/shares/orders/${encodeURIComponent(
      orderId,
    )}/cancel`,
  );

  return unwrap(response);
};

/* ============================================================
   SHARE HISTORY
============================================================ */

/**
 * GET /api/shares/history
 */
export const getShareHistory = async (
  params = {},
) => {
  const response = await api.get(
    `/shares/history${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * GET /api/shares/performance
 */
export const getSharePerformance = async (
  params = {},
) => {
  const response = await api.get(
    `/shares/performance${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* ============================================================
   DIVIDENDS
============================================================ */

/**
 * GET /api/shares/dividends
 */
export const getDividends = async (
  params = {},
) => {
  const response = await api.get(
    `/shares/dividends${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const getShareDividends = getDividends;

/**
 * GET /api/shares/dividends/:dividendId
 */
export const getDividend = async (
  dividendId,
) => {
  requireId(dividendId, "Dividend ID");

  const response = await api.get(
    `/shares/dividends/${encodeURIComponent(
      dividendId,
    )}`,
  );

  return unwrap(response);
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

const shareService = {
  getShares,
  listShares,
  getShare,
  getShareDetails,

  getShareHoldings,
  getHoldings,
  getShareHolding,

  buyShares,
  purchaseShares,
  createShareOrder,

  sellShares,
  createSellOrder,

  getShareOrders,
  listShareOrders,
  getShareOrder,
  cancelShareOrder,

  getShareHistory,
  getSharePerformance,

  getDividends,
  getShareDividends,
  getDividend,

  getShareErrorMessage,
};

export default shareService;