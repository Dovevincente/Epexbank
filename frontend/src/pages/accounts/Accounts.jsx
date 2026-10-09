import { useNavigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Building2,
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
import { useState } from "react";

import useAccounts from "../../hooks/useAccounts.js";

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

const AccountCard = ({ account, onCopy }) => {
  const navigate = useNavigate();
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const accountNumber = String(account?.accountNumber || "");
  const currencyCode = account?.currency?.code || "USD";

  const availableBalance = Number(
    account?.availableBalance ?? 0,
  );

  const ledgerBalance = Number(
    account?.ledgerBalance ?? 0,
  );

  const status = account?.status || "UNKNOWN";

  const displayedAccountNumber =
    showAccountNumber || accountNumber.length <= 4
      ? accountNumber || "Not available"
      : `•••• •••• ${accountNumber.slice(-4)}`;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">

      {/* Account header */}
      <div className="bg-slate-950 p-6 text-white sm:p-7">
        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Landmark className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-400">
                {formatAccountType(account?.type)}
              </p>

              <h2 className="mt-1 truncate text-base font-semibold sm:text-lg">
                Epex Bank Account
              </h2>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${getStatusClasses(
              status,
            )}`}
          >
            {status}
          </span>
        </div>

        {/* Balance */}
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Available Balance
          </p>

          <p className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">
            {formatMoney(
              availableBalance,
              currencyCode,
            )}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Available for transfers and payments
          </p>
        </div>
      </div>

      {/* Account information */}
      <div className="p-6 sm:p-7">

        <div className="grid gap-5 sm:grid-cols-2">

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Account Number
            </p>

            <div className="mt-2 flex items-center gap-2">
              <p className="font-mono text-sm font-semibold tracking-wide text-slate-900">
                {displayedAccountNumber}
              </p>

              {accountNumber && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setShowAccountNumber(
                        (current) => !current,
                      )
                    }
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
                    onClick={() => onCopy(accountNumber)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Copy account number"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Currency
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-900">
              {currencyCode}
              {account?.currency?.name
                ? ` · ${account.currency.name}`
                : ""}
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

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Account Status
            </p>

            <div className="mt-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />

              <span className="text-sm font-semibold text-slate-900">
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Account actions */}
        <div className="mt-7 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-3">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/accounts/${account.id}`,
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Account details
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/transactions")
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Transactions
            <ArrowUpRight className="h-4 w-4" />
          </button>

          <button
  type="button"
  onClick={() =>
    navigate(`/accounts/${account.id}/statement`)
  }
  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
>
  Statement
  <ArrowDownToLine className="h-4 w-4" />
</button>
        </div>
      </div>
    </article>
  );
};

const Accounts = () => {
  const {
    accounts,
    loading,
    error,
    refresh,
  } = useAccounts();

  const [copied, setCopied] = useState(false);

  const handleCopy = async (value) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

          <div className="mb-8">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />

            <div className="mt-3 h-9 w-48 animate-pulse rounded bg-slate-200" />

            <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded bg-slate-200" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-[430px] animate-pulse rounded-3xl bg-white shadow-sm"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <header className="mb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="text-sm font-medium text-slate-500">
                Epex Bank
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Your Accounts
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                View your balances, account details and banking activity.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </header>

        {/* Copied notification */}
        {copied && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Account number copied.
          </div>
        )}

        {/* Error */}
        {error && (
          <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-rose-900">
                  Unable to load accounts
                </h2>

                <p className="mt-1 text-sm leading-6 text-rose-700">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => refresh()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </section>
        )}

        {/* Account cards */}
        {!error && accounts.length > 0 && (
          <section className="grid gap-6 lg:grid-cols-2">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onCopy={handleCopy}
              />
            ))}
          </section>
        )}

        {/* Empty state */}
        {!error && accounts.length === 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Building2 className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-950">
              No accounts found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              There are currently no bank accounts available on your
              customer profile. Contact Epex Bank support if you believe
              an account should be available.
            </p>

            <button
              type="button"
              onClick={() => refresh()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Check again
            </button>
          </section>
        )}

        {/* Security information */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-950">
              Secure banking
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Your account information is protected through your authenticated
              Epex Bank session.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <WalletCards className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-950">
              Available balance
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Available balances reflect funds currently available for
              eligible banking operations.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <CreditCard className="h-5 w-5" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-950">
              Account services
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Access transactions, statements and other account services
              from your banking dashboard.
            </p>
          </div>

        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Epex Bank · Secure digital banking
            </p>

            <p>
              {accounts.length}{" "}
              {accounts.length === 1
                ? "account"
                : "accounts"}
            </p>
          </div>
        </footer>

      </div>
    </main>
  );
};

export default Accounts;