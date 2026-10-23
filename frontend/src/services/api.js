
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/*
 * =========================================================
 * REQUEST INTERCEPTOR
 * =========================================================
 */

api.interceptors.request.use(
  (config) => {
    // Let the browser set the correct multipart boundary.
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/*
 * =========================================================
 * SHARED REFRESH REQUEST
 * =========================================================
 *
 * All refresh attempts in this module share one promise.
 * This prevents concurrent refresh requests from rotating
 * the same refresh cookie independently.
 *
 * Refresh tokens remain in HTTP-only cookies.
 */

let refreshPromise = null;

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL.replace(/\/+$/, "")}/auth/refresh`,
        {},
        {
          withCredentials: true,
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      )
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

/*
 * =========================================================
 * AUTH ENDPOINT DETECTION
 * =========================================================
 */

const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

const isAuthEndpoint = (url = "") => {
  const normalizedUrl = String(url).toLowerCase().split("?")[0];

  return AUTH_ENDPOINTS.some((endpoint) =>
    normalizedUrl.endsWith(endpoint),
  );
};

/*
 * =========================================================
 * RESPONSE INTERCEPTOR
 * =========================================================
 *
 * If a protected request receives 401:
 *
 * 1. Do not refresh login/register/refresh/logout requests.
 * 2. Do not refresh requests explicitly marked to skip it.
 * 3. Retry the original request at most once.
 * 4. Share the refresh promise with other failed requests.
 *
 * A failed refresh is returned to the caller. This module
 * does not automatically redirect or clear application state.
 */

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    // Network failures and timeouts are not authentication errors.
    if (!error?.response) {
      return Promise.reject(error);
    }

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest.skipAuthRefresh === true) {
      return Promise.reject(error);
    }

    if (isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Prevent an infinite retry loop.
    if (originalRequest._retry === true) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshAccessToken();

      // Retry the original request with the newly set cookie.
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export default api;