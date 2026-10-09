import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { ROUTES } from "../../utils/constants.js";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
    <div className="w-full max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <p className="mt-6 text-sm font-bold text-blue-600">
        Error 404
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Page not found
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        The page you're looking for doesn't exist or may have moved.
      </p>

      <Link
        to={ROUTES.DASHBOARD}
        className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  </div>
);

export default NotFound;
