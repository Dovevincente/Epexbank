import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";

const INITIAL_FORM = {
  category: "",
  subject: "",
  message: "",
};

const CATEGORY_OPTIONS = [
  {
    value: "ACCOUNT",
    label: "Account",
  },
  {
    value: "TRANSACTION",
    label: "Transaction",
  },
  {
    value: "TRANSFER",
    label: "Transfer",
  },
  {
    value: "CARD",
    label: "Card",
  },
  {
    value: "LOAN",
    label: "Loan",
  },
  {
    value: "SAVINGS",
    label: "Savings",
  },
  {
    value: "INVESTMENT",
    label: "Investment",
  },
  {
    value: "KYC",
    label: "KYC / Verification",
  },
  {
    value: "SECURITY",
    label: "Security",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const CreateTicket = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  const validate = () => {
    const nextErrors = {};

    if (!form.category) {
      nextErrors.category = "Select a support category.";
    }

    const subject = form.subject.trim();

    if (!subject) {
      nextErrors.subject = "Enter a subject.";
    } else if (subject.length < 5) {
      nextErrors.subject =
        "The subject must contain at least 5 characters.";
    } else if (subject.length > 150) {
      nextErrors.subject =
        "The subject cannot exceed 150 characters.";
    }

    const message = form.message.trim();

    if (!message) {
      nextErrors.message = "Describe your issue.";
    } else if (message.length < 10) {
      nextErrors.message =
        "Please provide more details about your issue.";
    } else if (message.length > 5000) {
      nextErrors.message =
        "Your message cannot exceed 5,000 characters.";
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
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      };

      const response = await api.post(
        "/support/tickets",
        payload,
      );

      const data = response?.data;

      const ticket =
        data?.ticket ||
        data?.data?.ticket ||
        data?.data ||
        null;

      const message =
        data?.message ||
        "Your support ticket has been created successfully.";

      setSuccessMessage(message);

      if (ticket?.id) {
        navigate(
          `/support/tickets/${encodeURIComponent(ticket.id)}`,
        );
        return;
      }

      setForm(INITIAL_FORM);
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          "Unable to create your support ticket. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/support")}
              disabled={submitting}
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Back to support"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <MessageSquarePlus
                  size={20}
                  className="text-blue-700"
                />

                <span className="text-sm font-semibold text-blue-700">
                  Epex Bank Support
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Create support ticket
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Tell us what you need help with and our support
                team will review your request.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/support/tickets")}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            My tickets
            <ChevronRight size={16} />
          </button>
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
                Ticket created
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <MessageSquarePlus size={21} />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-950">
                    Support request
                  </h2>

                  <p className="text-sm text-slate-500">
                    Provide enough information for us to assist you.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Support category
                </label>

                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  disabled={submitting}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                    errors.category
                      ? "border-red-300"
                      : "border-slate-200"
                  }`}
                >
                  <option value="">
                    Select a category
                  </option>

                  {CATEGORY_OPTIONS.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>

                {errors.category ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.category}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="subject"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Subject
                  </label>

                  <span className="text-xs text-slate-400">
                    {form.subject.length}/150
                  </span>
                </div>

                <input
                  id="subject"
                  name="subject"
                  type="text"
                  maxLength={150}
                  value={form.subject}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="Briefly describe what you need help with"
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                    errors.subject
                      ? "border-red-300"
                      : "border-slate-200"
                  }`}
                />

                {errors.subject ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.subject}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Message
                  </label>

                  <span className="text-xs text-slate-400">
                    {form.message.length}/5000
                  </span>
                </div>

                <textarea
                  id="message"
                  name="message"
                  rows={9}
                  maxLength={5000}
                  value={form.message}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="Explain the issue, what happened, and any relevant details that can help our support team investigate."
                  className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                    errors.message
                      ? "border-red-300"
                      : "border-slate-200"
                  }`}
                />

                {errors.message ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.message}
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
                    Keep your account secure
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-800">
                    Never include your password, one-time password,
                    full card PIN, or other authentication secrets
                    in a support ticket.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/support")}
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
                      Creating ticket...
                    </>
                  ) : (
                    <>
                      Create ticket
                      <ChevronRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">
                Before submitting
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Be specific
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Include relevant dates, transaction references,
                    account information that is safe to share, and
                    what you expected to happen.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    One issue per ticket
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Keeping separate issues in separate tickets
                    helps the support team track each request.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Protect your credentials
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Epex Bank support will never need your password
                    or authentication codes in a ticket.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <MessageSquarePlus size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Track your request
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Once your ticket is created, you can view its
                    status and follow up with the support team from
                    your support dashboard.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/support/tickets")
                    }
                    className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-800"
                  >
                    View my tickets
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreateTicket;