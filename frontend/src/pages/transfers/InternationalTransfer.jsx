import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAccounts from "../../hooks/useAccounts.js";
import api from "../../services/api.js";

const INITIAL_FORM = {
  accountId: "",
  beneficiaryId: "",
  amount: "",
  currency: "USD",
  purpose: "",
  reference: "",
  transferDate: "",
  notes: "",
};

const PURPOSE_OPTIONS = [
  "Personal transfer",
  "Family support",
  "Education",
  "Business payment",
  "Investment",
  "Invoice payment",
  "Other",
];

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const normalizeList = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  return [];
};

const normalizeBeneficiaries = (payload) =>
  normalizeList(payload, "beneficiaries");

const getStatus = (item) =>
  String(item?.status ?? "").trim().toUpperCase();

const isActive = (item) => {
  const status = getStatus(item);

  return (
    !status ||
    status === "ACTIVE" ||
    status === "ENABLED" ||
    status === "VERIFIED"
  );
};

const getBeneficiaryName = (beneficiary) =>
  beneficiary?.name ||
  beneficiary?.beneficiaryName ||
  beneficiary?.fullName ||
  beneficiary?.accountName ||
  beneficiary?.recipientName ||
  "Unnamed beneficiary";

const getBeneficiaryBank = (beneficiary) =>
  beneficiary?.bankName ||
  beneficiary?.bank?.name ||
  beneficiary?.bank ||
  beneficiary?.institutionName ||
  "Bank details available";

const getBeneficiaryAccount = (beneficiary) =>
  beneficiary?.accountNumber ||
  beneficiary?.account ||
  beneficiary?.iban ||
  beneficiary?.ibanNumber ||
  beneficiary?.accountIdentifier ||
  "—";

const getBeneficiaryCountry = (beneficiary) =>
  beneficiary?.country ||
  beneficiary?.countryName ||
  beneficiary?.destinationCountry ||
  beneficiary?.bankCountry ||
  "";

const getAccountCurrency = (account) =>
  String(
    account?.currency?.code ||
      account?.currencyCode ||
      account?.currency ||
      "USD",
  ).toUpperCase();

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const InternationalTransfer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    accounts,
    primaryAccount,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(true);
  const [beneficiariesError, setBeneficiariesError] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeAccounts = useMemo(
    () => accounts.filter((account) => isActive(account)),
    [accounts],
  );

  const activeBeneficiaries = useMemo(
    () => beneficiaries.filter((beneficiary) => isActive(beneficiary)),
    [beneficiaries],
  );

  const selectedAccount = useMemo(
    () =>
      activeAccounts.find(
        (account) => String(account?.id) === String(form.accountId),
      ) || null,
    [activeAccounts, form.accountId],
  );

  const selectedBeneficiary = useMemo(
    () =>
      activeBeneficiaries.find(
        (beneficiary) =>
          String(beneficiary?.id) === String(form.beneficiaryId),
      ) || null,
    [activeBeneficiaries, form.beneficiaryId],
  );

  const accountCurrency = getAccountCurrency(selectedAccount);
  const amount = Number(form.amount);

  const availableBalance = Number(
    selectedAccount?.availableBalance ??
      selectedAccount?.balance ??
      selectedAccount?.ledgerBalance ??
      0,
  );

  const total = Number.isFinite(amount) && amount > 0 ? amount : 0;

  const loadBeneficiaries = async () => {
    setBeneficiariesLoading(true);
    setBeneficiariesError("");

    try {
      const response = await api.get("/beneficiaries");

      const nextBeneficiaries = normalizeBeneficiaries(response?.data);

      setBeneficiaries(nextBeneficiaries);
    } catch (error) {
      setBeneficiaries([]);
      setBeneficiariesError(
        getErrorMessage(
          error,
          "Unable to load your beneficiaries.",
        ),
      );
    } finally {
      setBeneficiariesLoading(false);
    }
  };

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  useEffect(() => {
    if (!form.accountId && primaryAccount?.id) {
      const currency = getAccountCurrency(primaryAccount);

      setForm((current) => ({
        ...current,
        accountId: primaryAccount.id,
        currency,
      }));
    }
  }, [form.accountId, primaryAccount]);

  useEffect(() => {
    if (!form.accountId) {
      return;
    }

    const accountStillExists = activeAccounts.some(
      (account) => String(account?.id) === String(form.accountId),
    );

    if (!accountStillExists) {
      const fallbackAccount =
        activeAccounts[0] || primaryAccount || null;

      setForm((current) => ({
        ...current,
        accountId: fallbackAccount?.id || "",
        currency: fallbackAccount
          ? getAccountCurrency(fallbackAccount)
          : current.currency,
      }));
    }
  }, [activeAccounts, form.accountId, primaryAccount]);

  useEffect(() => {
    const queryBeneficiaryId = searchParams.get("beneficiaryId");

    if (!queryBeneficiaryId || !activeBeneficiaries.length) {
      return;
    }

    const beneficiaryExists = activeBeneficiaries.some(
      (beneficiary) =>
        String(beneficiary?.id) === String(queryBeneficiaryId),
    );

    if (beneficiaryExists) {
      setForm((current) => ({
        ...current,
        beneficiaryId: queryBeneficiaryId,
      }));
    }
  }, [activeBeneficiaries, searchParams]);

  useEffect(() => {
    if (!selectedAccount) {
      return;
    }

    const currency = getAccountCurrency(selectedAccount);

    if (form.currency !== currency) {
      setForm((current) => ({
        ...current,
        currency,
      }));
    }
  }, [selectedAccount, form.currency]);

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

  const handleAccountChange = (event) => {
    const accountId = event.target.value;

    const account =
      activeAccounts.find(
        (item) => String(item?.id) === String(accountId),
      ) || null;

    setForm((current) => ({
      ...current,
      accountId,
      currency: account ? getAccountCurrency(account) : "USD",
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next.accountId;
      delete next.amount;
      return next;
    });

    setSubmitError("");
    setSuccessMessage("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.accountId) {
      nextErrors.accountId = "Select the account to debit.";
    }

    if (!selectedAccount) {
      nextErrors.accountId = "The selected debit account is unavailable.";
    }

    if (!form.beneficiaryId) {
      nextErrors.beneficiaryId =
        "Select an international beneficiary.";
    }

    if (!selectedBeneficiary) {
      nextErrors.beneficiaryId =
        "The selected beneficiary is unavailable.";
    }

    if (!form.amount) {
      nextErrors.amount = "Enter the transfer amount.";
    } else if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount =
        "Enter a valid amount greater than zero.";
    } else if (amount > availableBalance) {
      nextErrors.amount =
        "The amount exceeds your available balance.";
    }

    if (!form.purpose) {
      nextErrors.purpose =
        "Select the purpose of this transfer.";
    }

    if (form.reference.trim().length > 120) {
      nextErrors.reference =
        "The payment reference cannot exceed 120 characters.";
    }

    if (form.notes.trim().length > 500) {
      nextErrors.notes =
        "Additional instructions cannot exceed 500 characters.";
    }

    if (
      form.transferDate &&
      form.transferDate < getToday()
    ) {
      nextErrors.transferDate =
        "The transfer date cannot be in the past.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSuccessMessage("");
    setSubmitError("");

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        accountId: form.accountId,
        beneficiaryId: form.beneficiaryId,
        amount: Number(form.amount),
        currency: accountCurrency,
        purpose: form.purpose,
        reference: form.reference.trim() || undefined,
        transferDate: form.transferDate || undefined,
        notes: form.notes.trim() || undefined,
      };

      const response = await api.post(
        "/transfers/international",
        payload,
      );

      const responseData = response?.data;

      const transfer =
        responseData?.transfer ||
        responseData?.data?.transfer ||
        responseData?.data ||
        null;

      const message =
        responseData?.message ||
        "Your international transfer instruction has been submitted successfully.";

      setSuccessMessage(message);

      setForm((current) => ({
        ...INITIAL_FORM,
        accountId: current.accountId,
        currency: accountCurrency,
      }));

      await refreshAccounts();

      if (transfer?.id) {
        navigate(
          `/transfers/${encodeURIComponent(transfer.id)}`,
        );
      }
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          "Unable to submit the international transfer. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const refreshBeneficiaries = async () => {
    await loadBeneficiaries();
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/transfers")}
              disabled={submitting}
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Back to transfers"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <Globe2
                  className="text-blue-700"
                  size={20}
                />

                <span className="text-sm font-semibold text-blue-700">
                  International payments
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                International transfer
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Send funds to an international beneficiary
                using your Epex Bank account.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/transfers/beneficiaries")
            }
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Manage beneficiaries
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

            <div className="text-sm leading-6">
              {successMessage}
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Globe2 size={21} />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-950">
                      Transfer details
                    </h2>

                    <p className="text-sm text-slate-500">
                      Provide the required payment information.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-7">
                <div>
                  <label
                    htmlFor="accountId"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Debit account
                  </label>

                  <select
                    id="accountId"
                    name="accountId"
                    value={form.accountId}
                    onChange={handleAccountChange}
                    disabled={
                      accountsLoading || submitting
                    }
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                      errors.accountId
                        ? "border-red-300"
                        : "border-slate-200"
                    }`}
                  >
                    <option value="">
                      {accountsLoading
                        ? "Loading accounts..."
                        : "Select account"}
                    </option>

                    {activeAccounts.map((account) => {
                      const currency =
                        getAccountCurrency(account);

                      const balance =
                        account?.availableBalance ??
                        account?.balance ??
                        0;

                      return (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account?.type || "Account"} •{" "}
                          {account?.accountNumber ||
                            account?.id}{" "}
                          • {currency} • Available{" "}
                          {formatMoney(
                            balance,
                            currency,
                          )}
                        </option>
                      );
                    })}
                  </select>

                  {errors.accountId ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.accountId}
                    </p>
                  ) : null}

                  {accountsError ? (
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-red-600">
                      <span>{accountsError}</span>

                      <button
                        type="button"
                        onClick={refreshAccounts}
                        disabled={accountsLoading}
                        className="font-semibold underline disabled:opacity-50"
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!accountsLoading &&
                  !accountsError &&
                  activeAccounts.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-semibold">
                        No active account available
                      </p>

                      <p className="mt-1 text-xs leading-5">
                        You need an active account before
                        submitting an international transfer.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="beneficiaryId"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      International beneficiary
                    </label>

                    <button
                      type="button"
                      onClick={refreshBeneficiaries}
                      disabled={
                        beneficiariesLoading ||
                        submitting
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw
                        size={13}
                        className={
                          beneficiariesLoading
                            ? "animate-spin"
                            : ""
                        }
                      />

                      Refresh
                    </button>
                  </div>

                  <select
                    id="beneficiaryId"
                    name="beneficiaryId"
                    value={form.beneficiaryId}
                    onChange={handleChange}
                    disabled={
                      beneficiariesLoading ||
                      submitting
                    }
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                      errors.beneficiaryId
                        ? "border-red-300"
                        : "border-slate-200"
                    }`}
                  >
                    <option value="">
                      {beneficiariesLoading
                        ? "Loading beneficiaries..."
                        : "Select beneficiary"}
                    </option>

                    {activeBeneficiaries.map(
                      (beneficiary) => (
                        <option
                          key={beneficiary.id}
                          value={beneficiary.id}
                        >
                          {getBeneficiaryName(
                            beneficiary,
                          )}{" "}
                          •{" "}
                          {getBeneficiaryBank(
                            beneficiary,
                          )}
                        </option>
                      ),
                    )}
                  </select>

                  {errors.beneficiaryId ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.beneficiaryId}
                    </p>
                  ) : null}

                  {beneficiariesError ? (
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-red-600">
                      <span>
                        {beneficiariesError}
                      </span>

                      <button
                        type="button"
                        onClick={refreshBeneficiaries}
                        className="font-semibold underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!beneficiariesLoading &&
                  !beneficiariesError &&
                  activeBeneficiaries.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-semibold">
                        No active beneficiaries
                      </p>

                      <p className="mt-1 text-xs leading-5">
                        Add and activate an international
                        beneficiary before starting this
                        transfer.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            "/transfers/beneficiaries",
                          )
                        }
                        className="mt-2 font-semibold underline"
                      >
                        Add beneficiary
                      </button>
                    </div>
                  ) : null}
                </div>

                {selectedBeneficiary ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Beneficiary details
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          Name
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {getBeneficiaryName(
                            selectedBeneficiary,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Bank
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {getBeneficiaryBank(
                            selectedBeneficiary,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Account / IBAN
                        </p>

                        <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                          {getBeneficiaryAccount(
                            selectedBeneficiary,
                          )}
                        </p>
                      </div>
                    </div>

                    {getBeneficiaryCountry(
                      selectedBeneficiary,
                    ) ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Destination:{" "}
                        <span className="font-semibold text-slate-700">
                          {getBeneficiaryCountry(
                            selectedBeneficiary,
                          )}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <div>
                    <label
                      htmlFor="amount"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Amount
                    </label>

                    <input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={handleChange}
                      disabled={submitting}
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                        errors.amount
                          ? "border-red-300"
                          : "border-slate-200"
                      }`}
                    />

                    {errors.amount ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {errors.amount}
                      </p>
                    ) : selectedAccount ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Available:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatMoney(
                            availableBalance,
                            accountCurrency,
                          )}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label
                      htmlFor="currency"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Currency
                    </label>

                    <input
                      id="currency"
                      name="currency"
                      type="text"
                      value={accountCurrency}
                      readOnly
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                    />

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Transfer currency follows the debit
                      account currency. Currency conversion
                      should be handled by the bank's FX
                      service.
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="purpose"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Transfer purpose
                  </label>

                  <select
                    id="purpose"
                    name="purpose"
                    value={form.purpose}
                    onChange={handleChange}
                    disabled={submitting}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                      errors.purpose
                        ? "border-red-300"
                        : "border-slate-200"
                    }`}
                  >
                    <option value="">
                      Select purpose
                    </option>

                    {PURPOSE_OPTIONS.map((purpose) => (
                      <option
                        key={purpose}
                        value={purpose}
                      >
                        {purpose}
                      </option>
                    ))}
                  </select>

                  {errors.purpose ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.purpose}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="transferDate"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Requested transfer date
                    </label>

                    <input
                      id="transferDate"
                      name="transferDate"
                      type="date"
                      value={form.transferDate}
                      onChange={handleChange}
                      disabled={submitting}
                      min={getToday()}
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                        errors.transferDate
                          ? "border-red-300"
                          : "border-slate-200"
                      }`}
                    />

                    {errors.transferDate ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {errors.transferDate}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label
                      htmlFor="reference"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Payment reference
                      <span className="ml-1 font-normal text-slate-400">
                        Optional
                      </span>
                    </label>

                    <input
                      id="reference"
                      name="reference"
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Invoice 1048"
                      value={form.reference}
                      onChange={handleChange}
                      disabled={submitting}
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                        errors.reference
                          ? "border-red-300"
                          : "border-slate-200"
                      }`}
                    />

                    {errors.reference ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {errors.reference}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Additional instructions
                    <span className="ml-1 font-normal text-slate-400">
                      Optional
                    </span>
                  </label>

                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    maxLength={500}
                    placeholder="Add any relevant payment instructions."
                    value={form.notes}
                    onChange={handleChange}
                    disabled={submitting}
                    className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                      errors.notes
                        ? "border-red-300"
                        : "border-slate-200"
                    }`}
                  />

                  {errors.notes ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.notes}
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
                      Secure transfer instruction
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-800">
                      International payments may be subject
                      to authentication, compliance checks,
                      correspondent-bank requirements and
                      applicable transfer limits before
                      processing.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/transfers")}
                    disabled={submitting}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      accountsLoading ||
                      beneficiariesLoading ||
                      activeAccounts.length === 0 ||
                      activeBeneficiaries.length === 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Review transfer
                        <ChevronRight size={17} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5">
                <h2 className="font-semibold text-slate-950">
                  Transfer summary
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review the instruction before submitting.
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Amount
                  </span>

                  <span className="text-sm font-semibold text-slate-950">
                    {formatMoney(
                      form.amount,
                      accountCurrency,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Bank fee
                  </span>

                  <span className="text-right text-xs font-medium text-slate-500">
                    Calculated by bank
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-700">
                      Transfer amount
                    </span>

                    <span className="text-xl font-bold text-slate-950">
                      {formatMoney(
                        total,
                        accountCurrency,
                      )}
                    </span>
                  </div>
                </div>

                {selectedBeneficiary ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Sending to
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {getBeneficiaryName(
                        selectedBeneficiary,
                      )}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {getBeneficiaryBank(
                        selectedBeneficiary,
                      )}
                    </p>

                    <p className="mt-1 break-all text-xs text-slate-500">
                      {getBeneficiaryAccount(
                        selectedBeneficiary,
                      )}
                    </p>
                  </div>
                ) : null}

                {selectedAccount ? (
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                      Debit account
                    </p>

                    <p className="mt-2 text-sm font-semibold text-blue-950">
                      {selectedAccount?.type ||
                        "Account"}
                    </p>

                    <p className="mt-1 text-xs text-blue-800">
                      {selectedAccount?.accountNumber ||
                        "Account"}
                    </p>

                    <p className="mt-2 text-xs text-blue-800">
                      Available balance:{" "}
                      <span className="font-semibold">
                        {formatMoney(
                          availableBalance,
                          accountCurrency,
                        )}
                      </span>
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <LockKeyhole size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Security & verification
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    International transfers can require
                    additional authentication or compliance
                    verification before release.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default InternationalTransfer;