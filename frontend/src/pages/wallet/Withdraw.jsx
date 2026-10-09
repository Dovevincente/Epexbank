import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpFromLine,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const WITHDRAWAL_METHODS = [
  {
    value: "BANK_TRANSFER",
    label: "Bank transfer",
    description: "Send funds to an eligible bank account.",
    icon: Building2,
  },
  {
    value: "BANK",
    label: "Bank withdrawal",
    description: "Withdraw through a supported banking channel.",
    icon: CreditCard,
  },
  {
    value: "WALLET",
    label: "Wallet",
    description: "Withdraw to an eligible connected wallet.",
    icon: WalletCards,
  },
];

const MAX_AMOUNT = 1000000000;

const isNotFoundOrUnavailable = (error) =>
  [404, 405, 501].includes(error?.response?.status);

const normalizeAccounts = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.accounts)) return value.accounts;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.accounts)) return value.data.accounts;
  return [];
};

const getCurrencyCode = (account) =>
  String(
    account?.currency?.code ||
      account?.currencyCode ||
      account?.currency ||
      "USD",
  ).toUpperCase();

const getAvailableBalance = (account) => {
  const value = Number(account?.availableBalance ?? account?.balance ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const formatMoney = (amount, currency = "USD") => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
};

const formatAccountNumber = (accountNumber) => {
  const value = String(accountNumber ?? "");

  if (!value) return "Account number unavailable";

  if (value.length <= 4) {
    return value;
  }

  return `•••• ${value.slice(-4)}`;
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unable to process your withdrawal request.";

const Withdraw = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedAccountId =
    searchParams.get("accountId") || searchParams.get("account");

  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();

  const [selectedAccountId, setSelectedAccountId] = useState(
    requestedAccountId || "",
  );
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  const eligibleAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          String(account?.status ?? "").toUpperCase() === "ACTIVE" &&
          getAvailableBalance(account) > 0,
      ),
    [accounts],
  );

  const selectedAccount = useMemo(() => {
    if (!eligibleAccounts.length) return null;

    return (
      eligibleAccounts.find(
        (account) => String(account?.id) === String(selectedAccountId),
      ) || eligibleAccounts[0]
    );
  }, [eligibleAccounts, selectedAccountId]);

  const selectedCurrency = getCurrencyCode(selectedAccount);
  const availableBalance = getAvailableBalance(selectedAccount);

  const numericAmount = Number(amount);

  const amountIsValid =
    amount !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= MAX_AMOUNT &&
    numericAmount <= availableBalance;

  const amountTooHigh =
    amount !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > availableBalance;

  const canSubmit =
    Boolean(selectedAccount?.id) &&
    amountIsValid &&
    Boolean(method) &&
    Boolean(destination.trim()) &&
    !loading;

  useEffect(() => {
    if (!selectedAccountId && eligibleAccounts.length) {
      setSelectedAccountId(String(eligibleAccounts[0].id));
      return;
    }

    if (
      selectedAccountId &&
      eligibleAccounts.length &&
      !eligibleAccounts.some(
        (account) => String(account.id) === String(selectedAccountId),
      )
    ) {
      setSelectedAccountId(String(eligibleAccounts[0].id));
    }
  }, [eligibleAccounts, selectedAccountId]);

  useEffect(() => {
    if (!selectedAccount) return;

    const currency = getCurrencyCode(selectedAccount);

    if (amount !== "") {
      const currentAmount = Number(amount);

      if (Number.isFinite(currentAmount) && currentAmount > availableBalance) {
        setAmount(String(availableBalance));
      }
    }

    setSubmitError("");

    if (!currency) {
      setSubmitError("The selected account does not have a valid currency.");
    }
  }, [selectedAccount?.id]);

  const handleRefresh = useCallback(async () => {
    setSubmitError("");

    try {
      await refreshAccounts();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  }, [refreshAccounts]);

  const handleCopyReference = async () => {
    const reference =
      success?.reference ||
      success?.withdrawal?.reference ||
      success?.withdrawal?.id;

    if (!reference) return;

    try {
      await navigator.clipboard.writeText(String(reference));
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedAccount) {
      setSubmitError("Please select an eligible account.");
      return;
    }

    if (!amountIsValid) {
      setSubmitError(
        amountTooHigh
          ? "The withdrawal amount cannot exceed your available balance."
          : "Enter a valid withdrawal amount.",
      );
      return;
    }

    if (!destination.trim()) {
      setSubmitError("Enter the withdrawal destination or beneficiary details.");
      return;
    }

    setLoading(true);
    setSubmitError("");
    setSuccess(null);

    const payload = {
      accountId: selectedAccount.id,
      amount: numericAmount,
      currency: selectedCurrency,
      method,
      destination: destination.trim(),
      description: description.trim() || undefined,
    };

    try {
      let response;

      try {
        response = await api.post("/withdrawals", payload);
      } catch (error) {
        if (!isNotFoundOrUnavailable(error)) {
          throw error;
        }

        response = await api.post("/withdrawal", payload);
      }

      const data = response?.data ?? {};

      setSuccess({
        ...data,
        withdrawal: data?.withdrawal || data?.data || data,
      });

      setAmount("");
      setDestination("");
      setDescription("");

      await refreshAccounts().catch(() => {});
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const withdrawal = success?.withdrawal || success;
    const reference =
      withdrawal?.reference ||
      withdrawal?.withdrawalReference ||
      withdrawal?.id;

    const status = String(
      withdrawal?.status || success?.status || "PENDING",
    ).toUpperCase();

    return (
      <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-6 py-8 text-center dark:border-slate-800 sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
                Withdrawal request submitted
              </h1>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Your request has been submitted to Epex Bank for processing.
                The final processing status is determined by the bank's
                withdrawal service.
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </p>
                <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                  {formatMoney(
                    withdrawal?.amount,
                    withdrawal?.currency || selectedCurrency,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <Clock3 className="h-4 w-4" />
                  {status}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reference
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-slate-950 dark:text-white">
                    {reference || "Reference pending"}
                  </p>

                  {reference && (
                    <button
                      type="button"
                      onClick={handleCopyReference}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                      aria-label="Copy withdrawal reference"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Submitted
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                  {formatDateTime(
                    withdrawal?.createdAt ||
                      withdrawal?.created_at ||
                      success?.createdAt,
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 p-6 dark:border-slate-800 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(null);
                    handleRefresh();
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  Make another withdrawal
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/transactions")}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  View transactions
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="leading-6">
              Keep your withdrawal reference for support or transaction
              verification. Never share your banking password, PIN, OTP, or
              authentication codes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <ArrowUpFromLine className="h-5 w-5" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Withdraw funds
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Request a withdrawal from an eligible Epex Bank account. Your
              available balance and account currency are checked before the
              request is submitted.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={accountsLoading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${accountsLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {accountsError && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Unable to load accounts</p>
              <p className="mt-1">{accountsError}</p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="leading-6">{submitError}</p>
          </div>
        )}

        {accountsLoading && !accounts.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              Loading your eligible accounts…
            </p>
          </div>
        ) : eligibleAccounts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <WalletCards className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              No eligible account
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
              There is currently no active account with available funds that
              can be used for a withdrawal.
            </p>

            <button
              type="button"
              onClick={() => navigate("/accounts")}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              View accounts
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                      Withdrawal account
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Choose the account to debit.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {eligibleAccounts.map((account) => {
                      const accountId = String(account.id);
                      const active = accountId === String(selectedAccount?.id);
                      const currency = getCurrencyCode(account);
                      const balance = getAvailableBalance(account);

                      return (
                        <button
                          type="button"
                          key={account.id}
                          onClick={() => {
                            setSelectedAccountId(accountId);
                            setSubmitError("");
                          }}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-950"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <WalletCards className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                                <p className="truncate font-semibold text-slate-950 dark:text-white">
                                  {account?.name ||
                                    account?.type ||
                                    "Bank account"}
                                </p>
                              </div>

                              <p className="mt-1 pl-7 text-xs text-slate-500 dark:text-slate-400">
                                {formatAccountNumber(account?.accountNumber)}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-slate-950 dark:text-white">
                                {formatMoney(balance, currency)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Available
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                      Withdrawal amount
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Available balance:{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(availableBalance, selectedCurrency)}
                      </span>
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Amount
                    </span>

                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        max={availableBalance}
                        step="0.01"
                        value={amount}
                        onChange={(event) => {
                          setAmount(event.target.value);
                          setSubmitError("");
                        }}
                        placeholder="0.00"
                        className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 pr-20 text-2xl font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-700 dark:focus:ring-blue-950"
                      />

                      <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">
                        {selectedCurrency}
                      </span>
                    </div>

                    {amountTooHigh && (
                      <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                        Amount exceeds your available balance.
                      </p>
                    )}
                  </label>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                      Withdrawal method
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Select the supported destination channel.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {WITHDRAWAL_METHODS.map((item) => {
                      const Icon = item.icon;
                      const active = method === item.value;

                      return (
                        <button
                          type="button"
                          key={item.value}
                          onClick={() => {
                            setMethod(item.value);
                            setSubmitError("");
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-950"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              active
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          />

                          <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                            {item.label}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                      Destination details
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Provide the destination information required for this
                      withdrawal method.
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Destination / beneficiary details
                    </span>

                    <input
                      type="text"
                      value={destination}
                      onChange={(event) => {
                        setDestination(event.target.value);
                        setSubmitError("");
                      }}
                      placeholder="Enter beneficiary or destination details"
                      autoComplete="off"
                      className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:ring-blue-950"
                    />
                  </label>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Description{" "}
                      <span className="font-normal text-slate-400">
                        (optional)
                      </span>
                    </span>

                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder="Add a note for this withdrawal"
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:ring-blue-950"
                    />

                    <p className="mt-2 text-right text-xs text-slate-400">
                      {description.length}/500
                    </p>
                  </label>
                </section>
              </div>

              <aside className="lg:sticky lg:top-6 lg:h-fit">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Review withdrawal
                  </h2>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        From account
                      </span>
                      <span className="max-w-[190px] text-right text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedAccount
                          ? formatAccountNumber(selectedAccount.accountNumber)
                          : "—"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Method
                      </span>
                      <span className="text-right text-sm font-semibold text-slate-900 dark:text-white">
                        {WITHDRAWAL_METHODS.find(
                          (item) => item.value === method,
                        )?.label || method}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                      <div className="flex items-end justify-between gap-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          Withdrawal amount
                        </span>
                        <span className="text-2xl font-bold text-slate-950 dark:text-white">
                          {amount
                            ? formatMoney(numericAmount, selectedCurrency)
                            : formatMoney(0, selectedCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting request…
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="h-4 w-4" />
                        Submit withdrawal
                      </>
                    )}
                  </button>

                  <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Withdrawal requests are processed through the bank's
                      authenticated transaction system. Never provide your
                      password, PIN, OTP, or recovery codes in the destination
                      field.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Withdraw;