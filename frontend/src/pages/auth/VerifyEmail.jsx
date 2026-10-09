import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  LoaderCircle,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../../services/api.js";
import { ROUTES } from "../../utils/constants.js";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const email =
    location.state?.email ||
    searchParams.get("email") ||
    "";

  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(Boolean(token));
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const verifyEmail = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post(
        "/auth/verify-email",
        {
          token,
        },
      );

      if (response?.data?.success === false) {
        throw new Error(
          response?.data?.message ||
            "Email verification failed.",
        );
      }

      setVerified(true);

      setMessage(
        response?.data?.message ||
          "Your email address has been verified successfully.",
      );
    } catch (requestError) {
      setVerified(false);

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "We could not verify your email address. The verification link may be invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setLoading(false);
    }
  }, [token, verifyEmail]);

  const resendVerification = async () => {
    if (!email) {
      setError(
        "We need your registered email address before we can resend the verification message.",
      );
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post(
        "/auth/resend-verification",
        {
          email: email.trim().toLowerCase(),
        },
      );

      setMessage(
        response?.data?.message ||
          "If an account exists for this email address, a new verification email has been sent.",
      );
    } catch (requestError) {
      setMessage(
        requestError?.response?.data?.message ||
          "If an account exists for this email address, a new verification email will be sent.",
      );
    } finally {
      setResending(false);
    }
  };

  const handleLogin = () => {
    navigate(ROUTES.LOGIN, {
      replace: true,
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
            Verifying your email
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Please wait while Epex Bank securely verifies your email
            address.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
            Secure verification
          </div>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/50 sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
            Email verified
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your email address has been verified successfully. You can now
            continue to your Epex Bank account.
          </p>

          {message && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left text-sm leading-5 text-emerald-700">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            className="mt-6 min-h-12 w-full rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            Continue to sign in
          </button>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
            Email verification complete
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <MailCheck className="h-6 w-6" />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
          Verify your email
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Verify your email address to help protect your Epex Bank account
          and complete your registration.
        </p>

        {email && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-400">
              Verification email
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {email}
            </p>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-5 text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={resending || !email}
          onClick={resendVerification}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Sending verification email...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Resend verification email
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleLogin}
          className="mt-4 w-full text-center text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          Return to sign in
        </button>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

        <p className="text-xs leading-5 text-blue-700">
          For your protection, never share verification codes or
          verification links with another person.
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;