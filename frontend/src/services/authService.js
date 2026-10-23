
import api, { refreshAccessToken } from "./api.js";

/*
 * =========================================================
 * REGISTER
 * =========================================================
 */

export const register = async (data) => {
  const response = await api.post("/auth/register", data);

  return response.data;
};

/*
 * =========================================================
 * LOGIN
 * =========================================================
 */

export const login = async (email, password) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

/*
 * =========================================================
 * REFRESH SESSION
 * =========================================================
 *
 * Uses the shared refresh promise from api.js.
 * The refresh token stays in the HTTP-only cookie.
 */

export const refreshSession = async () => {
  const response = await refreshAccessToken();

  return response.data;
};

/*
 * =========================================================
 * LOGOUT
 * =========================================================
 */

export const logout = async () => {
  const response = await api.post("/auth/logout");

  return response.data;
};

/*
 * =========================================================
 * CURRENT USER
 * =========================================================
 */

export const getCurrentUser = async (options = {}) => {
  const response = await api.get("/users/me", {
    skipAuthRefresh: options.skipAuthRefresh === true,
  });

  return response.data;
};