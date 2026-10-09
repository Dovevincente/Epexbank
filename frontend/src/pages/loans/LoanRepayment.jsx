import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Info,
  Landmark,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ""} ${amount.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`.trim();
  }
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const formatStatus = (value) => {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const normalizeLoan = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  return (
    root?.loan ??
    root?.application ??
    root?.loanApplication ??
    root?.result ??
    (root?.id || root?.loanId ? root : null)
  );
};

const normalizeRepayment = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  return (
    root?.repayment ??
    root?.payment ??
    root?.transaction ??
    root?.result ??
    root
  );
};

const getCurrency = (loan) =>
  loan?.currency?.code ??
  loan?.currencyCode ??
  loan?.currency ??
  "USD";

const getOutstandingBalance = (loan) =>
  numberOrNull(
    loan?.outstandingBalance ??
      loan?.outstandingPrincipal ??
      loan?.remainingBalance ??
      loan?.balanceOutstanding,
  );

const getMinimumPayment = (loan) =>
  numberOrNull(
    loan?.minimumPayment ??
      loan?.minimumRepayment ??
      loan?.nextPaymentAmount ??
      loan?.nextRepaymentAmount,
  );

const getLoanStatus = (loan) =>
  String(
    loan?.status ??
      loan?.loanStatus ??
      loan?.applicationStatus ??
      "",
  ).toUpperCase();

const getAccountBalance = (account) =>
  numberOrNull(
    account?.availableBalance ??
      account?.balance ??
      account?.ledgerBalance,
  ) ?? 0;

const getAccountCurrency = (account) =>
  account?.currency?.code ??
  account?.currencyCode ??
  account?.currency ??
  "";

const getAccountLabel = (account) => {
  const type = String(account?.type ?? "Account")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

  const accountNumber = String(account?.accountNumber ?? "");

  return accountNumber
    ? `${type} •••• ${accountNumber.slice(-4)}`
    : type;
};

const LoanRepayment = () => {
  const { loanId } = useParams();
  const navigate = useNavigate();

  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();

  const [loan, setLoan] = useState(null);
  const [loanLoading, setLoanLoading] = useState(true);
  const [loanError, setLoanError] = useState("");

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(null);

  const loadLoan = useCallback(async () => {
    if (!loanId) {
      setLoanError("A loan identifier was not provided.");
      setLoanLoading(false);
      return;
    }

    setLoanLoading(true);
    setLoanError("");

    try {
      const response = await api.get(
        `/loans/${encodeURIComponent(loanId)}`,
      );

      const normalized = normalizeLoan(response?.data);

      if (!normalized) {
        throw new Error("The banking API returned no loan details.");
      }

      setLoan(normalized);

      const linkedAccountId =
        normalized?.account?.id ??
        normalized?.accountId ??
        normalized?.repaymentAccount?.id ??
        "";

      if (linkedAccountId) {
        setAccountId(String(linkedAccountId));
      }
    } catch (requestError) {
      setLoan(null);
      setLoanError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load this loan.",
      );
    } finally {
      setLoanLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    loadLoan();
  }, [loadLoan]);

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const activeAccount = accounts.find(
        (account) =>
          String(account?.status ?? "").toUpperCase() === "ACTIVE",
      );

      if (activeAccount?.id) {
        setAccountId(String(activeAccount.id));
      }
    }
  }, [accounts, accountId]);

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          String(account?.status ?? "").toUpperCase() === "ACTIVE",
      ),
    [accounts],
  );

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) => String(account?.id) === String(accountId),
      ) ?? null,
    [accounts, accountId],
  );

  const currency = getCurrency(loan);
  const outstandingBalance = getOutstandingBalance(loan);
  const minimumPayment = getMinimumPayment(loan);
  const loanStatus = getLoanStatus(loan);

  const enteredAmount = numberOrNull(amount);
  const availableBalance = selectedAccount
    ? getAccountBalance(selectedAccount)
    : 0;

  const accountCurrency = selectedAccount
    ? getAccountCurrency(selectedAccount)
    : "";

  const accountCurrencyMismatch =
    Boolean(accountCurrency) &&
    Boolean(currency) &&
    accountCurrency !== currency;

  const isRepayable = [
    "ACTIVE",
    "DISBURSED",
    "OVERDUE",
  ].includes(loanStatus);

  const validate = () => {
    const errors = [];

    if (!loan) {
      errors.push("Loan details are unavailable.");
    }

    if (!isRepayable) {
      errors.push(
        "This loan is not currently in a repayable state.",
      );
    }

    if (!accountId) {
      errors.push("Select an account to make the repayment.");
    }

    if (accountCurrencyMismatch) {
      errors.push(
        `The selected account uses ${accountCurrency}, while this loan uses ${currency}.`,
      );
    }

    if (enteredAmount === null || enteredAmount <= 0) {
      errors.push("Enter a valid repayment amount.");
    }

    if (
      enteredAmount !== null &&
      outstandingBalance !== null &&
      enteredAmount > outstandingBalance
    ) {
      errors.push(
        `The repayment cannot exceed the outstanding balance of ${formatMoney(
          outstandingBalance,
          currency,
        )}.`,
      );
    }

    if (
      enteredAmount !== null &&
      enteredAmount > availableBalance
    ) {
      errors.push(
        `The selected account has only ${formatMoney(
          availableBalance,
          accountCurrency || currency,
        )} available.`,
      );
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitError("");

    const validationErrors = validate();

    if (validationErrors.length > 0) {
      setSubmitError(validationErrors[0]);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        loanId,
        accountId,
        amount: enteredAmount,
        currency,
      };

      const response = await api.post(
        `/loans/${encodeURIComponent(loanId)}/repayments`,
        payload,
      );

      const repayment = normalizeRepayment(response?.data);

      setSuccess(repayment);
      setAmount("");

      await Promise.all([
        loadLoan(),
        refreshAccounts().catch(() => {}),
      ]);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (requestError) {
      setSubmitError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to process the repayment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetSuccess = () => {
    setSuccess(null);
    setSubmitError("");
  };

  if (loanLoading || accountsLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />

          <div className="h-44 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="h-96 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (loanError || !loan) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-slate-900 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
              Unable to load repayment information
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {loanError ||
                "The requested loan could not be found."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadLoan}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <Link
                to={`/loans/${encodeURIComponent(loanId ?? "")}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Loan details
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (success) {
    const reference =
      success?.reference ??
      success?.repaymentReference ??
      success?.transactionReference ??
      success?.transaction?.reference ??
      "";

    const transactionId =
      success?.transactionId ??
      success?.transaction?.id ??
      "";

    const repaymentAmount =
      numberOrNull(
        success?.amount ??
          success?.paymentAmount ??
          success?.transaction?.amount,
      ) ?? enteredAmount;

    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <h1 className="mt-5 text-2xl font-bold text-emerald-950 dark:text-emerald-300 sm:text-3xl">
                Repayment submitted
              </h1>

              <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-400 sm:text-base">
                The repayment request was accepted by the Epex Bank API.
                Review the transaction status below.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Amount
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                    {formatMoney(repaymentAmount, currency)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </p>

                  <p className="mt-2 font-bold text-slate-950 dark:text-white">
                    {formatStatus(
                      success?.status ??
                        success?.transaction?.status ??
                        "SUBMITTED",
                    )}
                  </p>
                </div>

                {reference && (
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Reference
                    </p>

                    <p className="mt-2 break-all font-mono text-sm font-bold text-slate-950 dark:text-white">
                      {reference}
                    </p>
                  </div>
                )}

                {transactionId && (
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Transaction ID
                    </p>

                    <p className="mt-2 break-all font-mono text-sm font-bold text-slate-950 dark:text-white">
                      {transactionId}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                  <p className="text-sm leading-6 text-blue-800 dark:text-blue-400">
                    The repayment has not been treated as permanently
                    completed by the frontend. The displayed status comes from
                    the response returned by the banking API.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={`/loans/${encodeURIComponent(loanId)}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  View loan
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {transactionId && (
                  <Link
                    to={`/transactions/${encodeURIComponent(
                      transactionId,
                    )}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    View transaction
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={resetSuccess}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Make another repayment
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            to={`/loans/${encodeURIComponent(loanId)}`}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to loan details
          </Link>

          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
            <Banknote className="h-4 w-4" />
            Lending
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Loan repayment
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
            Make a repayment against your active Epex Bank loan using an
            eligible account.
          </p>
        </div>

        {(accountsError || submitError) && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

              <div>
                <p className="font-bold text-red-950 dark:text-red-300">
                  Repayment could not be completed
                </p>

                <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                  {submitError || accountsError}
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <Banknote className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Loan
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                    {loan?.product?.name ??
                      loan?.productName ??
                      loan?.loanProduct?.name ??
                      "Loan"}
                  </h2>
                </div>

                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {formatStatus(loanStatus)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Outstanding
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                    {formatMoney(
                      outstandingBalance,
                      currency,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Minimum payment
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                    {formatMoney(
                      minimumPayment,
                      currency,
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Currency
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                    {currency}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isRepayable && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-6">
            <div className="flex items-start gap-4">
              <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />

              <div>
                <h2 className="font-bold text-amber-950 dark:text-amber-300">
                  Repayment is not currently available
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-400">
                  This loan currently has a status of{" "}
                  <strong>{formatStatus(loanStatus)}</strong>. Repayments can
                  only be submitted when the loan is in an eligible repayment
                  state.
                </p>
              </div>
            </div>
          </section>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
        >
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Repayment details
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Select the account to debit and enter the amount you want to
                repay.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <label
                  htmlFor="repaymentAccount"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Payment account
                </label>

                {activeAccounts.length === 0 ? (
                  <div className="mt-2 rounded-2xl border border-dashed border-slate-300 p-5 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                      <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                        No active account is available for repayment.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-2">
                    <Landmark className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <select
                      id="repaymentAccount"
                      value={accountId}
                      onChange={(event) => {
                        setAccountId(event.target.value);
                        setSubmitError("");
                      }}
                      className="min-h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">Select account</option>

                      {activeAccounts.map((account) => (
                        <option
                          key={account?.id}
                          value={account?.id}
                        >
                          {getAccountLabel(account)} —{" "}
                          {formatMoney(
                            getAccountBalance(account),
                            getAccountCurrency(account) ||
                              currency,
                          )}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="repaymentAmount"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Repayment amount
                </label>

                <div className="relative mt-2">
                  <Banknote className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="repaymentAmount"
                    name="repaymentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setSubmitError("");
                    }}
                    placeholder="0.00"
                    disabled={!isRepayable || submitting}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-20 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />

                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    {currency}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {minimumPayment !== null && (
                    <span>
                      Minimum:{" "}
                      <strong>
                        {formatMoney(
                          minimumPayment,
                          currency,
                        )}
                      </strong>
                    </span>
                  )}

                  {outstandingBalance !== null && (
                    <span>
                      Outstanding:{" "}
                      <strong>
                        {formatMoney(
                          outstandingBalance,
                          currency,
                        )}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {selectedAccount && (
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Available balance
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                        {formatMoney(
                          availableBalance,
                          accountCurrency ||
                            currency,
                        )}
                      </p>

                      {accountCurrencyMismatch && (
                        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                          Currency mismatch: this loan uses {currency}.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                  <div>
                    <p className="font-bold text-blue-950 dark:text-blue-300">
                      Repayment processing
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-400">
                      The selected account will only be debited when the
                      repayment request is accepted and processed by the
                      authenticated banking backend.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !isRepayable ||
                  activeAccounts.length === 0
                }
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing repayment...
                  </>
                ) : (
                  <>
                    Make repayment
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Repayment summary
              </h2>

              <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Loan
                  </span>

                  <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                    {loan?.product?.name ??
                      loan?.productName ??
                      loan?.loanProduct?.name ??
                      "Loan"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Outstanding
                  </span>

                  <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                    {formatMoney(
                      outstandingBalance,
                      currency,
                    )}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Payment
                  </span>

                  <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                    {enteredAmount !== null
                      ? formatMoney(
                          enteredAmount,
                          currency,
                        )
                      : "—"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Remaining after payment
                  </span>

                  <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                    {enteredAmount !== null &&
                    outstandingBalance !== null
                      ? formatMoney(
                          Math.max(
                            outstandingBalance -
                              enteredAmount,
                            0,
                          ),
                          currency,
                        )
                      : "—"}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white">
                    Secure repayment
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Repayments are submitted through your authenticated Epex
                    Bank session. Never provide passwords, OTPs, card PINs, or
                    security codes in this form.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />

                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white">
                    Confirm before submitting
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Check the repayment amount and funding account carefully.
                    The final transaction status is determined by the banking
                    backend.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </form>

        <div className="pb-2">
          <button
            type="button"
            onClick={() => {
              loadLoan();
              refreshAccounts().catch(() => {});
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh loan and account balances
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanRepayment;