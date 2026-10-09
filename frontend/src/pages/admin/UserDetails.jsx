import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Copy,
  CreditCard,
  FileCheck2,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const normalizeCustomer = (payload) => {
  const source =
    payload?.customer ??
    payload?.user ??
    payload?.data?.customer ??
    payload?.data?.user ??
    payload?.data ??
    payload ??
    {};

  return {
    ...source,
    id: source?.id ?? source?.userId ?? "",
    firstName: source?.firstName ?? source?.first_name ?? "",
    lastName: source?.lastName ?? source?.last_name ?? "",
    email: source?.email ?? source?.emailAddress ?? "",
    phone:
      source?.phone ??
      source?.phoneNumber ??
      source?.mobile ??
      "",
    role: source?.role ?? "CUSTOMER",
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
    createdAt:
      source?.createdAt ??
      source?.created_at ??
      source?.registeredAt ??
      null,
    updatedAt:
      source?.updatedAt ??
      source?.updated_at ??
      null,
    country:
      source?.country ??
      source?.countryCode ??
      source?.profile?.country ??
      "",
    city:
      source?.city ??
      source?.profile?.city ??
      "",
    address:
      source?.address ??
      source?.profile?.address ??
      "",
    dateOfBirth:
      source?.dateOfBirth ??
      source?.date_of_birth ??
      source?.profile?.dateOfBirth ??
      null,
    accounts: Array.isArray(source?.accounts)
      ? source.accounts
      : Array.isArray(source?.bankAccounts)
        ? source.bankAccounts
        : [],
    transactions: Array.isArray(source?.transactions)
      ? source.transactions
      : [],
    kyc: source?.kyc ?? source?.verification ?? null,
  };
};

const normalizeAccounts = (payload, customer) => {
  const source = payload?.data ?? payload ?? {};

  const accounts =
    (Array.isArray(source?.accounts) && source.accounts) ||
    (Array.isArray(source?.items) && source.items) ||
    (Array.isArray(source) && source) ||
    customer?.accounts ||
    [];

  return accounts;
};

const normalizeTransactions = (payload) => {
  const source = payload?.data ?? payload ?? {};

  return (
    (Array.isArray(source?.transactions) && source.transactions) ||
    (Array.isArray(source?.items) && source.items) ||
    (Array.isArray(source?.results) && source.results) ||
    (Array.isArray(source) && source) ||
    []
  );
};

const normalizeTransaction = (transaction) => {
  const amount = Number(
    transaction?.amount ??
      transaction?.value ??
      transaction?.totalAmount ??
      0,
  );

  return {
    ...transaction,
    id:
      transaction?.id ??
      transaction?.transactionId ??
      transaction?.reference ??
      "",
    reference:
      transaction?.reference ??
      transaction?.transactionReference ??
      "",
    type:
      transaction?.type ??
      transaction?.transactionType ??
      transaction?.category ??
      "UNKNOWN",
    status:
      transaction?.status ??
      transaction?.transactionStatus ??
      "UNKNOWN",
    amount: Number.isFinite(amount) ? amount : 0,
    currency:
      transaction?.currency?.code ??
      transaction?.currencyCode ??
      transaction?.currency ??
      "USD",
    description:
      transaction?.description ??
      transaction?.narration ??
      transaction?.memo ??
      "Transaction",
    createdAt:
      transaction?.createdAt ??
      transaction?.date ??
      transaction?.transactionDate ??
      transaction?.processedAt ??
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

const formatDateTime = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatMoney = (amount, currency = "USD") => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${numericAmount.toFixed(
      2,
    )}`;
  }
};

const getFullName = (customer) => {
  const fullName =
    `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim();

  return (
    fullName ||
    customer?.name ||
    customer?.fullName ||
    customer?.displayName ||
    "Customer"
  );
};

const getInitials = (customer) => {
  const first = String(customer?.firstName ?? "").trim();
  const last = String(customer?.lastName ?? "").trim();

  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }

  const name = getFullName(customer);

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
};

const getAccountNumber = (account) =>
  account?.accountNumber ??
  account?.number ??
  account?.maskedAccountNumber ??
  "";

const maskAccountNumber = (value) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) return "Not available";

  if (normalized.length <= 4) return normalized;

  return `•••• ${normalized.slice(-4)}`;
};

const getAccountBalance = (account) => {
  const value =
    account?.availableBalance ??
    account?.balance ??
    account?.ledgerBalance ??
    0;

  return Number(value);
};

const getAccountCurrency = (account) =>
  account?.currency?.code ??
  account?.currencyCode ??
  account?.currency ??
  "USD";

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status);

  if (
    ["ACTIVE", "APPROVED", "VERIFIED", "COMPLETED"].includes(
      normalized,
    )
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (
    ["PENDING", "IN_REVIEW", "PROCESSING"].includes(
      normalized,
    )
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
  }

  if (
    ["BLOCKED", "SUSPENDED", "REJECTED", "FAILED", "CLOSED"].includes(
      normalized,
    )
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
        normalized,
      )}`}
    >
      {["ACTIVE", "APPROVED", "VERIFIED", "COMPLETED"].includes(
        normalized,
      ) ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : ["BLOCKED", "SUSPENDED", "REJECTED", "FAILED", "CLOSED"].includes(
          normalized,
        ) ? (
        <XCircle className="h-3.5 w-3.5" />
      ) : (
        <Activity className="h-3.5 w-3.5" />
      )}

      {normalized}
    </span>
  );
};

const AdminUserDetails = () => {
  const { userId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchCustomer = useCallback(
    async (isRefresh = false) => {
      if (!userId) {
        setError("Customer ID is missing from the URL.");
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const customerResponse = await api.get(
          `/admin/customers/${encodeURIComponent(userId)}`,
        );

        const normalizedCustomer = normalizeCustomer(
          customerResponse?.data,
        );

        setCustomer(normalizedCustomer);

        const [accountsResponse, transactionsResponse] =
          await Promise.allSettled([
            api.get(
              `/admin/customers/${encodeURIComponent(
                userId,
              )}/accounts`,
            ),
            api.get(
              `/admin/customers/${encodeURIComponent(
                userId,
              )}/transactions`,
              {
                params: {
                  limit: 10,
                },
              },
            ),
          ]);

        if (accountsResponse.status === "fulfilled") {
          setAccounts(
            normalizeAccounts(
              accountsResponse.value?.data,
              normalizedCustomer,
            ),
          );
        } else {
          setAccounts(normalizedCustomer.accounts ?? []);
        }

        if (transactionsResponse.status === "fulfilled") {
          setTransactions(
            normalizeTransactions(
              transactionsResponse.value?.data,
            ).map(normalizeTransaction),
          );
        } else {
          setTransactions(
            (normalizedCustomer.transactions ?? []).map(
              normalizeTransaction,
            ),
          );
        }
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load the customer profile.";

        setError(message);
        setCustomer(null);
        setAccounts([]);
        setTransactions([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const totals = useMemo(() => {
    const balancesByCurrency = {};

    accounts.forEach((account) => {
      const currency = String(
        getAccountCurrency(account),
      ).toUpperCase();

      const balance = getAccountBalance(account);

      if (!Number.isFinite(balance)) return;

      balancesByCurrency[currency] =
        (balancesByCurrency[currency] ?? 0) + balance;
    });

    const activeAccounts = accounts.filter(
      (account) =>
        normalizeStatus(account?.status) === "ACTIVE",
    ).length;

    return {
      activeAccounts,
      totalAccounts: accounts.length,
      balancesByCurrency,
    };
  }, [accounts]);

  const recentTransactions = useMemo(
    () => transactions.slice(0, 10),
    [transactions],
  );

  const copyValue = async (value) => {
    if (!value || !navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      // Clipboard permissions may be unavailable.
    }
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/admin/customers"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Customers
          </Link>

          <button
            type="button"
            onClick={() => fetchCustomer(true)}
            disabled={loading || refreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

              <div>
                <h2 className="font-semibold text-red-800 dark:text-red-300">
                  Customer profile could not be loaded
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => fetchCustomer()}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <>
            <div className="h-56 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl bg-white dark:bg-slate-900"
                />
              ))}
            </div>
          </>
        ) : customer ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="h-28 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900" />

              <div className="px-5 pb-6 sm:px-7">
                <div className="-mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700 shadow-lg dark:border-slate-900 dark:bg-blue-950/60 dark:text-blue-300">
                      {getInitials(customer)}
                    </div>

                    <div className="pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                          {getFullName(customer)}
                        </h1>

                        <StatusBadge status={customer.status} />
                      </div>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Customer ID: {customer.id || "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pb-1">
                    <Link
                      to={`/admin/customers/${encodeURIComponent(
                        customer.id,
                      )}/accounts`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      <Wallet className="h-4 w-4" />
                      Accounts
                    </Link>

                    <Link
                      to="/admin/kyc"
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      KYC
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    <Wallet className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Accounts
                    </p>
                    <p className="text-xl font-bold text-slate-950 dark:text-white">
                      {totals.totalAccounts}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {totals.activeAccounts} active account
                  {totals.activeAccounts === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Banknote className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Account balances
                    </p>

                    <p className="text-xl font-bold text-slate-950 dark:text-white">
                      {Object.keys(totals.balancesByCurrency).length}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  {Object.entries(totals.balancesByCurrency).map(
                    ([currency, amount]) => (
                      <p
                        key={currency}
                        className="text-xs font-medium text-slate-500 dark:text-slate-400"
                      >
                        {formatMoney(amount, currency)}
                      </p>
                    ),
                  )}

                  {Object.keys(totals.balancesByCurrency).length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No balance data
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    <Activity className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Recent activity
                    </p>

                    <p className="text-xl font-bold text-slate-950 dark:text-white">
                      {recentTransactions.length}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Transactions returned by the admin activity endpoint
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <BadgeCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      KYC status
                    </p>

                    <div className="mt-1">
                      <StatusBadge status={customer.kycStatus} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <CircleUserRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                    <div>
                      <h2 className="font-bold text-slate-950 dark:text-white">
                        Customer profile
                      </h2>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Identity and contact information available to the
                        administration API.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Email
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {customer.email || "Not available"}
                        </p>

                        {customer.email && (
                          <button
                            type="button"
                            onClick={() =>
                              copyValue(customer.email)
                            }
                            aria-label="Copy customer email"
                            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Phone
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {customer.phone || "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Location
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {[customer.city, customer.country]
                          .filter(Boolean)
                          .join(", ") || "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Date of birth
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatDate(customer.dateOfBirth)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Customer since
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatDate(customer.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Role
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {normalizeStatus(customer.role)}
                      </p>
                    </div>
                  </div>

                  {customer.address && (
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Address
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                          {customer.address}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />

                    <div>
                      <h2 className="font-bold text-slate-950 dark:text-white">
                        Verification
                      </h2>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Customer verification information.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      KYC status
                    </p>

                    <div className="mt-2">
                      <StatusBadge status={customer.kycStatus} />
                    </div>
                  </div>

                  {customer.kyc?.reference && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        KYC reference
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {customer.kyc.reference}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            copyValue(customer.kyc.reference)
                          }
                          aria-label="Copy KYC reference"
                          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {customer.kyc?.updatedAt && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Last KYC update
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatDateTime(customer.kyc.updatedAt)}
                      </p>
                    </div>
                  )}

                  <Link
                    to="/admin/kyc"
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Open KYC review
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Customer accounts
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Banking accounts linked to this customer.
                  </p>
                </div>

                <Link
                  to={`/admin/customers/${encodeURIComponent(
                    customer.id,
                  )}/accounts`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Manage accounts
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {accounts.length === 0 ? (
                <div className="p-8 text-center">
                  <Wallet className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />

                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                    No accounts returned
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    The administration API did not return any accounts for
                    this customer.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  {accounts.map((account) => {
                    const accountId = account?.id;
                    const accountNumber =
                      getAccountNumber(account);
                    const currency =
                      getAccountCurrency(account);
                    const balance =
                      getAccountBalance(account);

                    return (
                      <article
                        key={accountId || accountNumber}
                        className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {account?.type ??
                                account?.accountType ??
                                "Account"}
                            </p>

                            <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                              {maskAccountNumber(accountNumber)}
                            </p>
                          </div>

                          <StatusBadge status={account?.status} />
                        </div>

                        <div className="mt-5 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Available balance
                            </p>

                            <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                              {formatMoney(balance, currency)}
                            </p>
                          </div>

                          {accountId && (
                            <Link
                              to={`/admin/customers/${encodeURIComponent(
                                customer.id,
                              )}/accounts/${encodeURIComponent(
                                accountId,
                              )}`}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300"
                            >
                              Review
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Recent transactions
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Latest transaction activity returned for this customer.
                    </p>
                  </div>
                </div>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />

                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                    No recent transactions
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    No transaction activity was returned for this customer.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[850px]">
                      <thead className="bg-slate-50 dark:bg-slate-950/50">
                        <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Transaction
                          </th>
                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Type
                          </th>
                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Amount
                          </th>
                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Status
                          </th>
                          <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Date
                          </th>
                          <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentTransactions.map((transaction) => {
                          const isCredit = [
                            "CREDIT",
                            "DEPOSIT",
                            "INTEREST",
                            "REFUND",
                          ].includes(
                            normalizeStatus(transaction.type),
                          );

                          return (
                            <tr
                              key={
                                transaction.id ||
                                transaction.reference
                              }
                              className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50"
                            >
                              <td className="px-5 py-4">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {transaction.description}
                                </p>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {transaction.reference ||
                                    transaction.id ||
                                    "No reference"}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {isCredit ? (
                                    <ArrowDownLeft className="h-3.5 w-3.5" />
                                  ) : (
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  )}
                                  {normalizeStatus(
                                    transaction.type,
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <p
                                  className={`text-sm font-bold ${
                                    isCredit
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {isCredit ? "+" : "-"}
                                  {formatMoney(
                                    transaction.amount,
                                    transaction.currency,
                                  )}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <StatusBadge
                                  status={transaction.status}
                                />
                              </td>

                              <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                                {formatDateTime(
                                  transaction.createdAt,
                                )}
                              </td>

                              <td className="px-5 py-4 text-right">
                                {transaction.id && (
                                  <Link
                                    to={`/admin/transactions/${encodeURIComponent(
                                      transaction.id,
                                    )}`}
                                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300"
                                  >
                                    Review
                                    <ChevronRight className="h-4 w-4" />
                                  </Link>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
                    {recentTransactions.map((transaction) => {
                      const isCredit = [
                        "CREDIT",
                        "DEPOSIT",
                        "INTEREST",
                        "REFUND",
                      ].includes(
                        normalizeStatus(transaction.type),
                      );

                      return (
                        <article
                          key={
                            transaction.id ||
                            transaction.reference
                          }
                          className="p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {transaction.description}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                {transaction.reference ||
                                  transaction.id ||
                                  "No reference"}
                              </p>
                            </div>

                            <StatusBadge
                              status={transaction.status}
                            />
                          </div>

                          <div className="mt-4 flex items-end justify-between gap-4">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {normalizeStatus(
                                  transaction.type,
                                )}
                              </p>

                              <p
                                className={`mt-1 text-lg font-bold ${
                                  isCredit
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {isCredit ? "+" : "-"}
                                {formatMoney(
                                  transaction.amount,
                                  transaction.currency,
                                )}
                              </p>
                            </div>

                            <p className="text-right text-xs text-slate-500 dark:text-slate-400">
                              {formatDateTime(
                                transaction.createdAt,
                              )}
                            </p>
                          </div>

                          {transaction.id && (
                            <Link
                              to={`/admin/transactions/${encodeURIComponent(
                                transaction.id,
                              )}`}
                              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-300"
                            >
                              Review transaction
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />

                <div>
                  <h2 className="font-semibold text-amber-950 dark:text-amber-200">
                    Administrative security
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-300">
                    Customer information displayed here comes from protected
                    administration endpoints. Passwords, OTPs, PINs,
                    authentication tokens and other credentials should never
                    be displayed in the admin interface.
                  </p>
                </div>
              </div>
            </section>

            <footer className="flex justify-end">
              <Link
                to="/admin/audit-logs"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
              >
                Review administrative audit logs
                <ChevronRight className="h-4 w-4" />
              </Link>
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AdminUserDetails;