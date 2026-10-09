import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  const code =
    currency?.code ||
    currency?.currencyCode ||
    currency ||
    "USD";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
};

const BalanceCard = ({
  account = null,
  totalAvailableBalance,
  totalLedgerBalance,
  currency,
  loading = false,
  refreshing = false,
  error = "",
  onRefresh,
  onDeposit,
  onWithdraw,
  onTransfer,
  className = "",
}) => {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);

  const currencyCode = useMemo(
    () =>
      currency ||
      account?.currency?.code ||
      account?.currencyCode ||
      "USD",
    [account, currency],
  );

  const available =
    totalAvailableBalance ??
    account?.availableBalance ??
    account?.balance ??
    0;

  const ledger =
    totalLedgerBalance ??
    account?.ledgerBalance ??
    account?.balance ??
    0;

  const displayBalance = hidden
    ? "••••••"
    : formatMoney(available, currencyCode);

  const displayLedger = hidden
    ? "••••••"
    : formatMoney(ledger, currencyCode);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-6",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.38),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(14,116,144,0.24),transparent_45%)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Wallet className="h-5 w-5 text-white" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Total available balance
              </p>

              <p className="mt-1 text-sm font-semibold text-white/90">
                Epex Bank
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setHidden((current) => !current)
              }
              className="rounded-xl p-2.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label={
                hidden
                  ? "Show balance"
                  : "Hide balance"
              }
            >
              {hidden ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </button>

            {typeof onRefresh === "function" && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="rounded-xl p-2.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label="Refresh balance"
              >
                <RefreshCw
                  className={[
                    "h-5 w-5",
                    refreshing
                      ? "animate-spin"
                      : "",
                  ].join(" ")}
                />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="mt-8 animate-pulse">
            <div className="h-11 w-52 rounded-lg bg-white/10" />
            <div className="mt-3 h-4 w-32 rounded bg-white/10" />
          </div>
        ) : error ? (
          <div className="mt-7 rounded-2xl border border-red-300/20 bg-red-500/10 p-4">
            <p className="text-sm font-bold text-red-200">
              Balance unavailable
            </p>

            <p className="mt-1 text-xs leading-5 text-red-100/80">
              {error}
            </p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (account?.id) {
                  navigate(
                    `/accounts/${account.id}`,
                  );
                } else {
                  navigate("/accounts");
                }
              }}
              className="mt-8 text-left"
            >
              <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                {displayBalance}
              </p>

              <p className="mt-2 text-xs text-white/50">
                {account?.accountNumber
                  ? `Account ending ${String(
                      account.accountNumber,
                    ).slice(-4)}`
                  : "Across eligible accounts"}
              </p>
            </button>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Ledger balance
                </p>

                <p className="mt-2 text-sm font-bold text-white">
                  {displayLedger}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Currency
                </p>

                <p className="mt-2 text-sm font-bold text-white">
                  {currencyCode}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={
              onDeposit ||
              (() => navigate("/wallet/deposit"))
            }
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-xs font-bold text-white transition hover:bg-white/15"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Deposit
          </button>

          <button
            type="button"
            onClick={
              onWithdraw ||
              (() => navigate("/wallet/withdraw"))
            }
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-xs font-bold text-white transition hover:bg-white/15"
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdraw
          </button>

          <button
            type="button"
            onClick={
              onTransfer ||
              (() => navigate("/transfers"))
            }
            className="flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-2 text-xs font-bold text-white transition hover:bg-blue-500"
          >
            Transfer
          </button>
        </div>
      </div>
    </section>
  );
};

export default BalanceCard;