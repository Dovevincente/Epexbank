import { assertPositiveMoney } from "./money.js";

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

export const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

export const normalizeAccountId = (value) => {
  return normalizeString(value);
};

export const normalizeBeneficiaryId = (value) => {
  return normalizeString(value);
};

export const normalizeDescription = (value) => {
  const description = normalizeString(value);

  if (!description) {
    return null;
  }

  return description.slice(0, 250);
};

export const normalizeIdempotencyKey = (value) => {
  const key = normalizeString(value);

  if (!key) {
    return null;
  }

  if (key.length > 255) {
    const error = new Error(
      "Idempotency key cannot exceed 255 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  return key;
};

/*
 * ============================================================
 * AMOUNT VALIDATION
 * ============================================================
 */

export const validateBankTransferAmount = (
  amount,
) => {
  return assertPositiveMoney(
    amount,
    "Transfer amount",
  );
};

/*
 * ============================================================
 * REQUEST VALIDATION
 * ============================================================
 */

export const validateBankTransfer = ({
  accountId,
  beneficiaryId,
  amount,
}) => {
  const normalizedAccountId =
    normalizeAccountId(accountId);

  const normalizedBeneficiaryId =
    normalizeBeneficiaryId(beneficiaryId);

  if (!normalizedAccountId) {
    const error = new Error(
      "Source account is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (!normalizedBeneficiaryId) {
    const error = new Error(
      "Beneficiary is required",
    );

    error.statusCode = 400;
    throw error;
  }

  const normalizedAmount =
    validateBankTransferAmount(amount);

  return {
    accountId: normalizedAccountId,
    beneficiaryId:
      normalizedBeneficiaryId,
    amount: normalizedAmount,
  };
};