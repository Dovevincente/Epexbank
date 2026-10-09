import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../hooks/useAuth.js";

const ProtectedRoute = ({
  requireAdmin = false,
}) => {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth();

  const location = useLocation();

  /* =========================================================
     AUTHENTICATION LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div
            className="
              mx-auto
              mb-4
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-slate-200
              border-t-blue-600
            "
            aria-hidden="true"
          />

          <p className="text-sm font-medium text-slate-500">
            Securing your Epex session...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     NOT AUTHENTICATED
  ========================================================= */

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  /* =========================================================
     ADMIN ACCESS
  ========================================================= */

  if (requireAdmin) {
    const role = String(
      user?.role ?? "",
    ).toUpperCase();

    if (role !== "ADMIN") {
      return (
        <Navigate
          to="/forbidden"
          replace
        />
      );
    }
  }

  /* =========================================================
     AUTHORIZED
  ========================================================= */

  return <Outlet />;
};

export default ProtectedRoute;