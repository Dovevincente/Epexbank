import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

/*
 * =========================================================
 * API CLIENT
 * =========================================================
 *
 * Authentication uses HTTP-only cookies:
 *
 * epex_access
 * epex_refresh
 *
 * Every authenticated request therefore needs credentials.
 */

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
 *
 * FormData requests must NOT use the global
 * application/json content type.
 *
 * The browser/Axios must generate:
 *
 * multipart/form-data; boundary=...
 *
 * automatically.
 */

api.interceptors.request.use(
  (config) => {
    if (
      typeof FormData !== "undefined" &&
      config?.data instanceof FormData
    ) {
      /*
       * Remove any manually configured JSON
       * Content-Type header.
       *
       * The browser will generate the correct
       * multipart/form-data boundary.
       */

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
 * REFRESH STATE
 * =========================================================
 *
 * Only one refresh request is allowed at a time.
 */

let refreshPromise = null;

/*
 * =========================================================
 * AUTH ENDPOINTS
 * =========================================================
 *
 * These endpoints must never trigger automatic refresh.
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

/*
 * =========================================================
 * AUTH ENDPOINT CHECK
 * =========================================================
 */

const isAuthEndpoint = (url = "") => {
  const normalizedUrl = String(url).toLowerCase();

  return AUTH_ENDPOINTS.some((endpoint) =>
    normalizedUrl.includes(endpoint),
  );
};

/*
 * =========================================================
 * REFRESH ACCESS TOKEN
 * =========================================================
 *
 * The refresh token is stored in an HTTP-only cookie.
 * JavaScript never needs to read the refresh token.
 */

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          timeout: 15000,
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
 * RESPONSE INTERCEPTOR
 * =========================================================
 */

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    /*
     * Network/server error.
     */
    if (!error?.response) {
      return Promise.reject(error);
    }

    /*
     * Only 401 responses can trigger
     * authentication refresh.
     */
    if (status !== 401) {
      return Promise.reject(error);
    }

    /*
     * AuthContext may explicitly disable
     * automatic refresh.
     */
    if (
      originalRequest?.skipAuthRefresh === true
    ) {
      return Promise.reject(error);
    }

    /*
     * Never refresh authentication endpoints.
     *
     * This prevents:
     *
     * /auth/refresh
     *      ↓
     * 401
     *      ↓
     * /auth/refresh
     *      ↓
     * 401
     *      ↓
     * infinite loop
     */
    if (
      isAuthEndpoint(
        originalRequest?.url,
      )
    ) {
      return Promise.reject(error);
    }

    /*
     * Never retry the same request more than once.
     */
    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Refresh the authentication session.
       */
      await refreshAccessToken();

      /*
       * Retry the original protected request.
       *
       * The browser automatically sends the
       * refreshed HTTP-only cookie.
       */
      return api(originalRequest);
    } catch (refreshError) {
      /*
       * Refresh failed.
       *
       * Do not retry again.
       */
      return Promise.reject(refreshError);
    }
  },
);

export default api;