import api from "./api.js";

/**
 * Epex Bank — Loan API service
 *
 * Loan balances, approval decisions, interest and repayment
 * schedules are controlled by the backend.
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
   CUSTOMER LOANS
========================================================= */

export const getLoans = async (params = {}) => {
  const response = await api.get(
    `/loans${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const listLoans = getLoans;

export const getLoan = async (loanId) => {
  requireId(loanId, "Loan ID");

  const response = await api.get(
    `/loans/${encodeURIComponent(loanId)}`,
  );

  return unwrap(response);
};

/* =========================================================
   LOAN APPLICATION
========================================================= */

export const applyForLoan = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("Loan application information is required.");
  }

  const response = await api.post(
    "/loans",
    data,
  );

  return unwrap(response);
};

export const createLoanApplication =
  applyForLoan;

export const updateLoanApplication = async (
  loanId,
  data,
) => {
  requireId(loanId, "Loan ID");

  if (!data || typeof data !== "object") {
    throw new Error("Loan information is required.");
  }

  const response = await api.patch(
    `/loans/${encodeURIComponent(loanId)}`,
    data,
  );

  return unwrap(response);
};

export const cancelLoan = async (loanId) => {
  requireId(loanId, "Loan ID");

  const response = await api.post(
    `/loans/${encodeURIComponent(loanId)}/cancel`,
  );

  return unwrap(response);
};

/* =========================================================
   REPAYMENT SCHEDULE
========================================================= */

export const getRepaymentSchedule = async (
  loanId,
  params = {},
) => {
  requireId(loanId, "Loan ID");

  const response = await api.get(
    `/loans/${encodeURIComponent(
      loanId,
    )}/repayments${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const getLoanRepaymentSchedule =
  getRepaymentSchedule;

/* =========================================================
   REPAYMENTS
========================================================= */

export const getLoanRepayments = async (
  loanId,
  params = {},
) => {
  requireId(loanId, "Loan ID");

  const response = await api.get(
    `/loans/${encodeURIComponent(
      loanId,
    )}/repayments${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const makeLoanRepayment = async (
  loanId,
  data,
) => {
  requireId(loanId, "Loan ID");

  if (!data || typeof data !== "object") {
    throw new Error("Repayment information is required.");
  }

  const response = await api.post(
    `/loans/${encodeURIComponent(loanId)}/repay`,
    data,
  );

  return unwrap(response);
};

export const repayLoan =
  makeLoanRepayment;

/* =========================================================
   LOAN HISTORY
========================================================= */

export const getLoanHistory = async (
  loanId,
  params = {},
) => {
  requireId(loanId, "Loan ID");

  const response = await api.get(
    `/loans/${encodeURIComponent(
      loanId,
    )}/history${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* =========================================================
   ADMIN LOANS
========================================================= */

export const getAdminLoans = async (
  params = {},
) => {
  const response = await api.get(
    `/admin/loans${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const getAdminLoan = async (loanId) => {
  requireId(loanId, "Loan ID");

  const response = await api.get(
    `/admin/loans/${encodeURIComponent(loanId)}`,
  );

  return unwrap(response);
};

export const reviewLoan = async (
  loanId,
  data,
) => {
  requireId(loanId, "Loan ID");

  if (!data || typeof data !== "object") {
    throw new Error("Loan review information is required.");
  }

  const response = await api.patch(
    `/admin/loans/${encodeURIComponent(loanId)}/review`,
    data,
  );

  return unwrap(response);
};

export const approveLoan = async (
  loanId,
  data = {},
) => {
  requireId(loanId, "Loan ID");

  const response = await api.post(
    `/admin/loans/${encodeURIComponent(loanId)}/approve`,
    data,
  );

  return unwrap(response);
};

export const rejectLoan = async (
  loanId,
  data,
) => {
  requireId(loanId, "Loan ID");

  if (!data || typeof data !== "object") {
    throw new Error("Loan rejection information is required.");
  }

  const response = await api.post(
    `/admin/loans/${encodeURIComponent(loanId)}/reject`,
    data,
  );

  return unwrap(response);
};

/* =========================================================
   ERROR HELPER
========================================================= */

export const getLoanErrorMessage = (
  error,
  fallback = "Unable to complete the loan request.",
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
  getLoans,
  listLoans,
  getLoan,
  applyForLoan,
  createLoanApplication,
  updateLoanApplication,
  cancelLoan,
  getRepaymentSchedule,
  getLoanRepaymentSchedule,
  getLoanRepayments,
  makeLoanRepayment,
  repayLoan,
  getLoanHistory,
  getAdminLoans,
  getAdminLoan,
  reviewLoan,
  approveLoan,
  rejectLoan,
  getLoanErrorMessage,
};