import prisma from "../config/database.js";

import {
  normalizeAccountNumber,
  normalizeBankName,
  normalizeBankCode,
  normalizeCountry,
  normalizeCurrency,
  normalizeBeneficiaryName,
  validateBeneficiaryName,
  validateBeneficiaryAccountNumber,
  validateBankName,
  validateCountry,
  validateCurrency,
} from "../utils/beneficiary.js";

const beneficiarySelect = {
  id: true,
  userId: true,
  name: true,
  accountName: true,
  accountNumber: true,
  bankName: true,
  bankCode: true,
  country: true,
  currencyCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const serializeBeneficiary = (beneficiary) => {
  if (!beneficiary) {
    return null;
  }

  return {
    id: beneficiary.id,
    userId: beneficiary.userId,
    name: beneficiary.name,
    accountName: beneficiary.accountName,
    accountNumber: beneficiary.accountNumber,
    bankName: beneficiary.bankName,
    bankCode: beneficiary.bankCode,
    country: beneficiary.country,
    currencyCode: beneficiary.currencyCode,
    isActive: beneficiary.isActive,
    createdAt: beneficiary.createdAt,
    updatedAt: beneficiary.updatedAt,
  };
};

const ensureUserId = (userId) => {
  if (!userId) {
    const error = new Error(
      "Authenticated user is required",
    );

    error.statusCode = 401;
    throw error;
  }

  return userId;
};

const normalizeOptionalString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
};

const findOwnedBeneficiary = async (
  userId,
  beneficiaryId,
  tx = prisma,
) => {
  return tx.beneficiary.findFirst({
    where: {
      id: beneficiaryId,
      userId,
    },
    select: beneficiarySelect,
  });
};

const throwBeneficiaryNotFound = () => {
  const error = new Error(
    "Beneficiary not found",
  );

  error.statusCode = 404;
  throw error;
};

const checkDuplicateBeneficiary = async ({
  userId,
  accountNumber,
  bankName,
  currencyCode,
  excludeId = null,
  tx = prisma,
}) => {
  if (!accountNumber) {
    return null;
  }

  const where = {
    userId,
    accountNumber,
    isActive: true,
  };

  if (bankName) {
    where.bankName = bankName;
  }

  if (currencyCode) {
    where.currencyCode = currencyCode;
  }

  if (excludeId) {
    where.NOT = {
      id: excludeId,
    };
  }

  return tx.beneficiary.findFirst({
    where,
    select: {
      id: true,
      name: true,
      accountNumber: true,
      bankName: true,
      currencyCode: true,
    },
  });
};

export const createBeneficiary = async ({
  userId,
  name,
  accountName,
  accountNumber,
  bankName,
  bankCode,
  country,
  currencyCode,
}) => {
  const authenticatedUserId =
    ensureUserId(userId);

  const normalizedName =
    validateBeneficiaryName(name);

  const normalizedAccountNumber =
    validateBeneficiaryAccountNumber(
      accountNumber,
    );

  const normalizedBankName =
    bankName
      ? validateBankName(bankName)
      : null;

  const normalizedCountry =
    country
      ? validateCountry(country)
      : null;

  const normalizedCurrencyCode =
    currencyCode
      ? validateCurrency(currencyCode)
      : null;

  const normalizedAccountName =
    normalizeOptionalString(accountName);

  const normalizedBankCode =
    normalizeOptionalString(
      bankCode,
    )
      ? normalizeBankCode(bankCode)
      : null;

  const duplicate =
    await checkDuplicateBeneficiary({
      userId: authenticatedUserId,
      accountNumber:
        normalizedAccountNumber,
      bankName: normalizedBankName,
      currencyCode:
        normalizedCurrencyCode,
    });

  if (duplicate) {
    const error = new Error(
      "An active beneficiary with the same account details already exists",
    );

    error.statusCode = 409;
    throw error;
  }

  const beneficiary =
    await prisma.beneficiary.create({
      data: {
        userId: authenticatedUserId,
        name: normalizedName,
        accountName:
          normalizedAccountName,
        accountNumber:
          normalizedAccountNumber,
        bankName: normalizedBankName,
        bankCode: normalizedBankCode,
        country: normalizedCountry,
        currencyCode:
          normalizedCurrencyCode,
        isActive: true,
      },
      select: beneficiarySelect,
    });

  return serializeBeneficiary(
    beneficiary,
  );
};

export const getUserBeneficiaries = async ({
  userId,
  includeInactive = false,
}) => {
  const authenticatedUserId =
    ensureUserId(userId);

  const beneficiaries =
    await prisma.beneficiary.findMany({
      where: {
        userId: authenticatedUserId,
        ...(includeInactive
          ? {}
          : {
              isActive: true,
            }),
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: beneficiarySelect,
    });

  return beneficiaries.map(
    serializeBeneficiary,
  );
};

export const getUserBeneficiary = async ({
  userId,
  beneficiaryId,
}) => {
  const authenticatedUserId =
    ensureUserId(userId);

  if (!beneficiaryId) {
    const error = new Error(
      "Beneficiary ID is required",
    );

    error.statusCode = 400;
    throw error;
  }

  const beneficiary =
    await findOwnedBeneficiary(
      authenticatedUserId,
      beneficiaryId,
    );

  if (!beneficiary) {
    throwBeneficiaryNotFound();
  }

  return serializeBeneficiary(
    beneficiary,
  );
};

export const updateBeneficiary = async ({
  userId,
  beneficiaryId,
  name,
  accountName,
  accountNumber,
  bankName,
  bankCode,
  country,
  currencyCode,
}) => {
  const authenticatedUserId =
    ensureUserId(userId);

  if (!beneficiaryId) {
    const error = new Error(
      "Beneficiary ID is required",
    );

    error.statusCode = 400;
    throw error;
  }

  const existing =
    await findOwnedBeneficiary(
      authenticatedUserId,
      beneficiaryId,
    );

  if (!existing) {
    throwBeneficiaryNotFound();
  }

  const data = {};

  if (name !== undefined) {
    data.name =
      validateBeneficiaryName(name);
  }

  if (accountName !== undefined) {
    data.accountName =
      normalizeOptionalString(
        accountName,
      );
  }

  if (accountNumber !== undefined) {
    data.accountNumber =
      validateBeneficiaryAccountNumber(
        accountNumber,
      );
  }

  if (bankName !== undefined) {
    data.bankName = bankName
      ? validateBankName(bankName)
      : null;
  }

  if (bankCode !== undefined) {
    data.bankCode =
      normalizeOptionalString(
        bankCode,
      )
        ? normalizeBankCode(bankCode)
        : null;
  }

  if (country !== undefined) {
    data.country = country
      ? validateCountry(country)
      : null;
  }

  if (currencyCode !== undefined) {
    data.currencyCode =
      currencyCode
        ? validateCurrency(currencyCode)
        : null;
  }

  const finalAccountNumber =
    data.accountNumber ??
    existing.accountNumber;

  const finalBankName =
    data.bankName ??
    existing.bankName;

  const finalCurrencyCode =
    data.currencyCode ??
    existing.currencyCode;

  const duplicate =
    await checkDuplicateBeneficiary({
      userId: authenticatedUserId,
      accountNumber:
        finalAccountNumber,
      bankName: finalBankName,
      currencyCode:
        finalCurrencyCode,
      excludeId: beneficiaryId,
    });

  if (duplicate) {
    const error = new Error(
      "Another active beneficiary with the same account details already exists",
    );

    error.statusCode = 409;
    throw error;
  }

  const beneficiary =
    await prisma.beneficiary.update({
      where: {
        id: beneficiaryId,
      },
      data,
      select: beneficiarySelect,
    });

  return serializeBeneficiary(
    beneficiary,
  );
};

export const deactivateBeneficiary =
  async ({
    userId,
    beneficiaryId,
  }) => {
    const authenticatedUserId =
      ensureUserId(userId);

    if (!beneficiaryId) {
      const error = new Error(
        "Beneficiary ID is required",
      );

      error.statusCode = 400;
      throw error;
    }

    const existing =
      await findOwnedBeneficiary(
        authenticatedUserId,
        beneficiaryId,
      );

    if (!existing) {
      throwBeneficiaryNotFound();
    }

    const beneficiary =
      await prisma.beneficiary.update({
        where: {
          id: beneficiaryId,
        },
        data: {
          isActive: false,
        },
        select: beneficiarySelect,
      });

    return serializeBeneficiary(
      beneficiary,
    );
  };

export const activateBeneficiary =
  async ({
    userId,
    beneficiaryId,
  }) => {
    const authenticatedUserId =
      ensureUserId(userId);

    if (!beneficiaryId) {
      const error = new Error(
        "Beneficiary ID is required",
      );

      error.statusCode = 400;
      throw error;
    }

    const existing =
      await findOwnedBeneficiary(
        authenticatedUserId,
        beneficiaryId,
      );

    if (!existing) {
      throwBeneficiaryNotFound();
    }

    if (existing.isActive) {
      return serializeBeneficiary(
        existing,
      );
    }

    const duplicate =
      await checkDuplicateBeneficiary({
        userId: authenticatedUserId,
        accountNumber:
          existing.accountNumber,
        bankName: existing.bankName,
        currencyCode:
          existing.currencyCode,
        excludeId: beneficiaryId,
      });

    if (duplicate) {
      const error = new Error(
        "An active beneficiary with the same account details already exists",
      );

      error.statusCode = 409;
      throw error;
    }

    const beneficiary =
      await prisma.beneficiary.update({
        where: {
          id: beneficiaryId,
        },
        data: {
          isActive: true,
        },
        select: beneficiarySelect,
      });

    return serializeBeneficiary(
      beneficiary,
    );
  };

export const deleteBeneficiary =
  async ({
    userId,
    beneficiaryId,
  }) => {
    return deactivateBeneficiary({
      userId,
      beneficiaryId,
    });
  };

export const findBeneficiaryForTransfer =
  async ({
    userId,
    beneficiaryId,
  }) => {
    const authenticatedUserId =
      ensureUserId(userId);

    if (!beneficiaryId) {
      const error = new Error(
        "Beneficiary ID is required",
      );

      error.statusCode = 400;
      throw error;
    }

    const beneficiary =
      await prisma.beneficiary.findFirst({
        where: {
          id: beneficiaryId,
          userId: authenticatedUserId,
          isActive: true,
        },
        select: beneficiarySelect,
      });

    if (!beneficiary) {
      const error = new Error(
        "Active beneficiary not found",
      );

      error.statusCode = 404;
      throw error;
    }

    return serializeBeneficiary(
      beneficiary,
    );
  };
