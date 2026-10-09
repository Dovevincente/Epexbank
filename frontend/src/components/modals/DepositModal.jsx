import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";

const DepositModal = ({
  open = false,
  onClose,
  onSubmit,
  loading = false,
  error = "",
  success = "",
  account = null,
  currency = "USD",
  initialAmount = "",
  title = "Deposit funds",
}) => {
  const [amount, setAmount] = useState(initialAmount);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setAmount(initialAmount ?? "");
    setMethod("BANK_TRANSFER");
    setDescription("");
    setValidationError("");
  }, [open, initialAmount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, loading, onClose]);

  if (!open) {
    return null;
  }

  const accountNumber =
    account?.accountNumber ??
    account?.number ??
    "";

  const accountCurrency =
    account?.currency?.code ??
    account?.currency ??
    currency;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setValidationError("Enter a valid deposit amount.");
      return;
    }

    if (numericAmount < 1) {
      setValidationError("The minimum deposit amount is 1.");
      return;
    }

    setValidationError("");

    await onSubmit?.({
      amount: numericAmount,
      currency: accountCurrency,
      method,
      description: description.trim() || undefined,
      accountId: account?.id,
    });
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-modal-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ArrowDownToLine size={19} />
            </div>

            <div>
              <h2
                id="deposit-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                {title}
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add funds to your selected account.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {validationError || error ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 dark:border-red-900/40 dark:bg-red-500/5">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
              />
              <p className="text-sm text-red-700 dark:text-red-400">
                {validationError || error}
              </p>
            </div>
          ) : null}

          {success ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-500/5">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {success}
              </p>
            </div>
          ) : null}

          {account ? (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Deposit account
              </p>

              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {account.type ?? "Bank account"}
                </p>

                {accountNumber ? (
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    •••• {String(accountNumber).slice(-4)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Amount
              </span>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {accountCurrency}
                </span>

                <input
                  type="number"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setValidationError("");
                  }}
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={`${inputClass} pl-16`}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Deposit method
              </span>

              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className={inputClass}
                disabled={loading}
              >
                <option value="BANK_TRANSFER">
                  Bank transfer
                </option>
                <option value="CARD">
                  Card
                </option>
                <option value="CASH">
                  Cash deposit
                </option>
                <option value="OTHER">
                  Other
                </option>
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Description
                <span className="ml-1 font-normal text-slate-400">
                  (optional)
                </span>
              </span>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={3}
                placeholder="Add a note for this deposit"
                className={`${inputClass} resize-none`}
                disabled={loading}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownToLine size={17} />
                  Continue deposit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepositModal;