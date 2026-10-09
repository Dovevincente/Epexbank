import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import api from "../../services/api.js";
import useAccounts from "../../hooks/useAccounts.js";

const normalizeProducts = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.cards)) return payload.cards;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.records)) return payload.records;

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.cards)) return payload.data.cards;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;

  return [];
};

const formatAmount = (amount, currency = "USD") => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

const getProductId = (product) =>
  product?.id ??
  product?.cardProductId ??
  product?.productId ??
  product?.cardTypeId ??
  null;

const getProductName = (product) =>
  product?.name ??
  product?.cardName ??
  product?.displayName ??
  product?.title ??
  "Epex Bank Card";

const getProductDescription = (product) =>
  product?.description ??
  product?.summary ??
  product?.shortDescription ??
  "Epex Bank payment card.";

const getProductCurrency = (product) =>
  product?.currency?.code ??
  product?.currencyCode ??
  product?.currency ??
  "USD";

const getProductType = (product) =>
  product?.type ??
  product?.cardType ??
  product?.category ??
  "CARD";

const getProductFee = (product) =>
  product?.issuanceFee ??
  product?.issueFee ??
  product?.applicationFee ??
  product?.fee ??
  null;

const getProductStatus = (product) =>
  String(product?.status ?? "ACTIVE").toUpperCase();

const isProductAvailable = (product) => {
  const status = getProductStatus(product);

  return ![
    "INACTIVE",
    "DISABLED",
    "SUSPENDED",
    "CLOSED",
    "UNAVAILABLE",
  ].includes(status);
};

const CreateCard = () => {
  const navigate = useNavigate();

  const {
    accounts,
    primaryAccount,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(null);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");

    try {
      const response = await api.get("/cards/products");
      const normalized = normalizeProducts(response?.data).filter(
        isProductAvailable,
      );

      setProducts(normalized);

      if (normalized.length > 0) {
        setSelectedProductId((current) => {
          const exists = normalized.some(
            (product) => String(getProductId(product)) === String(current),
          );

          return exists ? current : String(getProductId(normalized[0]));
        });
      } else {
        setSelectedProductId("");
      }

      return normalized;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load available card products.";

      setProducts([]);
      setSelectedProductId("");
      setProductsError(message);

      return [];
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!selectedAccountId && primaryAccount?.id) {
      setSelectedAccountId(String(primaryAccount.id));
    }
  }, [primaryAccount, selectedAccountId]);

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          String(getProductId(product)) === String(selectedProductId),
      ) || null,
    [products, selectedProductId],
  );

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
      activeAccounts.find(
        (account) =>
          String(account?.id) === String(selectedAccountId),
      ) || null,
    [activeAccounts, selectedAccountId],
  );

  const productCurrency = getProductCurrency(selectedProduct);
  const productFee = getProductFee(selectedProduct);

  const accountCurrency =
    selectedAccount?.currency?.code ||
    selectedAccount?.currencyCode ||
    selectedAccount?.currency ||
    "USD";

  const accountBalance = Number(
    selectedAccount?.availableBalance ??
      selectedAccount?.balance ??
      0,
  );

  const canSubmit =
    Boolean(selectedProduct) &&
    Boolean(selectedAccount) &&
    !submitting &&
    !productsLoading &&
    !accountsLoading;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedProduct) {
      setSubmitError("Please select a card product.");
      return;
    }

    if (!selectedAccount) {
      setSubmitError("Please select an active account.");
      return;
    }

    setSubmitError("");
    setSuccess(null);
    setSubmitting(true);

    try {
      /*
       * The backend card-request endpoint must be implemented and
       * authenticated before this operation can be enabled.
       *
       * Do not replace this with fake local success behavior.
       */
      const response = await api.post("/cards/requests", {
        cardProductId: getProductId(selectedProduct),
        accountId: selectedAccount.id,
      });

      const request =
        response?.data?.request ||
        response?.data?.cardRequest ||
        response?.data?.data ||
        response?.data;

      setSuccess(request);

      await refreshAccounts().catch(() => {});
    } catch (error) {
      const status = error?.response?.status;

      if (status === 404 || status === 501) {
        setSubmitError(
          "Card requests are not enabled on the banking service yet. The card request API must be connected before a request can be submitted.",
        );
      } else {
        setSubmitError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to submit your card request.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/cards"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to cards
          </Link>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 size={30} />
            </div>

            <div className="mt-6">
              <h1 className="text-2xl font-bold tracking-tight">
                Card request submitted
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Your card request has been received. You can return to your
                cards area to review its current status when available.
              </p>
            </div>

            {success?.reference && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Request reference
                </p>

                <p className="mt-1 break-all font-mono text-sm font-semibold">
                  {success.reference}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/cards")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                View my cards
                <ChevronRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccess(null);
                  setSubmitError("");
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Request another card
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            to="/cards"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to cards
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <CreditCard size={29} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            Request a card
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Choose an eligible Epex Bank card and the account you want to use
            for the card relationship.
          </p>
        </div>

        {productsError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />

            <div className="flex-1">
              <p className="font-semibold">Unable to load card products</p>
              <p className="mt-1 leading-6">{productsError}</p>
            </div>

            <button
              type="button"
              onClick={loadProducts}
              disabled={productsLoading}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
            >
              <RefreshCw
                size={15}
                className={productsLoading ? "animate-spin" : ""}
              />
              Retry
            </button>
          </div>
        )}

        {accountsError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />

            <div className="flex-1">
              <p className="font-semibold">Account information unavailable</p>
              <p className="mt-1 leading-6">{accountsError}</p>
            </div>

            <button
              type="button"
              onClick={() => refreshAccounts().catch(() => {})}
              disabled={accountsLoading}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:hover:bg-amber-950"
            >
              <RefreshCw
                size={15}
                className={accountsLoading ? "animate-spin" : ""}
              />
              Retry
            </button>
          </div>
        )}

        {submitError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <p className="leading-6">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold">Available cards</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Only card products returned by the banking service are
                    displayed.
                  </p>
                </div>

                {productsLoading ? (
                  <div className="flex min-h-40 items-center justify-center">
                    <Loader2
                      size={27}
                      className="animate-spin text-slate-500"
                    />
                  </div>
                ) : products.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                    <CreditCard
                      size={28}
                      className="mx-auto text-slate-400"
                    />

                    <h3 className="mt-3 font-semibold">
                      No card products available
                    </h3>

                    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                      There are currently no eligible card products available
                      for your account.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {products.map((product) => {
                      const productId = getProductId(product);
                      const selected =
                        String(productId) === String(selectedProductId);

                      const currency = getProductCurrency(product);
                      const fee = getProductFee(product);

                      return (
                        <button
                          key={String(productId)}
                          type="button"
                          onClick={() =>
                            setSelectedProductId(String(productId))
                          }
                          className={`w-full rounded-2xl border p-5 text-left transition ${
                            selected
                              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-500/10"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                                selected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              <CreditCard size={23} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="font-semibold">
                                  {getProductName(product)}
                                </h3>

                                {selected && (
                                  <CheckCircle2
                                    size={20}
                                    className="shrink-0 text-blue-600 dark:text-blue-400"
                                  />
                                )}
                              </div>

                              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                {getProductDescription(product)}
                              </p>

                              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {getProductType(product)}
                                </span>

                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {currency}
                                </span>

                                {fee !== null && (
                                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    Fee: {formatAmount(fee, currency)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold">Linked account</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Select the active account associated with this card
                    request.
                  </p>
                </div>

                {accountsLoading ? (
                  <div className="flex min-h-28 items-center justify-center">
                    <Loader2
                      size={25}
                      className="animate-spin text-slate-500"
                    />
                  </div>
                ) : activeAccounts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                    <p className="font-semibold">
                      No active account available
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      An active Epex Bank account is required before requesting
                      a card.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeAccounts.map((account) => {
                      const accountId = account?.id;
                      const selected =
                        String(accountId) === String(selectedAccountId);

                      const currency =
                        account?.currency?.code ||
                        account?.currencyCode ||
                        account?.currency ||
                        "USD";

                      return (
                        <button
                          key={String(accountId)}
                          type="button"
                          onClick={() =>
                            setSelectedAccountId(String(accountId))
                          }
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10"
                              : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-semibold">
                                {account?.name ||
                                  account?.type ||
                                  "Bank account"}
                              </p>

                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {account?.accountNumber
                                  ? `•••• ${String(account.accountNumber).slice(-4)}`
                                  : "Account number unavailable"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-semibold">
                                {formatAmount(
                                  account?.availableBalance ??
                                    account?.balance,
                                  currency,
                                )}
                              </p>

                              {selected && (
                                <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                  Selected
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <h2 className="font-bold">Request summary</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review before submitting
                  </p>
                </div>
              </div>

              <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Card
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedProduct
                      ? getProductName(selectedProduct)
                      : "Not selected"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Card type
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedProduct
                      ? getProductType(selectedProduct)
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Currency
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedProduct ? productCurrency : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Linked account
                  </p>

                  <p className="mt-1 font-semibold">
                    {selectedAccount?.accountNumber
                      ? `•••• ${String(selectedAccount.accountNumber).slice(-4)}`
                      : "Not selected"}
                  </p>
                </div>

                {selectedProduct && productFee !== null && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Card fee
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatAmount(productFee, productCurrency)}
                    </p>
                  </div>
                )}

                {selectedAccount && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Available balance
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatAmount(accountBalance, accountCurrency)}
                    </p>
                  </div>
                )}
              </div>

              {selectedProduct &&
                selectedAccount &&
                productCurrency !== accountCurrency && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    The selected card currency ({productCurrency}) differs
                    from the selected account currency ({accountCurrency}).
                    The banking service must confirm whether this combination
                    is eligible.
                  </div>
                )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting request...
                  </>
                ) : (
                  <>
                    Submit card request
                    <ChevronRight size={18} />
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
                Card eligibility, fees, approval and issuance are determined
                by the Epex Bank card service.
              </p>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCard;