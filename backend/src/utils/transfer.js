import { assertPositiveMoney } from "./money.js";

export const normalizeAccountNumber = (
  accountNumber,
) => {
  return String(accountNumber || "")
    .trim()
    .toUpperCase();
};

export const normalizeIdempotencyKey = (
  value,
) => {
  if (!value) {
    return null;
  }

  const key = String(value).trim();

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

export const validateTransferAmount = (
  amount,
) => {
  return assertPositiveMoney(
    amount,
    "Transfer amount",
  );
};

export const validateInternalTransfer = ({
  senderAccountNumber,
  receiverAccountNumber,
  amount,
}) => {
  const sender =
    normalizeAccountNumber(
      senderAccountNumber,
    );

  const receiver =
    normalizeAccountNumber(
      receiverAccountNumber,
    );

  if (!sender) {
    const error = new Error(
      "Sender account number is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (!receiver) {
    const error = new Error(
      "Recipient account number is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (sender === receiver) {
    const error = new Error(
      "Sender and recipient accounts must be different",
    );

    error.statusCode = 400;
    throw error;
  }

  return validateTransferAmount(amount);
};