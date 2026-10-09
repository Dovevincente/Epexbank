import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";

const INITIAL_FORM = {
  amount: "",
  recipient: "",
  description: "",
  reference: "",
};

const TransferModal = ({
  isOpen = false,
  onClose,
  onSubmit,
  accounts = [],
  beneficiaries = [],
  selectedAccount = null,
  selectedBeneficiary = null,
  currency = "USD",
  loading = false,
  title = "Transfer Money",
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

    setForm({
      amount: "",
      recipient:
        selectedBeneficiary?.id ||
        selectedBeneficiary?.accountNumber ||
        selectedBeneficiary?.accountId ||
        "",
      description: "",
      reference: "",
    });

    setError("");
    setSuccess("");
  }, [isOpen, selectedBeneficiary]);

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
    if (selectedAccount) {
      return selectedAccount;
    }

    return (
      accounts.find(
        (account) =>
          String(account?.status || "").toUpperCase() === "ACTIVE",
      ) || accounts[0] || null
    );
  }, [accounts, selectedAccount]);

  const amount = Number(form.amount);
  const availableBalance = Number(
    activeAccount?.availableBalance ?? activeAccount?.balance ?? 0,
  );

  const validationError = useMemo(() => {
    if (!activeAccount) {
      return "No eligible account is available for this transfer.";
    }

    if (!form.recipient) {
      return "Select a recipient.";
    }

    if (!form.amount) {
      return "Enter a transfer amount.";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Transfer amount must be greater than zero.";
    }

    if (amount > availableBalance) {
      return "Transfer amount exceeds your available balance.";
    }

    if (amount > 999999999) {
      return "Transfer amount is too large.";
    }

    return "";
  }, [activeAccount, amount, availableBalance, form.amount, form.recipient]);

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
        accountId: activeAccount?.id,
        beneficiaryId: selectedBeneficiary?.id || undefined,
      };

      const response = await onSubmit?.(payload);

      if (response === false) {
        return;
      }

      setSuccess(
        response?.message || "Transfer submitted successfully.",
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
          "Unable to process the transfer.",
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
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
              id="transfer-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review the transfer details before submitting.
            </p>
          </div>

          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
            aria-label="Close transfer modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  From
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {activeAccount?.accountNumber || "No account selected"}
                </p>
              </div>

              <ArrowRight className="shrink-0 text-slate-400" size={20} />

              <div className="min-w-0 text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  To
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedBeneficiary?.name ||
                    selectedBeneficiary?.accountNumber ||
                    "Recipient"}
                </p>
              </div>
            </div>

            {activeAccount && (
              <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Available balance:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {currency}{" "}
                  {availableBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="transfer-recipient"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Recipient
            </label>

            {beneficiaries.length > 0 ? (
              <select
                id="transfer-recipient"
                name="recipient"
                value={form.recipient}
                onChange={handleChange}
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Select beneficiary</option>

                {beneficiaries.map((beneficiary) => (
                  <option
                    key={beneficiary.id || beneficiary.accountNumber}
                    value={
                      beneficiary.id ||
                      beneficiary.accountNumber ||
                      beneficiary.accountId
                    }
                  >
                    {beneficiary.name || beneficiary.accountName || "Beneficiary"}
                    {beneficiary.accountNumber
                      ? ` — ${beneficiary.accountNumber}`
                      : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="transfer-recipient"
                name="recipient"
                type="text"
                value={form.recipient}
                onChange={handleChange}
                disabled={loading}
                placeholder="Recipient account or beneficiary ID"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            )}
          </div>

          <div>
            <label
              htmlFor="transfer-amount"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Amount
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                {currency}
              </span>

              <input
                id="transfer-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={handleChange}
                disabled={loading}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-14 pr-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="transfer-description"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Description
            </label>

            <textarea
              id="transfer-description"
              name="description"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={handleChange}
              disabled={loading}
              placeholder="Transfer description"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="transfer-reference"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Reference{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>

            <input
              id="transfer-reference"
              name="reference"
              type="text"
              maxLength={100}
              value={form.reference}
              onChange={handleChange}
              disabled={loading}
              placeholder="Transfer reference"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={17} className="animate-spin" />}
              {loading ? "Processing..." : "Continue Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferModal;