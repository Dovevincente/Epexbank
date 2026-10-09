import api from "./api.js";

/* ============================================================
   IDEMPOTENCY KEY
============================================================ */

const createIdempotencyKey = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

/* ============================================================
   CREATE BANK TRANSFER
============================================================ */

export const createBankTransfer = async ({
  accountId,
  beneficiaryId,
  amount,
  tinCode,
  amlCode,
  cftCode,
  description,
  recipientName,
  recipientAccountName,
  recipientAccountNumber,
  recipientBankName,
  recipientBankCode,
  recipientCountry,
  recipientCurrencyCode,
}) => {
  if (!accountId) {
    throw new Error("Source account is required");
  }

  if (
    amount === undefined ||
    amount === null ||
    amount === ""
  ) {
    throw new Error("Transfer amount is required");
  }

  if (!String(tinCode ?? "").trim()) {
    throw new Error("TIN / Tax Code is required");
  }

  if (!String(amlCode ?? "").trim()) {
    throw new Error("AML Code is required");
  }

  if (!String(cftCode ?? "").trim()) {
    throw new Error("CFT Code is required");
  }

  const idempotencyKey = createIdempotencyKey();

  const payload = {
    accountId,

    ...(beneficiaryId ? { beneficiaryId } : {}),

    // Bank transfer type
    type: "BANK",

    amount,

    tinCode: String(tinCode).trim(),

    amlCode: String(amlCode).trim(),

    cftCode: String(cftCode).trim(),

    ...(recipientName?.trim()
      ? { recipientName: recipientName.trim() }
      : {}),

    ...(recipientAccountName?.trim()
      ? {
          recipientAccountName:
            recipientAccountName.trim(),
        }
      : {}),

    ...(recipientAccountNumber?.trim()
      ? {
          recipientAccountNumber:
            recipientAccountNumber.trim(),
        }
      : {}),

    ...(recipientBankName?.trim()
      ? {
          recipientBankName:
            recipientBankName.trim(),
        }
      : {}),

    ...(recipientBankCode?.trim()
      ? {
          recipientBankCode:
            recipientBankCode.trim(),
        }
      : {}),

    ...(recipientCountry?.trim()
      ? {
          recipientCountry:
            recipientCountry.trim(),
        }
      : {}),

    ...(recipientCurrencyCode?.trim()
      ? {
          recipientCurrencyCode:
            recipientCurrencyCode.trim(),
        }
      : {}),

    ...(description?.trim()
      ? {
          description:
            description.trim(),
        }
      : {}),
  };

  const response = await api.post(
    "/bank-transfers",
    payload,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );

  return response.data;
};

/* ============================================================
   GET CUSTOMER BANK TRANSFERS
============================================================ */

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

/* ============================================================
   GET ONE BANK TRANSFER
============================================================ */

export const getBankTransfer = async (
  transferId,
) => {
  if (!transferId) {
    throw new Error("Transfer ID is required");
  }

  const response = await api.get(
    `/bank-transfers/${encodeURIComponent(
      transferId,
    )}`,
  );

  return response.data;
};

/* ============================================================
   GET NEXT PAGE
============================================================ */

export const getNextBankTransfers = async ({
  status,
  limit = 50,
  cursor,
} = {}) => {
  return getBankTransfers({
    status,
    limit,
    cursor,
  });
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default {
  createBankTransfer,
  getBankTransfers,
  getBankTransfer,
  getNextBankTransfers,
};