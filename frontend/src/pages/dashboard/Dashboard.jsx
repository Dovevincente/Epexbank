import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CreditCard,
  Landmark,
  PiggyBank,
  RefreshCw,
  Send,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth.js";
import useAccounts from "../../hooks/useAccounts.js";

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value ?? 0);
  const normalizedCurrency = String(currency || "USD").toUpperCase();

  if (!Number.isFinite(amount)) {
    return `${normalizedCurrency} 0.00`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
};

const maskAccountNumber = (accountNumber = "") => {
  const value = String(accountNumber ?? "").trim();

  if (!value) {
    return "Not available";
  }

  if (value.length <= 4) {
    return value;
  }

  return `•••• ${value.slice(-4)}`;
};

const formatAccountType = (type) => {
  const value = String(type ?? "ACCOUNT")
    .replaceAll("_", " ")
    .toLowerCase();

  return value.replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );
};

const getAccountStatusClasses = (status) => {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/60";

    case "FROZEN":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/60";

    case "SUSPENDED":
      return "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900/60";

    case "CLOSED":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/60";

    case "PENDING":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/60";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  }
};

const DashboardSkeleton = () => {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-3 h-9 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-2 h-5 w-80 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>

        <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-xl sm:p-8 lg:p-10">
          <div className="animate-pulse">
            <div className="h-4 w-32 rounded bg-slate-800" />

            <div className="mt-4 h-14 w-72 max-w-full rounded bg-slate-800" />

            <div className="mt-10 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div className="h-12 rounded bg-slate-900" />
              <div className="h-12 rounded bg-slate-900" />
              <div className="h-12 rounded bg-slate-900" />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="h-6 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-900"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    accounts,
    primaryAccount: account,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();

  const firstName = useMemo(() => {
    const profileFirstName = user?.profile?.firstName;
    const directFirstName = user?.firstName;

    if (profileFirstName) {
      return profileFirstName;
    }

    if (directFirstName) {
      return directFirstName;
    }

    if (user?.name) {
      return String(user.name).trim().split(/\s+/)[0];
    }

    return "Customer";
  }, [user]);

  const currencyCode = String(
    account?.currency?.code ||
      account?.currencyCode ||
      "USD",
  ).toUpperCase();

  const availableBalance = Number(
    account?.availableBalance ?? 0,
  );

  const ledgerBalance = Number(
    account?.ledgerBalance ?? 0,
  );

  const accountNumber = account?.accountNumber || "";
  const accountType = account?.type || "ACCOUNT";
  const accountStatus = account?.status || "UNKNOWN";

  const activeAccountCount = useMemo(
    () =>
      accounts.filter(
        (item) =>
          String(item?.status ?? "").toUpperCase() ===
          "ACTIVE",
      ).length,
    [accounts],
  );

  const currencies = useMemo(() => {
    return [
      ...new Set(
        accounts
          .map(
            (item) =>
              item?.currency?.code ||
              item?.currencyCode ||
              null,
          )
          .filter(Boolean)
          .map((value) => String(value).toUpperCase()),
      ),
    ];
  }, [accounts]);

  const hasMultipleAccounts = accounts.length > 1;

  const quickActions = [
    {
      title: "Send Money",
      description: "Transfer funds securely",
      icon: Send,
      path: "/transfers",
    },
    {
      title: "Add Money",
      description: "Fund your bank account",
      icon: ArrowDownToLine,
      path: "/wallet",
    },
    {
      title: "Cards",
      description: "Manage your bank cards",
      icon: CreditCard,
      path: "/cards",
    },
    {
      title: "Invest",
      description: "Explore investment options",
      icon: TrendingUp,
      path: "/investments",
    },
  ];

  const accountActions = [
    {
      title: "Accounts",
      description: "View balances and account details",
      icon: Landmark,
      path: "/accounts",
    },
    {
      title: "Transactions",
      description: "Review your transaction history",
      icon: ArrowUpRight,
      path: "/transactions",
    },
    {
      title: "Savings",
      description: "Manage your savings goals",
      icon: PiggyBank,
      path: "/savings",
    },
    {
      title: "Loans",
      description: "View financing and repayments",
      icon: WalletCards,
      path: "/loans",
    },
  ];

  if (accountsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Epex Bank
          </p>

          <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Welcome, {firstName}
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                Here&apos;s an overview of your finances.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/accounts")}
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:text-slate-300 dark:hover:text-white dark:focus:ring-white/20"
            >
              View accounts
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* API Error */}
        {accountsError && (
          <section
            role="alert"
            className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20 sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-rose-900 dark:text-rose-300">
                  Unable to load your account
                </h2>

                <p className="mt-1 text-sm leading-6 text-rose-700 dark:text-rose-400">
                  {accountsError}
                </p>
              </div>

              <button
                type="button"
                onClick={() => refreshAccounts()}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-900/20"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </section>
        )}

        {/* Main Account Card */}
        {account && (
          <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
            <div className="relative p-6 sm:p-8 lg:p-10">
              <div
                aria-hidden="true"
                className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/5 blur-2xl"
              />

              <div
                aria-hidden="true"
                className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl"
              />

              <div className="relative">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">
                      Available Balance
                    </p>

                    <div className="mt-2">
                      <span className="break-words text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                        {formatMoney(
                          availableBalance,
                          currencyCode,
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Available to spend or transfer
                    </p>
                  </div>

                  <div
                    className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ring-1 ${getAccountStatusClasses(
                      accountStatus,
                    )}`}
                  >
                    {accountStatus}
                  </div>
                </div>

                <div className="mt-8 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Account Number
                    </p>

                    <p className="mt-2 font-mono text-sm font-medium text-slate-200">
                      {maskAccountNumber(accountNumber)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Account Type
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-200">
                      {formatAccountType(accountType)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Ledger Balance
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-200">
                      {formatMoney(
                        ledgerBalance,
                        currencyCode,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Account Overview */}
        {account && (
          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total accounts
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {accounts.length}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Accounts linked to your profile
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Active accounts
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {activeAccountCount}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Currently available for banking activity
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Account currencies
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {currencies.length || 1}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {currencies.length
                  ? currencies.join(", ")
                  : currencyCode}
              </p>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Access your most-used banking services.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:focus:ring-white/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-900 transition group-hover:bg-slate-950 group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-white dark:group-hover:text-slate-950">
                      <Icon className="h-5 w-5" />
                    </div>

                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>

                  <h3 className="mt-5 font-semibold text-slate-950 dark:text-white">
                    {action.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Banking Services */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Your Banking
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your Epex Bank products and activity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {accountActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:focus:ring-white/20"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-950 dark:text-white">
                      {action.title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  </div>

                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Multiple Accounts */}
        {hasMultipleAccounts && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Multiple accounts
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  You have {accounts.length} accounts. The balance above
                  represents your primary account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/accounts")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                Manage accounts
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* No Account */}
        {!account && !accountsError && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <Landmark className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>

              <div>
                <h2 className="font-semibold text-amber-900 dark:text-amber-300">
                  No account found
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-400">
                  There is currently no bank account available on your
                  customer profile. If you believe this is incorrect,
                  please contact Epex Bank support.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/support")}
                  className="mt-3 text-sm font-semibold text-amber-900 underline underline-offset-4 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200"
                >
                  Contact support
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>Epex Bank · Secure digital banking</p>

            <p>
              {account
                ? `Primary account currency: ${currencyCode}`
                : "No active account"}
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default Dashboard;