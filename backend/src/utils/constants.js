export const AUTH = {
  ACCESS_TOKEN_COOKIE: "epex_access",
  REFRESH_TOKEN_COOKIE: "epex_refresh",

  REFRESH_TOKEN_DAYS: 30,

  MAX_LOGIN_ATTEMPTS: 5,

  PASSWORD_MIN_LENGTH: 10,
};

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export const ACCOUNT = {
  DEFAULT_CURRENCY: "USD",
  DEFAULT_ACCOUNT_TYPE: "CURRENT",
};

export const TRANSACTION = {
  MAX_AMOUNT: 1000000000,
};