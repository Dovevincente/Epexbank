import {
  Bell,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth.js";
import { ROUTES } from "../../utils/constants.js";

const settingItems = [
  {
    title: "Profile",
    description:
      "Manage your personal information, contact details and account identity.",
    icon: UserRound,
    path: `${ROUTES.SETTINGS}/profile`,
  },
  {
    title: "Security",
    description:
      "Manage authentication, two-factor security and account protection.",
    icon: ShieldCheck,
    path: `${ROUTES.SETTINGS}/security`,
  },
  {
    title: "Notifications",
    description:
      "Control transaction, security and account notifications.",
    icon: Bell,
    path: `${ROUTES.SETTINGS}/notifications`,
  },
  {
    title: "Preferences",
    description:
      "Customize your banking experience, currency and display preferences.",
    icon: SlidersHorizontal,
    path: `${ROUTES.SETTINGS}/preferences`,
  },
  {
    title: "Sessions",
    description:
      "Review authenticated devices and sessions associated with your account.",
    icon: MonitorSmartphone,
    path: `${ROUTES.SETTINGS}/sessions`,
  },
  {
    title: "Change password",
    description:
      "Update your account password and strengthen your login credentials.",
    icon: KeyRound,
    path: `${ROUTES.SETTINGS}/change-password`,
  },
];

const getFirstName = (user) => {
  const profileFirstName =
    user?.profile?.firstName ||
    user?.customerProfile?.firstName ||
    user?.firstName;

  if (profileFirstName) {
    return String(profileFirstName).trim();
  }

  const emailName = user?.email?.split("@")?.[0];

  if (emailName) {
    return emailName
      .replace(/[._-]+/g, " ")
      .trim()
      .split(/\s+/)[0];
  }

  return "Customer";
};

const formatStatus = (status) => {
  if (!status) return "Active";

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const getStatusClasses = (status) => {
  const normalized = String(
    status || "ACTIVE",
  ).toUpperCase();

  if (
    normalized === "ACTIVE" ||
    normalized === "APPROVED" ||
    normalized === "VERIFIED"
  ) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (
    normalized === "PENDING" ||
    normalized === "IN_REVIEW"
  ) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const Settings = () => {
  const { user } = useAuth();

  const firstName = getFirstName(user);

  const accountStatus =
    user?.status || "ACTIVE";

  const kycStatus =
    user?.kycStatus ||
    user?.profile?.kycStatus ||
    user?.customerProfile?.kycStatus ||
    null;

  const emailVerified =
    user?.emailVerified ??
    user?.isEmailVerified ??
    user?.profile?.emailVerified ??
    false;

  const phoneVerified =
    user?.phoneVerified ??
    user?.isPhoneVerified ??
    user?.profile?.phoneVerified ??
    false;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <section>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
            <LockKeyhole className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Settings
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your Epex Bank account, security and preferences.
            </p>
          </div>
        </div>
      </section>

      {/* Account overview */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-slate-950 px-5 py-6 text-white dark:bg-slate-950 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Account settings
              </p>

              <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                Welcome, {firstName}
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Keep your account information, security controls and banking
                preferences up to date.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                  accountStatus,
                )}`}
              >
                {formatStatus(accountStatus)}
              </span>
            </div>
          </div>
        </div>

        {/* Security summary */}
        <div className="grid gap-px border-t border-slate-800 bg-slate-200 dark:bg-slate-800 sm:grid-cols-3">
          <AccountStatus
            label="Account"
            value={formatStatus(accountStatus)}
            active={
              String(accountStatus).toUpperCase() ===
              "ACTIVE"
            }
          />

          <AccountStatus
            label="Email"
            value={
              emailVerified
                ? "Verified"
                : "Verification required"
            }
            active={Boolean(emailVerified)}
          />

          <AccountStatus
            label="KYC"
            value={
              kycStatus
                ? formatStatus(kycStatus)
                : "Not available"
            }
            active={
              String(kycStatus).toUpperCase() ===
              "APPROVED"
            }
          />
        </div>
      </section>

      {/* Settings navigation */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Account controls
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Select a section to manage the corresponding part of your Epex
            Bank account.
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {settingItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="group flex min-w-0 items-center gap-3 px-5 py-5 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-950 dark:hover:bg-slate-800/60 dark:focus:ring-white sm:gap-4 sm:px-7"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-white dark:group-hover:text-slate-950">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                    {item.title}
                  </h3>

                  <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                    {item.description}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-300" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Security information */}
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-950 dark:text-emerald-300">
              Account security
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-400">
              Epex Bank security controls help protect your account and
              financial activity. Keep your password private and review your
              security settings regularly.
            </p>

            <Link
              to={`${ROUTES.SETTINGS}/security`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950 dark:text-emerald-300 dark:decoration-emerald-700 dark:hover:text-emerald-200"
            >
              Review security settings
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Account contact information */}
      {(user?.email || user?.phone) && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">
            Account contact
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {user?.email && (
              <ContactItem
                label="Email"
                value={user.email}
              />
            )}

            {user?.phone && (
              <ContactItem
                label="Phone"
                value={user.phone}
                verified={phoneVerified}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
};

const AccountStatus = ({
  label,
  value,
  active,
}) => (
  <div className="bg-white px-5 py-4 dark:bg-slate-900 sm:px-6">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <div className="mt-1.5 flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${
          active
            ? "bg-emerald-500"
            : "bg-amber-500"
        }`}
      />

      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </div>
  </div>
);

const ContactItem = ({
  label,
  value,
  verified = false,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <div className="mt-1.5 flex min-w-0 items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
        {value}
      </p>

      {verified && (
        <span className="shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Verified
        </span>
      )}
    </div>
  </div>
);

export default Settings;