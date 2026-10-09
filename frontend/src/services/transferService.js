import api from "./api.js";

/*
 * ============================================================
 * IDEMPOTENCY
 * ============================================================
 */

const createIdempotencyKey = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

/*
 * ============================================================
 * INTERNAL TRANSFERS
 * ============================================================
 */

export const createInternalTransfer = async ({
  senderAccountNumber,
  receiverAccountNumber,
  amount,
  description,
}) => {
  const idempotencyKey = createIdempotencyKey();

  const response = await api.post(
    "/transfers/internal",
    {
      senderAccountNumber,
      receiverAccountNumber,
      amount,
      description,
    },
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );

  return response.data;
};

/*
 * ============================================================
 * GET ALL TRANSFERS
 * ============================================================
 */

export const getTransfers = async ({
  status,
  limit = 50,
  cursor,
} = {}) => {
  const params = {
    ...(status ? { status } : {}),
    ...(limit ? { limit } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const response = await api.get(
    "/transfers",
    {
      params,
    },
  );

  return response.data;
};

/*
 * ============================================================
 * GET SINGLE TRANSFER
 * ============================================================
 */

export const getTransfer = async (
  transferId,
) => {
  if (!transferId) {
    throw new Error(
      "Transfer ID is required",
    );
  }

  const response = await api.get(
    `/transfers/${encodeURIComponent(
      transferId,
    )}`,
  );

  return response.data;
};

/*
 * ============================================================
 * EXTERNAL BANK TRANSFER
 * ============================================================
 *
 * Creates an external bank transfer.
 *
 * The backend is responsible for:
 * - Authentication
 * - Beneficiary ownership
 * - Account ownership
 * - Account status
 * - Currency validation
 * - Balance validation
 * - Row locking
 * - Decimal financial calculations
 * - Idempotency
 * - Ledger entries
 * - Transaction records
 * - Audit logging
 */

export const createBankTransfer = async ({
  accountId,
  beneficiaryId,
  amount,
  description,
}) => {
  const idempotencyKey =
    createIdempotencyKey();

  const response = await api.post(
    "/bank-transfers",
    {
      accountId,
      beneficiaryId,
      amount,
      description,
    },
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );

  return response.data;
};

/*
 * ============================================================
 * GET EXTERNAL BANK TRANSFERS
 * ============================================================
 */

export const getBankTransfers = async ({
  status,
  limit = 50,
  cursor,
} = {}) => {
  const params = {
    ...(status ? { status } : {}),
    ...(limit ? { limit } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const response = await api.get(
    "/bank-transfers",
    {
      params,
    },
  );

  return response.data;
};