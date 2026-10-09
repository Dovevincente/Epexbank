import { useEffect, useState } from "react";
import {
  ArrowLeft,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { ROUTES } from "../../utils/constants.js";

const TwoFactor = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const email =
    location.state?.email ||
    "your registered email address";

  useEffect(() => {
    if (!location.state?.requiresTwoFactor) {
      // The page can still be visited directly, but we don't
      // automatically redirect so users can complete an
      // authentication flow restored by the application.
    }
  }, [location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedCode = code.replace(/\D/g, "");

    if (normalizedCode.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * The backend 2FA verification endpoint should be wired here
       * when two-factor authentication is enabled for the account.
       *
       * We deliberately do not mark the user as authenticated on
       * the client. Authentication must be confirmed by the server.
       */

      setError(
        "Two-factor verification is not yet connected to the banking API.",
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
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </button>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
          Verify your identity
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter the six-digit security code required to complete your
          Epex Bank sign-in.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">
            Verification account
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {email}
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Security code
            </span>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6),
                )
              }
              placeholder="000000"
              className="min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-xl font-bold tracking-[0.35em] text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <LockKeyhole className="h-4 w-4" />
                Verify and continue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TwoFactor;