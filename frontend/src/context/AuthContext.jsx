
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  register as registerRequest,
} from "../services/authService.js";

const AuthContext = createContext(null);

/*
 * =========================================================
 * CONFIGURATION
 * =========================================================
 *
 * Client-side inactivity timeout.
 * The backend should also enforce its own session policies.
 */

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "pointerdown",
];

/*
 * =========================================================
 * RESPONSE HELPERS
 * =========================================================
 */

const extractUser = (response) => {
  return response?.data?.user ?? null;
};

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

/*
 * =========================================================
 * AUTH PROVIDER
 * =========================================================
 */

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initializationPromiseRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const idleLogoutStartedRef = useRef(false);
  const mountedRef = useRef(false);

  /*
   * =======================================================
   * LOAD CURRENT USER
   * =======================================================
   */

  const loadUser = useCallback(async (options = {}) => {
    const response = await getCurrentUser(options);
    const currentUser = extractUser(response);

    if (!currentUser?.id) {
      throw new Error(
        "The server did not return a valid authenticated user.",
      );
    }

    if (mountedRef.current) {
      setUser(currentUser);
      setError(null);
    }

    return response;
  }, []);

  /*
   * =======================================================
   * INITIALIZE AUTHENTICATION
   * =======================================================
   *
   * First check the existing access session.
   * If it fails, try refreshing the session once.
   */

  const initializeAuth = useCallback(async () => {
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    const initialization = (async () => {
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        try {
          return await loadUser({
            skipAuthRefresh: true,
          });
        } catch (initialError) {
          /*
           * Attempt a refresh if the current-user request fails.
           * If refresh also fails, preserve a useful diagnostic.
           */
          try {
            await refreshSession();

            return await loadUser({
              skipAuthRefresh: true,
            });
          } catch (refreshError) {
            if (mountedRef.current) {
              setUser(null);

              setError(
                getErrorMessage(
                  refreshError,
                  "Your session could not be restored. Please sign in again.",
                ),
              );
            }

            return null;
          }
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    })();

    initializationPromiseRef.current = initialization;

    try {
      return await initialization;
    } finally {
      if (
        initializationPromiseRef.current === initialization
      ) {
        initializationPromiseRef.current = null;
      }
    }
  }, [loadUser]);

  /*
   * =======================================================
   * INITIAL AUTH CHECK
   * =======================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    initializeAuth().catch((initializationError) => {
      if (mountedRef.current) {
        setUser(null);
        setError(
          getErrorMessage(
            initializationError,
            "Unable to initialize authentication.",
          ),
        );
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [initializeAuth]);

  /*
   * =======================================================
   * LOGOUT
   * =======================================================
   */

  const logout = useCallback(async () => {
    idleLogoutStartedRef.current = true;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    try {
      await logoutRequest();
    } catch (logoutError) {
      /*
       * The local session is cleared even if the API is
       * temporarily unreachable. The server session may
       * remain active until expiry or revocation.
       */
      console.error(
        "EpexBank logout request failed:",
        logoutError?.response?.status ||
          logoutError?.message ||
          "Unknown error",
      );
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setError(null);
        setLoading(false);
      }
    }
  }, []);

  /*
   * =======================================================
   * INACTIVITY LOGOUT
   * =======================================================
   */

  useEffect(() => {
    if (loading || !user?.id) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      return undefined;
    }

    let disposed = false;

    idleLogoutStartedRef.current = false;
    lastActivityRef.current = Date.now();

    const clearIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const scheduleIdleTimer = () => {
      clearIdleTimer();

      if (disposed || idleLogoutStartedRef.current) {
        return;
      }

      const elapsed =
        Date.now() - lastActivityRef.current;

      const remaining = Math.max(
        IDLE_TIMEOUT_MS - elapsed,
        0,
      );

      idleTimerRef.current = setTimeout(
        handleIdleTimeout,
        remaining,
      );
    };

    const handleIdleTimeout = async () => {
      if (disposed || idleLogoutStartedRef.current) {
        return;
      }

      const elapsed =
        Date.now() - lastActivityRef.current;

      if (elapsed < IDLE_TIMEOUT_MS) {
        scheduleIdleTimer();
        return;
      }

      idleLogoutStartedRef.current = true;
      clearIdleTimer();

      try {
        await logout();
      } finally {
        if (!disposed) {
          window.location.replace("/login");
        }
      }
    };

    const handleActivity = () => {
      if (disposed || idleLogoutStartedRef.current) {
        return;
      }

      lastActivityRef.current = Date.now();
      scheduleIdleTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const elapsed =
        Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        handleIdleTimeout();
      } else {
        scheduleIdleTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleActivity,
        { passive: true },
      );
    });

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    scheduleIdleTimer();

    return () => {
      disposed = true;
      clearIdleTimer();

      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleActivity,
        );
      });

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [user?.id, loading, logout]);

  /*
   * =======================================================
   * LOGIN
   * =======================================================
   */

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      setError(null);
      idleLogoutStartedRef.current = false;

      try {
        const response = await loginRequest(
          email,
          password,
        );

        const authenticatedUser =
          extractUser(response);

        if (!authenticatedUser?.id) {
          throw new Error(
            "Login succeeded, but the server did not return a valid user.",
          );
        }

        setUser(authenticatedUser);

        /*
         * Refresh the user profile from the backend.
         * If this request fails, keep the user returned by
         * the successful login response for now.
         */
        try {
          await loadUser();
        } catch (profileError) {
          console.error(
            "Unable to reload user after login:",
            profileError?.response?.status ||
              profileError?.message ||
              "Unknown error",
          );

          setUser(authenticatedUser);
        }

        return response;
      } catch (loginError) {
        const message = getErrorMessage(
          loginError,
          "Unable to sign in. Please verify your details and try again.",
        );

        setUser(null);
        setError(message);

        throw loginError;
      } finally {
        setLoading(false);
      }
    },
    [loadUser],
  );

  /*
   * =======================================================
   * REGISTER
   * =======================================================
   */

  const register = useCallback(
    async (data) => {
      setLoading(true);
      setError(null);
      idleLogoutStartedRef.current = false;

      try {
        const response = await registerRequest(data);

        const registeredUser =
          extractUser(response);

        if (!registeredUser?.id) {
          throw new Error(
            "Registration succeeded, but the server did not return a valid user.",
          );
        }

        setUser(registeredUser);

        try {
          await loadUser();
        } catch (profileError) {
          console.error(
            "Unable to reload user after registration:",
            profileError?.response?.status ||
              profileError?.message ||
              "Unknown error",
          );

          setUser(registeredUser);
        }

        return response;
      } catch (registrationError) {
        const message = getErrorMessage(
          registrationError,
          "Unable to create your account. Please try again.",
        );

        setUser(null);
        setError(message);

        throw registrationError;
      } finally {
        setLoading(false);
      }
    },
    [loadUser],
  );

  /*
   * =======================================================
   * CLEAR ERROR
   * =======================================================
   */

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /*
   * =======================================================
   * AUTHENTICATION STATE
   * =======================================================
   */

  const isAuthenticated = Boolean(user?.id);

  const isAdmin =
    String(user?.role ?? "").toUpperCase() === "ADMIN";

  /*
   * =======================================================
   * CONTEXT VALUE
   * =======================================================
   */

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      login,
      register,
      logout,
      loadUser,
      clearError,
    }),
    [
      user,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      login,
      register,
      logout,
      loadUser,
      clearError,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/*
 * =========================================================
 * AUTHENTICATION HOOK
 * =========================================================
 */

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
};
