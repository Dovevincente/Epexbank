import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const FALLBACK_METHOD_ICONS = {
  BANK_TRANSFER: Landmark,
  BANK: Landmark,
  CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  MOBILE_MONEY: Smartphone,
  MOBILE: Smartphone,
  WALLET: WalletCards,
};

const normalizeMethods = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.methods)) {
    return data.methods;
  }

  if (Array.isArray(data?.depositMethods)) {
    return data.depositMethods;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
};

const normalizeDeposit = (payload) => {
  const data = payload?.data ?? payload;

  return (
    data?.deposit ||
    data?.transaction ||
    data?.request ||
    data?.data ||
    data ||
    null
  );
};

const getMethodKey = (method) =>
  String(
    method?.code ||
      method?.type ||
      method?.method ||
      method?.id ||
      "",
  ).toUpperCase();

const getMethodName = (method) =>
  method?.name ||
  method?.displayName ||
  method?.label ||
  method?.title ||
  method?.description ||
  "Deposit method";

const getCurrencyCode = (value) => {
  if (!value) return "USD";

  if (typeof value === "string") {
    return value.toUpperCase();
  }

  return String(
    value?.code ||
      value?.currencyCode ||
      value?.currency ||
      "USD",
  ).toUpperCase();
};

const getCurrencyDecimals = (currency) => {
  const decimals = Number(currency?.decimals);

  return Number.isInteger(decimals) && decimals >= 0
    ? decimals
    : 2;
};

const formatAmount = (amount, currency = "USD") => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  const currencyCode = getCurrencyCode(currency);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits:
        typeof currency === "object"
          ? getCurrencyDecimals(currency)
          : 2,
      maximumFractionDigits:
        typeof currency === "object"
          ? getCurrencyDecimals(currency)
          : 2,
    }).format(numericAmount);
  } catch {
    return `${currencyCode} ${numericAmount.toFixed(2)}`;
  }
};

const formatDate = (value) => {
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

const getStatusClass = (status) => {
  const normalized = String(status || "").toUpperCase();

  if (
    normalized === "COMPLETED" ||
    normalized === "SUCCESS" ||
    normalized === "APPROVED"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  }

  if (
    normalized === "FAILED" ||
    normalized === "REJECTED" ||
    normalized === "CANCELLED"
  ) {
    return "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
};

const getStatusIcon = (status) => {
  const normalized = String(status || "").toUpperCase();

  if (
    normalized === "COMPLETED" ||
    normalized === "SUCCESS" ||
    normalized === "APPROVED"
  ) {
    return CheckCircle2;
  }

  if (
    normalized === "FAILED" ||
    normalized === "REJECTED" ||
    normalized === "CANCELLED"
  ) {
    return XCircle;
  }

  return Clock3;
};

const isMethodAvailable = (method) => {
  if (method?.enabled === false) return false;
  if (method?.active === false) return false;
  if (method?.isActive === false) return false;

  const status = String(method?.status || "").toUpperCase();

  if (
    status === "INACTIVE" ||
    status === "DISABLED" ||
    status === "UNAVAILABLE"
  ) {
    return false;
  }

  return true;
};

const getMethodIcon = (method) => {
  const key = getMethodKey(method);
  return (
    FALLBACK_METHOD_ICONS[key] ||
    (String(method?.category || "").toUpperCase().includes("BANK")
      ? Landmark
      : WalletCards)
  );
};

const getAccountCurrency = (account) =>
  getCurrencyCode(
    account?.currency ||
      account?.currencyCode ||
      "USD",
  );

const getAccountBalance = (account) =>
  Number(
    account?.availableBalance ??
      account?.balance ??
      account?.ledgerBalance ??
      0,
  );

const getMinimumAmount = (method) => {
  const value = Number(
    method?.minimumAmount ??
      method?.minAmount ??
      method?.limits?.minimum ??
      0,
  );

  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getMaximumAmount = (method) => {
  const value = Number(
    method?.maximumAmount ??
      method?.maxAmount ??
      method?.limits?.maximum ??
      0,
  );

  return Number.isFinite(value) && value > 0 ? value : null;
};

const Deposit = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    accounts,
    primaryAccount,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();

  const [methods, setMethods] = useState([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodsError, setMethodsError] = useState("");

  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [selectedMethodId, setSelectedMethodId] =
    useState("");

  const [amount, setAmount] = useState("");

  const [reference, setReference] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [successDeposit, setSuccessDeposit] =
    useState(null);

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const queryAccountId =
    queryParams.get("accountId") ||
    queryParams.get("account");

  const queryMethodId =
    queryParams.get("methodId") ||
    queryParams.get("method");

  const loadMethods = useCallback(async () => {
    setMethodsLoading(true);
    setMethodsError("");

    try {
      let response;

      try {
        response = await api.get("/deposits/methods");
      } catch (firstError) {
        const status = firstError?.response?.status;

        if (status !== 404 && status !== 501) {
          throw firstError;
        }

        response = await api.get("/deposits");
      }

      const nextMethods = normalizeMethods(response?.data);

      setMethods(
        nextMethods.filter(isMethodAvailable),
      );

      return nextMethods;
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Unable to load available deposit methods.";

      setMethods([]);
      setMethodsError(message);

      throw requestError;
    } finally {
      setMethodsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMethods().catch(() => {});
  }, [loadMethods]);

  useEffect(() => {
    if (!accounts.length) {
      setSelectedAccountId("");
      return;
    }

    const queryAccount = queryAccountId
      ? accounts.find(
          (account) =>
            String(account?.id) ===
              String(queryAccountId) ||
            String(account?.accountNumber) ===
              String(queryAccountId),
        )
      : null;

    const currentSelection = accounts.find(
      (account) =>
        String(account?.id) ===
        String(selectedAccountId),
    );

    if (queryAccount) {
      setSelectedAccountId(queryAccount.id);
      return;
    }

    if (
      currentSelection &&
      String(currentSelection?.status || "")
        .toUpperCase() === "ACTIVE"
    ) {
      return;
    }

    setSelectedAccountId(
      primaryAccount?.id || accounts[0]?.id || "",
    );
  }, [
    accounts,
    primaryAccount,
    queryAccountId,
    selectedAccountId,
  ]);

  useEffect(() => {
    if (!methods.length) {
      setSelectedMethodId("");
      return;
    }

    const queryMethod = queryMethodId
      ? methods.find(
          (method) =>
            String(method?.id) ===
              String(queryMethodId) ||
            getMethodKey(method) ===
              String(queryMethodId).toUpperCase(),
        )
      : null;

    const currentSelection = methods.find(
      (method) =>
        String(method?.id) ===
        String(selectedMethodId),
    );

    if (queryMethod) {
      setSelectedMethodId(queryMethod.id);
      return;
    }

    if (currentSelection) {
      return;
    }

    setSelectedMethodId(methods[0]?.id || "");
  }, [
    methods,
    queryMethodId,
    selectedMethodId,
  ]);

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) =>
          String(account?.id) ===
          String(selectedAccountId),
      ) || null,
    [accounts, selectedAccountId],
  );

  const selectedMethod = useMemo(
    () =>
      methods.find(
        (method) =>
          String(method?.id) ===
          String(selectedMethodId),
      ) || null,
    [methods, selectedMethodId],
  );

  const amountNumber = Number(amount);

  const amountIsValid =
    amount.trim() !== "" &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0;

  const accountCurrency = getAccountCurrency(
    selectedAccount,
  );

  const methodCurrency = selectedMethod
    ? getCurrencyCode(
        selectedMethod?.currency ||
          selectedMethod?.currencyCode ||
          accountCurrency,
      )
    : accountCurrency;

  const minimumAmount = getMinimumAmount(
    selectedMethod,
  );

  const maximumAmount = getMaximumAmount(
    selectedMethod,
  );

  const currencyMismatch =
    Boolean(selectedMethod) &&
    Boolean(selectedAccount) &&
    methodCurrency !== accountCurrency;

  const amountBelowMinimum =
    amountIsValid &&
    minimumAmount > 0 &&
    amountNumber < minimumAmount;

  const amountAboveMaximum =
    amountIsValid &&
    maximumAmount !== null &&
    amountNumber > maximumAmount;

  const validationMessage = useMemo(() => {
    if (!selectedAccount) {
      return "Select the account that should receive the deposit.";
    }

    if (
      String(selectedAccount?.status || "")
        .toUpperCase() !== "ACTIVE"
    ) {
      return "The selected account is not active and cannot receive a deposit.";
    }

    if (!selectedMethod) {
      return "Select an available deposit method.";
    }

    if (currencyMismatch) {
      return `This deposit method supports ${methodCurrency}, while the selected account uses ${accountCurrency}.`;
    }

    if (!amountIsValid) {
      return "Enter a valid deposit amount.";
    }

    if (amountBelowMinimum) {
      return `The minimum deposit for this method is ${formatAmount(
        minimumAmount,
        methodCurrency,
      )}.`;
    }

    if (amountAboveMaximum) {
      return `The maximum deposit for this method is ${formatAmount(
        maximumAmount,
        methodCurrency,
      )}.`;
    }

    return "";
  }, [
    selectedAccount,
    selectedMethod,
    currencyMismatch,
    methodCurrency,
    accountCurrency,
    amountIsValid,
    amountBelowMinimum,
    minimumAmount,
    amountAboveMaximum,
    maximumAmount,
  ]);

  const canSubmit =
    !submitting &&
    !successDeposit &&
    Boolean(selectedAccount) &&
    Boolean(selectedMethod) &&
    amountIsValid &&
    !currencyMismatch &&
    !amountBelowMinimum &&
    !amountAboveMaximum &&
    String(selectedAccount?.status || "")
      .toUpperCase() === "ACTIVE";

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      setSubmitError(
        validationMessage ||
          "Please review the deposit information.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        accountId: selectedAccount.id,
        depositMethodId: selectedMethod.id,
        methodId: selectedMethod.id,
        amount: amountNumber,
        currency: accountCurrency,
      };

      if (reference.trim()) {
        payload.reference = reference.trim();
        payload.customerReference =
          reference.trim();
      }

      let response;

      try {
        response = await api.post(
          "/deposits",
          payload,
        );
      } catch (firstError) {
        const status = firstError?.response?.status;

        if (status !== 404 && status !== 501) {
          throw firstError;
        }

        response = await api.post(
          "/deposits/request",
          payload,
        );
      }

      const deposit = normalizeDeposit(
        response?.data,
      );

      setSuccessDeposit(
        deposit || {
          amount: amountNumber,
          currency: accountCurrency,
        },
      );

      await refreshAccounts().catch(() => {});
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        "We could not create the deposit request.";

      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setReference("");
    setSubmitError("");
    setSuccessDeposit(null);
  };

  if (successDeposit) {
    const successStatus =
      successDeposit?.status ||
      successDeposit?.deposit?.status ||
      "PENDING";

    const StatusIcon = getStatusIcon(
      successStatus,
    );

    const successReference =
      successDeposit?.reference ||
      successDeposit?.depositReference ||
      successDeposit?.transaction?.reference ||
      successDeposit?.id ||
      successDeposit?.depositId ||
      null;

    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm dark:border-emerald-500/20 dark:bg-slate-900 sm:p-8">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <StatusIcon className="h-8 w-8" />
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
              Deposit request created
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Your deposit request has been submitted
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              The request was sent to Epex Bank for
              processing. Your account balance will
              reflect the deposit only when the bank
              confirms the transaction.
            </p>

            <div className="mt-7 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Amount
                </span>

                <span className="text-lg font-bold text-slate-950 dark:text-white">
                  {formatAmount(
                    successDeposit?.amount ??
                      amountNumber,
                    successDeposit?.currency ||
                      selectedAccount?.currency ||
                      accountCurrency,
                  )}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Method
                </span>

                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {getMethodName(selectedMethod)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Status
                </span>

                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                    getStatusClass(successStatus),
                  ].join(" ")}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {String(successStatus)
                    .replaceAll("_", " ")}
                </span>
              </div>

              {successReference && (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Reference
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard?.writeText(
                        String(successReference),
                      )
                    }
                    className="inline-flex min-w-0 items-center gap-2 text-right text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300"
                    title="Copy reference"
                  >
                    <span className="max-w-48 truncate sm:max-w-64">
                      {successReference}
                    </span>
                    <Copy className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              )}

              {successDeposit?.createdAt && (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Created
                  </span>

                  <span className="text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formatDate(
                      successDeposit.createdAt,
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/transactions")}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                View transactions
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Make another deposit
              </button>
            </div>
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Never share your banking password, OTP,
            PIN or card security code with anyone claiming
            to process your deposit.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              Fund your account
            </span>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Deposit
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Add funds to your Epex Bank account
              through an available deposit method.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadMethods().catch(() => {});
              refreshAccounts().catch(() => {});
            }}
            disabled={
              methodsLoading ||
              accountsLoading
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={[
                "h-4 w-4",
                methodsLoading || accountsLoading
                  ? "animate-spin"
                  : "",
              ].join(" ")}
            />
            Refresh
          </button>
        </div>
      </section>

      {/* Errors */}
      {(methodsError || accountsError) && (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />

            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">
                Deposit services unavailable
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300">
                {methodsError || accountsError}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Main form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]"
      >
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <ArrowDownToLine className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Deposit details
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose where the funds should be credited.
              </p>
            </div>
          </div>

          {/* Account */}
          <div className="mt-7">
            <label
              htmlFor="deposit-account"
              className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Deposit into
            </label>

            {accountsLoading ? (
              <div className="flex min-h-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  No eligible account found
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  An active Epex Bank account is required
                  before you can create a deposit request.
                </p>
              </div>
            ) : (
              <select
                id="deposit-account"
                value={selectedAccountId}
                onChange={(event) => {
                  setSelectedAccountId(
                    event.target.value,
                  );
                  setSubmitError("");
                }}
                className="min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
              >
                {accounts.map((account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account?.accountNumber ||
                      "Account"}{" "}
                    ·{" "}
                    {getAccountCurrency(account)} ·{" "}
                    {formatAmount(
                      getAccountBalance(account),
                      account?.currency,
                    )}
                  </option>
                ))}
              </select>
            )}

            {selectedAccount && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Available balance
                </span>

                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatAmount(
                    getAccountBalance(
                      selectedAccount,
                    ),
                    selectedAccount?.currency,
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Deposit methods */}
          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Deposit method
              </label>

              {methodsLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>

            {methods.length === 0 &&
            !methodsLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
                <WalletCards className="mx-auto h-7 w-7 text-slate-400" />

                <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  No deposit methods available
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Epex Bank has not made a deposit
                  method available for this account.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {methods.map((method) => {
                  const MethodIcon =
                    getMethodIcon(method);

                  const selected =
                    String(selectedMethodId) ===
                    String(method?.id);

                  const methodCurrencyValue =
                    getCurrencyCode(
                      method?.currency ||
                        method?.currencyCode ||
                        accountCurrency,
                    );

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethodId(
                          method.id,
                        );
                        setSubmitError("");
                      }}
                      className={[
                        "rounded-2xl border p-4 text-left transition",
                        selected
                          ? "border-blue-500 bg-blue-50/70 ring-4 ring-blue-50 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-500/10"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40 dark:hover:bg-slate-800",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <MethodIcon className="h-5 w-5" />
                        </div>

                        {selected && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        )}
                      </div>

                      <p className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                        {getMethodName(method)}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {method?.description ||
                          method?.instructions ||
                          `Deposit using ${getMethodName(
                            method,
                          )}.`}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {methodCurrencyValue}
                        </span>

                        {getMinimumAmount(method) >
                          0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Min{" "}
                            {formatAmount(
                              getMinimumAmount(
                                method,
                              ),
                              methodCurrencyValue,
                            )}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="mt-7">
            <label
              htmlFor="deposit-amount"
              className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Amount
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                {accountCurrency}
              </span>

              <input
                id="deposit-amount"
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
                className="min-h-14 w-full rounded-xl border border-slate-200 bg-white pl-16 pr-4 text-lg font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
              />
            </div>

            {selectedMethod &&
              (minimumAmount > 0 ||
                maximumAmount !== null) && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {minimumAmount > 0 &&
                    `Minimum ${formatAmount(
                      minimumAmount,
                      methodCurrency,
                    )}`}
                  {minimumAmount > 0 &&
                    maximumAmount !== null &&
                    " · "}
                  {maximumAmount !== null &&
                    `Maximum ${formatAmount(
                      maximumAmount,
                      methodCurrency,
                    )}`}
                </p>
              )}
          </div>

          {/* Customer reference */}
          <div className="mt-7">
            <label
              htmlFor="deposit-reference"
              className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Customer reference{" "}
              <span className="font-normal text-slate-400">
                (optional)
              </span>
            </label>

            <input
              id="deposit-reference"
              type="text"
              value={reference}
              onChange={(event) => {
                setReference(event.target.value);
                setSubmitError("");
              }}
              maxLength={100}
              placeholder="e.g. Salary deposit"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10"
            />
          </div>

          {/* Validation */}
          {(validationMessage || submitError) && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />

                <p className="text-sm leading-6 text-red-700 dark:text-red-300">
                  {submitError || validationMessage}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting deposit...
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-5 w-5" />
                Submit deposit request
              </>
            )}
          </button>
        </section>

        {/* Side information */}
        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Deposit summary
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Account
                </span>

                <span className="max-w-40 text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedAccount?.accountNumber ||
                    "Not selected"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Method
                </span>

                <span className="max-w-40 text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedMethod
                    ? getMethodName(
                        selectedMethod,
                      )
                    : "Not selected"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Amount
                </span>

                <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                  {amountIsValid
                    ? formatAmount(
                        amountNumber,
                        accountCurrency,
                      )
                    : "—"}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />

                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Deposits are only reflected in your
                    available balance after successful
                    processing by Epex Bank.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {selectedMethod?.instructions && (
            <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                Instructions
              </p>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-blue-900 dark:text-blue-100">
                {selectedMethod.instructions}
              </p>
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Security
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Epex Bank will never ask you to disclose
              your password, OTP, PIN or card security
              code to complete a deposit.
            </p>
          </section>
        </aside>
      </form>
    </div>
  );
};

export default Deposit;