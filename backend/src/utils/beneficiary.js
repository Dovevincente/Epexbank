const cleanString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

export const normalizeBeneficiaryName = (value) => {
  return cleanString(value)
    .replace(/\s+/g, " ")
    .trim();
};

export const normalizeAccountNumber = (value) => {
  return cleanString(value)
    .replace(/\s+/g, "")
    .toUpperCase();
};

export const normalizeBankName = (value) => {
  return cleanString(value)
    .replace(/\s+/g, " ")
    .trim();
};

export const normalizeBankCode = (value) => {
  return cleanString(value)
    .replace(/\s+/g, "")
    .toUpperCase();
};

export const normalizeCountry = (value) => {
  return cleanString(value)
    .replace(/\s+/g, " ")
    .trim();
};

export const normalizeCurrency = (value) => {
  return cleanString(value).toUpperCase();
};

export const normalizeIban = (value) => {
  return cleanString(value)
    .replace(/\s+/g, "")
    .toUpperCase();
};

export const normalizeSwiftBic = (value) => {
  return cleanString(value)
    .replace(/\s+/g, "")
    .toUpperCase();
};

export const normalizePhone = (value) => {
  return cleanString(value)
    .replace(/[^\d+]/g, "");
};

export const normalizeEmail = (value) => {
  return cleanString(value).toLowerCase();
};

export const validateBeneficiaryName = (value) => {
  const name = normalizeBeneficiaryName(value);

  if (!name) {
    const error = new Error(
      "Beneficiary name is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (name.length < 2) {
    const error = new Error(
      "Beneficiary name must contain at least 2 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  if (name.length > 120) {
    const error = new Error(
      "Beneficiary name cannot exceed 120 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  return name;
};

export const validateBeneficiaryAccountNumber = (
  value,
) => {
  const accountNumber =
    normalizeAccountNumber(value);

  if (!accountNumber) {
    const error = new Error(
      "Beneficiary account number is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    accountNumber.length < 4 ||
    accountNumber.length > 50
  ) {
    const error = new Error(
      "Beneficiary account number must contain between 4 and 50 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  return accountNumber;
};

export const validateBankName = (value) => {
  const bankName = normalizeBankName(value);

  if (!bankName) {
    const error = new Error(
      "Bank name is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (bankName.length < 2) {
    const error = new Error(
      "Bank name must contain at least 2 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  if (bankName.length > 150) {
    const error = new Error(
      "Bank name cannot exceed 150 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  return bankName;
};

export const validateCountry = (value) => {
  const country = normalizeCountry(value);

  if (!country) {
    const error = new Error(
      "Country is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (country.length < 2) {
    const error = new Error(
      "Country must contain at least 2 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  if (country.length > 100) {
    const error = new Error(
      "Country cannot exceed 100 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  return country;
};

export const validateCurrency = (value) => {
  const currency = normalizeCurrency(value);

  if (!currency) {
    const error = new Error(
      "Currency is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    const error = new Error(
      "Currency must be a valid 3-letter currency code",
    );

    error.statusCode = 400;
    throw error;
  }

  return currency;
};

export const validateIban = (value) => {
  const iban = normalizeIban(value);

  if (!iban) {
    const error = new Error(
      "IBAN is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    iban.length < 15 ||
    iban.length > 34
  ) {
    const error = new Error(
      "IBAN must contain between 15 and 34 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    !/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(
      iban,
    )
  ) {
    const error = new Error(
      "Invalid IBAN format",
    );

    error.statusCode = 400;
    throw error;
  }

  return iban;
};

export const validateSwiftBic = (value) => {
  const swiftBic =
    normalizeSwiftBic(value);

  if (!swiftBic) {
    const error = new Error(
      "SWIFT/BIC code is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(
      swiftBic,
    )
  ) {
    const error = new Error(
      "Invalid SWIFT/BIC code",
    );

    error.statusCode = 400;
    throw error;
  }

  return swiftBic;
};

export const validateBeneficiaryInput = ({
  name,
  accountNumber,
  bankName,
  country,
  currency,
  iban,
  swiftBic,
  bankCode,
  phone,
  email,
}) => {
  const normalized = {
    name: validateBeneficiaryName(name),
    accountNumber:
      validateBeneficiaryAccountNumber(
        accountNumber,
      ),
    bankName: validateBankName(bankName),
    country: validateCountry(country),
    currency: validateCurrency(currency),
  };

  if (iban !== undefined && iban !== null && iban !== "") {
    normalized.iban = validateIban(iban);
  }

  if (
    swiftBic !== undefined &&
    swiftBic !== null &&
    swiftBic !== ""
  ) {
    normalized.swiftBic =
      validateSwiftBic(swiftBic);
  }

  if (
    bankCode !== undefined &&
    bankCode !== null &&
    bankCode !== ""
  ) {
    normalized.bankCode =
      normalizeBankCode(bankCode);
  }

  if (
    phone !== undefined &&
    phone !== null &&
    phone !== ""
  ) {
    normalized.phone = normalizePhone(phone);
  }

  if (
    email !== undefined &&
    email !== null &&
    email !== ""
  ) {
    const normalizedEmail =
      normalizeEmail(email);

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      const error = new Error(
        "Invalid beneficiary email address",
      );

      error.statusCode = 400;
      throw error;
    }

    normalized.email = normalizedEmail;
  }

  return normalized;
};
