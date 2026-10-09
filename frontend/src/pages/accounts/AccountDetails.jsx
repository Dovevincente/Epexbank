import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import api from "../../services/api.js";

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return `${currency} 0.00`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatAccountType = (type) => {
  return String(type || "ACCOUNT")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getStatusClasses = (status) => {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "FROZEN":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "CLOSED":
      return "bg-rose-50 text-rose-700 ring-rose-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const extractAccount = (responseData) => {
  if (!responseData) {
    return null;
  }

  if (responseData.id) {
    return responseData;
  }

  if (responseData.account?.id) {
    return responseData.account;
  }

  if (responseData.data?.id) {
    return responseData.data;
  }

  if (responseData.data?.account?.id) {
    return responseData.data.account;
  }

  return null;
};

const AccountDetailsSkeleton = () => {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-9 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded bg-slate-200" />
        </div>

        <div className="h-[300px] animate-pulse rounded-3xl bg-slate-950" />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-white shadow-sm"
            />
          ))}
        </div>
      </div>
    </main>
  );
};

const AccountDetails = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadAccount = useCallback(
    async ({ silent = false } = {}) => {
      if (!accountId) {
        setAccount(null);
        setError("No account was specified.");
        setLoading(false);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.get(
          `/accounts/${accountId}`,
        );

        const nextAccount = extractAccount(
          response?.data,
        );

        if (!nextAccount) {
          throw new Error(
            "The account information could not be read from the server.",
          );
        }

        setAccount(nextAccount);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load this account.";

        setAccount(null);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accountId],
  );

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const currencyCode =
    account?.currency?.code || "USD";

  const accountNumber =
    account?.accountNumber || "";

  const availableBalance = Number(
    account?.availableBalance ?? 0,
  );

  const ledgerBalance = Number(
    account?.ledgerBalance ?? 0,
  );

  const minimumBalance = Number(
    account?.minimumBalance ?? 0,
  );

  const accountType = formatAccountType(
    account?.type,
  );

  const accountStatus =
    account?.status || "UNKNOWN";

  const displayedAccountNumber = useMemo(() => {
    if (!accountNumber) {
      return "Not available";
    }

    if (
      showAccountNumber ||
      accountNumber.length <= 4
    ) {
      return accountNumber;
    }

    return `•••• •••• ${accountNumber.slice(-4)}`;
  }, [accountNumber, showAccountNumber]);

  const handleCopy = async () => {
    if (!accountNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        accountNumber,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return <AccountDetailsSkeleton />;
  }

  if (error || !account) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <button
            type="button"
            onClick={() => navigate("/accounts")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to accounts
          </button>

          <section className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Landmark className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-950">
              Unable to load account
            </h1>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              {error ||
                "The requested account could not be found."}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => loadAccount()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/accounts")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to accounts
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <header className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/accounts")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to accounts
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Epex Bank
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Account Details
              </h1>

              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                View your account information, balances and banking services.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadAccount({ silent: true })
              }
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </header>

        {copied && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Account number copied.
          </div>
        )}

        {/* Main balance card */}
        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="relative p-6 sm:p-8 lg:p-10">

            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

            <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {accountType}
                  </p>

                  <h2 className="mt-2 text-lg font-semibold text-white">
                    Epex Bank Account
                  </h2>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ring-1 ${getStatusClasses(
                    accountStatus,
                  )}`}
                >
                  {accountStatus}
                </span>
              </div>

              <div className="mt-8">
                <p className="text-sm font-medium text-slate-400">
                  Available Balance
                </p>

                <p className="mt-2 break-words text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  {formatMoney(
                    availableBalance,
                    currencyCode,
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Funds currently available for eligible banking operations.
                </p>
              </div>

              <div className="mt-8 border-t border-white/10 pt-6">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Account Number
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-semibold tracking-wider text-slate-200">
                    {displayedAccountNumber}
                  </span>

                  {accountNumber && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setShowAccountNumber(
                            (current) => !current,
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label={
                          showAccountNumber
                            ? "Hide account number"
                            : "Show account number"
                        }
                      >
                        {showAccountNumber ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCopy}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="Copy account number"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Account metrics */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <WalletCards className="h-5 w-5" />
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">
              Ledger Balance
            </p>

            <p className="mt-2 text-lg font-bold text-slate-950">
              {formatMoney(
                ledgerBalance,
                currencyCode,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Landmark className="h-5 w-5" />
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">
              Account Type
            </p>

            <p className="mt-2 text-lg font-bold text-slate-950">
              {accountType}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <CreditCard className="h-5 w-5" />
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">
              Currency
            </p>

            <p className="mt-2 text-lg font-bold text-slate-950">
              {currencyCode}
            </p>

            {account?.currency?.name && (
              <p className="mt-1 text-xs text-slate-500">
                {account.currency.name}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">
              Minimum Balance
            </p>

            <p className="mt-2 text-lg font-bold text-slate-950">
              {formatMoney(
                minimumBalance,
                currencyCode,
              )}
            </p>
          </div>

        </section>

        {/* Account information */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6 sm:p-7">
            <h2 className="text-lg font-bold text-slate-950">
              Account Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Important information associated with this bank account.
            </p>
          </div>

          <div className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Account ID
              </p>

              <p className="mt-2 break-all font-mono text-sm text-slate-700">
                {account.id}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Account Number
              </p>

              <p className="mt-2 font-mono text-sm font-semibold text-slate-900">
                {displayedAccountNumber}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Status
              </p>

              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                <span className="text-sm font-semibold text-slate-900">
                  {accountStatus}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Account Type
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                {accountType}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Available Balance
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatMoney(
                  availableBalance,
                  currencyCode,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Ledger Balance
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatMoney(
                  ledgerBalance,
                  currencyCode,
                )}
              </p>
            </div>

          </div>
        </section>

        {/* Actions */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">
              Account Services
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Access services related to this account.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/accounts/${account.id}/statement`,
                )
              }
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <WalletCards className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-950">
                  Account Statement
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Review your account statement.
                </p>
              </div>

              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-700" />
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/transactions")
              }
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <ArrowUpRight className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-950">
                  Transactions
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  View transactions for your banking activity.
                </p>
              </div>

              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-700" />
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/transfers/internal")
              }
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <CreditCard className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-950">
                  Transfer Money
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Transfer funds from this account.
                </p>
              </div>

              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-700" />
            </button>

          </div>
        </section>

        {/* Security notice */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-950">
                Keep your account information secure
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Never share your login credentials, passwords, one-time
                verification codes or other security information with another
                person.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Epex Bank · Secure digital banking
            </p>

            <p>
              Account: {accountType} · {currencyCode}
            </p>
          </div>
        </footer>

      </div>
    </main>
  );
};

export default AccountDetails;