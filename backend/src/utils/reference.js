import crypto from "crypto";

const PREFIX_PATTERN = /^[A-Z0-9]{2,12}$/;

export const generateReference = (
  prefix = "TXN",
) => {
  const normalizedPrefix = String(prefix)
    .trim()
    .toUpperCase();

  if (!PREFIX_PATTERN.test(normalizedPrefix)) {
    throw new Error(
      "Invalid transaction reference prefix",
    );
  }

  const timestamp = Date.now()
    .toString(36)
    .toUpperCase();

  const random = crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase();

  return `${normalizedPrefix}-${timestamp}-${random}`;
};

export const generateIdempotencyKey = () => {
  return crypto.randomUUID();
};