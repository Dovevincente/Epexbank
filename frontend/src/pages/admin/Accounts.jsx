import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";

const PAGE_SIZE = 12;

const normalizeAccountsResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.accounts)) {
    return payload.accounts;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.accounts)) {
    return payload.data.accounts;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

const normalizeCustomer = (account) => {
  const customer =
    account?.user ||
    account?.customer ||
    account?.owner ||
    account?.customerProfile ||
    null;

  return {
    id: customer?.id || account?.userId || account?.customerId || "",
    name:
      customer?.name ||
      customer?.fullName ||
      [customer?.firstName, customer?.lastName]
        .filter(Boolean)
        .join(" ") ||
      customer?.email ||
      "Customer",
    email: customer?.email || "",
  };
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${amount.toFixed(2)}`;
  }
};

const getCurrencyCode = (account) => {
  if (typeof account?.currency === "string") {
    return account.currency;
  }

  return (
    account?.currency?.code ||
    account?.currencyCode ||
    account?.currency?.isoCode ||
    "USD"
  );
};

const getAccountStatus = (account) =>
  String(account?.status || "UNKNOWN").toUpperCase();

const statusClass = (status) => {
  switch (String(status).toUpperCase()) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "BLOCKED":
    case "SUSPENDED":
    case "FROZEN":
      return "border-red-200 bg-red-50 text-red-700";
    case "CLOSED":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const getCustomerName = (account) => normalizeCustomer(account).name;

const getCustomerEmail = (account) => normalizeCustomer(account).email;

const getAccountType = (account) =>
  String(account?.type || account?.accountType || "ACCOUNT")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const AdminAccounts = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const loadAccounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      /*
       * The admin backend currently exposes customer/account management
       * under /api/admin/customers. We request the customer list and
       * flatten their accounts into one administrative account view.
       */
      const response = await api.get("/admin/customers");

      const customers = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.customers)
          ? response.data.customers
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : Array.isArray(response?.data?.data?.customers)
              ? response.data.data.customers
              : [];

      const flattenedAccounts = [];

      customers.forEach((customer) => {
        const customerAccounts = Array.isArray(customer?.accounts)
          ? customer.accounts
          : [];

        customerAccounts.forEach((account) => {
          flattenedAccounts.push({
            ...account,
            userId:
              account?.userId ||
              customer?.id ||
              customer?.user?.id ||
              customer?.customerId,
            customerId:
              account?.customerId ||
              customer?.id ||
              customer?.user?.id ||
              customer?.customerId,
            user: account?.user || customer?.user || customer,
            customer: account?.customer || customer,
          });
        });
      });

      /*
       * Some backend deployments may return accounts directly rather
       * than nested customer records. Preserve compatibility with that
       * response shape without introducing fake data.
       */
      if (!flattenedAccounts.length) {
        const directAccounts = normalizeAccountsResponse(response?.data);

        directAccounts.forEach((account) => {
          flattenedAccounts.push(account);
        });
      }

      setAccounts(flattenedAccounts);
      setPage(1);
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to load customer accounts.";

      setError(message);
      setAccounts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const accountTypes = useMemo(() => {
    const types = new Set();

    accounts.forEach((account) => {
      const type = String(
        account?.type || account?.accountType || "",
      ).toUpperCase();

      if (type) {
        types.add(type);
      }
    });

    return Array.from(types).sort();
  }, [accounts]);

  const statuses = useMemo(() => {
    const statusSet = new Set();

    accounts.forEach((account) => {
      const status = getAccountStatus(account);

      if (status) {
        statusSet.add(status);
      }
    });

    return Array.from(statusSet).sort();
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const customerName = getCustomerName(account).toLowerCase();
      const customerEmail = getCustomerEmail(account).toLowerCase();
      const accountNumber = String(account?.accountNumber || "").toLowerCase();
      const accountId = String(account?.id || "").toLowerCase();
      const type = String(
        account?.type || account?.accountType || "",
      ).toUpperCase();
      const status = getAccountStatus(account);

      const matchesSearch =
        !normalizedSearch ||
        customerName.includes(normalizedSearch) ||
        customerEmail.includes(normalizedSearch) ||
        accountNumber.includes(normalizedSearch) ||
        accountId.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      const matchesType = typeFilter === "ALL" || type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [accounts, search, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredAccounts.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredAccounts]);

  const statistics = useMemo(() => {
    let active = 0;
    let blocked = 0;
    let suspended = 0;
    let totalBalance = 0;

    accounts.forEach((account) => {
      const status = getAccountStatus(account);

      if (status === "ACTIVE") active += 1;
      if (status === "BLOCKED" || status === "FROZEN") blocked += 1;
      if (status === "SUSPENDED") suspended += 1;

      const balance = Number(
        account?.ledgerBalance ??
          account?.availableBalance ??
          account?.balance ??
          0,
      );

      if (Number.isFinite(balance)) {
        totalBalance += balance;
      }
    });

    return {
      total: accounts.length,
      active,
      blocked: blocked + suspended,
      totalBalance,
    };
  }, [accounts]);

  const openAccount = (account) => {
    const customerId =
      account?.userId ||
      account?.customerId ||
      account?.user?.id ||
      account?.customer?.id;

    const accountId = account?.id;

    if (!customerId || !accountId) {
      return;
    }

    navigate(
      `/admin/customers/${encodeURIComponent(
        customerId,
      )}/accounts/${encodeURIComponent(accountId)}`,
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
              <div>
                <p className="font-semibold text-slate-900">
                  Loading customer accounts
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Retrieving live account information from Epex Bank.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !accounts.length) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              Unable to load accounts
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadAccounts()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to admin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Protected administration
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Customer accounts
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Review customer banking accounts, balances, account types,
                and operational status from the administrative console.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadAccounts(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Account data warning</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Total accounts
              </span>
              <WalletCards className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Active accounts
              </span>
              <CircleDollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {statistics.active}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Restricted accounts
              </span>
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {statistics.blocked}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Account balances
              </span>
              <Building2 className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-xl font-bold text-slate-950">
              {formatMoney(statistics.totalBalance, "USD")}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Display total across returned accounts
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Account directory
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredAccounts.length} account
                  {filteredAccounts.length === 1 ? "" : "s"} match the
                  current filters.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search customer or account..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All account types</option>
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>

                {(search ||
                  statusFilter !== "ALL" ||
                  typeFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {paginatedAccounts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <WalletCards className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-950">
                No accounts found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                No customer accounts match the current search and filter
                settings.
              </p>

              {(search ||
                statusFilter !== "ALL" ||
                typeFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Account</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Balance</th>
                      <th className="px-5 py-4">Available</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedAccounts.map((account) => {
                      const currency = getCurrencyCode(account);
                      const status = getAccountStatus(account);
                      const customerName = getCustomerName(account);
                      const customerEmail = getCustomerEmail(account);

                      return (
                        <tr
                          key={account?.id || account?.accountNumber}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {customerName}
                                </p>
                                {customerEmail ? (
                                  <p className="truncate text-xs text-slate-500">
                                    {customerEmail}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {account?.accountNumber || "—"}
                            </p>
                            <p className="mt-1 max-w-[150px] truncate text-xs text-slate-400">
                              {account?.id || "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {getAccountType(account)}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">
                              {formatMoney(
                                account?.ledgerBalance ??
                                  account?.balance ??
                                  0,
                                currency,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                            {formatMoney(
                              account?.availableBalance ??
                                account?.ledgerBalance ??
                                account?.balance ??
                                0,
                              currency,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                status,
                              )}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openAccount(account)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4" />
                              Review
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {paginatedAccounts.map((account) => {
                  const currency = getCurrencyCode(account);
                  const status = getAccountStatus(account);
                  const customerName = getCustomerName(account);
                  const customerEmail = getCustomerEmail(account);

                  return (
                    <article
                      key={account?.id || account?.accountNumber}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-slate-950">
                              {customerName}
                            </h3>
                            {customerEmail ? (
                              <p className="truncate text-xs text-slate-500">
                                {customerEmail}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                            status,
                          )}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Account
                          </p>
                          <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
                            {account?.accountNumber || "—"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Type
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {getAccountType(account)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Balance
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatMoney(
                              account?.ledgerBalance ??
                                account?.balance ??
                                0,
                              currency,
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-medium text-slate-500">
                            Available
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatMoney(
                              account?.availableBalance ??
                                account?.ledgerBalance ??
                                account?.balance ??
                                0,
                              currency,
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openAccount(account)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4" />
                        Review account
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredAccounts.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredAccounts.length}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1),
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>
            Administrative account information is retrieved from the protected
            Epex Bank API. Account balances and status changes should only be
            performed through authorized server-side administrative operations
            with appropriate audit controls.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAccounts;