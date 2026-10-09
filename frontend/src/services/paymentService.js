import api from "./api.js";

/*
 * ============================================================
 * PAYMENT SERVICE
 * ============================================================
 *
 * Centralized API access for customer payments.
 *
 * This file intentionally contains no fake payment state and
 * does not modify balances locally. Balance changes must come
 * from the backend ledger/account system.
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

const requirePayload = (payload, name = "Payment data") => {
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

export const getPaymentErrorMessage = (
  error,
  fallback = "Unable to complete the payment request.",
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
   PAYMENTS
============================================================ */

/**
 * GET /api/payments
 *
 * Retrieve the authenticated customer's payments.
 */
export const getPayments = async (params = {}) => {
  const response = await api.get(
    `/payments${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias for getPayments.
 */
export const listPayments = getPayments;

/**
 * GET /api/payments/:paymentId
 *
 * Retrieve one payment.
 */
export const getPayment = async (paymentId) => {
  requireId(paymentId, "Payment ID");

  const response = await api.get(
    `/payments/${encodeURIComponent(paymentId)}`,
  );

  return unwrap(response);
};

/**
 * POST /api/payments
 *
 * Create/process a payment.
 *
 * The backend is responsible for:
 * - validating the payment
 * - checking available balance
 * - applying fees
 * - creating ledger entries
 * - changing payment status
 * - preventing duplicate processing
 */
export const createPayment = async (payload) => {
  requirePayload(payload);

  const response = await api.post(
    "/payments",
    payload,
  );

  return unwrap(response);
};

/**
 * Alias used by payment pages.
 */
export const makePayment = createPayment;

/**
 * POST /api/payments/bill
 *
 * Explicit bill-payment endpoint where supported.
 */
export const payBill = async (payload) => {
  requirePayload(payload, "Bill payment data");

  const response = await api.post(
    "/payments/bill",
    payload,
  );

  return unwrap(response);
};

/**
 * PATCH /api/payments/:paymentId
 *
 * Update an eligible payment.
 */
export const updatePayment = async (
  paymentId,
  payload,
) => {
  requireId(paymentId, "Payment ID");
  requirePayload(payload);

  const response = await api.patch(
    `/payments/${encodeURIComponent(paymentId)}`,
    payload,
  );

  return unwrap(response);
};

/**
 * POST /api/payments/:paymentId/cancel
 *
 * Request cancellation of an eligible payment.
 */
export const cancelPayment = async (paymentId) => {
  requireId(paymentId, "Payment ID");

  const response = await api.post(
    `/payments/${encodeURIComponent(paymentId)}/cancel`,
  );

  return unwrap(response);
};

/**
 * POST /api/payments/:paymentId/retry
 *
 * Retry an eligible failed/pending payment where the
 * backend permits retrying.
 */
export const retryPayment = async (paymentId) => {
  requireId(paymentId, "Payment ID");

  const response = await api.post(
    `/payments/${encodeURIComponent(paymentId)}/retry`,
  );

  return unwrap(response);
};

/* ============================================================
   PAYMENT HISTORY
============================================================ */

/**
 * GET /api/payments/history
 */
export const getPaymentHistory = async (params = {}) => {
  const response = await api.get(
    `/payments/history${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * GET /api/payments/summary
 */
export const getPaymentSummary = async (params = {}) => {
  const response = await api.get(
    `/payments/summary${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * GET /api/payments/:paymentId/receipt
 *
 * Retrieve receipt information for a completed payment.
 */
export const getPaymentReceipt = async (paymentId) => {
  requireId(paymentId, "Payment ID");

  const response = await api.get(
    `/payments/${encodeURIComponent(paymentId)}/receipt`,
  );

  return unwrap(response);
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

const paymentService = {
  getPayments,
  listPayments,
  getPayment,
  createPayment,
  makePayment,
  payBill,
  updatePayment,
  cancelPayment,
  retryPayment,
  getPaymentHistory,
  getPaymentSummary,
  getPaymentReceipt,
  getPaymentErrorMessage,
};

export default paymentService;