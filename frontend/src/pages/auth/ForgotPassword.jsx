import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api.js";
import { ROUTES } from "../../utils/constants.js";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "/auth/forgot-password",
        { email },
      );

      setSubmitted(true);

      setError(
        response?.data?.message || "",
      );
    } catch (requestError) {
      setSubmitted(true);

      setError(
        requestError?.response?.data?.message ||
          "",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={() => navigate(ROUTES.LOGIN)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </button>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
          Forgot your password?
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your registered email address and we will send instructions
          for resetting your password.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />

            <h2 className="mt-3 text-sm font-bold text-emerald-900">
              Check your email
            </h2>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              If an account exists for this email address, password reset
              instructions have been sent.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Email address
              </span>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset instructions"
              )}
            </button>
          </form>
        )}

        {submitted && (
          <button
            type="button"
            onClick={() => navigate(ROUTES.LOGIN)}
            className="mt-5 w-full text-center text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            Return to sign in
          </button>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;