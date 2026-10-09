import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const normalizeStatus = (status) =>
  String(status || "UNKNOWN").trim().toUpperCase();

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  const currencyCode =
    currency?.code ||
    currency?.currencyCode ||
    currency ||
    "USD";

  const decimals =
    Number.isInteger(Number(currency?.decimals))
      ? Number(currency.decimals)
      : 2;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(decimals)}`;
  }
};

const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) {
    return "••••••••••••";
  }

  const value = String(accountNumber);

  if (value.length <= 4) {
    return value;
  }

  return `•••• •••• ${value.slice(-4)}`;
};

const formatAccountType = (type) => {
  const value = String(type || "ACCOUNT")
    .replace(/_/g, " ")
    .trim();

  return value.replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
};

const AccountSummary = ({
  account = null,
  loading = false,
  error = "",
  onRetry,
  onViewAccount,
  showLedgerBalance = true,
  className = "",
}) => {
  const navigate = useNavigate();

  const [showAccountNumber, setShowAccountNumber] =
    useState(false);

  const currency = useMemo(
    () =>
      account?.currency?.code ||
      account?.currencyCode ||
      account?.currency ||
      "USD",
    [account],
  );

  const status = normalizeStatus(account?.status);

  const accountNumber =
    account?.accountNumber ||
    account?.number ||
    account?.iban ||
    "";

  const accountType = formatAccountType(
    account?.type,
  );

  const availableBalance =
    account?.availableBalance ??
    account?.balance ??
    0;

  const ledgerBalance =
    account?.ledgerBalance ??
    account?.balance ??
    0;

  const handleViewAccount = () => {
    if (typeof onViewAccount === "function") {
      onViewAccount(account);
      return;
    }

    if (account?.id) {
      navigate(`/accounts/${account.id}`);
    }
  };

  if (loading) {
    return (
      <section
        className={[
          "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
          "dark:border-slate-800 dark:bg-slate-900",
          className,
        ].join(" ")}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 w-48 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-4 w-36 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={[
          "rounded-3xl border border-red-100 bg-red-50 p-5",
          "dark:border-red-950 dark:bg-red-950/30",
          className,
        ].join(" ")}
      >
        <p className="text-sm font-bold text-red-800 dark:text-red-300">
          Account summary unavailable
        </p>

        <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
          {error}
        </p>

        {typeof onRetry === "function" && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700"
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!account) {
    return (
      <section
        className={[
          "rounded-3xl border border-slate-200 bg-white p-8 text-center",
          "dark:border-slate-800 dark:bg-slate-900",
          className,
        ].join(" ")}
      >
        <WalletCards className="mx-auto h-8 w-8 text-slate-400" />

        <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          No account available
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          Your account information will appear here when an eligible account is available.
        </p>
      </section>
    );
  }

  return (
    <section
      className={[
        "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Primary account
              </p>

              <h2 className="mt-1 truncate text-base font-bold text-slate-900 dark:text-white">
                {accountType}
              </h2>
            </div>
          </div>

          <span
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1",
              "text-[10px] font-bold uppercase tracking-wide",
              status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            ].join(" ")}
          >
            {status === "ACTIVE" && (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {status}
          </span>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/70">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Available balance
          </p>

          <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {formatMoney(
              availableBalance,
              currency,
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-400">
              {showAccountNumber
                ? accountNumber || "Account number unavailable"
                : maskAccountNumber(accountNumber)}
            </span>

            {accountNumber && (
              <button
                type="button"
                onClick={() =>
                  setShowAccountNumber(
                    (current) => !current,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
              >
                {showAccountNumber ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}

                {showAccountNumber
                  ? "Hide"
                  : "Show"}
              </button>
            )}
          </div>
        </div>

        {showLedgerBalance && (
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Ledger balance
            </span>

            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatMoney(
                ledgerBalance,
                currency,
              )}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleViewAccount}
          className="group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
        >
          <span>View account details</span>

          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
};

export default AccountSummary;