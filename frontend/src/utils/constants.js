export const APP_CONFIG = {
  name: "Epex Bank",
  shortName: "Epex",
  currency: "USD",
  currencyLocale: "en-US",
  supportEmail: "support@epexbank.com",
};

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_EMAIL: "/verify-email",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  TWO_FACTOR: "/two-factor",

  DASHBOARD: "/dashboard",
  ACCOUNTS: "/accounts",
  WALLET: "/wallet",
  TRANSFERS: "/transfers",
  PAYMENTS: "/payments",
  CARDS: "/cards",
  LOANS: "/loans",
  SAVINGS: "/savings",
  INVESTMENTS: "/investments",
  SHARES: "/shares",
  TRANSACTIONS: "/transactions",
  KYC: "/kyc",
  SUPPORT: "/support",
  SETTINGS: "/settings",

  ADMIN: "/admin",
};

export const TRANSACTION_TYPES = {
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  TRANSFER: "TRANSFER",
  PAYMENT: "PAYMENT",
  FEE: "FEE",
  REFUND: "REFUND",
  LOAN_DISBURSEMENT: "LOAN_DISBURSEMENT",
  LOAN_REPAYMENT: "LOAN_REPAYMENT",
  SAVINGS_DEPOSIT: "SAVINGS_DEPOSIT",
  SAVINGS_WITHDRAWAL: "SAVINGS_WITHDRAWAL",
  INVESTMENT_BUY: "INVESTMENT_BUY",
  INVESTMENT_SELL: "INVESTMENT_SELL",
  DIVIDEND: "DIVIDEND",
  INTEREST: "INTEREST",
  ADJUSTMENT: "ADJUSTMENT",
};

export const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REVERSED: "REVERSED",
  CANCELLED: "CANCELLED",
};

export const ACCOUNT_TYPES = {
  CURRENT: "CURRENT",
  SAVINGS: "SAVINGS",
  BUSINESS: "BUSINESS",
  INVESTMENT: "INVESTMENT",
};

export const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  FROZEN: "FROZEN",
  SUSPENDED: "SUSPENDED",
  CLOSED: "CLOSED",
};

export const USER_ROLES = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  SUPPORT: "SUPPORT",
  LOAN_OFFICER: "LOAN_OFFICER",
  INVESTMENT_MANAGER: "INVESTMENT_MANAGER",
  COMPLIANCE_OFFICER: "COMPLIANCE_OFFICER",
};

export const KYC_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const STORAGE_KEYS = {
  THEME: "epex_theme",
  SIDEBAR_COLLAPSED: "epex_sidebar_collapsed",
};

export const QUERY_KEYS = {
  CURRENT_USER: "current-user",
  ACCOUNTS: "accounts",
  TRANSACTIONS: "transactions",
  TRANSFERS: "transfers",
  WALLET: "wallet",
  NOTIFICATIONS: "notifications",
};