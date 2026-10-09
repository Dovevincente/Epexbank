import { useEffect, useState } from "react";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../hooks/useAuth.js";

import Input from "../../components/common/Input.jsx";
import Button from "../../components/common/Button.jsx";

import {
  getApiErrorMessage,
} from "../../utils/error.js";

import {
  APP_CONFIG,
  ROUTES,
} from "../../utils/constants.js";

const ADMIN_ROLES = [
  "ADMIN",
  "SUPERADMIN",
  "SUPER_ADMIN",
  "STAFF",
  "MANAGER",
];

const normalizeRole = (role) => {
  return String(role ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
};

const isAdminRole = (role) => {
  return ADMIN_ROLES.includes(
    normalizeRole(role),
  );
};

const getUserFromStorage = () => {
  const storageKeys = [
    "user",
    "currentUser",
    "authUser",
    "profile",
  ];

  for (const key of storageKeys) {
    try {
      const value = localStorage.getItem(key);

      if (!value) {
        continue;
      }

      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Ignore malformed storage values.
    }
  }

  return null;
};

const getDestination = (user, location) => {
  const role = normalizeRole(user?.role);

  /*
   * If the user is an administrator, always send them
   * to the admin dashboard immediately after login.
   *
   * This prevents an admin from landing on the normal
   * customer dashboard first.
   */
  if (isAdminRole(role)) {
    return "/admin";
  }

  /*
   * Normal customers can still be returned to the page
   * they originally tried to access.
   */
  const requestedPath =
    location.state?.from?.pathname;

  if (
    requestedPath &&
    requestedPath !== "/admin" &&
    !requestedPath.startsWith("/admin/")
  ) {
    return requestedPath;
  }

  return ROUTES.DASHBOARD;
};

const Login = () => {
  const {
    login,
    isAuthenticated,
    loading: authLoading,
    user,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  useEffect(() => {
    setSubmitError("");
  }, [form.email, form.password]);

  /*
   * If the user is already authenticated and this page
   * is opened directly, send them to the correct dashboard.
   */
  if (!authLoading && isAuthenticated) {
    const storedUser =
      user || getUserFromStorage();

    return (
      <Navigate
        to={getDestination(
          storedUser,
          location,
        )}
        replace
      />
    );
  }

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    const email = form.email.trim();

    if (!email) {
      nextErrors.email =
        "Enter the email address associated with your account.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      nextErrors.email =
        "Enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password =
        "Enter your password.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      /*
       * Login first.
       *
       * Your auth context should update the authenticated
       * user after this succeeds.
       */
      const loggedInUser = await login(
        form.email.trim().toLowerCase(),
        form.password,
      );

      /*
       * Prefer the user returned by login().
       * If login() does not return the user, fall back
       * to the auth context or localStorage.
       */
      const authenticatedUser =
        loggedInUser ||
        user ||
        getUserFromStorage();

      const destination = getDestination(
        authenticatedUser,
        location,
      );

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(
          error,
          "We couldn't sign you in. Please verify your details and try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg lg:hidden">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <p className="mb-2 text-sm font-semibold text-blue-600">
          Welcome back
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Sign in to your account
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Access your accounts, transfers, cards,
          savings and investments securely.
        </p>
      </div>

      {/* Error */}
      {submitError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700"
        >
          {submitError}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
      >
        <Input
          id="login-email"
          name="email"
          label="Email address"
          type="email"
          value={form.email}
          onChange={(event) =>
            updateField(
              "email",
              event.target.value,
            )
          }
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={errors.email}
          leftIcon={
            <Mail className="h-4 w-4" />
          }
        />

        <div>
          <Input
            id="login-password"
            name="password"
            label="Password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={form.password}
            onChange={(event) =>
              updateField(
                "password",
                event.target.value,
              )
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            error={errors.password}
            leftIcon={
              <LockKeyhole className="h-4 w-4" />
            }
            rightElement={
              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current,
                  )
                }
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
          />

          <div className="mt-2 flex justify-end">
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={submitting}
          rightIcon={
            !submitting && (
              <ArrowRight className="h-4 w-4" />
            )
          }
        >
          Sign in securely
        </Button>
      </form>

      {/* Registration */}
      <div className="mt-8 border-t border-slate-100 pt-6 text-center">
        <p className="text-sm text-slate-500">
          Don't have an Epex Bank account?
        </p>

        <Link
          to={ROUTES.REGISTER}
          className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-slate-950 hover:text-blue-600"
        >
          Open an account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Security notice */}
      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

        <p className="text-xs leading-5 text-slate-500">
          {APP_CONFIG.name} will never ask you to
          share your password or one-time security
          codes with another person.
        </p>
      </div>
    </div>
  );
};

export default Login;