import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Landmark,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";

const ACCOUNT_TYPES = [
  {
    value: "CURRENT",
    name: "Current Account",
    description:
      "A flexible account for everyday payments, transfers and general banking activity.",
    features: [
      "Everyday banking",
      "Transfers and payments",
      "Account statements",
    ],
  },
  {
    value: "SAVINGS",
    name: "Savings Account",
    description:
      "Designed for saving funds while keeping convenient access to your money.",
    features: [
      "Savings-focused",
      "Flexible access",
      "Savings transactions",
    ],
  },
];

const INITIAL_FORM = {
  accountType: "",
  currency: "USD",
  purpose: "",
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const getApplicationFromResponse = (payload) =>
  payload?.application ||
  payload?.accountApplication ||
  payload?.data?.application ||
  payload?.data?.accountApplication ||
  payload?.data ||
  null;

const OpenAccount = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedType = useMemo(
    () =>
      ACCOUNT_TYPES.find(
        (account) => account.value === form.accountType,
      ) || null,
    [form.accountType],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];

      return next;
    });

    setSubmitError("");
    setSuccessMessage("");
  };

  const selectAccountType = (value) => {
    setForm((current) => ({
      ...current,
      accountType: value,
    }));

    setErrors((current) => {
      if (!current.accountType) {
        return current;
      }

      const next = { ...current };
      delete next.accountType;

      return next;
    });

    setSubmitError("");
    setSuccessMessage("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.accountType) {
      nextErrors.accountType =
        "Select the type of account you want to open.";
    }

    if (!form.currency) {
      nextErrors.currency = "Select an account currency.";
    }

    const purpose = form.purpose.trim();

    if (!purpose) {
      nextErrors.purpose =
        "Tell us briefly why you want to open this account.";
    } else if (purpose.length < 5) {
      nextErrors.purpose =
        "Please provide a little more detail.";
    } else if (purpose.length > 500) {
      nextErrors.purpose =
        "The purpose cannot exceed 500 characters.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitError("");
    setSuccessMessage("");

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        accountType: form.accountType,
        currency: form.currency,
        purpose: form.purpose.trim(),
      };

      const response = await api.post(
        "/accounts/open",
        payload,
      );

      const data = response?.data;

      const application = getApplicationFromResponse(data);

      const message =
        data?.message ||
        "Your account-opening request has been submitted successfully.";

      setSuccessMessage(message);

      if (application?.id) {
        navigate(
          `/accounts/open/${encodeURIComponent(
            application.id,
          )}`,
        );
        return;
      }

      setForm(INITIAL_FORM);
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          "Unable to submit your account-opening request. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-7 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/accounts")}
            disabled={submitting}
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Back to accounts"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <Landmark
                size={20}
                className="text-blue-700"
              />

              <span className="text-sm font-semibold text-blue-700">
                Account services
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Open an account
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Request an additional Epex Bank account for your
              banking needs.
            </p>
          </div>
        </div>

        {successMessage ? (
          <div
            className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="text-sm font-semibold">
                Request submitted
              </p>

              <p className="mt-1 text-sm leading-6">
                {successMessage}
              </p>
            </div>
          </div>
        ) : null}

        {submitError ? (
          <div
            className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
            role="alert"
          >
            <AlertCircle
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div className="text-sm leading-6">
              {submitError}
            </div>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]"
        >
          <main className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Landmark size={21} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-950">
                    Choose your account
                  </h2>

                  <p className="text-sm text-slate-500">
                    Select the account product you want to request.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              <div>
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Account type
                  </label>

                  <p className="mt-1 text-xs text-slate-500">
                    Available products may depend on your profile,
                    eligibility and jurisdiction.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {ACCOUNT_TYPES.map((account) => {
                    const selected =
                      form.accountType === account.value;

                    return (
                      <button
                        key={account.value}
                        type="button"
                        onClick={() =>
                          selectAccountType(
                            account.value,
                          )
                        }
                        disabled={submitting}
                        aria-pressed={selected}
                        className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${
                          selected
                            ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
                            <Landmark size={18} />
                          </div>

                          {selected ? (
                            <CheckCircle2
                              size={19}
                              className="text-blue-700"
                            />
                          ) : null}
                        </div>

                        <h3 className="mt-4 text-sm font-semibold text-slate-950">
                          {account.name}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {account.description}
                        </p>

                        <div className="mt-4 space-y-1.5">
                          {account.features.map(
                            (feature) => (
                              <p
                                key={feature}
                                className="text-xs font-medium text-slate-600"
                              >
                                • {feature}
                              </p>
                            ),
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {errors.accountType ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.accountType}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="currency"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Account currency
                  </label>

                  <select
                    id="currency"
                    name="currency"
                    value={form.currency}
                    onChange={handleChange}
                    disabled={submitting}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                      errors.currency
                        ? "border-red-300"
                        : "border-slate-200"
                    }`}
                  >
                    <option value="USD">
                      USD — US Dollar
                    </option>
                    <option value="EUR">
                      EUR — Euro
                    </option>
                    <option value="GBP">
                      GBP — British Pound
                    </option>
                    <option value="CAD">
                      CAD — Canadian Dollar
                    </option>
                    <option value="AUD">
                      AUD — Australian Dollar
                    </option>
                    <option value="CHF">
                      CHF — Swiss Franc
                    </option>
                    <option value="JPY">
                      JPY — Japanese Yen
                    </option>
                  </select>

                  {errors.currency ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.currency}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">
                    Selected product
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedType?.name ||
                      "Select an account type"}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="purpose"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Purpose of the account
                  </label>

                  <span className="text-xs text-slate-400">
                    {form.purpose.length}/500
                  </span>
                </div>

                <textarea
                  id="purpose"
                  name="purpose"
                  rows={5}
                  maxLength={500}
                  value={form.purpose}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="Briefly explain how you intend to use this account."
                  className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                    errors.purpose
                      ? "border-red-300"
                      : "border-slate-200"
                  }`}
                />

                {errors.purpose ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.purpose}
                  </p>
                ) : null}
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <ShieldCheck
                  className="mt-0.5 shrink-0 text-blue-700"
                  size={19}
                />

                <div>
                  <p className="text-sm font-semibold text-blue-950">
                    Account opening review
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-800">
                    Submitting this form creates an account-opening
                    request. Eligibility, verification, product
                    availability and applicable banking requirements
                    are handled by the bank before an account is
                    opened.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/accounts")}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Submitting request...
                    </>
                  ) : (
                    <>
                      Submit account request
                      <ChevronRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </main>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">
                What happens next?
              </h2>

              <div className="mt-5 space-y-5">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                    1
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Submit your request
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Tell us which account product you want and
                      how you intend to use it.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                    2
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Eligibility review
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      The bank reviews the request against applicable
                      product and verification requirements.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                    3
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Account decision
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      If approved, the account can be created and
                      made available according to the bank's
                      procedures.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Secure application
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Never enter passwords, PINs or one-time
                    authentication codes into an account-opening
                    request.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/support/faq")}
              className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-slate-950">
                Have questions?
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Review frequently asked questions before submitting
                your request.
              </p>

              <span className="mt-3 inline-flex text-xs font-semibold text-blue-700">
                View FAQs
              </span>
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default OpenAccount;