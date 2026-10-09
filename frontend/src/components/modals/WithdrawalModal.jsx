import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  WalletCards,
  X,
} from "lucide-react";

const INITIAL_FORM = {
  accountId: "",
  amount: "",
  method: "BANK_TRANSFER",
  destination: "",
  description: "",
};

const WITHDRAWAL_METHODS = [
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
  },
  {
    value: "CASH",
    label: "Cash",
  },
  {
    value: "CARD",
    label: "Card / ATM",
  },
];

const getAccountBalance = (account) => {
  const value = Number(
    account?.availableBalance ??
      account?.balance ??
      account?.ledgerBalance ??
      0,
  );

  return Number.isFinite(value) ? value : 0;
};

const formatAmount = (value, currency = "USD") => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const WithdrawalModal = ({
  isOpen = false,
  onClose,
  onSubmit,
  accounts = [],
  selectedAccount = null,
  currency = "USD",
  loading = false,
  title = "Withdraw Funds",
}) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setError("");
      setSuccess("");
      return;
    }

    const initialAccount =
      selectedAccount?.id ||
      accounts.find(
        (account) =>
          String(account?.status ?? "").toUpperCase() === "ACTIVE",
      )?.id ||
      accounts[0]?.id ||
      "";

    setForm({
      accountId: initialAccount,
      amount: "",
      method: "BANK_TRANSFER",
      destination: "",
      description: "",
    });

    setError("");
    setSuccess("");
  }, [accounts, isOpen, selectedAccount]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  const activeAccount = useMemo(() => {
    if (selectedAccount?.id) {
      return (
        accounts.find(
          (account) => String(account?.id) === String(selectedAccount.id),
        ) || selectedAccount
      );
    }

    return (
      accounts.find(
        (account) => String(account?.id) === String(form.accountId),
      ) || null
    );
  }, [accounts, form.accountId, selectedAccount]);

  const availableBalance = getAccountBalance(activeAccount);
  const amount = Number(form.amount);

  const validationError = useMemo(() => {
    if (!form.accountId) {
      return "Select the account to withdraw from.";
    }

    if (!activeAccount) {
      return "The selected account could not be found.";
    }

    if (
      String(activeAccount.status ?? "").toUpperCase() !== "ACTIVE"
    ) {
      return "The selected account is not active.";
    }

    if (!form.amount) {
      return "Enter a withdrawal amount.";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Withdrawal amount must be greater than zero.";
    }

    if (amount > availableBalance) {
      return "Withdrawal amount exceeds your available balance.";
    }

    if (!form.destination.trim()) {
      return "Enter the withdrawal destination.";
    }

    if (form.destination.trim().length < 3) {
      return "Withdrawal destination is too short.";
    }

    return "";
  }, [
    activeAccount,
    amount,
    availableBalance,
    form.accountId,
    form.amount,
    form.destination,
  ]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleAccountChange = (event) => {
    const accountId = event.target.value;

    setForm((current) => ({
      ...current,
      accountId,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const payload = {
        accountId: form.accountId,
        amount,
        method: form.method,
        destination: form.destination.trim(),
        description: form.description.trim(),
      };

      const response = await onSubmit?.(payload);

      if (response === false) {
        return;
      }

      setSuccess(
        response?.message ||
          "Withdrawal request submitted successfully.",
      );

      if (response?.close !== false) {
        window.setTimeout(() => {
          onClose?.();
        }, 1000);
      }
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          submitError?.message ||
          "Unable to process the withdrawal request.",
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdrawal-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2
              id="withdrawal-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose an account and enter your withdrawal details.
            </p>
          </div>

          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close withdrawal modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="withdrawal-account"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Withdrawal account
            </label>

            {accounts.length > 0 ? (
              <select
                id="withdrawal-account"
                name="accountId"
                value={form.accountId}
                onChange={handleAccountChange}
                disabled={loading || Boolean(selectedAccount?.id)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Select account</option>

                {accounts.map((account) => {
                  const balance = getAccountBalance(account);

                  return (
                    <option
                      key={account.id || account.accountNumber}
                      value={account.id}
                      disabled={
                        String(account?.status ?? "").toUpperCase() !==
                        "ACTIVE"
                      }
                    >
                      {account.accountNumber || "Account"} —{" "}
                      {formatAmount(
                        balance,
                        account?.currency?.code || currency,
                      )}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                No bank account is currently available for withdrawal.
              </div>
            )}
          </div>

          {activeAccount && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <WalletCards size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Available balance
                </p>

                <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
                  {formatAmount(
                    availableBalance,
                    activeAccount?.currency?.code || currency,
                  )}
                </p>

                {activeAccount.accountNumber && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    •••• {String(activeAccount.accountNumber).slice(-4)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="withdrawal-amount"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Amount
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                {activeAccount?.currency?.code || currency}
              </span>

              <input
                id="withdrawal-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={handleChange}
                disabled={loading}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-14 pr-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="withdrawal-method"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Withdrawal method
            </label>

            <select
              id="withdrawal-method"
              name="method"
              value={form.method}
              onChange={handleChange}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            >
              {WITHDRAWAL_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="withdrawal-destination"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Destination
            </label>

            <input
              id="withdrawal-destination"
              name="destination"
              type="text"
              maxLength={250}
              value={form.destination}
              onChange={handleChange}
              disabled={loading}
              placeholder="Bank account, wallet, or withdrawal location"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="withdrawal-description"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Description{" "}
              <span className="font-normal text-slate-400">
                (optional)
              </span>
            </label>

            <textarea
              id="withdrawal-description"
              name="description"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={handleChange}
              disabled={loading}
              placeholder="Add a note for this withdrawal"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {form.description.length}/500
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || accounts.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <Loader2 size={17} className="animate-spin" />
              )}

              {loading ? "Processing..." : "Submit Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawalModal;