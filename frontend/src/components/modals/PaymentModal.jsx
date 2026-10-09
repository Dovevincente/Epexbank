import { useEffect, useMemo, useState } from "react";
import { Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";

const INITIAL_FORM = {
  amount: "",
  method: "ACCOUNT",
  description: "",
  reference: "",
};

const PAYMENT_METHODS = [
  { value: "ACCOUNT", label: "Bank Account" },
  { value: "CARD", label: "Card" },
  { value: "WALLET", label: "Wallet" },
];

const formatAmount = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0.00";
  }

  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const PaymentModal = ({
  isOpen = false,
  onClose,
  onSubmit,
  payment = null,
  currency = "USD",
  loading = false,
  title = "Make Payment",
  submitLabel = "Make Payment",
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

    if (payment) {
      setForm({
        amount: payment.amount ?? "",
        method: payment.method ?? "ACCOUNT",
        description: payment.description ?? "",
        reference: payment.reference ?? "",
      });
    } else {
      setForm(INITIAL_FORM);
    }

    setError("");
    setSuccess("");
  }, [isOpen, payment]);

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

  const amount = Number(form.amount);

  const validationError = useMemo(() => {
    if (!form.amount) {
      return "Enter a payment amount.";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Payment amount must be greater than zero.";
    }

    if (amount > 999999999) {
      return "Payment amount is too large.";
    }

    return "";
  }, [amount, form.amount]);

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
        ...form,
        amount,
      };

      const response = await onSubmit?.(payload);

      if (response === false) {
        return;
      }

      setSuccess("Payment submitted successfully.");

      if (response?.close !== false) {
        window.setTimeout(() => {
          onClose?.();
        }, 900);
      }
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          submitError?.message ||
          "Unable to process the payment.",
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2
              id="payment-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter the payment details below.
            </p>
          </div>

          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close payment modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="payment-amount"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Amount
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                {currency}
              </span>

              <input
                id="payment-amount"
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

            {form.amount && !validationError && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Payment total: {currency} {formatAmount(amount)}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Payment method
            </label>

            <select
              id="payment-method"
              name="method"
              value={form.method}
              onChange={handleChange}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="payment-description"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Description
            </label>

            <textarea
              id="payment-description"
              name="description"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={handleChange}
              disabled={loading}
              placeholder="What is this payment for?"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            />

            <div className="mt-1 text-right text-xs text-slate-400">
              {form.description.length}/500
            </div>
          </div>

          <div>
            <label
              htmlFor="payment-reference"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Reference{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>

            <input
              id="payment-reference"
              name="reference"
              type="text"
              maxLength={100}
              value={form.reference}
              onChange={handleChange}
              disabled={loading}
              placeholder="Payment reference"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
            />
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
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={17} className="animate-spin" />}
              {loading ? "Processing..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;