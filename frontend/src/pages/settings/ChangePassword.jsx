import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import api from "../../services/api.js";

const INITIAL_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const ChangePassword = () => {
  const [form, setForm] =
    useState(INITIAL_FORM);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const updateField = (
    field,
    value,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  const passwordRules = useMemo(
    () => ({
      minLength:
        form.newPassword.length >= 10,
      uppercase:
        /[A-Z]/.test(form.newPassword),
      lowercase:
        /[a-z]/.test(form.newPassword),
      number:
        /[0-9]/.test(form.newPassword),
      special:
        /[^A-Za-z0-9]/.test(
          form.newPassword,
        ),
    }),
    [form.newPassword],
  );

  const passwordIsValid =
    Object.values(passwordRules).every(
      Boolean,
    );

  const passwordsMatch =
    form.newPassword.length > 0 &&
    form.newPassword ===
      form.confirmPassword;

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const currentPassword =
      form.currentPassword.trim();

    if (!currentPassword) {
      setError(
        "Enter your current password.",
      );
      return;
    }

    if (!form.newPassword) {
      setError(
        "Enter a new password.",
      );
      return;
    }

    if (!passwordIsValid) {
      setError(
        "Your new password must contain at least 10 characters, including uppercase and lowercase letters, a number and a special character.",
      );
      return;
    }

    if (!passwordsMatch) {
      setError(
        "The new passwords do not match.",
      );
      return;
    }

    if (
      currentPassword ===
      form.newPassword
    ) {
      setError(
        "Your new password must be different from your current password.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/users/change-password",
        {
          currentPassword,
          newPassword:
            form.newPassword,
        },
      );

      setForm(INITIAL_FORM);

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setSuccess(
        response?.data?.message ||
          "Your password has been changed successfully.",
      );
    } catch (requestError) {
      const status =
        requestError?.response?.status;

      const serverMessage =
        requestError?.response?.data
          ?.message;

      if (status === 400) {
        setError(
          serverMessage ||
            "The password information provided is invalid.",
        );
      } else if (
        status === 401 ||
        status === 403
      ) {
        setError(
          serverMessage ||
            "Your current password is incorrect or your session is no longer valid.",
        );
      } else if (status === 429) {
        setError(
          serverMessage ||
            "Too many password-change attempts. Please wait and try again.",
        );
      } else {
        setError(
          serverMessage ||
            requestError?.message ||
            "Unable to change your password. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Header */}
      <section>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <KeyRound className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Change password
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update your password to keep your Epex Bank account secure.
            </p>
          </div>
        </div>
      </section>

      {/* Main card */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Protect your account
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Choose a password that is unique to Epex Bank and do not share
                it with anyone.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {/* Error */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

              <div>
                <p className="text-sm font-bold text-red-900 dark:text-red-300">
                  Password update failed
                </p>

                <p className="mt-1 text-sm leading-5 text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />

              <div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  Password updated
                </p>

                <p className="mt-1 text-sm leading-5 text-emerald-800 dark:text-emerald-400">
                  {success}
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5"
          >
            <PasswordField
              id="current-password"
              label="Current password"
              value={
                form.currentPassword
              }
              onChange={(value) =>
                updateField(
                  "currentPassword",
                  value,
                )
              }
              visible={
                showCurrentPassword
              }
              onToggle={() =>
                setShowCurrentPassword(
                  (current) =>
                    !current,
                )
              }
              autoComplete="current-password"
              disabled={loading}
            />

            <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
              <PasswordField
                id="new-password"
                label="New password"
                value={
                  form.newPassword
                }
                onChange={(value) =>
                  updateField(
                    "newPassword",
                    value,
                  )
                }
                visible={
                  showNewPassword
                }
                onToggle={() =>
                  setShowNewPassword(
                    (current) =>
                      !current,
                  )
                }
                autoComplete="new-password"
                disabled={loading}
              />

              {/* Password requirements */}
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password requirements
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <PasswordRule
                    valid={
                      passwordRules.minLength
                    }
                    text="At least 10 characters"
                  />

                  <PasswordRule
                    valid={
                      passwordRules.uppercase
                    }
                    text="One uppercase letter"
                  />

                  <PasswordRule
                    valid={
                      passwordRules.lowercase
                    }
                    text="One lowercase letter"
                  />

                  <PasswordRule
                    valid={
                      passwordRules.number
                    }
                    text="One number"
                  />

                  <PasswordRule
                    valid={
                      passwordRules.special
                    }
                    text="One special character"
                  />
                </div>
              </div>
            </div>

            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={
                form.confirmPassword
              }
              onChange={(value) =>
                updateField(
                  "confirmPassword",
                  value,
                )
              }
              visible={
                showConfirmPassword
              }
              onToggle={() =>
                setShowConfirmPassword(
                  (current) =>
                    !current,
                )
              }
              autoComplete="new-password"
              disabled={loading}
            />

            {form.confirmPassword && (
              <div
                className={`flex items-center gap-2 text-xs font-semibold ${
                  passwordsMatch
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {passwordsMatch ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}

                {passwordsMatch
                  ? "Passwords match."
                  : "Passwords do not match."}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus:ring-slate-800"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  <LockKeyhole className="h-4 w-4" />
                  Change password
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Security information */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Security reminder
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Never share your password, one-time passwords or authentication
              codes with another person. Epex Bank support will not ask you to
              disclose your password.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  disabled,
}) => (
  <label
    htmlFor={id}
    className="block"
  >
    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
      {label}
    </span>

    <div className="relative">
      <input
        id={id}
        type={
          visible
            ? "text"
            : "password"
        }
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        autoComplete={autoComplete}
        required
        disabled={disabled}
        spellCheck={false}
        className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800 dark:disabled:bg-slate-900"
      />

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label={
          visible
            ? `Hide ${label.toLowerCase()}`
            : `Show ${label.toLowerCase()}`
        }
        title={
          visible
            ? "Hide password"
            : "Show password"
        }
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  </label>
);

const PasswordRule = ({
  valid,
  text,
}) => (
  <div
    className={`flex items-center gap-2 text-xs font-medium ${
      valid
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-slate-500 dark:text-slate-400"
    }`}
  >
    {valid ? (
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
    ) : (
      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300 dark:border-slate-600" />
    )}

    <span>{text}</span>
  </div>
);

export default ChangePassword;