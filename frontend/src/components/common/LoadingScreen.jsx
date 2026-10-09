import { ShieldCheck } from "lucide-react";
import { APP_CONFIG } from "../../utils/constants.js";

const LoadingScreen = ({
  message = "Securing your banking session...",
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
          <ShieldCheck className="h-7 w-7" />
        </div>

        <h1 className="text-lg font-bold text-slate-950">
          {APP_CONFIG.name}
        </h1>

        <div className="mx-auto mt-6 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-950" />
        </div>

        <p className="mt-4 text-sm text-slate-500">
          {message}
        </p>

        <p className="mt-2 text-xs text-slate-400">
          Please wait while we verify your session.
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;