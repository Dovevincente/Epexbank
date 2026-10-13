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

  UserRound,

  Wallet,

} from "lucide-react";

import { useNavigate, useSearchParams } from "react-router-dom";

import useAccounts from "../../hooks/useAccounts.js";

import api from "../../services/api.js";

const INITIAL_FORM = {

  accountId: "",

  beneficiaryMode: "manual",

  beneficiaryId: "",

  beneficiaryName: "",

  bankName: "",

  accountNumber: "",

  iban: "",

  swiftBic: "",

  routingNumber: "",

  country: "",

  bankAddress: "",

  saveBeneficiary: false,

  amount: "",

  currency: "USD",

  purpose: "",

  reference: "",

  transferDate: "",

  notes: "",

  tinCode: "",

  amlCode: "",

  cftCode: "",

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

const getStatus = (item) => String(item?.status ?? "").trim().toUpperCase();

const isActive = (item) => {

  const status = getStatus(item);

  return !status || ["ACTIVE", "ENABLED", "VERIFIED"].includes(status);

};

const getBeneficiaryName = (item) =>

  item?.name || item?.beneficiaryName || item?.fullName || item?.accountName || item?.recipientName || "Unnamed beneficiary";

const getBeneficiaryBank = (item) =>

  item?.bankName || item?.bank?.name || item?.bank || item?.institutionName || "Bank details available";

const getBeneficiaryAccount = (item) =>

  item?.accountNumber || item?.account || item?.iban || item?.ibanNumber || item?.accountIdentifier || "—";

const getBeneficiaryCountry = (item) =>

  item?.country || item?.countryName || item?.destinationCountry || item?.bankCountry || "";

const getAccountCurrency = (account) =>

  String(account?.currency?.code || account?.currencyCode || account?.currency || "USD").toUpperCase();

const formatMoney = (value, currency = "USD") => {

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

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

const Field = ({ label, name, value, onChange, error, required = false, ...props }) => (

  <div>

    <label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-700">

      {label}{required ? <span className="ml-1 text-rose-600">*</span> : null}

    </label>

    <input

      id={name}

      name={name}

      value={value}

      onChange={onChange}

      aria-invalid={Boolean(error)}

      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${error ? "border-rose-300" : "border-slate-200"}`}

      {...props}

    />

    {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}

  </div>

);

const InternationalTransfer = () => {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const {

    accounts = [],

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

  const [step, setStep] = useState("form");

  const [complianceStep, setComplianceStep] = useState("tin");

  const [complianceChecking, setComplianceChecking] = useState(false);

  const activeAccounts = useMemo(() => accounts.filter(isActive), [accounts]);

  const activeBeneficiaries = useMemo(() => beneficiaries.filter(isActive), [beneficiaries]);

  const selectedAccount = useMemo(

    () => activeAccounts.find((account) => String(account?.id) === String(form.accountId)) || null,

    [activeAccounts, form.accountId],

  );

  const selectedBeneficiary = useMemo(

    () => activeBeneficiaries.find((item) => String(item?.id) === String(form.beneficiaryId)) || null,

    [activeBeneficiaries, form.beneficiaryId],

  );

  const accountCurrency = getAccountCurrency(selectedAccount);

  const amount = Number(form.amount);

  const availableBalance = Number(

    selectedAccount?.availableBalance ?? selectedAccount?.balance ?? selectedAccount?.ledgerBalance ?? 0,

  );

  const total = Number.isFinite(amount) && amount > 0 ? amount : 0;

  const manualRecipient = form.beneficiaryMode === "manual";

  const loadBeneficiaries = async () => {

    setBeneficiariesLoading(true);

    setBeneficiariesError("");

    try {

      const response = await api.get("/beneficiaries");

      setBeneficiaries(normalizeList(response?.data, "beneficiaries"));

    } catch (error) {

      setBeneficiaries([]);

      setBeneficiariesError(getErrorMessage(error, "Unable to load saved beneficiaries."));

    } finally {

      setBeneficiariesLoading(false);

    }

  };

  useEffect(() => {

    loadBeneficiaries();

    // Load saved beneficiaries once on mount.

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  useEffect(() => {

    if (!form.accountId && primaryAccount?.id) {

      setForm((current) => ({

        ...current,

        accountId: String(primaryAccount.id),

        currency: getAccountCurrency(primaryAccount),

      }));

    }

  }, [form.accountId, primaryAccount]);

  useEffect(() => {

    const queryBeneficiaryId = searchParams.get("beneficiaryId");

    if (!queryBeneficiaryId || !activeBeneficiaries.length) return;

    const exists = activeBeneficiaries.some((item) => String(item?.id) === String(queryBeneficiaryId));

    if (exists) {

      setForm((current) => ({ ...current, beneficiaryMode: "saved", beneficiaryId: queryBeneficiaryId }));

    }

  }, [activeBeneficiaries, searchParams]);

  useEffect(() => {

    if (!selectedAccount) return;

    const currency = getAccountCurrency(selectedAccount);

    if (form.currency !== currency) setForm((current) => ({ ...current, currency }));

  }, [selectedAccount, form.currency]);

  const handleChange = (event) => {

    const { name, value, type, checked } = event.target;

    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));

    setErrors((current) => {

      if (!current[name]) return current;

      const next = { ...current };

      delete next[name];

      return next;

    });

    setSubmitError("");

    setSuccessMessage("");

  };

  const handleAccountChange = (event) => {

    const accountId = event.target.value;

    const account = activeAccounts.find((item) => String(item?.id) === String(accountId)) || null;

    setForm((current) => ({ ...current, accountId, currency: account ? getAccountCurrency(account) : "USD" }));

    setErrors((current) => {

      const next = { ...current };

      delete next.accountId;

      delete next.amount;

      return next;

    });

    setSubmitError("");

    setSuccessMessage("");

  };

  const handleModeChange = (mode) => {

    setForm((current) => ({

      ...current,

      beneficiaryMode: mode,

      beneficiaryId: mode === "saved" ? current.beneficiaryId : "",

      beneficiaryName: mode === "manual" ? current.beneficiaryName : "",

      bankName: mode === "manual" ? current.bankName : "",

      accountNumber: mode === "manual" ? current.accountNumber : "",

      iban: mode === "manual" ? current.iban : "",

      swiftBic: mode === "manual" ? current.swiftBic : "",

      routingNumber: mode === "manual" ? current.routingNumber : "",

      country: mode === "manual" ? current.country : "",

      bankAddress: mode === "manual" ? current.bankAddress : "",

      saveBeneficiary: mode === "manual" ? current.saveBeneficiary : false,

    }));

    setErrors({});

    setSubmitError("");

    setSuccessMessage("");

  };

  const validate = () => {

    const nextErrors = {};

    if (!form.accountId || !selectedAccount) nextErrors.accountId = "Select an available account to debit.";

    if (manualRecipient) {

      if (!form.beneficiaryName.trim()) nextErrors.beneficiaryName = "Enter the recipient's full name.";

      if (!form.bankName.trim()) nextErrors.bankName = "Enter the recipient bank name.";

      if (!form.country.trim()) nextErrors.country = "Select or enter the destination country.";

      if (!form.accountNumber.trim() && !form.iban.trim()) {

        nextErrors.accountNumber = "Enter an account number or IBAN.";

        nextErrors.iban = "Enter an IBAN or provide an account number.";

      }

      if (form.swiftBic.trim() && !/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/.test(form.swiftBic.trim())) {

        nextErrors.swiftBic = "Enter a valid 8- or 11-character SWIFT/BIC code.";

      }

      if (form.saveBeneficiary && !form.beneficiaryName.trim()) {

        nextErrors.beneficiaryName = "A name is required to save this beneficiary.";

      }

    } else if (!selectedBeneficiary) {

      nextErrors.beneficiaryId = "Select a saved beneficiary or enter recipient details manually.";

    }

    if (!form.amount) nextErrors.amount = "Enter the transfer amount.";

    else if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = "Enter a valid amount greater than zero.";

    else if (amount > availableBalance) nextErrors.amount = "The amount exceeds your available balance.";

    if (!form.purpose) nextErrors.purpose = "Select the purpose of this transfer.";

    if (form.reference.trim().length > 120) nextErrors.reference = "The payment reference cannot exceed 120 characters.";

    if (form.notes.trim().length > 500) nextErrors.notes = "Additional instructions cannot exceed 500 characters.";

    if (form.transferDate && form.transferDate < getToday()) nextErrors.transferDate = "The transfer date cannot be in the past.";

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;

  };

  const createBeneficiaryIfRequested = async () => {

    const details = {

      name: form.beneficiaryName.trim(),

      beneficiaryName: form.beneficiaryName.trim(),

      bankName: form.bankName.trim(),

      accountNumber: form.accountNumber.trim() || undefined,

      iban: form.iban.trim() || undefined,

      swiftBic: form.swiftBic.trim().toUpperCase() || undefined,

      routingNumber: form.routingNumber.trim() || undefined,

      country: form.country.trim(),

      bankAddress: form.bankAddress.trim() || undefined,

      type: "INTERNATIONAL",

    };

    if (!manualRecipient || !form.saveBeneficiary) return null;

    const response = await api.post("/beneficiaries", details);

    const saved = response?.data?.beneficiary || response?.data?.data?.beneficiary || response?.data?.data || response?.data;

    if (!saved?.id) {

      throw new Error("The beneficiary could not be saved because the server did not return its ID. You can disable Save beneficiary and try again if direct recipient transfers are enabled.");

    }

    return saved;

  };

  const handleContinue = (event) => {

    event.preventDefault();

    if (submitting) return;

    setSubmitError("");

    setSuccessMessage("");

    if (!validate()) return;

    setForm((current) => ({ ...current, tinCode: "", amlCode: "", cftCode: "" }));

    setComplianceStep("tin");

    setStep("tin");

  };

  const handleComplianceSubmit = (event) => {
    event.preventDefault();
    if (complianceChecking || submitting) return;

    const fieldByStep = {
      tin: { field: "tinCode", message: "Enter your TIN / Tax Code." },
      aml: { field: "amlCode", message: "Enter your AML Code." },
      cft: { field: "cftCode", message: "Enter your CFT Code." },
    };
    const current = fieldByStep[complianceStep];

    if (!current) return;

    if (!String(form[current.field] || "").trim()) {
      setErrors((previous) => ({ ...previous, [current.field]: current.message }));
      setSubmitError("Enter the requested information to continue.");
      return;
    }

    setErrors((previous) => {
      const next = { ...previous };
      delete next[current.field];
      return next;
    });
    setSubmitError("");

    if (step === "tin") {
      setComplianceStep("aml");
      setStep("aml");
      return;
    }
    if (step === "aml") {
      setComplianceStep("cft");
      setStep("cft");
      return;
    }

    setComplianceStep("complete");
    setStep("review");
  };

  const handleBack = () => {
    if (submitting || complianceChecking) return;
    setSubmitError("");
    if (step === "review") {
      setComplianceStep("cft");
      setStep("cft");
      return;
    }
    if (step === "cft") {
      setComplianceStep("aml");
      setStep("aml");
      return;
    }
    if (step === "aml") {
      setComplianceStep("tin");
      setStep("tin");
      return;
    }
    if (step === "tin") setStep("form");
  };

  const handleConfirm = async () => {

    if (submitting) return;

    if (complianceStep !== "complete") {

      setSubmitError("Please complete the TIN, AML, and CFT steps first.");

      setStep(complianceStep === "aml" ? "aml" : complianceStep === "cft" ? "cft" : "tin");

      return;

    }

    setSubmitError("");

    setSuccessMessage("");

    setSubmitting(true);

    try {

      let beneficiaryId = manualRecipient ? undefined : form.beneficiaryId;

      let recipient = manualRecipient

        ? {

            name: form.beneficiaryName.trim(),

            beneficiaryName: form.beneficiaryName.trim(),

            bankName: form.bankName.trim(),

            accountNumber: form.accountNumber.trim() || undefined,

            iban: form.iban.trim() || undefined,

            swiftBic: form.swiftBic.trim().toUpperCase() || undefined,

            routingNumber: form.routingNumber.trim() || undefined,

            country: form.country.trim(),

            bankAddress: form.bankAddress.trim() || undefined,

          }

        : undefined;

      if (manualRecipient && form.saveBeneficiary) {

        const savedBeneficiary = await createBeneficiaryIfRequested();

        beneficiaryId = savedBeneficiary?.id;

        recipient = undefined;

        await loadBeneficiaries();

      }

      const payload = {

        accountId: form.accountId,

        ...(beneficiaryId ? { beneficiaryId } : {}),

        ...(recipient ? { recipient, beneficiary: recipient, recipientDetails: recipient } : {}),

        amount: Number(form.amount),

        currency: accountCurrency,

        purpose: form.purpose,

        reference: form.reference.trim() || undefined,

        transferDate: form.transferDate || undefined,

        notes: form.notes.trim() || undefined,

        tinCode: form.tinCode.trim(),

        amlCode: form.amlCode.trim(),

        cftCode: form.cftCode.trim(),

      };

      const response = await api.post("/transfers/international", payload);

      const responseData = response?.data;

      const transfer = responseData?.transfer || responseData?.data?.transfer || responseData?.data || null;

      setSuccessMessage(responseData?.message || "Your international transfer instruction has been submitted successfully.");

      setForm((current) => ({ ...INITIAL_FORM, accountId: current.accountId, currency: accountCurrency }));

      setStep("success");

      await refreshAccounts();

      if (transfer?.id) navigate(`/transfers/${encodeURIComponent(transfer.id)}`);

    } catch (error) {

      const message = getErrorMessage(error, "Unable to submit the international transfer. Please try again.");

      setSubmitError(message);

      const lower = message.toLowerCase();

      if (lower.includes("tin") || lower.includes("tax code")) setComplianceStep("tin");

      else if (lower.includes("aml")) setComplianceStep("aml");

      else if (lower.includes("cft")) setComplianceStep("cft");

      setStep(lower.includes("aml") ? "aml" : lower.includes("cft") ? "cft" : lower.includes("tin") || lower.includes("tax code") ? "tin" : "review");

    } finally {

      setSubmitting(false);

    }

  };

  const refreshBeneficiaries = async () => loadBeneficiaries();

  return (

    <div className="min-h-full bg-slate-50">

      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-3">

            <button type="button" onClick={() => navigate("/transfers")} disabled={submitting} aria-label="Back to transfers" className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50">

              <ArrowLeft size={19} />

            </button>

            <div>

              <div className="mb-1 flex items-center gap-2"><Globe2 className="text-blue-700" size={20} /><span className="text-sm font-semibold text-blue-700">International payments</span></div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">International transfer</h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Send money internationally using your Epex Bank account. Enter recipient details or choose a saved beneficiary.</p>

            </div>

          </div>

          <button type="button" onClick={() => navigate("/transfers/beneficiaries")} disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-50">Manage beneficiaries <ChevronRight size={16} /></button>

        </div>

        {successMessage ? <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800" role="status" aria-live="polite"><CheckCircle2 className="mt-0.5 shrink-0" size={20} /><div className="text-sm leading-6">{successMessage}</div></div> : null}

        {submitError ? <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800" role="alert"><AlertCircle className="mt-0.5 shrink-0" size={20} /><div className="text-sm leading-6">{submitError}</div></div> : null}

        {step === "form" ? (

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

          <form onSubmit={handleContinue} noValidate>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-5 sm:px-7"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Globe2 size={21} /></div><div><h2 className="font-semibold text-slate-950">Transfer details</h2><p className="text-sm text-slate-500">Complete the recipient and payment information.</p></div></div></div>

              <div className="space-y-7 p-5 sm:p-7">

                <section>

                  <div className="mb-2 flex items-center gap-2"><Wallet size={17} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">1. Choose a debit account</h3></div>

                  <label htmlFor="accountId" className="mb-2 block text-sm font-semibold text-slate-700">Debit account <span className="text-rose-600">*</span></label>

                  <select id="accountId" name="accountId" value={form.accountId} onChange={handleAccountChange} disabled={accountsLoading || submitting} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.accountId ? "border-rose-300" : "border-slate-200"}`}>

                    <option value="">{accountsLoading ? "Loading accounts…" : "Select account"}</option>

                    {activeAccounts.map((account) => {

                      const currency = getAccountCurrency(account);

                      const balance = account?.availableBalance ?? account?.balance ?? 0;

                      return <option key={account.id} value={account.id}>{account?.type || "Account"} · {account?.accountNumber || account?.id} · Available {formatMoney(balance, currency)}</option>;

                    })}

                  </select>

                  {errors.accountId ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.accountId}</p> : null}

                  {accountsError ? <div className="mt-2 flex items-center justify-between gap-3 text-xs text-rose-600"><span>{accountsError}</span><button type="button" onClick={refreshAccounts} disabled={accountsLoading} className="font-semibold underline">Retry</button></div> : null}

                  {!accountsLoading && !accountsError && activeAccounts.length === 0 ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No active account is available. You need an active account before submitting a transfer.</div> : null}

                </section>

                <section>

                  <div className="mb-3 flex items-center gap-2"><UserRound size={17} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">2. Recipient details</h3></div>

                  <div className="mb-5 grid gap-3 sm:grid-cols-2">

                    <button type="button" onClick={() => handleModeChange("manual")} disabled={submitting} className={`rounded-2xl border p-4 text-left transition ${manualRecipient ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10" : "border-slate-200 hover:border-slate-300"}`}>

                      <span className="block text-sm font-semibold text-slate-950">Enter details manually</span><span className="mt-1 block text-xs leading-5 text-slate-500">Send to a new recipient without saving them.</span>

                    </button>

                    <button type="button" onClick={() => handleModeChange("saved")} disabled={submitting} className={`rounded-2xl border p-4 text-left transition ${!manualRecipient ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10" : "border-slate-200 hover:border-slate-300"}`}>

                      <span className="block text-sm font-semibold text-slate-950">Use saved beneficiary</span><span className="mt-1 block text-xs leading-5 text-slate-500">Choose recipient details you saved earlier.</span>

                    </button>

                  </div>

                  {!manualRecipient ? <>

                    <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="beneficiaryId" className="block text-sm font-semibold text-slate-700">Saved beneficiary <span className="text-rose-600">*</span></label><button type="button" onClick={refreshBeneficiaries} disabled={beneficiariesLoading || submitting} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50"><RefreshCw size={13} className={beneficiariesLoading ? "animate-spin" : ""} /> Refresh</button></div>

                    <select id="beneficiaryId" name="beneficiaryId" value={form.beneficiaryId} onChange={handleChange} disabled={beneficiariesLoading || submitting} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.beneficiaryId ? "border-rose-300" : "border-slate-200"}`}>

                      <option value="">{beneficiariesLoading ? "Loading beneficiaries…" : "Select a saved beneficiary"}</option>

                      {activeBeneficiaries.map((item) => <option key={item.id} value={item.id}>{getBeneficiaryName(item)} · {getBeneficiaryBank(item)} · {getBeneficiaryCountry(item)}</option>)}

                    </select>

                    {errors.beneficiaryId ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.beneficiaryId}</p> : null}

                    {beneficiariesError ? <div className="mt-2 flex items-center justify-between gap-3 text-xs text-rose-600"><span>{beneficiariesError}</span><button type="button" onClick={refreshBeneficiaries} className="font-semibold underline">Retry</button></div> : null}

                    {selectedBeneficiary ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Recipient summary</p><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Recipient</p><p className="mt-1 text-sm font-semibold text-slate-900">{getBeneficiaryName(selectedBeneficiary)}</p></div><div><p className="text-xs text-slate-500">Bank</p><p className="mt-1 text-sm font-semibold text-slate-900">{getBeneficiaryBank(selectedBeneficiary)}</p></div><div><p className="text-xs text-slate-500">Account / IBAN</p><p className="mt-1 break-all text-sm font-semibold text-slate-900">{getBeneficiaryAccount(selectedBeneficiary)}</p></div><div><p className="text-xs text-slate-500">Destination country</p><p className="mt-1 text-sm font-semibold text-slate-900">{getBeneficiaryCountry(selectedBeneficiary) || "—"}</p></div></div></div> : null}

                    {!beneficiariesLoading && !beneficiariesError && activeBeneficiaries.length === 0 ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">You do not have saved beneficiaries yet. You can enter the recipient details manually instead.</p> : null}

                  </> : <>

                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">Enter the recipient's details exactly as provided by their bank. Account number or IBAN is required. SWIFT/BIC and routing details depend on the destination country.</div>

                    <div className="grid gap-5 sm:grid-cols-2">

                      <Field label="Recipient full name" name="beneficiaryName" value={form.beneficiaryName} onChange={handleChange} error={errors.beneficiaryName} required autoComplete="name" placeholder="Name as registered with the bank" disabled={submitting} />

                      <Field label="Recipient bank name" name="bankName" value={form.bankName} onChange={handleChange} error={errors.bankName} required placeholder="Bank or financial institution" disabled={submitting} />

                      <Field label="Account number" name="accountNumber" value={form.accountNumber} onChange={handleChange} error={errors.accountNumber} placeholder="Recipient account number" disabled={submitting} autoComplete="off" />

                      <Field label="IBAN" name="iban" value={form.iban} onChange={handleChange} error={errors.iban} placeholder="International Bank Account Number" disabled={submitting} autoComplete="off" />

                      <Field label="SWIFT / BIC" name="swiftBic" value={form.swiftBic} onChange={handleChange} error={errors.swiftBic} placeholder="8 or 11 characters, if required" disabled={submitting} autoComplete="off" />

                      <Field label="Routing / sort code" name="routingNumber" value={form.routingNumber} onChange={handleChange} error={errors.routingNumber} placeholder="If required by destination bank" disabled={submitting} autoComplete="off" />

                      <Field label="Destination country" name="country" value={form.country} onChange={handleChange} error={errors.country} required placeholder="e.g. United Kingdom" disabled={submitting} autoComplete="country-name" />

                      <Field label="Bank address (optional)" name="bankAddress" value={form.bankAddress} onChange={handleChange} error={errors.bankAddress} placeholder="Branch or bank address" disabled={submitting} />

                    </div>

                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300">

                      <input type="checkbox" name="saveBeneficiary" checked={form.saveBeneficiary} onChange={handleChange} disabled={submitting} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600" />

                      <span><span className="block text-sm font-semibold text-slate-900">Save this beneficiary for next time</span><span className="mt-1 block text-xs leading-5 text-slate-500">Optional. If unchecked, the details are used for this transfer only and are not intentionally saved as a beneficiary by this form.</span></span>

                    </label>

                  </>}

                </section>

                <section>

                  <div className="mb-3 flex items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">3. Payment information</h3></div>

                  <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">

                    <div><label htmlFor="amount" className="mb-2 block text-sm font-semibold text-slate-700">Amount <span className="text-rose-600">*</span></label><input id="amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={handleChange} disabled={submitting} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.amount ? "border-rose-300" : "border-slate-200"}`} />{errors.amount ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.amount}</p> : <p className="mt-2 text-xs text-slate-500">Available balance: <span className="font-semibold text-slate-700">{formatMoney(availableBalance, accountCurrency)}</span></p>}</div>

                    <div><label htmlFor="currency" className="mb-2 block text-sm font-semibold text-slate-700">Debit currency</label><input id="currency" value={accountCurrency} readOnly disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700" /><p className="mt-2 text-xs leading-5 text-slate-500">Conversion and exchange rates are confirmed by the bank.</p></div>

                  </div>

                  <div className="mt-5"><label htmlFor="purpose" className="mb-2 block text-sm font-semibold text-slate-700">Transfer purpose <span className="text-rose-600">*</span></label><select id="purpose" name="purpose" value={form.purpose} onChange={handleChange} disabled={submitting} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.purpose ? "border-rose-300" : "border-slate-200"}`}><option value="">Select purpose</option>{PURPOSE_OPTIONS.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}</select>{errors.purpose ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.purpose}</p> : null}</div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">

                    <div><label htmlFor="transferDate" className="mb-2 block text-sm font-semibold text-slate-700">Requested transfer date <span className="text-xs font-normal text-slate-400">Optional</span></label><input id="transferDate" name="transferDate" type="date" value={form.transferDate} onChange={handleChange} disabled={submitting} min={getToday()} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.transferDate ? "border-rose-300" : "border-slate-200"}`} />{errors.transferDate ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.transferDate}</p> : null}</div>

                    <div><label htmlFor="reference" className="mb-2 block text-sm font-semibold text-slate-700">Payment reference <span className="text-xs font-normal text-slate-400">Optional</span></label><input id="reference" name="reference" type="text" maxLength={120} placeholder="e.g. Invoice 1048" value={form.reference} onChange={handleChange} disabled={submitting} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.reference ? "border-rose-300" : "border-slate-200"}`} />{errors.reference ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.reference}</p> : null}</div>

                  </div>

                  <div className="mt-5"><label htmlFor="notes" className="mb-2 block text-sm font-semibold text-slate-700">Additional instructions <span className="text-xs font-normal text-slate-400">Optional</span></label><textarea id="notes" name="notes" rows={3} maxLength={500} placeholder="Add relevant payment instructions." value={form.notes} onChange={handleChange} disabled={submitting} className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.notes ? "border-rose-300" : "border-slate-200"}`} />{errors.notes ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.notes}</p> : null}</div>

                </section>

                <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-blue-700" size={19} /><div><p className="text-sm font-semibold text-blue-950">Secure transfer instruction</p><p className="mt-1 text-xs leading-5 text-blue-800">Review recipient details carefully. International payments may require additional authentication, compliance checks, correspondent-bank processing, and applicable fees before execution.</p></div></div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => navigate("/transfers")} disabled={submitting} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-50">Cancel</button><button type="submit" disabled={submitting || accountsLoading || activeAccounts.length === 0 || (!manualRecipient && (beneficiariesLoading || activeBeneficiaries.length === 0))} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"><>Continue <ChevronRight size={17} /></></button></div>

              </div>

            </div>

          </form>

          <aside className="space-y-5">

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-5"><h2 className="font-semibold text-slate-950">Transfer summary</h2><p className="mt-1 text-sm text-slate-500">Review your instruction before submission.</p></div><div className="space-y-4 p-5"><div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">Amount</span><span className="text-sm font-semibold text-slate-950">{formatMoney(form.amount, accountCurrency)}</span></div><div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">Bank fee</span><span className="text-right text-xs font-medium text-slate-500">Calculated by bank</span></div><div className="border-t border-slate-100 pt-4"><div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold text-slate-700">Transfer amount</span><span className="text-xl font-bold text-slate-950">{formatMoney(total, accountCurrency)}</span></div><p className="mt-1 text-xs text-slate-500">Fees and FX, if applicable, may change the final debit.</p></div>

              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sending to</p><p className="mt-2 text-sm font-semibold text-slate-950">{manualRecipient ? (form.beneficiaryName.trim() || "Recipient name") : (selectedBeneficiary ? getBeneficiaryName(selectedBeneficiary) : "Choose a saved beneficiary")}</p><p className="mt-1 text-xs leading-5 text-slate-500">{manualRecipient ? (form.bankName.trim() || "Recipient bank") : (selectedBeneficiary ? getBeneficiaryBank(selectedBeneficiary) : "")}</p><p className="mt-1 break-all text-xs text-slate-500">{manualRecipient ? (form.iban.trim() || form.accountNumber.trim() || "Account / IBAN") : (selectedBeneficiary ? getBeneficiaryAccount(selectedBeneficiary) : "")}</p><p className="mt-1 text-xs text-slate-500">{manualRecipient ? form.country : getBeneficiaryCountry(selectedBeneficiary || {})}</p></div>

              {selectedAccount ? <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Debit account</p><p className="mt-2 text-sm font-semibold text-blue-950">{selectedAccount?.type || "Account"}</p><p className="mt-1 text-xs text-blue-800">{selectedAccount?.accountNumber || "Account"}</p><p className="mt-2 text-xs text-blue-800">Available balance: <span className="font-semibold">{formatMoney(availableBalance, accountCurrency)}</span></p></div> : null}

            </div></div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><LockKeyhole size={18} /></div><div><h3 className="text-sm font-semibold text-slate-950">Security & verification</h3><p className="mt-1 text-xs leading-5 text-slate-500">Only submit recipient details you have independently verified. Transfers may be held for authentication, fraud prevention, or compliance review.</p></div></div></div>

          </aside>

        </div>

        ) : null}

        {["tin", "aml", "cft"].includes(step) ? (
          <div key={step} className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">{step === "tin" ? "Tax identification verification" : step === "aml" ? "Verification" : "Verification"}</h2>
                  <p className="text-sm text-slate-500">{step === "tin" ? "Enter the requested information to continue." : "Enter the requested information to continue."}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleComplianceSubmit} className="space-y-5 p-5 sm:p-7" noValidate>
              <div>
                <label htmlFor={step === "tin" ? "tinCode" : step === "aml" ? "amlCode" : "cftCode"} className="mb-2 block text-sm font-semibold text-slate-700">
                  {step === "tin" ? "TIN / Tax Code" : step === "aml" ? "AML Code" : "CFT Code"}<span className="ml-1 text-rose-600">*</span>
                </label>
                <input
                  id={step === "tin" ? "tinCode" : step === "aml" ? "amlCode" : "cftCode"}
                  name={step === "tin" ? "tinCode" : step === "aml" ? "amlCode" : "cftCode"}
                  type="password"
                  autoComplete="off"
                  value={step === "tin" ? form.tinCode : step === "aml" ? form.amlCode : form.cftCode}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder={step === "tin" ? "Enter your TIN / Tax Code" : step === "aml" ? "Enter your AML Code" : "Enter your CFT Code"}
                  aria-invalid={Boolean(errors[step === "tin" ? "tinCode" : step === "aml" ? "amlCode" : "cftCode"])}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors[step === "tin" ? "tinCode" : step === "aml" ? "amlCode" : "cftCode"] ? "border-rose-300" : "border-slate-200"}`}
                />
                {errors[step === "tin" ? "tinCode" : step === "aml" ? "amlCode" : "cftCode"] ? <p className="mt-2 text-xs font-medium text-rose-600">{errors[step === "tin" ? "tinCode" : step === "aml" ? "amlCode" : "cftCode"]}</p> : null}
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <ShieldCheck className="mt-0.5 shrink-0 text-blue-700" size={19} />
                <p className="text-xs leading-5 text-blue-900">This information is requested as part of the bank's compliance review for your transfer.</p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                <button type="button" onClick={handleBack} disabled={submitting} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Back</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Continue <ChevronRight size={17} /></button>
              </div>
            </form>
          </div>
        ) : null}

        {step === "review" ? (

          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-5 sm:px-7"><h2 className="font-semibold text-slate-950">Confirm international transfer</h2><p className="mt-1 text-sm text-slate-500">Review the details before submitting the transfer instruction.</p></div>

            <div className="space-y-4 p-5 sm:p-7">

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Debit account</p><p className="mt-1 text-sm font-semibold text-slate-900">{selectedAccount?.type || "Account"} · {selectedAccount?.accountNumber || selectedAccount?.id}</p><p className="mt-1 text-xs text-slate-500">Available: {formatMoney(availableBalance, accountCurrency)}</p></div>

                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Transfer amount</p><p className="mt-1 text-xl font-bold text-slate-950">{formatMoney(total, accountCurrency)}</p><p className="mt-1 text-xs text-slate-500">Fees and FX may affect the final debit.</p></div>

                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Recipient</p><p className="mt-1 text-sm font-semibold text-slate-900">{manualRecipient ? form.beneficiaryName : getBeneficiaryName(selectedBeneficiary || {})}</p><p className="mt-1 text-xs text-slate-500">{manualRecipient ? form.bankName : getBeneficiaryBank(selectedBeneficiary || {})}</p><p className="mt-1 break-all text-xs text-slate-500">{manualRecipient ? (form.iban || form.accountNumber) : getBeneficiaryAccount(selectedBeneficiary || {})}</p><p className="mt-1 text-xs text-slate-500">{manualRecipient ? form.country : getBeneficiaryCountry(selectedBeneficiary || {})}</p></div>

                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Purpose</p><p className="mt-1 text-sm font-semibold text-slate-900">{form.purpose}</p><p className="mt-1 text-xs text-slate-500">Reference: {form.reference || "—"}</p></div>

              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-blue-700" size={19}/><p className="text-xs leading-5 text-blue-900">Your submitted information is subject to the bank’s compliance review. Confirm only if the transfer details are correct.</p></div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between"><button type="button" onClick={handleBack} disabled={submitting} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Back</button><button type="button" onClick={handleConfirm} disabled={submitting || complianceStep !== "complete"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <><Loader2 size={17} className="animate-spin"/>Submitting…</> : <>Confirm transfer <ChevronRight size={17}/></>}</button></div>

            </div>

          </div>

        ) : null}

        {step === "success" ? <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800"><CheckCircle2 className="mb-3" size={24}/><h2 className="text-lg font-semibold">Transfer submitted</h2><p className="mt-2 text-sm">{successMessage || "Your international transfer instruction has been submitted."}</p><button type="button" onClick={() => { setStep("form"); setComplianceStep("tin"); setSuccessMessage(""); setSubmitError(""); }} className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Make another transfer</button></div> : null}

      </div>

    </div>

  );

};

export default InternationalTransfer;