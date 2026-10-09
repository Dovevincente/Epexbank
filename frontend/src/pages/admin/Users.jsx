import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";

const STATUS_OPTIONS = [
  "ALL",
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "BLOCKED",
  "CLOSED",
];

const KYC_OPTIONS = [
  "ALL",
  "PENDING",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
];

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      nextCursor: null,
      total: payload.length,
    };
  }

  const source = payload?.data ?? payload ?? {};

  const items =
    (Array.isArray(source?.customers) && source.customers) ||
    (Array.isArray(source?.users) && source.users) ||
    (Array.isArray(source?.items) && source.items) ||
    (Array.isArray(source?.results) && source.results) ||
    (Array.isArray(source?.records) && source.records) ||
    [];

  return {
    items,
    nextCursor:
      source?.nextCursor ??
      source?.pagination?.nextCursor ??
      source?.meta?.nextCursor ??
      null,
    total:
      source?.total ??
      source?.pagination?.total ??
      source?.meta?.total ??
      items.length,
  };
};

const normalizeUser = (user) => {
  const source = user?.customer ?? user?.user ?? user ?? {};

  const firstName =
    source?.firstName ??
    source?.first_name ??
    "";

  const lastName =
    source?.lastName ??
    source?.last_name ??
    "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    source?.name ||
    source?.fullName ||
    source?.displayName ||
    "Customer";

  const accounts =
    (Array.isArray(source?.accounts) && source.accounts) ||
    (Array.isArray(source?.bankAccounts) && source.bankAccounts) ||
    [];

  return {
    ...source,

    id:
      source?.id ??
      source?.userId ??
      "",

    firstName,
    lastName,
    fullName,

    email:
      source?.email ??
      source?.emailAddress ??
      "",

    phone:
      source?.phone ??
      source?.phoneNumber ??
      source?.mobile ??
      "",

    role:
      source?.role ??
      "CUSTOMER",

    status:
      source?.status ??
      source?.accountStatus ??
      source?.userStatus ??
      "UNKNOWN",

    kycStatus:
      source?.kycStatus ??
      source?.kyc?.status ??
      source?.verificationStatus ??
      "UNKNOWN",

    accounts,

    accountCount:
      source?.accountCount ??
      source?.accountsCount ??
      accounts.length,

    createdAt:
      source?.createdAt ??
      source?.created_at ??
      source?.registeredAt ??
      null,

    updatedAt:
      source?.updatedAt ??
      source?.updated_at ??
      null,
  };
};

const normalizeStatus = (value) =>
  String(value ?? "UNKNOWN")
    .trim()
    .toUpperCase();

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (
    ["PENDING", "IN_REVIEW"].includes(normalized)
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
  }

  if (
    ["SUSPENDED", "BLOCKED", "CLOSED", "REJECTED", "EXPIRED"].includes(
      normalized,
    )
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);

  const positive = ["ACTIVE", "APPROVED", "VERIFIED"].includes(
    normalized,
  );

  const negative = [
    "SUSPENDED",
    "BLOCKED",
    "CLOSED",
    "REJECTED",
    "EXPIRED",
  ].includes(normalized);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
        normalized,
      )}`}
    >
      {positive ? (
        <BadgeCheck className="h-3.5 w-3.5" />
      ) : negative ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        <Activity className="h-3.5 w-3.5" />
      )}

      {normalized}
    </span>
  );
};

const SummaryCard = ({
  label,
  value,
  description,
  icon: Icon,
}) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {value}
        </p>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon className="h-5 w-5" />
      </div>
    </div>

    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
      {description}
    </p>
  </article>
);

const Users = () => {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [kycStatus, setKycStatus] = useState("ALL");

  const [nextCursor, setNextCursor] = useState(null);

  const fetchUsers = useCallback(
    async ({
      reset = true,
      cursor = null,
      refresh = false,
    } = {}) => {
      if (refresh) {
        setRefreshing(true);
      } else if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError("");

      try {
        const params = {
          limit: 25,
        };

        if (search.trim()) {
          params.search = search.trim();
        }

        if (status !== "ALL") {
          params.status = status;
        }

        if (kycStatus !== "ALL") {
          params.kycStatus = kycStatus;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const response = await api.get("/admin/customers", {
          params,
        });

        const normalized = normalizeCollection(
          response?.data,
        );

        const mapped = normalized.items.map(normalizeUser);

        setUsers((current) =>
          reset ? mapped : [...current, ...mapped],
        );

        setNextCursor(normalized.nextCursor);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load customer records.";

        setError(message);

        if (reset) {
          setUsers([]);
          setNextCursor(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, status, kycStatus],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchUsers({ reset: true });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchUsers]);

  const summary = useMemo(() => {
    const active = users.filter(
      (user) => normalizeStatus(user.status) === "ACTIVE",
    ).length;

    const pending = users.filter((user) =>
      ["PENDING", "IN_REVIEW"].includes(
        normalizeStatus(user.status),
      ),
    ).length;

    const restricted = users.filter((user) =>
      ["SUSPENDED", "BLOCKED"].includes(
        normalizeStatus(user.status),
      ),
    ).length;

    const verified = users.filter((user) =>
      ["APPROVED", "VERIFIED"].includes(
        normalizeStatus(user.kycStatus),
      ),
    ).length;

    const kycPending = users.filter((user) =>
      ["PENDING", "IN_REVIEW"].includes(
        normalizeStatus(user.kycStatus),
      ),
    ).length;

    const totalAccounts = users.reduce(
      (total, user) =>
        total + Number(user.accountCount || 0),
      0,
    );

    return {
      total: users.length,
      active,
      pending,
      restricted,
      verified,
      kycPending,
      totalAccounts,
    };
  }, [users]);

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setKycStatus("ALL");
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <UsersRound className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  Users
                </h1>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Review customer accounts, access status, verification
                  status and user activity.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchUsers({
                  reset: true,
                  refresh: true,
                })
              }
              disabled={loading || refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Loaded users"
            value={summary.total.toLocaleString()}
            description="Customer records currently loaded in this view."
            icon={UsersRound}
          />

          <SummaryCard
            label="Active"
            value={summary.active.toLocaleString()}
            description="Customers with active access status."
            icon={CheckCircle2}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending.toLocaleString()}
            description="Users requiring pending or review attention."
            icon={Clock3}
          />

          <SummaryCard
            label="Restricted"
            value={summary.restricted.toLocaleString()}
            description="Suspended or blocked customer accounts."
            icon={XCircle}
          />

          <SummaryCard
            label="Verified KYC"
            value={summary.verified.toLocaleString()}
            description="Customers with approved or verified KYC status."
            icon={ShieldCheck}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  KYC requiring attention
                </p>

                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Pending or in-review verification records in the current
                  result set.
                </p>
              </div>

              <BadgeCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            </div>

            <p className="mt-4 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
              {summary.kycPending.toLocaleString()}
            </p>
          </article>

          <article className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900/60 dark:bg-violet-950/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                  Linked accounts
                </p>

                <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
                  Banking accounts represented by the returned customer
                  records.
                </p>
              </div>

              <Wallet className="h-5 w-5 text-violet-700 dark:text-violet-300" />
            </div>

            <p className="mt-4 text-2xl font-bold text-violet-950 dark:text-violet-100">
              {summary.totalAccounts.toLocaleString()}
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="admin-users-search"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Search customers
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="admin-users-search"
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Name, email, phone or customer ID..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="w-full xl:w-52">
              <label
                htmlFor="admin-users-status"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Access status
              </label>

              <select
                id="admin-users-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL"
                      ? "All access statuses"
                      : option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full xl:w-52">
              <label
                htmlFor="admin-users-kyc"
                className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                KYC status
              </label>

              <select
                id="admin-users-kyc"
                value={kycStatus}
                onChange={(event) =>
                  setKycStatus(event.target.value)
                }
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {KYC_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL"
                      ? "All KYC statuses"
                      : option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Filter className="h-4 w-4" />
              Clear
            </button>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

              <div>
                <h2 className="font-semibold text-red-800 dark:text-red-300">
                  Customer records could not be loaded
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    fetchUsers({ reset: true })
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Customer directory
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Customer records returned by the authenticated admin API.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Server-side authorization
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center">
              <UsersRound className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                No customers found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                No customer records matched the current search and filter
                criteria.
              </p>

              {(search ||
                status !== "ALL" ||
                kycStatus !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-slate-50 dark:bg-slate-950/60">
                    <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Contact
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Access
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        KYC
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Accounts
                      </th>

                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Joined
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((user) => (
                      <tr
                        key={user.id || user.email}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {user.fullName
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((part) =>
                                  part.charAt(0),
                                )
                                .join("")
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {user.fullName}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                {user.id || "No customer ID"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-[250px]">
                            {user.email && (
                              <p className="flex items-center gap-1.5 truncate text-sm text-slate-700 dark:text-slate-300">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                {user.email}
                              </p>
                            )}

                            {user.phone && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={user.status} />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={user.kycStatus} />
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <Wallet className="h-4 w-4 text-slate-400" />
                            {Number(
                              user.accountCount || 0,
                            ).toLocaleString()}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {user.id ? (
                            <Link
                              to={`/admin/customers/${encodeURIComponent(
                                user.id,
                              )}`}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
                            >
                              Review
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">
                              No ID
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
                {users.map((user) => (
                  <article
                    key={user.id || user.email}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {user.fullName
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) =>
                              part.charAt(0),
                            )
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {user.fullName}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {user.email || user.id || "Customer"}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={user.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          KYC
                        </p>

                        <div className="mt-1">
                          <StatusBadge status={user.kycStatus} />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Accounts
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                          <Wallet className="h-4 w-4 text-slate-400" />
                          {Number(
                            user.accountCount || 0,
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Joined {formatDate(user.createdAt)}
                      </p>

                      {user.id && (
                        <Link
                          to={`/admin/customers/${encodeURIComponent(
                            user.id,
                          )}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                        >
                          Review
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {nextCursor && (
                <div className="border-t border-slate-200 p-5 text-center dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      fetchUsers({
                        reset: false,
                        cursor: nextCursor,
                      })
                    }
                    disabled={loadingMore}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        loadingMore ? "animate-spin" : ""
                      }`}
                    />
                    {loadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" />

            <div>
              <h2 className="font-semibold text-blue-950 dark:text-blue-200">
                User administration security
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                Customer records are loaded through protected administrative
                endpoints. Authentication credentials, passwords, PINs,
                OTPs and private security information are not exposed in this
                directory.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap justify-end gap-4">
          <Link
            to="/admin/kyc"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          >
            KYC review
            <ChevronRight className="h-4 w-4" />
          </Link>

          <Link
            to="/admin/audit-logs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Audit logs
            <ChevronRight className="h-4 w-4" />
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Users;