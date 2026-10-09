import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
} from "../services/authService.js";

import {
  AUTH,
  COOKIE_OPTIONS,
} from "../utils/constants.js";

const setAuthCookies = (
  res,
  accessToken,
  refreshToken,
) => {
  res.cookie(
    AUTH.ACCESS_TOKEN_COOKIE,
    accessToken,
    {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    },
  );

  res.cookie(
    AUTH.REFRESH_TOKEN_COOKIE,
    refreshToken,
    {
      ...COOKIE_OPTIONS,
      maxAge:
        AUTH.REFRESH_TOKEN_DAYS *
        24 *
        60 *
        60 *
        1000,
    },
  );
};

const clearAuthCookies = (res) => {
  res.clearCookie(
    AUTH.ACCESS_TOKEN_COOKIE,
    COOKIE_OPTIONS,
  );

  res.clearCookie(
    AUTH.REFRESH_TOKEN_COOKIE,
    COOKIE_OPTIONS,
  );
};

export const register = async (
  req,
  res,
  next,
) => {
  try {
    const {
      email,
      phone,
      password,
      firstName,
      lastName,
      country,
    } = req.validated.body;

    const result =
      await registerUser({
        email,
        phone,
        password,
        firstName,
        lastName,
        country,
        ipAddress: req.ip,
        userAgent:
          req.get("user-agent"),
      });

    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
    );

    return res.status(201).json({
      success: true,
      message:
        "Epex Bank account created successfully",
      data: {
        user: result.user,
        account: result.account,
        wallet: result.wallet,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req,
  res,
  next,
) => {
  try {
    const {
      email,
      password,
    } = req.validated.body;

    const result =
      await loginUser({
        email,
        password,
        ipAddress: req.ip,
        userAgent:
          req.get("user-agent"),
      });

    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req,
  res,
  next,
) => {
  try {
    const refreshToken =
      req.cookies[
        AUTH.REFRESH_TOKEN_COOKIE
      ];

    const result =
      await refreshAccessToken(
        refreshToken,
      );

    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
    );

    return res.status(200).json({
      success: true,
      message:
        "Authentication refreshed",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    clearAuthCookies(res);

    return res.status(401).json({
      success: false,
      message:
        "Authentication session expired",
    });
  }
};

export const logout = async (
  req,
  res,
  next,
) => {
  try {
    const refreshToken =
      req.cookies[
        AUTH.REFRESH_TOKEN_COOKIE
      ];

    await logoutUser(
      refreshToken,
    );

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};