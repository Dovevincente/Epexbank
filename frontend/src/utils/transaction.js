
/**
 * Epex Bank transaction utilities.
 *
 * This file contains shared, presentation-safe helpers for working with
 * transaction records returned by the API.
 *
 * Important:
 * - These helpers do not modify balances.
 * - These helpers do not create transactions.
 * - Financial state remains controlled by the backend.
 */

const CREDIT_TYPES = new Set([
  "CREDIT",
  "DEPOSIT",
  "CASH_DEPOSIT",
  "TRANSFER_IN",
  "INTERNAL_TRANSFER_IN",
  "BANK_TRANSFER_IN",
  "INCOMING_TRANSFER",
  "CARD_REFUND",
  "REFUND",
  "DIVIDEND",
  "INTEREST",
  "INTEREST_CREDIT",
  "LOAN_DISBURSEMENT",
  "REVERSAL_CREDIT",
  "ADJUSTMENT_CREDIT",
]);

const DEBIT_TYPES = new Set([
  "DEBIT",
  "WITHDRAWAL",
  "CASH_WITHDRAWAL",
  "TRANSFER_OUT",
  "INTERNAL_TRANSFER_OUT",
  "BANK_TRANSFER_OUT",
  "OUTGOING_TRANSFER",
  "CARD_PAYMENT",
  "CARD_PURCHASE",
  "PURCHASE",
  "PAYMENT",
  "BILL_PAYMENT",
  "FEE",
  "CHARGE",
  "INTEREST_CHARGE",
  "LOAN_REPAYMENT",
  "REVERSAL_DEBIT",
  "ADJUSTMENT_DEBIT",
]);

const COMPLETED_STATUSES = new Set([
  "COMPLETED",
  "SUCCESS",
  "SUCCEEDED",
  "SETTLED",
  "POSTED",
  "PAID",
]);

const PENDING_STATUSES = new Set([
  "PENDING",
  "PROCESSING",
  "AWAITING",
  "QUEUED",
  "INITIATED",
  "SUBMITTED",
  "IN_REVIEW",
]);

const FAILED_STATUSES = new Set([
  "FAILED",
  "DECLINED",
  "REJECTED",
  "ERROR",
  "DENIED",
]);

const REVERSED_STATUSES = new Set([
  "REVERSED",
  "REFUNDED",
  "CANCELLED",
  "VOIDED",
]);

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

export const normalizeTransaction = (transaction = {}) => {
  if (!transaction || typeof transaction !== "object") {
    return {};
  }

  return {
    ...transaction,

    id:
      transaction.id ||
      transaction.transactionId ||
      transaction._id ||
      null,

    reference:
      transaction.reference ||
      transaction.transactionReference ||
      transaction.ref ||
      null,

    type: normalize(
      transaction.type ||
        transaction.transactionType ||
        transaction.category ||
        "",
    ),

    status: normalize(transaction.status || ""),

    amount:
      transaction.amount ??
      transaction.value ??
      transaction.transactionAmount ??
      0,

    currency:
      transaction.currency?.code ||
      transaction.currencyCode ||
      (typeof transaction.currency === "string"
        ? transaction.currency
        : null) ||
      "USD",

    description:
      transaction.description ||
      transaction.narration ||
      transaction.memo ||
      transaction.title ||
      "",

    createdAt:
      transaction.createdAt ||
      transaction.created_at ||
      transaction.date ||
      transaction.transactionDate ||
      null,

    accountId:
      transaction.accountId ||
      transaction.account?.id ||
      null,

    accountNumber:
      transaction.accountNumber ||
      transaction.account?.accountNumber ||
      null,
  };
};

export const getTransactionId = (transaction) =>
  normalizeTransaction(transaction).id;

export const getTransactionReference = (transaction) =>
  normalizeTransaction(transaction).reference;

export const getTransactionType = (transaction) =>
  normalizeTransaction(transaction).type;

export const getTransactionStatus = (transaction) =>
  normalizeTransaction(transaction).status;

export const getTransactionAmount = (transaction) => {
  const value = Number(normalizeTransaction(transaction).amount);

  return Number.isFinite(value) ? value : 0;
};

export const getTransactionCurrency = (transaction) =>
  String(normalizeTransaction(transaction).currency || "USD").toUpperCase();

export const getTransactionDescription = (transaction) =>
  normalizeTransaction(transaction).description || "Transaction";

export const getTransactionDirection = (transaction) => {
  const normalized = normalizeTransaction(transaction);

  const explicitDirection = normalize(
    transaction?.direction ||
      transaction?.creditDebit ||
      transaction?.entryType ||
      "",
  );

  if (
    explicitDirection === "CREDIT" ||
    explicitDirection === "IN" ||
    explicitDirection === "INCOMING"
  ) {
    return "CREDIT";
  }

  if (
    explicitDirection === "DEBIT" ||
    explicitDirection === "OUT" ||
    explicitDirection === "OUTGOING"
  ) {
    return "DEBIT";
  }

  if (CREDIT_TYPES.has(normalized.type)) {
    return "CREDIT";
  }

  if (DEBIT_TYPES.has(normalized.type)) {
    return "DEBIT";
  }

  const signedAmount = Number(transaction?.amount);

  if (Number.isFinite(signedAmount)) {
    if (signedAmount > 0) return "CREDIT";
    if (signedAmount < 0) return "DEBIT";
  }

  return "UNKNOWN";
};

export const isCreditTransaction = (transaction) =>
  getTransactionDirection(transaction) === "CREDIT";

export const isDebitTransaction = (transaction) =>
  getTransactionDirection(transaction) === "DEBIT";

export const getAbsoluteAmount = (transaction) =>
  Math.abs(getTransactionAmount(transaction));

export const getSignedAmount = (transaction) => {
  const amount = getAbsoluteAmount(transaction);
  const direction = getTransactionDirection(transaction);

  if (direction === "CREDIT") return amount;
  if (direction === "DEBIT") return -amount;

  const original = Number(transaction?.amount);

  return Number.isFinite(original) ? original : 0;
};

export const isCompletedTransaction = (transaction) =>
  COMPLETED_STATUSES.has(getTransactionStatus(transaction));

export const isPendingTransaction = (transaction) =>
  PENDING_STATUSES.has(getTransactionStatus(transaction));

export const isFailedTransaction = (transaction) =>
  FAILED_STATUSES.has(getTransactionStatus(transaction));

export const isReversedTransaction = (transaction) =>
  REVERSED_STATUSES.has(getTransactionStatus(transaction));

export const getTransactionState = (transaction) => {
  const status = getTransactionStatus(transaction);

  if (COMPLETED_STATUSES.has(status)) return "COMPLETED";
  if (PENDING_STATUSES.has(status)) return "PENDING";
  if (FAILED_STATUSES.has(status)) return "FAILED";
  if (REVERSED_STATUSES.has(status)) return "REVERSED";

  return status || "UNKNOWN";
};

export const getTransactionStatusLabel = (transactionOrStatus) => {
  const status =
    typeof transactionOrStatus === "string"
      ? normalize(transactionOrStatus)
      : getTransactionState(transactionOrStatus);

  const labels = {
    COMPLETED: "Completed",
    PENDING: "Pending",
    PROCESSING: "Processing",
    FAILED: "Failed",
    DECLINED: "Declined",
    REJECTED: "Rejected",
    REVERSED: "Reversed",
    REFUNDED: "Refunded",
    CANCELLED: "Cancelled",
    POSTED: "Posted",
    SETTLED: "Settled",
    PAID: "Paid",
    IN_REVIEW: "In review",
    QUEUED: "Queued",
    INITIATED: "Initiated",
    SUBMITTED: "Submitted",
  };

  return (
    labels[status] ||
    status
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase()) ||
    "Unknown"
  );
};

export const getTransactionTypeLabel = (transactionOrType) => {
  const type =
    typeof transactionOrType === "string"
      ? normalize(transactionOrType)
      : getTransactionType(transactionOrType);

  const labels = {
    CREDIT: "Credit",
    DEBIT: "Debit",
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    CASH_WITHDRAWAL: "Cash withdrawal",
    TRANSFER_IN: "Incoming transfer",
    TRANSFER_OUT: "Outgoing transfer",
    INTERNAL_TRANSFER_IN: "Internal transfer",
    INTERNAL_TRANSFER_OUT: "Internal transfer",
    BANK_TRANSFER_IN: "Bank transfer",
    BANK_TRANSFER_OUT: "Bank transfer",
    INTERNATIONAL_TRANSFER: "International transfer",
    CARD_PAYMENT: "Card payment",
    CARD_PURCHASE: "Card purchase",
    PURCHASE: "Purchase",
    PAYMENT: "Payment",
    BILL_PAYMENT: "Bill payment",
    REFUND: "Refund",
    CARD_REFUND: "Card refund",
    FEE: "Fee",
    CHARGE: "Charge",
    DIVIDEND: "Dividend",
    INTEREST: "Interest",
    LOAN_DISBURSEMENT: "Loan disbursement",
    LOAN_REPAYMENT: "Loan repayment",
    REVERSAL_CREDIT: "Reversal",
    REVERSAL_DEBIT: "Reversal",
    ADJUSTMENT_CREDIT: "Credit adjustment",
    ADJUSTMENT_DEBIT: "Debit adjustment",
  };

  return (
    labels[type] ||
    type
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase()) ||
    "Transaction"
  );
};

export const formatTransactionAmount = (
  transaction,
  options = {},
) => {
  const {
    showSign = false,
    currencyOverride = null,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const amount = getAbsoluteAmount(transaction);
  const currency =
    currencyOverride || getTransactionCurrency(transaction);

  let formatted;

  try {
    formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    formatted = `${currency} ${amount.toFixed(maximumFractionDigits)}`;
  }

  if (!showSign) {
    return formatted;
  }

  const direction = getTransactionDirection(transaction);

  if (direction === "CREDIT") {
    return `+${formatted}`;
  }

  if (direction === "DEBIT") {
    return `-${formatted}`;
  }

  return formatted;
};

export const formatTransactionDate = (
  value,
  options = {},
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: options.dateStyle || "medium",
      timeStyle: options.timeStyle || "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

export const formatTransactionShortDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
};

export const formatTransactionTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
};

export const maskAccountNumber = (
  accountNumber,
  visibleDigits = 4,
) => {
  const value = String(accountNumber ?? "").replace(/\s+/g, "");

  if (!value) return "—";

  if (value.length <= visibleDigits) {
    return value;
  }

  return `•••• ${value.slice(-visibleDigits)}`;
};

export const maskReference = (
  reference,
  visibleStart = 6,
  visibleEnd = 4,
) => {
  const value = String(reference ?? "");

  if (!value) return "—";

  if (value.length <= visibleStart + visibleEnd + 3) {
    return value;
  }

  return `${value.slice(0, visibleStart)}…${value.slice(-visibleEnd)}`;
};

export const getTransactionCounterparty = (transaction) => {
  const value = transaction || {};

  return (
    value.counterparty ||
    value.recipientName ||
    value.senderName ||
    value.beneficiaryName ||
    value.merchantName ||
    value.providerName ||
    value.payeeName ||
    value.payee ||
    null
  );
};

export const getTransactionMetadata = (transaction) => {
  const metadata =
    transaction?.metadata ||
    transaction?.meta ||
    transaction?.details ||
    {};

  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return metadata;
};

export const getTransactionCategory = (transaction) =>
  normalizeTransaction(transaction)?.category ||
  transaction?.category ||
  getTransactionType(transaction);

export const extractTransactions = (response) => {
  const data = response?.data ?? response;

  if (Array.isArray(data)) {
    return data.map(normalizeTransaction);
  }

  const candidates = [
    data?.transactions,
    data?.items,
    data?.records,
    data?.results,
    data?.data,
    data?.data?.transactions,
    data?.data?.items,
    data?.data?.records,
    data?.data?.results,
  ];

  const transactions = candidates.find(Array.isArray);

  return (transactions || []).map(normalizeTransaction);
};

export const getPaginationCursor = (response) => {
  const data = response?.data ?? response;

  return (
    data?.nextCursor ||
    data?.next_cursor ||
    data?.pagination?.nextCursor ||
    data?.pagination?.next_cursor ||
    data?.meta?.nextCursor ||
    data?.meta?.next_cursor ||
    data?.data?.nextCursor ||
    data?.data?.next_cursor ||
    null
  );
};

export const calculateTransactionSummary = (transactions = []) => {
  const normalized = transactions.map(normalizeTransaction);

  let credits = 0;
  let debits = 0;
  let completed = 0;
  let pending = 0;
  let failed = 0;
  let reversed = 0;

  for (const transaction of normalized) {
    const amount = getAbsoluteAmount(transaction);
    const direction = getTransactionDirection(transaction);

    if (direction === "CREDIT") {
      credits += amount;
    }

    if (direction === "DEBIT") {
      debits += amount;
    }

    if (isCompletedTransaction(transaction)) {
      completed += 1;
    }

    if (isPendingTransaction(transaction)) {
      pending += 1;
    }

    if (isFailedTransaction(transaction)) {
      failed += 1;
    }

    if (isReversedTransaction(transaction)) {
      reversed += 1;
    }
  }

  return {
    count: normalized.length,
    credits,
    debits,
    completed,
    pending,
    failed,
    reversed,
    net: credits - debits,
  };
};

export const sortTransactionsByDate = (
  transactions = [],
  direction = "desc",
) => {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...transactions].sort((a, b) => {
    const first = new Date(
      normalizeTransaction(a).createdAt || 0,
    ).getTime();

    const second = new Date(
      normalizeTransaction(b).createdAt || 0,
    ).getTime();

    return (first - second) * multiplier;
  });
};

export const filterTransactions = (
  transactions = [],
  filters = {},
) => {
  const {
    search = "",
    status = "",
    type = "",
    direction = "",
    accountId = "",
  } = filters;

  const normalizedSearch = String(search).trim().toLowerCase();
  const normalizedStatus = normalize(status);
  const normalizedType = normalize(type);
  const normalizedDirection = normalize(direction);

  return transactions
    .map(normalizeTransaction)
    .filter((transaction) => {
      if (
        normalizedStatus &&
        getTransactionStatus(transaction) !== normalizedStatus
      ) {
        return false;
      }

      if (
        normalizedType &&
        getTransactionType(transaction) !== normalizedType
      ) {
        return false;
      }

      if (
        normalizedDirection &&
        getTransactionDirection(transaction) !==
          normalizedDirection
      ) {
        return false;
      }

      if (
        accountId &&
        String(transaction.accountId) !== String(accountId)
      ) {
        return false;
      }

      if (normalizedSearch) {
        const searchableText = [
          transaction.id,
          transaction.reference,
          transaction.type,
          transaction.status,
          transaction.description,
          getTransactionCounterparty(transaction),
          transaction.accountNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
};

export default {
  normalizeTransaction,
  getTransactionId,
  getTransactionReference,
  getTransactionType,
  getTransactionStatus,
  getTransactionAmount,
  getTransactionCurrency,
  getTransactionDescription,
  getTransactionDirection,
  isCreditTransaction,
  isDebitTransaction,
  getAbsoluteAmount,
  getSignedAmount,
  isCompletedTransaction,
  isPendingTransaction,
  isFailedTransaction,
  isReversedTransaction,
  getTransactionState,
  getTransactionStatusLabel,
  getTransactionTypeLabel,
  formatTransactionAmount,
  formatTransactionDate,
  formatTransactionShortDate,
  formatTransactionTime,
  maskAccountNumber,
  maskReference,
  getTransactionCounterparty,
  getTransactionMetadata,
  getTransactionCategory,
  extractTransactions,
  getPaginationCursor,
  calculateTransactionSummary,
  sortTransactionsByDate,
  filterTransactions,
};
