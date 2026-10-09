import { LoaderCircle, ShieldCheck } from "lucide-react";

const PageLoader = ({
  message = "Loading...",
  fullScreen = false,
}) => {
  return (
    <div
      className={[
        "flex items-center justify-center",
        fullScreen
          ? "min-h-[70vh]"
          : "min-h-[300px]",
      ].join(" ")}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <ShieldCheck className="h-5 w-5" />

          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-slate-950" />
          </span>
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-700">
          {message}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Please wait...
        </p>
      </div>
    </div>
  );
};

export default PageLoader;