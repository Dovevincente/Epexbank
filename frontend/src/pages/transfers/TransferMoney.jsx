import {
  ArrowLeftRight,
  Building2,
  ChevronRight,
  Globe2,
  Landmark,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const transferOptions = [
  {
    id: "internal",
    title: "Epex Bank transfer",
    description:
      "Send money instantly to another Epex Bank customer using their account number.",
    icon: WalletCards,
    path: "/transfers/internal",
    badge: "Fast",
  },
  {
    id: "bank",
    title: "Bank transfer",
    description:
      "Send money to a beneficiary at another bank using their banking details.",
    icon: Landmark,
    path: "/transfers/bank",
    badge: "Domestic",
  },
  {
    id: "international",
    title: "International transfer",
    description:
      "Send funds internationally using supported beneficiary and bank details.",
    icon: Globe2,
    path: "/transfers/international",
    badge: "Global",
  },
];

const TransferMoney = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-7 text-white shadow-sm sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Secure transfers
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Transfer money
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Choose how you want to send money. Epex Bank protects every
              transfer with authentication, transaction controls, and
              applicable compliance checks.
            </p>
          </div>

          <div className="hidden shrink-0 lg:flex lg:h-24 lg:w-24 lg:items-center lg:justify-center lg:rounded-3xl lg:border lg:border-white/10 lg:bg-white/5">
            <ArrowLeftRight className="h-10 w-10 text-blue-200" />
          </div>
        </div>
      </section>

      {/* =========================================================
          TRANSFER OPTIONS
      ========================================================= */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Choose transfer type
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the transfer method that matches your payment.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {transferOptions.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => navigate(option.path)}
                className="group relative flex min-h-[250px] flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {option.badge}
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="text-base font-bold text-slate-900">
                    {option.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {option.description}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Compliance protected
                  </div>

                  <div className="flex items-center gap-1 text-sm font-semibold text-blue-700">
                    Continue
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          COMPLIANCE NOTICE
      ========================================================= */}
      <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-blue-950">
              Transfer compliance
            </h2>

            <p className="mt-1 text-sm leading-6 text-blue-950/70">
              Depending on your account and the bank's compliance settings,
              you may be required to complete TIN / Tax Code verification,
              Anti-Money Laundering (AML), and Counter-Terrorist Financing
              (CFT) checks before a transfer can proceed.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
                TIN / Tax Code
              </span>

              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
                AML
              </span>

              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
                CFT
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BENEFICIARIES
      ========================================================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Manage beneficiaries
              </h2>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Save trusted recipients so you can use their details for
                future bank and international transfers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/transfers/beneficiaries")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:w-auto"
          >
            Manage beneficiaries
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* =========================================================
          SECURITY NOTICE
      ========================================================= */}
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-emerald-950">
              Transfer security
            </h2>

            <p className="mt-1 text-sm leading-6 text-emerald-900/70">
              Never share your password, one-time verification code, card PIN,
              TIN credentials, or other security credentials with anyone.
              Always verify recipient details before confirming a transfer.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          SUPPORTING INFORMATION
      ========================================================= */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Bank transfers
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Send to supported external banks.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Globe2 className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                International payments
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Use supported international payment routes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TransferMoney;