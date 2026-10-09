import { ShieldCheck } from "lucide-react";

const Maintenance = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
    <div className="max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-950">
        <ShieldCheck className="h-7 w-7" />
      </div>

      <h1 className="mt-6 text-3xl font-bold">
        Temporarily unavailable
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        Epex Bank is performing scheduled maintenance. Please try again shortly.
      </p>
    </div>
  </div>
);

export default Maintenance;
