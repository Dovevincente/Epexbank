import { Link } from "react-router-dom";
import { ServerCrash } from "lucide-react";
import { ROUTES } from "../../utils/constants.js";

const ServerError = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
    <div className="max-w-md text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <ServerCrash className="h-6 w-6" />
      </div>

      <h1 className="mt-5 text-2xl font-bold text-slate-950">
        Something went wrong
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        We couldn't complete your request. Please try again shortly.
      </p>

      <Link
        to={ROUTES.DASHBOARD}
        className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
      >
        Return to dashboard
      </Link>
    </div>
  </div>
);

export default ServerError;
