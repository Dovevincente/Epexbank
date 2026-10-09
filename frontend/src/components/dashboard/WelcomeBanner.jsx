import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const getFirstName = (user) => {
  if (!user) {
    return "there";
  }

  const firstName =
    user?.firstName ??
    user?.firstname ??
    user?.givenName;

  if (firstName) {
    return String(firstName).trim();
  }

  const fullName =
    user?.name ??
    user?.fullName ??
    user?.displayName;

  if (fullName) {
    return String(fullName).trim().split(/\s+/)[0];
  }

  return "there";
};

const formatDate = (value = new Date()) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const WelcomeBanner = ({
  user,
  loading = false,
  subtitle = "Manage your money, accounts, transfers, and financial goals from one secure place.",
  showDate = true,
  showSecurity = true,
  onPrimaryAction,
  primaryActionLabel = "View accounts",
  onSecondaryAction,
  secondaryActionLabel = "Explore services",
}) => {
  if (loading) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="animate-pulse">
          <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-8 w-72 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-full max-w-xl rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-6 flex gap-3">
            <div className="h-11 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-11 w-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </section>
    );
  }

  const firstName = getFirstName(user);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 p-6 text-white shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100 backdrop-blur">
              <Sparkles size={13} />
              Epex Bank
            </span>

            {showSecurity ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                <ShieldCheck size={13} />
                Secure banking
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome back, {firstName}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            {subtitle}
          </p>

          {showDate ? (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-200">
              <CalendarDays size={15} />
              <span>{formatDate()}</span>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {onPrimaryAction ? (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-900 shadow-sm transition hover:bg-blue-50"
              >
                {primaryActionLabel}
                <ArrowRight size={16} />
              </button>
            ) : null}

            {onSecondaryAction ? (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {secondaryActionLabel}
                <ChevronRight size={16} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="hidden shrink-0 lg:block">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Sparkles size={30} className="text-blue-200" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WelcomeBanner;