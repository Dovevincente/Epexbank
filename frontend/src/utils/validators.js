
/**
 * Epex Bank frontend validation utilities.
 *
 * These validators provide client-side validation for user experience.
 *
 * Important:
 * Client-side validation is NOT a security boundary.
 * The backend must independently validate every request.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const OTP_LENGTH = 6;
export const ACCOUNT_NUMBER_MIN_LENGTH = 6;
export const ACCOUNT_NUMBER_MAX_LENGTH = 34;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const PHONE_PATTERN =
  /^\+?[0-9][0-9\s().-]{6,24}$/;

const NAME_PATTERN =
  /^[\p{L}\p{M}][\p{L}\p{M}' -]{1,99}$/u;

const ACCOUNT_NUMBER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9 .-]*$/;

const OTP_PATTERN = /^\d{6}$/;

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

const ROUTING_NUMBER_PATTERN = /^\d{6,20}$/;

const IBAN_PATTERN =
  /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;

const SWIFT_PATTERN =
  /^[A-Z]{6}[A-Z0-9]{2,5}$/;

const normalizeString = (value) =>
  String(value ?? "").trim();

export const isRequired = (value) =>
  normalizeString(value).length > 0;

export const isValidEmail = (email) =>
  EMAIL_PATTERN.test(normalizeString(email));

export const isValidPhone = (phone) =>
  PHONE_PATTERN.test(normalizeString(phone));

export const isValidName = (name) => {
  const value = normalizeString(name);

  if (value.length < 2 || value.length > 100) {
    return false;
  }

  return NAME_PATTERN.test(value);
};

export const isValidPassword = (password) => {
  if (typeof password !== "string") {
    return false;
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return (
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial
  );
};

export const getPasswordRequirements = (password = "") => {
  const value = String(password);

  return {
    minLength:
      value.length >= PASSWORD_MIN_LENGTH,
    maxLength:
      value.length <= PASSWORD_MAX_LENGTH,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };
};

export const getPasswordStrength = (password = "") => {
  const requirements =
    getPasswordRequirements(password);

  const passed = Object.values(requirements).filter(
    Boolean,
  ).length;

  if (!password) return "EMPTY";
  if (passed <= 2) return "WEAK";
  if (passed <= 4) return "FAIR";
  if (passed === 5) return "GOOD";

  return "STRONG";
};

export const passwordsMatch = (
  password,
  confirmation,
) => password === confirmation;

export const isValidAmount = (
  amount,
  options = {},
) => {
  const {
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    allowZero = false,
    decimals = 2,
  } = options;

  const value =
    typeof amount === "number"
      ? amount
      : Number(String(amount).trim());

  if (!Number.isFinite(value)) {
    return false;
  }

  if (!allowZero && value <= 0) {
    return false;
  }

  if (allowZero && value < 0) {
    return false;
  }

  if (value < min || value > max) {
    return false;
  }

  const decimalPart = String(value).split(".")[1];

  if (
    decimalPart &&
    decimalPart.length > decimals
  ) {
    return false;
  }

  return true;
};

export const isValidCurrency = (currency) =>
  CURRENCY_PATTERN.test(
    normalizeString(currency).toUpperCase(),
  );

export const isValidAccountNumber = (
  accountNumber,
) => {
  const value = normalizeString(accountNumber);

  if (
    value.length < ACCOUNT_NUMBER_MIN_LENGTH ||
    value.length > ACCOUNT_NUMBER_MAX_LENGTH
  ) {
    return false;
  }

  return ACCOUNT_NUMBER_PATTERN.test(value);
};

export const isValidRoutingNumber = (
  routingNumber,
) =>
  ROUTING_NUMBER_PATTERN.test(
    normalizeString(routingNumber),
  );

export const isValidIBAN = (iban) => {
  const value = normalizeString(iban)
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!IBAN_PATTERN.test(value)) {
    return false;
  }

  /*
   * ISO 13616 IBAN checksum validation.
   */
  const rearranged =
    `${value.slice(4)}${value.slice(0, 4)}`;

  let remainder = 0;

  for (const character of rearranged) {
    const numericValue =
      character >= "A" && character <= "Z"
        ? character.charCodeAt(0) - 55
        : Number(character);

    const digits = String(numericValue);

    for (const digit of digits) {
      remainder =
        (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
};

export const isValidSwiftBic = (swift) =>
  SWIFT_PATTERN.test(
    normalizeString(swift).toUpperCase(),
  );

export const isValidOtp = (otp) =>
  OTP_PATTERN.test(
    normalizeString(otp),
  );

export const isValidPin = (
  pin,
  length = 4,
) => {
  const value = normalizeString(pin);

  const pattern = new RegExp(
    `^\\d{${length}}$`,
  );

  return pattern.test(value);
};

export const isValidDescription = (
  description,
  options = {},
) => {
  const {
    required = false,
    minLength = 0,
    maxLength = 500,
  } = options;

  const value = normalizeString(description);

  if (required && !value) {
    return false;
  }

  if (!required && !value) {
    return true;
  }

  return (
    value.length >= minLength &&
    value.length <= maxLength
  );
};

export const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

export const isAdultDateOfBirth = (
  dateOfBirth,
  minimumAge = 18,
) => {
  if (!isValidDate(dateOfBirth)) {
    return false;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= minimumAge;
};

export const isValidUrl = (value) => {
  try {
    const url = new URL(
      normalizeString(value),
    );

    return ["http:", "https:"].includes(
      url.protocol,
    );
  } catch {
    return false;
  }
};

export const validateEmail = (email) => {
  if (!isRequired(email)) {
    return "Email address is required.";
  }

  if (!isValidEmail(email)) {
    return "Enter a valid email address.";
  }

  return "";
};

export const validatePhone = (phone) => {
  if (!isRequired(phone)) {
    return "Phone number is required.";
  }

  if (!isValidPhone(phone)) {
    return "Enter a valid phone number.";
  }

  return "";
};

export const validateName = (
  name,
  fieldName = "Name",
) => {
  if (!isRequired(name)) {
    return `${fieldName} is required.`;
  }

  if (!isValidName(name)) {
    return `${fieldName} must contain 2 to 100 valid characters.`;
  }

  return "";
};

export const validatePassword = (
  password,
) => {
  if (!password) {
    return "Password is required.";
  }

  if (
    password.length < PASSWORD_MIN_LENGTH
  ) {
    return `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain an uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain a lowercase letter.";
  }

  if (!/\d/.test(password)) {
    return "Password must contain a number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain a special character.";
  }

  return "";
};

export const validatePasswordConfirmation = (
  password,
  confirmation,
) => {
  if (!confirmation) {
    return "Please confirm your password.";
  }

  if (password !== confirmation) {
    return "Passwords do not match.";
  }

  return "";
};

export const validateAmount = (
  amount,
  options = {},
) => {
  const {
    fieldName = "Amount",
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    availableBalance = null,
    allowZero = false,
    decimals = 2,
  } = options;

  if (
    amount === "" ||
    amount === null ||
    amount === undefined
  ) {
    return `${fieldName} is required.`;
  }

  if (
    !isValidAmount(amount, {
      min,
      max,
      allowZero,
      decimals,
    })
  ) {
    if (Number(amount) > max) {
      return `${fieldName} cannot exceed the allowed maximum.`;
    }

    if (Number(amount) < min) {
      return `${fieldName} is below the minimum allowed amount.`;
    }

    return `Enter a valid ${fieldName.toLowerCase()}.`;
  }

  if (
    availableBalance !== null &&
    Number(amount) > Number(availableBalance)
  ) {
    return `${fieldName} cannot exceed the available balance.`;
  }

  return "";
};

export const validateAccountNumber = (
  accountNumber,
) => {
  if (!isRequired(accountNumber)) {
    return "Account number is required.";
  }

  if (!isValidAccountNumber(accountNumber)) {
    return "Enter a valid account number.";
  }

  return "";
};

export const validateOtp = (otp) => {
  if (!isRequired(otp)) {
    return "Verification code is required.";
  }

  if (!isValidOtp(otp)) {
    return "Verification code must contain exactly 6 digits.";
  }

  return "";
};

export const validateDescription = (
  description,
  options = {},
) => {
  const {
    fieldName = "Description",
    required = false,
    minLength = 0,
    maxLength = 500,
  } = options;

  if (
    !isValidDescription(description, {
      required,
      minLength,
      maxLength,
    })
  ) {
    if (
      required &&
      !normalizeString(description)
    ) {
      return `${fieldName} is required.`;
    }

    if (
      normalizeString(description).length >
      maxLength
    ) {
      return `${fieldName} cannot exceed ${maxLength} characters.`;
    }

    return `${fieldName} is not valid.`;
  }

  return "";
};

export const validateCurrency = (
  currency,
) => {
  if (!isRequired(currency)) {
    return "Currency is required.";
  }

  if (!isValidCurrency(currency)) {
    return "Enter a valid 3-letter currency code.";
  }

  return "";
};

export const validateIBAN = (iban) => {
  if (!isRequired(iban)) {
    return "IBAN is required.";
  }

  if (!isValidIBAN(iban)) {
    return "Enter a valid IBAN.";
  }

  return "";
};

export const validateSwiftBic = (swift) => {
  if (!isRequired(swift)) {
    return "SWIFT/BIC code is required.";
  }

  if (!isValidSwiftBic(swift)) {
    return "Enter a valid SWIFT/BIC code.";
  }

  return "";
};

export const validateRequiredFields = (
  values,
  fields,
) => {
  const errors = {};

  for (const field of fields) {
    const value = values?.[field];

    if (!isRequired(value)) {
      errors[field] = `${formatFieldName(field)} is required.`;
    }
  }

  return errors;
};

export const formatFieldName = (fieldName) =>
  String(fieldName ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );

export const firstValidationError = (
  errors,
) => {
  if (!errors || typeof errors !== "object") {
    return "";
  }

  const firstError = Object.values(errors).find(
    (value) =>
      typeof value === "string" &&
      value.trim(),
  );

  return firstError || "";
};

export const hasValidationErrors = (
  errors,
) => Boolean(firstValidationError(errors));

export default {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  OTP_LENGTH,
  ACCOUNT_NUMBER_MIN_LENGTH,
  ACCOUNT_NUMBER_MAX_LENGTH,

  isRequired,
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidPassword,
  getPasswordRequirements,
  getPasswordStrength,
  passwordsMatch,
  isValidAmount,
  isValidCurrency,
  isValidAccountNumber,
  isValidRoutingNumber,
  isValidIBAN,
  isValidSwiftBic,
  isValidOtp,
  isValidPin,
  isValidDescription,
  isValidDate,
  isAdultDateOfBirth,
  isValidUrl,

  validateEmail,
  validatePhone,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
  validateAmount,
  validateAccountNumber,
  validateOtp,
  validateDescription,
  validateCurrency,
  validateIBAN,
  validateSwiftBic,
  validateRequiredFields,

  formatFieldName,
  firstValidationError,
  hasValidationErrors,
};