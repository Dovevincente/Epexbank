import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Globe2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
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
import { ROUTES } from "../../utils/constants.js";

const Register = () => {
  const {
    register,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const passwordRules = useMemo(
    () => [
      {
        label: "At least 10 characters",
        valid: form.password.length >= 10,
      },
      {
        label: "One uppercase letter",
        valid: /[A-Z]/.test(form.password),
      },
      {
        label: "One lowercase letter",
        valid: /[a-z]/.test(form.password),
      },
      {
        label: "One number",
        valid: /[0-9]/.test(form.password),
      },
      {
        label: "One special character",
        valid: /[^A-Za-z0-9]/.test(
          form.password,
        ),
      },
    ],
    [form.password],
  );

  if (!authLoading && isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.DASHBOARD}
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

    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (form.firstName.trim().length < 2) {
      nextErrors.firstName =
        "Enter your first name.";
    }

    if (form.lastName.trim().length < 2) {
      nextErrors.lastName =
        "Enter your last name.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim(),
      )
    ) {
      nextErrors.email =
        "Enter a valid email address.";
    }

    if (
      form.phone.trim() &&
      form.phone.trim().length < 7
    ) {
      nextErrors.phone =
        "Enter a valid phone number.";
    }

    if (!form.country.trim()) {
      nextErrors.country =
        "Enter your country.";
    }

    const invalidPassword =
      passwordRules.some(
        (rule) => !rule.valid,
      );

    if (invalidPassword) {
      nextErrors.password =
        "Your password does not meet the security requirements.";
    }

    if (
      form.password !== form.confirmPassword
    ) {
      nextErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        country: form.country.trim(),
        password: form.password,
      });

      const destination =
        location.state?.from?.pathname ||
        ROUTES.DASHBOARD;

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(
          error,
          "We couldn't create your account. Please review your information and try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-7">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg lg:hidden">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <p className="mb-2 text-sm font-semibold text-blue-600">
          Become an Epex customer
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Open your account
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Create your Epex Bank profile and manage
          your finances through one secure account.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          {submitError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="register-first-name"
            name="firstName"
            label="First name"
            value={form.firstName}
            onChange={(event) =>
              updateField(
                "firstName",
                event.target.value,
              )
            }
            placeholder="John"
            autoComplete="given-name"
            required
            error={errors.firstName}
            leftIcon={
              <UserRound className="h-4 w-4" />
            }
          />

          <Input
            id="register-last-name"
            name="lastName"
            label="Last name"
            value={form.lastName}
            onChange={(event) =>
              updateField(
                "lastName",
                event.target.value,
              )
            }
            placeholder="Doe"
            autoComplete="family-name"
            required
            error={errors.lastName}
          />
        </div>

        <Input
          id="register-email"
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

        <Input
          id="register-phone"
          name="phone"
          label="Phone number"
          type="tel"
          value={form.phone}
          onChange={(event) =>
            updateField(
              "phone",
              event.target.value,
            )
          }
          placeholder="+1 555 000 0000"
          autoComplete="tel"
          error={errors.phone}
          leftIcon={
            <Phone className="h-4 w-4" />
          }
          hint="Optional. Include your international country code."
        />

        <Input
          id="register-country"
          name="country"
          label="Country"
          value={form.country}
          onChange={(event) =>
            updateField(
              "country",
              event.target.value,
            )
          }
          placeholder="United States"
          autoComplete="country-name"
          required
          error={errors.country}
          leftIcon={
            <Globe2 className="h-4 w-4" />
          }
        />

        <div>
          <Input
            id="register-password"
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
            placeholder="Create a strong password"
            autoComplete="new-password"
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
                    (value) => !value,
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

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {passwordRules.map((rule) => (
              <div
                key={rule.label}
                className={[
                  "flex items-center gap-2 text-xs",
                  rule.valid
                    ? "text-emerald-600"
                    : "text-slate-400",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-4 w-4 items-center justify-center rounded-full",
                    rule.valid
                      ? "bg-emerald-100"
                      : "bg-slate-100",
                  ].join(" ")}
                >
                  <Check className="h-2.5 w-2.5" />
                </span>

                {rule.label}
              </div>
            ))}
          </div>
        </div>

        <Input
          id="register-confirm-password"
          name="confirmPassword"
          label="Confirm password"
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          value={form.confirmPassword}
          onChange={(event) =>
            updateField(
              "confirmPassword",
              event.target.value,
            )
          }
          placeholder="Repeat your password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
          leftIcon={
            <LockKeyhole className="h-4 w-4" />
          }
          rightElement={
            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (value) => !value,
                )
              }
              className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              aria-label={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <p className="text-xs leading-5 text-slate-500">
              Your account information is transmitted
              through the secure Epex Bank API. Never
              share your password with anyone.
            </p>
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
          Create Epex Bank account
        </Button>
      </form>

      <div className="mt-7 border-t border-slate-100 pt-6 text-center">
        <p className="text-sm text-slate-500">
          Already have an account?
        </p>

        <Link
          to={ROUTES.LOGIN}
          className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-slate-950 hover:text-blue-600"
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default Register;