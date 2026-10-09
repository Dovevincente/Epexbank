import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth.js";
import { ROUTES } from "../../utils/constants.js";

const Security = () => {
  const { user } = useAuth();

  const twoFactorEnabled = Boolean(
    user?.twoFactorEnabled ??
      user?.twoFactor?.enabled ??
      user?.security?.twoFactorEnabled,
  );

  const accountStatus = String(
    user?.status || "ACTIVE",
  ).toUpperCase();

  const emailVerified = Boolean(
    user?.emailVerified ??
      user?.isEmailVerified ??
      user?.verifiedEmail,
  );

  const phoneVerified = Boolean(
    user?.phoneVerified ??
      user?.isPhoneVerified ??
      user?.verifiedPhone,
  );

  const statusLabel =
    accountStatus
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Security
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage the security controls that protect your Epex Bank account.
            </p>
          </div>
        </div>
      </section>

      {/* Security overview */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Security overview
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Review your authentication settings, verification status and
                account protection controls.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
          <SecurityStatusCard
            title="Two-factor authentication"
            enabled={twoFactorEnabled}
            enabledLabel="Enabled"
            disabledLabel="Not enabled"
          />

          <SecurityStatusCard
            title="Email verification"
            enabled={emailVerified}
            enabledLabel="Verified"
            disabledLabel="Not verified"
          />

          <SecurityStatusCard
            title="Phone verification"
            enabled={phoneVerified}
            enabledLabel="Verified"
            disabledLabel="Not verified"
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Account status
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  accountStatus ===
                    "ACTIVE" ||
                  accountStatus ===
                    "VERIFIED"
                    ? "bg-emerald-500"
                    : accountStatus ===
                        "PENDING"
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
              />

              <span className="text-sm font-bold text-slate-950 dark:text-white">
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Authentication
            </p>

            <p className="mt-3 text-sm font-bold text-slate-950 dark:text-white">
              Password protected
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Password authentication is active for this account.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Security controls
            </p>

            <p className="mt-3 text-sm font-bold text-slate-950 dark:text-white">
              Account protection
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Review authentication and active-session controls below.
            </p>
          </div>
        </div>
      </section>

      {/* Security actions */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Security controls
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Manage the settings used to protect access to your banking account.
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          <SecurityLink
            icon={KeyRound}
            title="Change password"
            description="Update your account password and strengthen your login credentials."
            to={`${ROUTES.SETTINGS}/change-password`}
          />

          <SecurityLink
            icon={Smartphone}
            title="Two-factor authentication"
            description={
              twoFactorEnabled
                ? "Two-factor authentication is currently enabled on your account."
                : "Add an additional verification layer to protect your account."
            }
            to="/two-factor"
            status={
              twoFactorEnabled
                ? "Enabled"
                : "Not enabled"
            }
            statusTone={
              twoFactorEnabled
                ? "success"
                : "warning"
            }
          />

          <SecurityLink
            icon={MonitorSmartphone}
            title="Active sessions"
            description="Review devices and sessions associated with your account."
            to={`${ROUTES.SETTINGS}/sessions`}
          />

          <SecurityLink
            icon={LockKeyhole}
            title="Account protection"
            description="Review account security and access controls."
            to={ROUTES.SETTINGS}
            last
          />
        </div>
      </section>

      {/* Security notice */}
      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/30 sm:p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

          <div>
            <h2 className="text-sm font-bold text-blue-950 dark:text-blue-300">
              Keep your account secure
            </h2>

            <p className="mt-1 text-xs leading-5 text-blue-800 dark:text-blue-400">
              Never share your password, one-time passwords, authentication
              codes or session information with anyone. Epex Bank support
              should not require you to disclose your password.
            </p>
          </div>
        </div>
      </section>

      {/* Identity note */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Account identity
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Security settings protect access to your account but do not
              replace identity verification or KYC requirements. Changes to
              regulated identity information should follow the appropriate
              verified Epex Bank workflow.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const SecurityStatusCard = ({
  title,
  enabled,
  enabledLabel,
  disabledLabel,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {title}
    </p>

    <div className="mt-3 flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          enabled
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
        }`}
      >
        {enabled ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>

      <span className="text-sm font-bold text-slate-950 dark:text-white">
        {enabled
          ? enabledLabel
          : disabledLabel}
      </span>
    </div>
  </div>
);

const SecurityLink = ({
  icon: Icon,
  title,
  description,
  to,
  status,
  statusTone = "neutral",
  last = false,
}) => {
  const statusClasses = {
    success:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    warning:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    neutral:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <Link
      to={to}
      className={[
        "group flex items-center gap-4 p-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:p-6",
        last
          ? ""
          : "border-b border-slate-200 dark:border-slate-800",
      ].join(" ")}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-white dark:group-hover:text-slate-950">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            {title}
          </p>

          {status && (
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClasses[statusTone]}`}
            >
              {status}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-300" />
    </Link>
  );
};

export default Security;