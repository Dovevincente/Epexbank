import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  CircleAlert,
  Loader2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api.js";
import {
  createInternalTransfer,
} from "../../services/transferService.js";

/* ============================================================
   CONSTANTS
============================================================ */

const MAX_AMOUNT_LENGTH = 18;
const MAX_DESCRIPTION_LENGTH = 500;

/* ============================================================
   HELPERS
============================================================ */

const formatMoney = (
  value,
  currency = "USD",
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return `0.00 ${currency}`;
  }

  try {
    return (
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numericValue) +
      ` ${currency}`
    );
  } catch {
    return `${numericValue.toFixed(2)} ${currency}`;
  }
};

const normalizeAccountNumber = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getErrorMessage = (
  error,
  fallback = "We could not complete this request. Please try again.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const unwrapAccounts = (response) => {
  const data = response?.data ?? response;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.accounts)) {
    return data.accounts;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.accounts)) {
    return data.data.accounts;
  }

  return [];
};

const unwrapTransfer = (response) => {
  const data = response?.data ?? response;

  return (
    data?.transfer ||
    data?.data?.transfer ||
    data?.data ||
    null
  );
};

const getAlreadyProcessed = (response) => {
  const data = response?.data ?? response;

  return Boolean(
    data?.alreadyProcessed ||
      data?.data?.alreadyProcessed,
  );
};

const getAccountCurrency = (account) => {
  return (
    account?.currency?.code ||
    account?.currencyCode ||
    "USD"
  );
};

const getAccountBalance = (account) => {
  const value =
    account?.availableBalance ??
    account?.balance ??
    account?.currentBalance ??
    0;

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
};

const getAccountLabel = (account) => {
  const accountNumber =
    account?.accountNumber ||
    account?.number ||
    "";

  const accountType =
    account?.type ||
    account?.accountType ||
    "Account";

  if (!accountNumber) {
    return accountType;
  }

  return `${accountType} •••• ${String(
    accountNumber,
  ).slice(-4)}`;
};

const isActiveAccount = (account) => {
  return (
    String(
      account?.status || "ACTIVE",
    ).toUpperCase() === "ACTIVE"
  );
};

/* ============================================================
   COMPONENT
============================================================ */

const InternalTransfer = () => {
  const navigate = useNavigate();

  /* ==========================================================
     ACCOUNTS
  ========================================================== */

  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] =
    useState(true);
  const [accountsError, setAccountsError] =
    useState("");

  /* ==========================================================
     FORM
  ========================================================== */

  const [
    senderAccountNumber,
    setSenderAccountNumber,
  ] = useState("");

  const [
    receiverAccountNumber,
    setReceiverAccountNumber,
  ] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] =
    useState("");

  /* ==========================================================
     TRANSFER STATE
  ========================================================== */

  const [step, setStep] = useState("form");
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState(null);

  const [copiedReference, setCopiedReference] =
    useState(false);

  /* ==========================================================
     LOAD ACCOUNTS
  ========================================================== */

  const loadAccounts = useCallback(
    async (showInitialLoader = false) => {
      if (showInitialLoader) {
        setAccountsLoading(true);
      }

      setAccountsError("");

      try {
        const response =
          await api.get("/accounts");

        const loadedAccounts =
          unwrapAccounts(response);

        const activeAccounts =
          loadedAccounts.filter(
            isActiveAccount,
          );

        setAccounts(activeAccounts);

        /*
         * Preserve the currently selected sender account
         * if it still exists.
         */
        setSenderAccountNumber(
          (currentNumber) => {
            const currentExists =
              activeAccounts.some(
                (account) =>
                  normalizeAccountNumber(
                    account?.accountNumber,
                  ) ===
                  normalizeAccountNumber(
                    currentNumber,
                  ),
              );

            if (currentExists) {
              return currentNumber;
            }

            if (activeAccounts.length === 1) {
              return (
                activeAccounts[0]
                  ?.accountNumber || ""
              );
            }

            return "";
          },
        );
      } catch (requestError) {
        console.error(
          "Unable to load accounts:",
          requestError,
        );

        setAccounts([]);
        setAccountsError(
          getErrorMessage(
            requestError,
            "Unable to load your accounts. Please try again.",
          ),
        );
      } finally {
        setAccountsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadAccounts(true);
  }, [loadAccounts]);

  /* ==========================================================
     SELECTED SENDER
  ========================================================== */

  const selectedSender = useMemo(() => {
    const normalizedSender =
      normalizeAccountNumber(
        senderAccountNumber,
      );

    if (!normalizedSender) {
      return null;
    }

    return (
      accounts.find(
        (account) =>
          normalizeAccountNumber(
            account?.accountNumber,
          ) === normalizedSender,
      ) || null
    );
  }, [
    accounts,
    senderAccountNumber,
  ]);

  /* ==========================================================
     FINANCIAL VALUES
  ========================================================== */

  const currencyCode =
    getAccountCurrency(selectedSender);

  const availableBalance =
    getAccountBalance(selectedSender);

  const numericAmount =
    Number(amount);

  const amountIsValid =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  const amountWithinBalance =
    amountIsValid &&
    numericAmount <= availableBalance;

  /* ==========================================================
     VALIDATION
  ========================================================== */

  const formValidation = useMemo(() => {
    if (!senderAccountNumber) {
      return "Select the account you want to transfer from.";
    }

    if (!selectedSender) {
      return "The selected source account is no longer available.";
    }

    if (!isActiveAccount(selectedSender)) {
      return "The selected source account is not active.";
    }

    if (!receiverAccountNumber.trim()) {
      return "Enter the recipient account number.";
    }

    const normalizedSender =
      normalizeAccountNumber(
        senderAccountNumber,
      );

    const normalizedReceiver =
      normalizeAccountNumber(
        receiverAccountNumber,
      );

    if (
      normalizedSender ===
      normalizedReceiver
    ) {
      return "Sender and recipient accounts must be different.";
    }

    if (!amount.trim()) {
      return "Enter a transfer amount.";
    }

    if (
      !/^\d+(?:\.\d{1,2})?$/.test(
        amount.trim(),
      )
    ) {
      return "Enter a valid amount with no more than two decimal places.";
    }

    if (
      amount.length >
      MAX_AMOUNT_LENGTH
    ) {
      return "The transfer amount is too large.";
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return "Enter a valid amount greater than zero.";
    }

    if (!amountWithinBalance) {
      return "The transfer amount exceeds your available balance.";
    }

    return "";
  }, [
    senderAccountNumber,
    receiverAccountNumber,
    amount,
    numericAmount,
    selectedSender,
    amountWithinBalance,
  ]);

  /* ==========================================================
     FORM INPUTS
  ========================================================== */

  const handleReceiverChange = (
    event,
  ) => {
    const value =
      event.target.value;

    if (value.length > 64) {
      return;
    }

    setReceiverAccountNumber(
      value.toUpperCase(),
    );
    setError("");
  };

  const handleAmountChange = (
    event,
  ) => {
    const value =
      event.target.value;

    if (value === "") {
      setAmount("");
      setError("");
      return;
    }

    if (
      value.length >
      MAX_AMOUNT_LENGTH
    ) {
      return;
    }

    if (
      !/^\d*(?:\.\d{0,2})?$/.test(
        value,
      )
    ) {
      return;
    }

    setAmount(value);
    setError("");
  };

  const handleDescriptionChange = (
    event,
  ) => {
    setDescription(
      event.target.value.slice(
        0,
        MAX_DESCRIPTION_LENGTH,
      ),
    );
    setError("");
  };

  /* ==========================================================
     CONTINUE TO REVIEW
  ========================================================== */

  const handleContinue = (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    if (formValidation) {
      setError(formValidation);
      return;
    }

    setCopiedReference(false);
    setStep("review");
  };

  /* ==========================================================
     SUBMIT TRANSFER
  ========================================================== */

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    setError("");

    /*
     * Revalidate immediately before the actual API call.
     * This protects against stale UI state.
     */
    if (formValidation) {
      setError(formValidation);
      setStep("form");
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await createInternalTransfer({
          senderAccountNumber:
            normalizeAccountNumber(
              senderAccountNumber,
            ),
          receiverAccountNumber:
            normalizeAccountNumber(
              receiverAccountNumber,
            ),
          amount: Number(
            numericAmount.toFixed(2),
          ),
          description:
            description.trim() ||
            undefined,
        });

      const transfer =
        unwrapTransfer(response);

      if (!transfer?.id) {
        throw new Error(
          "The transfer request completed but no valid transfer record was returned.",
        );
      }

      setSuccess({
        transfer,
        alreadyProcessed:
          getAlreadyProcessed(
            response,
          ),
      });

      setCopiedReference(false);
      setStep("success");
    } catch (requestError) {
      console.error(
        "Internal transfer failed:",
        requestError,
      );

      setError(
        getErrorMessage(
          requestError,
          "We could not complete the internal transfer. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================
     COPY REFERENCE
  ========================================================== */

  const handleCopyReference = async (
    reference,
  ) => {
    if (!reference) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        reference,
      );

      setCopiedReference(true);

      window.setTimeout(() => {
        setCopiedReference(false);
      }, 2000);
    } catch (copyError) {
      console.error(
        "Unable to copy reference:",
        copyError,
      );
    }
  };

  /* ==========================================================
     RESET
  ========================================================== */

  const resetForm = () => {
    setReceiverAccountNumber("");
    setAmount("");
    setDescription("");
    setError("");
    setSuccess(null);
    setCopiedReference(false);
    setStep("form");
  };

  /* ==========================================================
     RETRY
  ========================================================== */

  const handleRetryAccounts = async () => {
    await loadAccounts(true);
  };

  /* ==========================================================
     SUCCESS
  ========================================================== */

  if (step === "success") {
    const transfer =
      success?.transfer;

    const reference =
      transfer?.reference ||
      transfer?.transferReference ||
      transfer?.transactionReference ||
      "";

    const transferCurrency =
      transfer?.currencyCode ||
      transfer?.currency?.code ||
      currencyCode;

    const transferAmount =
      transfer?.amount ??
      numericAmount;

    const status = String(
      transfer?.status ||
        "COMPLETED",
    )
      .replace(/_/g, " ")
      .toUpperCase();

    const alreadyProcessed =
      Boolean(success?.alreadyProcessed);

    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-10 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2
                className="h-9 w-9 text-emerald-600"
                strokeWidth={2}
              />
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {alreadyProcessed
                ? "Transfer already processed"
                : "Transfer completed"}
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              {alreadyProcessed
                ? "This transfer request was already processed safely. No duplicate transaction was created."
                : "Your internal transfer has been successfully processed."}
            </p>

            <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-slate-50 p-5 text-left">
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-slate-500">
                  Amount
                </span>

                <strong className="text-lg text-slate-950">
                  {formatMoney(
                    transferAmount,
                    transferCurrency,
                  )}
                </strong>
              </div>

              <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-slate-500">
                  Recipient
                </span>

                <span className="break-all text-left text-sm font-semibold text-slate-900 sm:text-right">
                  {receiverAccountNumber}
                </span>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-slate-500">
                  Status
                </span>

                <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {status}
                </span>
              </div>

              {reference && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Reference
                      </p>

                      <p className="mt-2 break-all font-mono text-xs font-semibold text-slate-900">
                        {reference}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyReference(
                          reference,
                        )
                      }
                      className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {copiedReference ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Clipboard className="h-3.5 w-3.5" />
                          Copy reference
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {alreadyProcessed && (
              <div className="mx-auto mt-4 max-w-xl rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm leading-6 text-blue-800">
                The request was safely handled using its
                idempotency protection. The same transfer was
                not posted twice.
              </div>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Make another transfer
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/transfers")
                }
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View transfers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     MAIN PAGE
  ============================================================ */

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* PAGE HEADER */}

      <div className="mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ArrowLeftRight
              className="h-5 w-5"
              strokeWidth={2}
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Internal transfer
            </h1>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Transfer funds securely between eligible Epex
              Bank accounts.
            </p>
          </div>
        </div>
      </div>

      {/* INFORMATION CARDS */}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="h-4 w-4" />

            <span className="text-xs font-semibold uppercase tracking-wide">
              Secure
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            Protected transfer
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <ArrowLeftRight className="h-4 w-4" />

            <span className="text-xs font-semibold uppercase tracking-wide">
              Type
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            Epex Bank internal
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <WalletCards className="h-4 w-4" />

            <span className="text-xs font-semibold uppercase tracking-wide">
              Currency
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {currencyCode}
          </p>
        </div>
      </div>

      {/* MAIN CARD */}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                {step === "review"
                  ? "Review transfer"
                  : "Transfer details"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {step === "review"
                  ? "Check the details carefully before confirming."
                  : "Enter the account and amount for your transfer."}
              </p>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  step === "form"
                    ? "bg-blue-600"
                    : "bg-emerald-500"
                }`}
              />

              <span className="text-xs font-medium text-slate-500">
                {step === "form"
                  ? "Step 1 of 2"
                  : "Step 2 of 2"}
              </span>
            </div>
          </div>
        </div>

        {/* ACCOUNT ERROR */}

        {accountsError && (
          <div className="m-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:m-7">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Unable to load your accounts
              </p>

              <p className="mt-1 leading-6">
                {accountsError}
              </p>

              <button
                type="button"
                onClick={handleRetryAccounts}
                disabled={accountsLoading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {accountsLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Retry
              </button>
            </div>
          </div>
        )}

        {/* TRANSFER ERROR */}

        {error && (
          <div
            role="alert"
            className="mx-5 mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:mx-7"
          >
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Transfer could not be completed
              </p>

              <p className="mt-1 leading-6">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ======================================================
            FORM
        ====================================================== */}

        {step === "form" ? (
          <form
            onSubmit={handleContinue}
            className="space-y-7 px-5 py-6 sm:px-7 sm:py-8"
          >
            {/* FROM ACCOUNT */}

            <div>
              <label
                htmlFor="senderAccount"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                From account
              </label>

              {accountsLoading ? (
                <div className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your accounts...
                </div>
              ) : accounts.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  No eligible active accounts are available
                  for internal transfers.
                </div>
              ) : (
                <select
                  id="senderAccount"
                  value={senderAccountNumber}
                  onChange={(event) => {
                    setSenderAccountNumber(
                      event.target.value,
                    );
                    setError("");
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="">
                    Select an account
                  </option>

                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={
                          account.accountNumber
                        }
                      >
                        {getAccountLabel(
                          account,
                        )}{" "}
                        —{" "}
                        {formatMoney(
                          getAccountBalance(
                            account,
                          ),
                          getAccountCurrency(
                            account,
                          ),
                        )}
                      </option>
                    ),
                  )}
                </select>
              )}

              {selectedSender && (
                <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-slate-500">
                      Available balance
                    </span>

                    <strong className="text-sm text-slate-950">
                      {formatMoney(
                        availableBalance,
                        currencyCode,
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* RECIPIENT */}

            <div>
              <label
                htmlFor="receiverAccount"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Recipient account number
              </label>

              <input
                id="receiverAccount"
                type="text"
                value={
                  receiverAccountNumber
                }
                onChange={
                  handleReceiverChange
                }
                placeholder="Enter Epex Bank account number"
                autoComplete="off"
                spellCheck="false"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Make sure the account number belongs to the
                intended recipient.
              </p>
            </div>

            {/* AMOUNT */}

            <div>
              <label
                htmlFor="transferAmount"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Amount
              </label>

              <div className="relative">
                <input
                  id="transferAmount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={
                    handleAmountChange
                  }
                  placeholder="0.00"
                  autoComplete="off"
                  className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-lg font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  {currencyCode}
                </span>
              </div>

              {selectedSender && (
                <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:justify-between sm:gap-4">
                  <span>
                    Available{" "}
                    {formatMoney(
                      availableBalance,
                      currencyCode,
                    )}
                  </span>

                  {amountIsValid && (
                    <span
                      className={
                        amountWithinBalance
                          ? ""
                          : "font-semibold text-red-600"
                      }
                    >
                      Remaining{" "}
                      {formatMoney(
                        Math.max(
                          availableBalance -
                            numericAmount,
                          0,
                        ),
                        currencyCode,
                      )}
                    </span>
                  )}
                </div>
              )}

              {amountIsValid &&
                !amountWithinBalance && (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    The amount exceeds your available balance.
                  </p>
                )}
            </div>

            {/* DESCRIPTION */}

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Description
                <span className="ml-1 font-normal text-slate-400">
                  (optional)
                </span>
              </label>

              <textarea
                id="description"
                rows={3}
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
                value={description}
                onChange={
                  handleDescriptionChange
                }
                placeholder="What is this transfer for?"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

              <div className="mt-1 text-right text-xs text-slate-400">
                {description.length}/
                {MAX_DESCRIPTION_LENGTH}
              </div>
            </div>

            {/* ACTIONS */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate("/transfers")
                }
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  accountsLoading ||
                  accounts.length === 0 ||
                  Boolean(formValidation)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Review transfer
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          /* ======================================================
             REVIEW
          ====================================================== */

          <div className="px-5 py-6 sm:px-7 sm:py-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    From
                  </p>

                  <p className="mt-2 break-all text-sm font-bold text-slate-950">
                    {senderAccountNumber}
                  </p>

                  {selectedSender && (
                    <p className="mt-1 text-xs text-slate-500">
                      {getAccountLabel(
                        selectedSender,
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    To
                  </p>

                  <p className="mt-2 break-all text-sm font-bold text-slate-950">
                    {receiverAccountNumber}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Amount
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-950">
                    {formatMoney(
                      numericAmount,
                      currencyCode,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transfer type
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950">
                    Epex Bank internal
                  </p>
                </div>
              </div>

              {description.trim() && (
                <div className="mt-5 border-t border-slate-200 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {description.trim()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

              <div className="text-sm leading-6 text-blue-900">
                <p className="font-semibold">
                  Confirm carefully
                </p>

                <p className="mt-1">
                  Once confirmed, the transfer will be submitted
                  to Epex Bank's secure transaction and ledger
                  system.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setStep("form");
                  setError("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing transfer...
                  </>
                ) : (
                  <>
                    Confirm transfer
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalTransfer;