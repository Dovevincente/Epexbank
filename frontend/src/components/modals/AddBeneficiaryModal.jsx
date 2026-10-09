import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
  X,
} from "lucide-react";

const initialForm = {
  name: "",
  accountNumber: "",
  bankName: "",
  bankCode: "",
  country: "",
  currency: "USD",
  email: "",
  phone: "",
  nickname: "",
};

const AddBeneficiaryModal = ({
  open = false,
  onClose,
  onSubmit,
  loading = false,
  error = "",
  success = "",
  initialValues = {},
  title = "Add beneficiary",
}) => {
  const [form, setForm] = useState({
    ...initialForm,
    ...initialValues,
  });

  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...initialForm,
      ...initialValues,
    });
    setValidationError("");
  }, [open, initialValues]);

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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (validationError) {
      setValidationError("");
    }
  };

  const validate = () => {
    if (!form.name.trim()) {
      return "Beneficiary name is required.";
    }

    if (!form.accountNumber.trim()) {
      return "Account number is required.";
    }

    if (!/^[A-Za-z0-9 -]{4,40}$/.test(form.accountNumber.trim())) {
      return "Enter a valid account number.";
    }

    if (!form.bankName.trim()) {
      return "Bank name is required.";
    }

    if (form.email.trim()) {
      const emailValid =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

      if (!emailValid) {
        return "Enter a valid email address.";
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const message = validate();

    if (message) {
      setValidationError(message);
      return;
    }

    setValidationError("");

    await onSubmit?.({
      name: form.name.trim(),
      accountNumber: form.accountNumber.trim(),
      bankName: form.bankName.trim(),
      bankCode: form.bankCode.trim() || undefined,
      country: form.country.trim() || undefined,
      currency: form.currency.trim().toUpperCase(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      nickname: form.nickname.trim() || undefined,
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
        aria-labelledby="add-beneficiary-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <UserPlus size={19} />
            </div>

            <div className="min-w-0">
              <h2
                id="add-beneficiary-title"
                className="truncate text-lg font-bold text-slate-900 dark:text-white"
              >
                {title}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Add a trusted recipient for future transfers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
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
              <p className="text-sm leading-5 text-red-700 dark:text-red-400">
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
              <p className="text-sm leading-5 text-emerald-700 dark:text-emerald-400">
                {success}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Beneficiary name
              </span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full name or business name"
                autoComplete="name"
                className={inputClass}
                disabled={loading}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Account number
              </span>
              <input
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
                placeholder="Account number"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
                disabled={loading}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Bank name
              </span>
              <input
                name="bankName"
                value={form.bankName}
                onChange={handleChange}
                placeholder="Bank name"
                className={inputClass}
                disabled={loading}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Bank code
              </span>
              <input
                name="bankCode"
                value={form.bankCode}
                onChange={handleChange}
                placeholder="Optional bank code"
                autoComplete="off"
                className={inputClass}
                disabled={loading}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Country
              </span>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="Country"
                autoComplete="country-name"
                className={inputClass}
                disabled={loading}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Currency
              </span>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className={inputClass}
                disabled={loading}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Pound Sterling</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="CHF">CHF — Swiss Franc</option>
                <option value="JPY">JPY — Japanese Yen</option>
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email
              </span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Optional email"
                autoComplete="email"
                className={inputClass}
                disabled={loading}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Phone
              </span>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Optional phone number"
                autoComplete="tel"
                className={inputClass}
                disabled={loading}
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nickname
              </span>
              <input
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="Optional nickname, e.g. John"
                className={inputClass}
                disabled={loading}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus size={17} />
                  Add beneficiary
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBeneficiaryModal;