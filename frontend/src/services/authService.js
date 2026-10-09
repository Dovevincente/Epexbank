import api from "./api.js";

/*
 * =========================================================
 * REGISTER
 * =========================================================
 */

export const register = async (data) => {
  const response = await api.post(
    "/auth/register",
    data,
  );

  return response.data;
};

/*
 * =========================================================
 * LOGIN
 * =========================================================
 */

export const login = async (
  email,
  password,
) => {
  const response = await api.post(
    "/auth/login",
    {
      email,
      password,
    },
  );

  return response.data;
};

/*
 * =========================================================
 * REFRESH SESSION
 * =========================================================
 *
 * The refresh token is stored in the HTTP-only
 * epex_refresh cookie.
 *
 * JavaScript does not read or store the token.
 * Axios sends the cookie automatically because
 * withCredentials is enabled in api.js.
 */

export const refreshSession = async () => {
  const response = await api.post(
    "/auth/refresh",
    {},
  );

  return response.data;
};

/*
 * =========================================================
 * LOGOUT
 * =========================================================
 */

export const logout = async () => {
  const response = await api.post(
    "/auth/logout",
  );

  return response.data;
};

/*
 * =========================================================
 * CURRENT USER
 * =========================================================
 *
 * During the initial application authentication check,
 * AuthContext passes:
 *
 * {
 *   skipAuthRefresh: true
 * }
 *
 * This prevents the Axios interceptor from attempting
 * its own refresh when /users/me returns 401.
 *
 * AuthContext handles that initial refresh explicitly.
 */

export const getCurrentUser = async (
  options = {},
) => {
  const response = await api.get(
    "/users/me",
    {
      skipAuthRefresh:
        options.skipAuthRefresh === true,
    },
  );

  return response.data;
};