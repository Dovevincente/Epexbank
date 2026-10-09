import {
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth.js";
import { ROUTES } from "../../utils/constants.js";

const AuthSuccess = () => {
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  useEffect(() => {
    let mounted = true;

    const completeAuthentication = async () => {
      try {
        await loadUser();

        if (mounted) {
          navigate(ROUTES.DASHBOARD, {
            replace: true,
          });
        }
      } catch {
        if (mounted) {
          navigate(ROUTES.LOGIN, {
            replace: true,
          });
        }
      }
    };

    completeAuthentication();

    return () => {
      mounted = false;
    };
  }, [loadUser, navigate]);

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <CheckCircle2 className="h-7 w-7" />

        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
          <LoaderCircle className="h-4 w-4 animate-spin text-slate-950" />
        </span>
      </div>

      <h1 className="mt-6 text-xl font-bold text-slate-950">
        Authentication successful
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Securing your session and preparing your Epex Bank dashboard.
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
        <ShieldCheck className="h-4 w-4" />
        Secure session
      </div>
    </div>
  );
};

export default AuthSuccess;