import api from "./api.js";

export const getTransactions = async ({
  accountId,
  type,
  status,
  limit = 50,
  cursor,
} = {}) => {
  const params = {
    ...(accountId
      ? { accountId }
      : {}),

    ...(type
      ? { type }
      : {}),

    ...(status
      ? { status }
      : {}),

    ...(limit
      ? { limit }
      : {}),

    ...(cursor
      ? { cursor }
      : {}),
  };

  const response = await api.get(
    "/transactions",
    {
      params,
    },
  );

  return response.data;
};

export const getTransaction = async (
  transactionId,
) => {
  const response = await api.get(
    `/transactions/${transactionId}`,
  );

  return response.data;
};

export const getAccountTransactions = async (
  accountId,
  {
    type,
    status,
    limit = 50,
    cursor,
  } = {},
) => {
  const params = {
    ...(type
      ? { type }
      : {}),

    ...(status
      ? { status }
      : {}),

    ...(limit
      ? { limit }
      : {}),

    ...(cursor
      ? { cursor }
      : {}),
  };

  const response = await api.get(
    `/accounts/${accountId}/transactions`,
    {
      params,
    },
  );

  return response.data;
};