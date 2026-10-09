import { useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../../services/api.js";
import { ROUTES } from "../../utils/constants.js";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const token =
    new URLSearchParams(location.search).get("token") ||
    "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "This password reset link is invalid or incomplete.",
      );
      return;
    }

    if (password.length < 10) {
      setError(
        "Your password must contain at least 10 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        password,
      });

      setSuccess(true);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Unable to reset your password.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-950">
          Password reset
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your password has been updated. You can now sign in using your
          new password.
        </p>

        <button
          type="button"
          onClick={() => navigate(ROUTES.LOGIN)}
          className="mt-6 min-h-12 w-full rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"
        >
          Continue to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <ShieldCheck className="h-5 w-5" />
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
        Create a new password
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Choose a strong password for your Epex Bank account.
      </p>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        <PasswordInput
          label="New password"
          value={password}
          onChange={setPassword}
        />

        <PasswordInput
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Reset password
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const PasswordInput = ({
  label,
  value,
  onChange,
}) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">
      {label}
    </span>

    <input
      type="password"
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      required
      minLength={10}
      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
    />
  </label>
);

export default ResetPassword;