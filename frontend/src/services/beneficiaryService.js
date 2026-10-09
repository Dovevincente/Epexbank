import api from "./api.js";

const unwrapBeneficiary = (response) => {
  return (
    response?.data?.data?.beneficiary ||
    response?.data?.beneficiary ||
    null
  );
};

const unwrapBeneficiaries = (response) => {
  if (
    Array.isArray(
      response?.data?.data?.beneficiaries,
    )
  ) {
    return response.data.data.beneficiaries;
  }

  if (
    Array.isArray(
      response?.data?.beneficiaries,
    )
  ) {
    return response.data.beneficiaries;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

export const getBeneficiaries = async ({
  includeInactive = false,
} = {}) => {
  const params = includeInactive
    ? {
        includeInactive: "true",
      }
    : {};

  const response = await api.get(
    "/beneficiaries",
    {
      params,
    },
  );

  return {
    ...response.data,
    data: {
      ...(response.data?.data || {}),
      beneficiaries:
        unwrapBeneficiaries(response),
    },
  };
};

export const getBeneficiary = async (
  beneficiaryId,
) => {
  if (!beneficiaryId) {
    throw new Error(
      "Beneficiary ID is required",
    );
  }

  const response = await api.get(
    `/beneficiaries/${beneficiaryId}`,
  );

  return {
    ...response.data,
    data: {
      ...(response.data?.data || {}),
      beneficiary:
        unwrapBeneficiary(response),
    },
  };
};

export const createBeneficiary = async ({
  name,
  accountName,
  accountNumber,
  bankName,
  bankCode,
  country,
  currencyCode,
}) => {
  const response = await api.post(
    "/beneficiaries",
    {
      name,
      accountName,
      accountNumber,
      bankName,
      bankCode,
      country,
      currencyCode,
    },
  );

  return {
    ...response.data,
    data: {
      ...(response.data?.data || {}),
      beneficiary:
        unwrapBeneficiary(response),
    },
  };
};

export const updateBeneficiary = async (
  beneficiaryId,
  {
    name,
    accountName,
    accountNumber,
    bankName,
    bankCode,
    country,
    currencyCode,
  },
) => {
  if (!beneficiaryId) {
    throw new Error(
      "Beneficiary ID is required",
    );
  }

  const response = await api.patch(
    `/beneficiaries/${beneficiaryId}`,
    {
      name,
      accountName,
      accountNumber,
      bankName,
      bankCode,
      country,
      currencyCode,
    },
  );

  return {
    ...response.data,
    data: {
      ...(response.data?.data || {}),
      beneficiary:
        unwrapBeneficiary(response),
    },
  };
};

export const activateBeneficiary = async (
  beneficiaryId,
) => {
  if (!beneficiaryId) {
    throw new Error(
      "Beneficiary ID is required",
    );
  }

  const response = await api.patch(
    `/beneficiaries/${beneficiaryId}/activate`,
  );

  return {
    ...response.data,
    data: {
      ...(response.data?.data || {}),
      beneficiary:
        unwrapBeneficiary(response),
    },
  };
};

export const deactivateBeneficiary =
  async (beneficiaryId) => {
    if (!beneficiaryId) {
      throw new Error(
        "Beneficiary ID is required",
      );
    }

    const response = await api.delete(
      `/beneficiaries/${beneficiaryId}`,
    );

    return {
      ...response.data,
      data: {
        ...(response.data?.data || {}),
        beneficiary:
          unwrapBeneficiary(response),
      },
    };
  };

export const deleteBeneficiary =
  deactivateBeneficiary;
