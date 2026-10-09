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

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initializationPromiseRef =
    useRef(null);

  /*
   * =========================================================
   * LOAD CURRENT USER
   * =========================================================
   *
   * Backend response:
   *
   * {
   *   success: true,
   *   data: {
   *     user: {...}
   *   }
   * }
   */

  const loadUser = useCallback(
    async (options = {}) => {
      const response =
        await getCurrentUser(options);

      const currentUser =
        response?.data?.user ?? null;

      setUser(currentUser);

      return response;
    },
    [],
  );

  /*
   * =========================================================
   * INITIALIZE AUTHENTICATION
   * =========================================================
   */

  const initializeAuth = useCallback(
    async () => {
      if (
        initializationPromiseRef.current
      ) {
        return initializationPromiseRef.current;
      }

      const initialization =
        (async () => {
          setLoading(true);
          setError(null);

          try {
            /*
             * First use the existing access cookie.
             */
            try {
              return await loadUser({
                skipAuthRefresh: true,
              });
            } catch {
              /*
               * Access token unavailable/expired.
               * Continue with refresh.
               */
            }

            /*
             * Use the HTTP-only refresh cookie.
             */
            try {
              await refreshSession();

              return await loadUser({
                skipAuthRefresh: true,
              });
            } catch {
              /*
               * No valid session.
               */
              setUser(null);

              return null;
            }
          } finally {
            setLoading(false);
          }
        })();

      initializationPromiseRef.current =
        initialization;

      try {
        return await initialization;
      } finally {
        if (
          initializationPromiseRef.current ===
          initialization
        ) {
          initializationPromiseRef.current =
            null;
        }
      }
    },
    [loadUser],
  );

  /*
   * =========================================================
   * INITIAL AUTH CHECK
   * =========================================================
   */

  useEffect(() => {
    initializeAuth().catch(() => {
      setUser(null);
      setError(null);
      setLoading(false);
    });
  }, [initializeAuth]);

  /*
   * =========================================================
   * LOGIN
   * =========================================================
   *
   * Backend response:
   *
   * {
   *   success: true,
   *   message: "Login successful",
   *   data: {
   *     user: {...}
   *   }
   * }
   */

  const login = useCallback(
    async (
      email,
      password,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await loginRequest(
            email,
            password,
          );

        const authenticatedUser =
          response?.data?.user ?? null;

        /*
         * Login succeeded but the backend did not
         * return the expected user object.
         */
        if (!authenticatedUser) {
          throw new Error(
            "Login succeeded, but the authenticated user was not returned.",
          );
        }

        setUser(authenticatedUser);

        /*
         * Retrieve the complete authoritative user
         * record using the newly created access cookie.
         */
        try {
          await loadUser();
        } catch {
          /*
           * Keep the user returned by login if the
           * secondary profile request fails.
           */
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
   * =========================================================
   * REGISTER
   * =========================================================
   */

  const register = useCallback(
    async (data) => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await registerRequest(data);

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
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  const logout = useCallback(
    async () => {
      setLoading(true);

      try {
        await logoutRequest();
      } catch {
        /*
         * Local authentication state must still be
         * cleared if the server request fails.
         */
      } finally {
        setUser(null);
        setError(null);
        setLoading(false);
      }
    },
    [],
  );

  /*
   * =========================================================
   * CLEAR ERROR
   * =========================================================
   */

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /*
   * =========================================================
   * AUTH STATE
   * =========================================================
   */

  const isAuthenticated =
    Boolean(user?.id);

  const isAdmin =
    String(
      user?.role ?? "",
    ).toUpperCase() === "ADMIN";

  /*
   * =========================================================
   * CONTEXT VALUE
   * =========================================================
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
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
};