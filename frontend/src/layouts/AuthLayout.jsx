import { Outlet, Link } from "react-router-dom";
import {
  ShieldCheck,
  LockKeyhole,
  Globe2,
  ArrowLeft,
} from "lucide-react";
import { APP_CONFIG, ROUTES } from "../utils/constants.js";

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* =====================================================
            BRAND PANEL
        ====================================================== */}
        <aside className="relative hidden overflow-hidden bg-slate-950 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.28),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.16),transparent_35%)]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
            <Link
              to={ROUTES.LOGIN}
              className="flex w-fit items-center gap-3"
              aria-label={`${APP_CONFIG.name} home`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-black text-slate-950 shadow-lg">
                E
              </div>

              <div>
                <p className="text-lg font-bold tracking-tight text-white">
                  {APP_CONFIG.name}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Banking, built around you
                </p>
              </div>
            </Link>

            <div className="max-w-xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                Secure digital banking
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-6xl">
                Your money.
                <br />
                Your future.
                <br />
                One secure place.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-400 xl:text-lg">
                Manage your accounts, move money, save, invest and
                access financial products through one modern banking
                experience.
              </p>

              <div className="mt-10 grid max-w-lg gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <LockKeyhole className="mb-3 h-5 w-5 text-blue-400" />
                  <p className="text-sm font-semibold text-white">
                    Secure
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Security-first account access
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <Globe2 className="mb-3 h-5 w-5 text-cyan-400" />
                  <p className="text-sm font-semibold text-white">
                    Global
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Designed for modern international banking
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <ShieldCheck className="mb-3 h-5 w-5 text-emerald-400" />
                  <p className="text-sm font-semibold text-white">
                    Protected
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Built around account security
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} {APP_CONFIG.name}. All rights
              reserved.
            </p>
          </div>
        </aside>

        {/* =====================================================
            FORM PANEL
        ====================================================== */}
        <main className="flex min-h-screen flex-col">
          <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end lg:px-12">
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <Link
              to={ROUTES.LOGIN}
              className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
            >
              {APP_CONFIG.name}
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8 lg:px-12">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;