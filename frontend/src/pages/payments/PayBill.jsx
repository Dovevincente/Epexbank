import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const normalizeList = (responseData, keys = []) => {
  const root = responseData?.data ?? responseData ?? {};

  if (Array.isArray(root)) return root;

  for (const key of keys) {
    if (Array.isArray(root?.[key])) {
      return root[key];
    }
  }

  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root?.records)) return root.records;

  return [];
};

const getBillerId = (biller) =>
  biller?.id ??
  biller?.billerId ??
  biller?.providerId ??
  biller?.code ??
  "";

const getBillerName = (biller) =>
  biller?.name ??
  biller?.billerName ??
  biller?.providerName ??
  biller?.title ??
  "Bill provider";

const getBillerCategory = (biller) =>
  biller?.category?.name ??
  biller?.categoryName ??
  biller?.category ??
  biller?.type ??
  "Other";

const getBillerDescription = (biller) =>
  biller?.description ??
  biller?.summary ??
  "";

const getBillerStatus = (biller) =>
  String(
    biller?.status ??
      (biller?.active === false ? "INACTIVE" : "ACTIVE"),
  ).toUpperCase();

const getCurrency = (biller) =>
  biller?.currency?.code ??
  biller?.currencyCode ??
  biller?.currency ??
  "USD";

const getAccountCurrency = (account) =>
  account?.currency?.code ??
  account?.currencyCode ??
  account?.currency ??
  "USD";

const getAvailableBalance = (account) => {
  const value =
    account?.availableBalance ??
    account?.balance ??
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

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

const PayBill = () => {
  const navigate = useNavigate();

  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();

  const [billers, setBillers] = useState([]);
  const [billersLoading, setBillersLoading] = useState(true);
  const [billersError, setBillersError] = useState("");

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedBillerId, setSelectedBillerId] = useState("");

  const [billerSearch, setBillerSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [customerReference, setCustomerReference] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(null);

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          String(account?.status ?? "").toUpperCase() ===
          "ACTIVE",
      ),
    [accounts],
  );

  const selectedAccount = useMemo(
    () =>
      activeAccounts.find(
        (account) =>
          String(account?.id) ===
          String(selectedAccountId),
      ) ?? null,
    [activeAccounts, selectedAccountId],
  );

  const selectedBiller = useMemo(
    () =>
      billers.find(
        (biller) =>
          String(getBillerId(biller)) ===
          String(selectedBillerId),
      ) ?? null,
    [billers, selectedBillerId],
  );

  const availableCategories = useMemo(() => {
    const values = billers
      .map(getBillerCategory)
      .filter(Boolean);

    return ["ALL", ...new Set(values)];
  }, [billers]);

  const filteredBillers = useMemo(() => {
    const query = billerSearch.trim().toLowerCase();

    return billers.filter((biller) => {
      const status = getBillerStatus(biller);

      if (
        !["ACTIVE", "AVAILABLE", "ENABLED", "OPEN"].includes(
          status,
        )
      ) {
        return false;
      }

      const category = getBillerCategory(biller);

      if (
        categoryFilter !== "ALL" &&
        String(category) !== String(categoryFilter)
      ) {
        return false;
      }

      if (!query) return true;

      const searchable = [
        getBillerName(biller),
        category,
        getBillerDescription(biller),
        getBillerId(biller),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [
    billers,
    billerSearch,
    categoryFilter,
  ]);

  const loadBillers = useCallback(async () => {
    setBillersLoading(true);
    setBillersError("");

    try {
      const response = await api.get("/payments/billers");

      const nextBillers = normalizeList(response?.data, [
        "billers",
        "providers",
        "services",
      ]);

      setBillers(nextBillers);

      if (
        selectedBillerId &&
        !nextBillers.some(
          (biller) =>
            String(getBillerId(biller)) ===
            String(selectedBillerId),
        )
      ) {
        setSelectedBillerId("");
      }
    } catch (requestError) {
      const status = requestError?.response?.status;

      setBillers([]);

      if (status === 404 || status === 501) {
        setBillersError(
          "Bill payment providers are not currently available through the banking API.",
        );
      } else {
        setBillersError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load supported bill providers.",
        );
      }
    } finally {
      setBillersLoading(false);
    }
  }, [selectedBillerId]);

  useEffect(() => {
    loadBillers();
  }, [loadBillers]);

  useEffect(() => {
    if (
      !selectedAccountId &&
      activeAccounts.length > 0
    ) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  const amountNumber = Number(amount);

  const amountIsValid =
    amount.trim() !== "" &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0;

  const accountCurrency = getAccountCurrency(
    selectedAccount,
  );

  const billerCurrency = selectedBiller
    ? getCurrency(selectedBiller)
    : accountCurrency;

  const currencyMismatch =
    Boolean(selectedBiller) &&
    Boolean(selectedAccount) &&
    String(accountCurrency).toUpperCase() !==
      String(billerCurrency).toUpperCase();

  const insufficientFunds =
    amountIsValid &&
    selectedAccount &&
    amountNumber >
      getAvailableBalance(selectedAccount);

  const canSubmit =
    Boolean(selectedAccount) &&
    Boolean(selectedBiller) &&
    Boolean(customerReference.trim()) &&
    amountIsValid &&
    !currencyMismatch &&
    !insufficientFunds &&
    !submitting;

  const resetForm = () => {
    setSelectedBillerId("");
    setCustomerReference("");
    setAmount("");
    setDescription("");
    setSubmitError("");
    setSuccess(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitError("");
    setSuccess(null);

    if (!selectedAccount) {
      setSubmitError(
        "Select an active account to fund this bill payment.",
      );
      return;
    }

    if (!selectedBiller) {
      setSubmitError(
        "Select a supported bill provider.",
      );
      return;
    }

    if (!customerReference.trim()) {
      setSubmitError(
        "Enter the customer, account, meter, policy, subscription, or service reference required by the provider.",
      );
      return;
    }

    if (!amountIsValid) {
      setSubmitError(
        "Enter a valid payment amount greater than zero.",
      );
      return;
    }

    if (currencyMismatch) {
      setSubmitError(
        `The selected account uses ${accountCurrency}, while this bill provider requires ${billerCurrency}.`,
      );
      return;
    }

    if (insufficientFunds) {
      setSubmitError(
        `Insufficient available balance. Your available balance is ${formatMoney(
          getAvailableBalance(selectedAccount),
          accountCurrency,
        )}.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(
        "/payments/bills",
        {
          billerId: getBillerId(selectedBiller),
          accountId: selectedAccount.id,
          customerReference: customerReference.trim(),
          amount: amountNumber,
          currency: accountCurrency,
          description: description.trim() || undefined,
        },
      );

      const data = response?.data;

      const result =
        data?.payment ??
        data?.billPayment ??
        data?.transaction ??
        data?.data ??
        data;

      setSuccess({
        id:
          result?.id ??
          result?.paymentId ??
          result?.transactionId ??
          "",
        reference:
          result?.reference ??
          result?.paymentReference ??
          result?.transactionReference ??
          "",
        status:
          result?.status ??
          "SUBMITTED",
        amount:
          result?.amount ??
          amountNumber,
        currency:
          result?.currency?.code ??
          result?.currencyCode ??
          accountCurrency,
        provider: getBillerName(selectedBiller),
      });

      await refreshAccounts().catch(() => {});
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404 || status === 501) {
        setSubmitError(
          "Bill payment submission is not currently available through the banking API.",
        );
      } else {
        setSubmitError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to submit the bill payment.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-center py-8 sm:py-16">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Payment submitted
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
              Bill payment received
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Your bill payment instruction has been submitted to Epex Bank.
              The final payment status is determined by the banking API and
              bill payment provider.
            </p>

            <div className="mx-auto mt-7 max-w-md rounded-2xl bg-slate-50 p-5 text-left dark:bg-slate-950/50">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Provider
                </span>

                <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                  {success.provider}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Amount
                </span>

                <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                  {formatMoney(
                    success.amount,
                    success.currency,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Status
                </span>

                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  {String(success.status)
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (character) =>
                      character.toUpperCase(),
                    )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Reference
                </span>

                <span className="max-w-[60%] break-all text-right text-xs font-bold text-slate-950 dark:text-white">
                  {success.reference ||
                    success.id ||
                    "Assigned by banking system"}
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Pay another bill
                <ArrowRight className="h-4 w-4" />
              </button>

              <Link
                to="/transactions"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                View transactions
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/payments"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to payments
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <ReceiptText className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Pay a bill
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                Create a payment instruction for a supported bill or service
                using an active Epex Bank account.
              </p>
            </div>
          </div>
        </div>

        {/* API errors */}
        {(billersError || accountsError) && (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

              <div>
                <h2 className="font-bold text-red-950 dark:text-red-300">
                  Payment services unavailable
                </h2>

                {billersError && (
                  <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                    {billersError}
                  </p>
                )}

                {accountsError && (
                  <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                    {accountsError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    loadBillers();
                    refreshAccounts().catch(() => {});
                  }}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-red-800 hover:underline dark:text-red-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Main */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Provider + form */}
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Select bill provider
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose a provider returned by the Epex Bank payments API.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadBillers}
                  disabled={billersLoading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label="Refresh bill providers"
                  title="Refresh bill providers"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      billersLoading ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={billerSearch}
                    onChange={(event) =>
                      setBillerSearch(event.target.value)
                    }
                    placeholder="Search providers..."
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(event.target.value)
                    }
                    className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-10 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {availableCategories.map(
                      (category) => (
                        <option
                          key={String(category)}
                          value={category}
                        >
                          {category === "ALL"
                            ? "All categories"
                            : category}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {billersLoading ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                    />
                  ))}
                </div>
              ) : filteredBillers.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-7 text-center dark:border-slate-700">
                  <ReceiptText className="mx-auto h-8 w-8 text-slate-400" />

                  <p className="mt-3 font-bold text-slate-950 dark:text-white">
                    No supported providers found
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Try another search or category.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {filteredBillers.map((biller) => {
                    const billerId = getBillerId(biller);
                    const selected =
                      String(billerId) ===
                      String(selectedBillerId);

                    return (
                      <button
                        key={String(billerId)}
                        type="button"
                        onClick={() =>
                          setSelectedBillerId(
                            String(billerId),
                          )
                        }
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10 dark:border-blue-500 dark:bg-blue-950/30"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-950 dark:text-white">
                              {getBillerName(biller)}
                            </p>

                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              {getBillerCategory(
                                biller,
                              )}
                            </p>
                          </div>

                          {selected && (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />
                          )}
                        </div>

                        {getBillerDescription(biller) && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {getBillerDescription(
                              biller,
                            )}
                          </p>
                        )}

                        <p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                          Currency: {getCurrency(biller)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Payment form */}
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
            >
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Payment details
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Enter the exact information required to identify the bill.
                </p>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

                    <p className="text-sm font-medium leading-6 text-red-800 dark:text-red-300">
                      {submitError}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {/* Account */}
                <div>
                  <label
                    htmlFor="payment-account"
                    className="mb-2 block text-sm font-bold text-slate-900 dark:text-slate-200"
                  >
                    Funding account
                  </label>

                  <div className="relative">
                    <select
                      id="payment-account"
                      value={selectedAccountId}
                      onChange={(event) =>
                        setSelectedAccountId(
                          event.target.value,
                        )
                      }
                      disabled={
                        accountsLoading ||
                        activeAccounts.length === 0
                      }
                      className="min-h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-10 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
                    >
                      <option value="">
                        {accountsLoading
                          ? "Loading accounts..."
                          : activeAccounts.length === 0
                            ? "No active accounts"
                            : "Select an account"}
                      </option>

                      {activeAccounts.map(
                        (account) => (
                          <option
                            key={String(account.id)}
                            value={account.id}
                          >
                            {account.accountNumber
                              ? `•••• ${String(
                                  account.accountNumber,
                                ).slice(-4)}`
                              : account.id}{" "}
                            —{" "}
                            {formatMoney(
                              getAvailableBalance(
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

                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label
                    htmlFor="customer-reference"
                    className="mb-2 block text-sm font-bold text-slate-900 dark:text-slate-200"
                  >
                    Customer / service reference
                  </label>

                  <input
                    id="customer-reference"
                    type="text"
                    value={customerReference}
                    onChange={(event) =>
                      setCustomerReference(
                        event.target.value,
                      )
                    }
                    placeholder="Enter account, meter, policy or service number"
                    autoComplete="off"
                    maxLength={120}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Use the exact customer or service identifier supplied by
                    the bill provider.
                  </p>
                </div>

                {/* Amount */}
                <div>
                  <label
                    htmlFor="payment-amount"
                    className="mb-2 block text-sm font-bold text-slate-900 dark:text-slate-200"
                  >
                    Payment amount
                  </label>

                  <div className="relative">
                    <input
                      id="payment-amount"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                      placeholder="0.00"
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-20 text-lg font-bold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">
                      {accountCurrency}
                    </span>
                  </div>

                  {selectedAccount && (
                    <p
                      className={`mt-2 text-xs font-medium ${
                        insufficientFunds
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Available balance:{" "}
                      {formatMoney(
                        getAvailableBalance(
                          selectedAccount,
                        ),
                        accountCurrency,
                      )}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="payment-description"
                    className="mb-2 block text-sm font-bold text-slate-900 dark:text-slate-200"
                  >
                    Description{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="payment-description"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="Add a note for this payment..."
                    rows={3}
                    maxLength={250}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Validation warning */}
              {currencyMismatch && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />

                    <p className="text-sm leading-6 text-amber-900 dark:text-amber-300">
                      This provider requires{" "}
                      <strong>
                        {billerCurrency}
                      </strong>
                      , but the selected account is in{" "}
                      <strong>
                        {accountCurrency}
                      </strong>
                      . Select a compatible account.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting payment...
                  </>
                ) : (
                  <>
                    Review and pay
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Summary */}
          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Payment summary
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Provider
                  </span>

                  <span className="max-w-[60%] text-right text-sm font-bold text-slate-950 dark:text-white">
                    {selectedBiller
                      ? getBillerName(selectedBiller)
                      : "Not selected"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Category
                  </span>

                  <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                    {selectedBiller
                      ? getBillerCategory(
                          selectedBiller,
                        )
                      : "—"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Account
                  </span>

                  <span className="text-right text-sm font-bold text-slate-950 dark:text-white">
                    {selectedAccount?.accountNumber
                      ? `•••• ${String(
                          selectedAccount.accountNumber,
                        ).slice(-4)}`
                      : "Not selected"}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Amount
                    </span>

                    <span className="text-xl font-bold text-slate-950 dark:text-white">
                      {amountIsValid
                        ? formatMoney(
                            amountNumber,
                            accountCurrency,
                          )
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Account balance */}
            {selectedAccount && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Wallet className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Available balance
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                      {formatMoney(
                        getAvailableBalance(
                          selectedAccount,
                        ),
                        accountCurrency,
                      )}
                    </p>
                  </div>
                </div>

                {amountIsValid && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        After payment
                      </span>

                      <span
                        className={`font-bold ${
                          insufficientFunds
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-950 dark:text-white"
                        }`}
                      >
                        {insufficientFunds
                          ? "Insufficient funds"
                          : formatMoney(
                              getAvailableBalance(
                                selectedAccount,
                              ) -
                                amountNumber,
                              accountCurrency,
                            )}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Security */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />

                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white">
                    Secure bill payments
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    Confirm the provider and customer reference before
                    submitting. Never share your password, OTP, PIN, or
                    authentication codes.
                  </p>
                </div>
              </div>
            </section>

            {/* Help */}
            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" />

                <div>
                  <h3 className="font-bold text-blue-950 dark:text-blue-300">
                    Before you pay
                  </h3>

                  <ul className="mt-2 space-y-2 text-xs leading-5 text-blue-800 dark:text-blue-400">
                    <li>
                      • Verify the customer/service reference.
                    </li>
                    <li>
                      • Confirm the amount and currency.
                    </li>
                    <li>
                      • Make sure your account has enough available funds.
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PayBill;