import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth.js";

const STATUS_STYLES = {
  ACTIVE:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  VERIFIED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  SUSPENDED:
    "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  BLOCKED:
    "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  CLOSED:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const KYC_STYLES = {
  APPROVED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  VERIFIED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  COMPLETED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  IN_REVIEW:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  REQUIRES_ACTION:
    "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
  REJECTED:
    "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  EXPIRED:
    "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
};

const formatStatus = (
  value,
) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
};

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
    },
  ).format(date);
};

const Profile = () => {
  const { user } = useAuth();

  const profile =
    user?.profile ||
    user?.customerProfile ||
    {};

  const firstName =
    profile.firstName ||
    user?.firstName ||
    "";

  const lastName =
    profile.lastName ||
    user?.lastName ||
    "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    user?.name ||
    user?.fullName ||
    user?.email?.split(
      "@",
    )[0] ||
    "Customer";

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`
      .toUpperCase() ||
    fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0),
      )
      .join("")
      .toUpperCase() ||
    "C";

  const status = String(
    user?.status ||
      "ACTIVE",
  ).toUpperCase();

  const kycStatus = String(
    user?.kycStatus ||
      profile.kycStatus ||
      "",
  ).toUpperCase();

  const role = String(
    user?.role ||
      "CUSTOMER",
  ).toUpperCase();

  const address =
    profile.address ||
    profile.streetAddress ||
    user?.address ||
    "";

  const city =
    profile.city ||
    user?.city ||
    "";

  const state =
    profile.state ||
    profile.stateProvince ||
    user?.state ||
    "";

  const country =
    profile.country ||
    user?.country ||
    "";

  const dateOfBirth =
    profile.dateOfBirth ||
    profile.dob ||
    user?.dateOfBirth ||
    null;

  const createdAt =
    user?.createdAt ||
    profile.createdAt ||
    null;

  const statusClass =
    STATUS_STYLES[status] ||
    STATUS_STYLES.ACTIVE;

  const kycClass =
    KYC_STYLES[kycStatus] ||
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Profile
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review your personal information associated with Epex Bank.
            </p>
          </div>
        </div>
      </section>

      {/* Profile hero */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-slate-950 px-5 py-7 text-white dark:bg-slate-950 sm:px-8 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-slate-950 shadow-lg">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-bold">
                  {fullName}
                </h2>

                {status ===
                  "ACTIVE" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                )}
              </div>

              <p className="mt-1 truncate text-sm text-slate-400">
                {user?.email ||
                  "No email address"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${statusClass}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {formatStatus(
                    status,
                  )}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
                  <UserRound className="h-3.5 w-3.5" />
                  {formatStatus(
                    role,
                  )}
                </span>

                {kycStatus && (
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${kycClass}`}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    KYC{" "}
                    {formatStatus(
                      kycStatus,
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal information */}
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
          <ProfileField
            icon={UserRound}
            label="First name"
            value={
              firstName ||
              "Not provided"
            }
          />

          <ProfileField
            icon={UserRound}
            label="Last name"
            value={
              lastName ||
              "Not provided"
            }
          />

          <ProfileField
            icon={Mail}
            label="Email"
            value={
              user?.email ||
              "Not provided"
            }
          />

          <ProfileField
            icon={Phone}
            label="Phone"
            value={
              user?.phone ||
              profile.phone ||
              "Not provided"
            }
          />

          <ProfileField
            icon={Globe2}
            label="Country"
            value={
              country ||
              "Not provided"
            }
          />

          <ProfileField
            icon={CalendarDays}
            label="Date of birth"
            value={formatDate(
              dateOfBirth,
            )}
          />

          <div className="sm:col-span-2">
            <ProfileField
              icon={MapPin}
              label="Address"
              value={
                address ||
                "Not provided"
              }
              secondary={[
                city,
                state,
                country,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </div>
        </div>
      </section>

      {/* Account information */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">
              Account information
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Account-level information associated with your customer profile.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AccountInfo
            label="Account status"
            value={formatStatus(
              status,
            )}
            statusClass={
              statusClass
            }
          />

          <AccountInfo
            label="Customer role"
            value={formatStatus(
              role,
            )}
          />

          <AccountInfo
            label="KYC status"
            value={
              kycStatus
                ? formatStatus(
                    kycStatus,
                  )
                : "Not available"
            }
          />

          <AccountInfo
            label="Customer since"
            value={formatDate(
              createdAt,
            )}
          />

          <AccountInfo
            label="Customer ID"
            value={
              user?.id ||
              "Not available"
            }
          />
        </div>
      </section>

      {/* Verification */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <BadgeCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-950 dark:text-white">
              Identity verification
            </h2>

            {kycStatus ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${kycClass}`}
                >
                  {formatStatus(
                    kycStatus,
                  )}
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Verification status supplied by the banking system.
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Your current verification status is not included in the
                authenticated profile response.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Profile update notice */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

          <div>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-300">
              Need to update your information?
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-400">
              Personal and identity information may require verification before
              it can be changed. Use the appropriate Epex Bank account or
              customer-service workflow rather than modifying sensitive profile
              data directly in the browser.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const ProfileField = ({
  icon: Icon,
  label,
  value,
  secondary,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </p>

        {secondary && (
          <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
            {secondary}
          </p>
        )}
      </div>
    </div>
  </div>
);

const AccountInfo = ({
  label,
  value,
  statusClass,
}) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
    </p>

    {statusClass ? (
      <span
        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}
      >
        {value}
      </span>
    ) : (
      <p className="mt-2 break-all text-sm font-bold text-slate-950 dark:text-white">
        {value}
      </p>
    )}
  </div>
);

export default Profile;