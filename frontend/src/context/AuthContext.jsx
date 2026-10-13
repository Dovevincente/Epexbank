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
|--------------------------------------------------------------------------
| Inactivity timeout configuration
|--------------------------------------------------------------------------
|
| Users are automatically logged out after two minutes without activity.
|
*/

const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "pointerdown",
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initializationPromiseRef = useRef(null);

  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const idleLogoutStartedRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD CURRENT USER
  |--------------------------------------------------------------------------
  */

  const loadUser = useCallback(async (options = {}) => {
    const response = await getCurrentUser(options);

    const currentUser = response?.data?.user ?? null;

    setUser(currentUser);

    return response;
  }, []);

  /*
  |--------------------------------------------------------------------------
  | INITIALIZE AUTHENTICATION
  |--------------------------------------------------------------------------
  */

  const initializeAuth = useCallback(async () => {
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    const initialization = (async () => {
      setLoading(true);
      setError(null);

      try {
        /*
         * First try the existing access cookie.
         */

        try {
          return await loadUser({
            skipAuthRefresh: true,
          });
        } catch {
          /*
           * Access token unavailable or expired.
           * Try the refresh session.
           */
        }

        /*
         * Refresh the session and load the user.
         */

        try {
          await refreshSession();

          return await loadUser({
            skipAuthRefresh: true,
          });
        } catch {
          setUser(null);
          return null;
        }
      } finally {
        setLoading(false);
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
  |--------------------------------------------------------------------------
  | INITIAL AUTH CHECK
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    initializeAuth().catch(() => {
      setUser(null);
      setError(null);
      setLoading(false);
    });
  }, [initializeAuth]);

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const logout = useCallback(async () => {
    /*
     * Prevent a pending inactivity timer from firing again.
     */

    idleLogoutStartedRef.current = true;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    try {
      await logoutRequest();
    } catch {
      /*
       * Clear local authentication even if the server
       * cannot be reached.
       */
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | AUTOMATIC LOGOUT AFTER INACTIVITY
  |--------------------------------------------------------------------------
  |
  | The timer starts when an authenticated user is available.
  | Activity resets the timer.
  | After two minutes of inactivity, the user is logged out.
  |
  */

  useEffect(() => {
    /*
     * Do not run the timer while authentication is loading
     * or when there is no authenticated user.
     */

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

    const handleIdleTimeout = async () => {
      if (disposed || idleLogoutStartedRef.current) {
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;

      /*
       * Recheck the elapsed time in case the browser
       * fired the timer earlier than expected.
       */

      if (elapsed < IDLE_TIMEOUT_MS) {
        scheduleIdleTimer();
        return;
      }

      idleLogoutStartedRef.current = true;

      clearIdleTimer();

      try {
        await logout();
      } finally {
        /*
         * Redirect even if the logout API request fails.
         */

        if (!disposed) {
          window.location.replace("/login");
        }
      }
    };

    function scheduleIdleTimer() {
      clearIdleTimer();

      if (disposed || idleLogoutStartedRef.current) {
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(
        IDLE_TIMEOUT_MS - elapsed,
        0,
      );

      idleTimerRef.current = setTimeout(
        handleIdleTimeout,
        remaining,
      );
    }

    const handleActivity = () => {
      if (disposed || idleLogoutStartedRef.current) {
        return;
      }

      lastActivityRef.current = Date.now();

      scheduleIdleTimer();
    };

    /*
     * Listen for user interaction throughout the application.
     */

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleActivity,
        { passive: true },
      );
    });

    /*
     * If the user returns to the tab, check whether
     * the inactivity period has already elapsed.
     */

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastActivityRef.current;

        if (elapsed >= IDLE_TIMEOUT_MS) {
          handleIdleTimeout();
        }
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    /*
     * Start the initial two-minute countdown.
     */

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
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      setError(null);

      try {
        const response = await loginRequest(
          email,
          password,
        );

        const authenticatedUser =
          response?.data?.user ?? null;

        if (!authenticatedUser) {
          throw new Error(
            "Login succeeded, but the authenticated user was not returned.",
          );
        }

        setUser(authenticatedUser);

        /*
         * Retrieve the authoritative user record.
         */

        try {
          await loadUser();
        } catch {
          setUser(authenticatedUser);
        }

        return response;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to sign in. Please verify your details and try again.";

        setUser(null);
        setError(message);

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadUser],
  );

  /*
  |--------------------------------------------------------------------------
  | REGISTER
  |--------------------------------------------------------------------------
  */

  const register = useCallback(
    async (data) => {
      setLoading(true);
      setError(null);

      try {
        const response = await registerRequest(data);

        const registeredUser =
          response?.data?.user ?? null;

        if (!registeredUser) {
          throw new Error(
            "Registration succeeded, but the authenticated user was not returned.",
          );
        }

        setUser(registeredUser);

        try {
          await loadUser();
        } catch {
          setUser(registeredUser);
        }

        return response;
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to create your account. Please try again.";

        setUser(null);
        setError(message);

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadUser],
  );

  /*
  |--------------------------------------------------------------------------
  | CLEAR ERROR
  |--------------------------------------------------------------------------
  */

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | AUTHENTICATION STATE
  |--------------------------------------------------------------------------
  */

  const isAuthenticated = Boolean(user?.id);

  const isAdmin =
    String(user?.role ?? "").toUpperCase() === "ADMIN";

  /*
  |--------------------------------------------------------------------------
  | CONTEXT VALUE
  |--------------------------------------------------------------------------
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
|--------------------------------------------------------------------------
| AUTHENTICATION HOOK
|--------------------------------------------------------------------------
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