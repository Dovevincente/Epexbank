import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  PiggyBank,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../services/api.js";

/*
|--------------------------------------------------------------------------
| CREATE SAVINGS
|--------------------------------------------------------------------------
|
| Creates a real SavingsAccount through:
|
|   POST /api/savings
|
| Product information comes from:
|
|   GET /api/savings?products=true
|
| The backend remains the source of truth for:
|   - interest rates
|   - product requirements
|   - currency
|   - validation
|   - account ownership
|   - opening/deposit processing
|
|--------------------------------------------------------------------------
*/

const MONEY_DECIMALS = 2;

const formatMoney = (value, currencyCode = "USD") => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return `${currencyCode} 0.00`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: MONEY_DECIMALS,
      maximumFractionDigits: MONEY_DECIMALS,
    }).format(numericValue);
  } catch {
    return `${currencyCode} ${numericValue.toFixed(MONEY_DECIMALS)}`;
  }
};

const normalizeProduct = (product) => ({
  id: String(product?.id || product?.type || "").toUpperCase(),
  type: String(product?.type || product?.id || "").toUpperCase(),
  name: product?.name || "Savings",
  currencyCode: String(product?.currencyCode || "USD").toUpperCase(),
  interestRate: Number(product?.interestRate ?? 0),
  minimumOpeningAmount: Number(
    product?.minimumOpeningAmount ?? 0,
  ),
  requiresTargetAmount:
    product?.requiresTargetAmount === true,
  requiresMaturityDate:
    product?.requiresMaturityDate === true,
  withdrawalsAllowed:
    product?.withdrawalsAllowed !== false,
  description:
    product?.description ||
    "Save money securely while earning interest.",
});

const getApiErrorMessage = (error, fallback) => {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (
    Array.isArray(responseData?.errors) &&
    responseData.errors.length > 0
  ) {
    return responseData.errors
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return (
          item?.message ||
          item?.msg ||
          item?.error ||
          ""
        );
      })
      .filter(Boolean)
      .join(" ");
  }

  if (
    typeof error?.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
};

const getTodayInputValue = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    today.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMinimumFutureDate = () => {
  const date = new Date();

  date.setDate(date.getDate() + 1);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseMoneyInput = (value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
};

const productIcon = (type) => {
  if (type === "GOAL") {
    return Target;
  }

  if (type === "FIXED") {
    return ShieldCheck;
  }

  return PiggyBank;
};

export default function CreateSavings() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedProductId, setSelectedProductId] =
    useState("");

  const [form, setForm] = useState({
    name: "",
    accountId: "",
    initialDeposit: "",
    targetAmount: "",
    maturityDate: "",
  });

  /*
  |--------------------------------------------------------------------------
  | LOAD PRODUCTS + CUSTOMER ACCOUNTS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    const loadPageData = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          savingsResponse,
          accountsResponse,
        ] = await Promise.all([
          api.get("/savings", {
            params: {
              products: true,
            },
          }),

          api.get("/accounts"),
        ]);

        if (!mounted) {
          return;
        }

        const savingsData =
          savingsResponse?.data?.data ||
          savingsResponse?.data ||
          {};

        const accountData =
          accountsResponse?.data?.data ||
          accountsResponse?.data ||
          {};

        const rawProducts =
          Array.isArray(
            savingsData?.products,
          )
            ? savingsData.products
            : [];

        const normalizedProducts =
          rawProducts
            .map(normalizeProduct)
            .filter(
              (product) =>
                product.id &&
                product.type,
            );

        const rawAccounts =
          Array.isArray(
            accountData?.accounts,
          )
            ? accountData.accounts
            : Array.isArray(accountData)
              ? accountData
              : [];

        const activeAccounts =
          rawAccounts.filter(
            (account) =>
              account?.status ===
                "ACTIVE" &&
              account?.currency?.code,
          );

        setProducts(
          normalizedProducts,
        );

        setAccounts(
          activeAccounts,
        );

        if (
          normalizedProducts.length > 0
        ) {
          const firstProduct =
            normalizedProducts[0];

          setSelectedProductId(
            firstProduct.id,
          );

          setForm((previous) => ({
            ...previous,
            targetAmount: "",
            maturityDate: "",
          }));
        }

        if (
          activeAccounts.length > 0
        ) {
          const usdAccount =
            activeAccounts.find(
              (account) =>
                String(
                  account?.currency?.code,
                ).toUpperCase() ===
                "USD",
            );

          setForm((previous) => ({
            ...previous,
            accountId:
              previous.accountId ||
              usdAccount?.id ||
              activeAccounts[0].id,
          }));
        }
      } catch (requestError) {
        if (!mounted) {
          return;
        }

        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load savings products and accounts.",
          ),
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPageData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SELECTED PRODUCT
  |--------------------------------------------------------------------------
  */

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          product.id ===
          selectedProductId,
      ) || null,
    [
      products,
      selectedProductId,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | COMPATIBLE FUNDING ACCOUNTS
  |--------------------------------------------------------------------------
  */

  const compatibleAccounts =
    useMemo(() => {
      if (!selectedProduct) {
        return [];
      }

      return accounts.filter(
        (account) =>
          String(
            account?.currency?.code,
          ).toUpperCase() ===
          selectedProduct.currencyCode,
      );
    }, [
      accounts,
      selectedProduct,
    ]);

  /*
  |--------------------------------------------------------------------------
  | MAKE SURE SELECTED ACCOUNT MATCHES PRODUCT CURRENCY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const selectedAccount =
      accounts.find(
        (account) =>
          account.id ===
          form.accountId,
      );

    const accountMatches =
      selectedAccount &&
      String(
        selectedAccount?.currency?.code,
      ).toUpperCase() ===
        selectedProduct.currencyCode;

    if (accountMatches) {
      return;
    }

    const compatible =
      compatibleAccounts[0];

    setForm((previous) => ({
      ...previous,
      accountId:
        compatible?.id || "",
    }));
  }, [
    selectedProduct,
    compatibleAccounts,
    accounts,
    form.accountId,
  ]);

  /*
  |--------------------------------------------------------------------------
  | FIELD HELPERS
  |--------------------------------------------------------------------------
  */

  const updateField = (
    field,
    value,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | PRODUCT CHANGE
  |--------------------------------------------------------------------------
  */

  const handleProductChange = (
    productId,
  ) => {
    const product =
      products.find(
        (item) =>
          item.id === productId,
      );

    setSelectedProductId(
      productId,
    );

    setForm((previous) => ({
      ...previous,
      targetAmount: "",
      maturityDate: "",
      accountId:
        accounts.find(
          (account) =>
            String(
              account?.currency?.code,
            ).toUpperCase() ===
            String(
              product?.currencyCode ||
                "USD",
            ).toUpperCase(),
        )?.id || "",
    }));

    setError("");
    setSuccess("");
  };

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validateForm = () => {
    if (!selectedProduct) {
      return "Please select a savings product.";
    }

    if (!form.name.trim()) {
      return "Please enter a name for your savings account.";
    }

    if (!form.accountId) {
      return "Please select a funding account.";
    }

    const fundingAccount =
      accounts.find(
        (account) =>
          account.id ===
          form.accountId,
      );

    if (!fundingAccount) {
      return "The selected funding account could not be found.";
    }

    const accountCurrency =
      String(
        fundingAccount?.currency?.code ||
          "",
      ).toUpperCase();

    if (
      accountCurrency !==
      selectedProduct.currencyCode
    ) {
      return `Your funding account uses ${accountCurrency}, but this savings product requires ${selectedProduct.currencyCode}.`;
    }

    const initialDeposit =
      parseMoneyInput(
        form.initialDeposit,
      );

    const minimumOpeningAmount =
      Number(
        selectedProduct.minimumOpeningAmount ||
          0,
      );

    if (
      initialDeposit < 0
    ) {
      return "Initial deposit cannot be negative.";
    }

    if (
      initialDeposit <
      minimumOpeningAmount
    ) {
      return `The minimum opening amount is ${formatMoney(
        minimumOpeningAmount,
        selectedProduct.currencyCode,
      )}.`;
    }

    const availableBalance =
      Number(
        fundingAccount?.availableBalance ??
          fundingAccount?.balance ??
          0,
      );

    if (
      initialDeposit >
      availableBalance
    ) {
      return "The initial deposit is greater than the available balance of the selected account.";
    }

    if (
      selectedProduct.requiresTargetAmount
    ) {
      const targetAmount =
        parseMoneyInput(
          form.targetAmount,
        );

      if (
        targetAmount <= 0
      ) {
        return "Please enter a target amount for Goal Savings.";
      }

      if (
        initialDeposit >
        targetAmount
      ) {
        return "The initial deposit cannot be greater than the savings target.";
      }
    }

    if (
      selectedProduct.requiresMaturityDate
    ) {
      if (!form.maturityDate) {
        return "Please select a maturity date for Fixed Savings.";
      }

      const selectedDate =
        new Date(
          `${form.maturityDate}T23:59:59`,
        );

      const minimumDate =
        new Date();

      minimumDate.setHours(
        23,
        59,
        59,
        999,
      );

      if (
        Number.isNaN(
          selectedDate.getTime(),
        ) ||
        selectedDate <=
          minimumDate
      ) {
        return "The maturity date must be in the future.";
      }
    }

    return "";
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE SAVINGS
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError,
      );
      return;
    }

    if (!selectedProduct) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        productId:
          selectedProduct.id,
        accountId:
          form.accountId,
        name:
          form.name.trim(),
        initialDeposit:
          parseMoneyInput(
            form.initialDeposit,
          ),
      };

      if (
        selectedProduct.requiresTargetAmount
      ) {
        payload.targetAmount =
          parseMoneyInput(
            form.targetAmount,
          );
      }

      if (
        selectedProduct.requiresMaturityDate
      ) {
        payload.maturityDate =
          form.maturityDate;
      }

      const response =
        await api.post(
          "/savings",
          payload,
        );

      const responseData =
        response?.data?.data ||
        response?.data ||
        {};

      const createdSavings =
        responseData?.savings;

      setSuccess(
        "Your savings account was created successfully.",
      );

      /*
      |--------------------------------------------------------------------------
      | Navigate to the newly created savings account
      |--------------------------------------------------------------------------
      */

      if (
        createdSavings?.id
      ) {
        setTimeout(() => {
          navigate(
            `/savings/${createdSavings.id}`,
          );
        }, 900);

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Fallback if backend does not return an ID
      |--------------------------------------------------------------------------
      */

      setTimeout(() => {
        navigate("/savings");
      }, 900);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to create your savings account.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING STATE
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2
            size={32}
            className="animate-spin"
          />

          <p className="text-sm font-medium">
            Loading savings products...
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* --------------------------------------------------------------
            HEADER
        -------------------------------------------------------------- */}

        <div className="mb-6">
          <Link
            to="/savings"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Back to Savings
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <PiggyBank
                  size={14}
                />
                Savings
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Create a savings account
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Choose a savings product, select
                your funding account, and set your
                savings goals.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex">
              <ShieldCheck
                size={18}
                className="text-emerald-600"
              />

              <span className="text-sm font-medium text-slate-600">
                Secure banking operation
              </span>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------
            ALERTS
        -------------------------------------------------------------- */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0">
              <p className="font-semibold">
                Unable to continue
              </p>

              <p className="mt-1 text-sm leading-6">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Savings created
              </p>

              <p className="mt-1 text-sm">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------
            NO PRODUCTS
        -------------------------------------------------------------- */}

        {products.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <PiggyBank
              size={42}
              className="mx-auto text-slate-400"
            />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Savings products unavailable
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              There are currently no savings products
              available for your account.
            </p>

            <Link
              to="/savings"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Return to Savings
              <ChevronRight size={17} />
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
          >
            {/* ==========================================================
                LEFT COLUMN
            ========================================================== */}

            <div className="space-y-6">
              {/* --------------------------------------------------------
                  SAVINGS PRODUCTS
              -------------------------------------------------------- */}

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Choose a savings product
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select the product that matches how
                    you want to save.
                  </p>
                </div>

                <div className="grid gap-3">
                  {products.map(
                    (product) => {
                      const Icon =
                        productIcon(
                          product.type,
                        );

                      const selected =
                        selectedProductId ===
                        product.id;

                      return (
                        <button
                          key={
                            product.id
                          }
                          type="button"
                          onClick={() =>
                            handleProductChange(
                              product.id,
                            )
                          }
                          className={[
                            "w-full rounded-2xl border p-4 text-left transition",
                            selected
                              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                          ].join(
                            " ",
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={[
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                                selected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600",
                              ].join(
                                " ",
                              )}
                            >
                              <Icon
                                size={21}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="font-bold text-slate-900">
                                  {
                                    product.name
                                  }
                                </h3>

                                <span className="text-sm font-bold text-emerald-600">
                                  {product.interestRate.toFixed(
                                    2,
                                  )}
                                  % p.a.
                                </span>
                              </div>

                              <p className="mt-1 text-sm leading-6 text-slate-500">
                                {
                                  product.description
                                }
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {
                                    product.currencyCode
                                  }
                                </span>

                                {product.withdrawalsAllowed && (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    Flexible access
                                  </span>
                                )}

                                {product.type ===
                                  "FIXED" && (
                                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    Fixed term
                                  </span>
                                )}

                                {product.type ===
                                  "GOAL" && (
                                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                    Goal based
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="hidden shrink-0 sm:block">
                              {selected ? (
                                <CheckCircle2
                                  size={22}
                                  className="text-blue-600"
                                />
                              ) : (
                                <ChevronRight
                                  size={21}
                                  className="text-slate-300"
                                />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </section>

              {/* --------------------------------------------------------
                  SAVINGS DETAILS
              -------------------------------------------------------- */}

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Savings details
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Give your savings account a clear
                    name and configure its requirements.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* NAME */}

                  <div>
                    <label
                      htmlFor="savings-name"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Savings name
                    </label>

                    <input
                      id="savings-name"
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        updateField(
                          "name",
                          event.target
                            .value,
                        )
                      }
                      placeholder={
                        selectedProduct?.type ===
                        "GOAL"
                          ? "e.g. New Car Fund"
                          : selectedProduct?.type ===
                              "FIXED"
                            ? "e.g. 12 Month Fixed Savings"
                            : "e.g. Emergency Savings"
                      }
                      maxLength={100}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  {/* FUNDING ACCOUNT */}

                  <div>
                    <label
                      htmlFor="funding-account"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Funding account
                    </label>

                    <div className="relative">
                      <Wallet
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <select
                        id="funding-account"
                        value={
                          form.accountId
                        }
                        onChange={(event) =>
                          updateField(
                            "accountId",
                            event.target
                              .value,
                          )
                        }
                        className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">
                          Select an account
                        </option>

                        {compatibleAccounts.map(
                          (account) => (
                            <option
                              key={
                                account.id
                              }
                              value={
                                account.id
                              }
                            >
                              {account.accountNumber ||
                                "Account"}{" "}
                              —{" "}
                              {formatMoney(
                                account.availableBalance ??
                                  account.balance ??
                                  0,
                                account
                                  ?.currency
                                  ?.code ||
                                  selectedProduct?.currencyCode ||
                                  "USD",
                              )}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {compatibleAccounts.length ===
                      0 &&
                      selectedProduct && (
                        <p className="mt-2 text-xs leading-5 text-red-600">
                          You do not currently have an
                          active{" "}
                          {
                            selectedProduct.currencyCode
                          } funding account compatible
                          with this savings product.
                        </p>
                      )}
                  </div>

                  {/* INITIAL DEPOSIT */}

                  <div>
                    <label
                      htmlFor="initial-deposit"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Initial deposit
                    </label>

                    <div className="relative">
                      <CircleDollarSign
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="initial-deposit"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={
                          form.initialDeposit
                        }
                        onChange={(event) =>
                          updateField(
                            "initialDeposit",
                            event.target
                              .value,
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      You can open the savings account
                      without making an initial deposit.
                    </p>
                  </div>

                  {/* GOAL TARGET */}

                  {selectedProduct?.requiresTargetAmount && (
                    <div>
                      <label
                        htmlFor="target-amount"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Target amount
                      </label>

                      <div className="relative">
                        <Target
                          size={18}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          id="target-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={
                            form.targetAmount
                          }
                          onChange={(event) =>
                            updateField(
                              "targetAmount",
                              event.target
                                .value,
                            )
                          }
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Set the amount you want to
                        reach with this savings goal.
                      </p>
                    </div>
                  )}

                  {/* MATURITY DATE */}

                  {selectedProduct?.requiresMaturityDate && (
                    <div>
                      <label
                        htmlFor="maturity-date"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Maturity date
                      </label>

                      <div className="relative">
                        <CalendarDays
                          size={18}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          id="maturity-date"
                          type="date"
                          min={
                            getMinimumFutureDate()
                          }
                          value={
                            form.maturityDate
                          }
                          onChange={(event) =>
                            updateField(
                              "maturityDate",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Fixed Savings cannot normally
                        be withdrawn before maturity.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ==========================================================
                RIGHT COLUMN
            ========================================================== */}

            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* --------------------------------------------------------
                  SUMMARY
              -------------------------------------------------------- */}

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-slate-950 p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Selected product
                      </p>

                      <h2 className="mt-2 text-xl font-bold">
                        {selectedProduct?.name ||
                          "Savings"}
                      </h2>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                      <PiggyBank
                        size={21}
                      />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs text-slate-400">
                        Interest rate
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        {(
                          selectedProduct?.interestRate ||
                          0
                        ).toFixed(2)}
                        %
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs text-slate-400">
                        Currency
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        {selectedProduct?.currencyCode ||
                          "USD"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Initial deposit
                      </span>

                      <span className="font-semibold text-slate-900">
                        {formatMoney(
                          parseMoneyInput(
                            form.initialDeposit,
                          ),
                          selectedProduct?.currencyCode ||
                            "USD",
                        )}
                      </span>
                    </div>

                    {selectedProduct?.type ===
                      "GOAL" && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Target
                        </span>

                        <span className="font-semibold text-slate-900">
                          {formatMoney(
                            parseMoneyInput(
                              form.targetAmount,
                            ),
                            selectedProduct.currencyCode,
                          )}
                        </span>
                      </div>
                    )}

                    {selectedProduct?.type ===
                      "FIXED" && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Maturity
                        </span>

                        <span className="font-semibold text-slate-900">
                          {form.maturityDate ||
                            "Not selected"}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck
                          size={18}
                          className="mt-0.5 shrink-0 text-emerald-600"
                        />

                        <p className="text-xs leading-5 text-slate-500">
                          Your savings account will be
                          created using the selected
                          product rules and your real
                          banking account.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !selectedProduct ||
                      compatibleAccounts.length ===
                        0
                    }
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                        Creating savings...
                      </>
                    ) : (
                      <>
                        Create savings account
                        <ChevronRight
                          size={18}
                        />
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* --------------------------------------------------------
                  PRODUCT INFORMATION
              -------------------------------------------------------- */}

              {selectedProduct && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="font-bold text-slate-900">
                    About this product
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {
                      selectedProduct.description
                    }
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Product
                      </span>

                      <span className="text-sm font-semibold text-slate-900">
                        {
                          selectedProduct.name
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Currency
                      </span>

                      <span className="text-sm font-semibold text-slate-900">
                        {
                          selectedProduct.currencyCode
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Interest rate
                      </span>

                      <span className="text-sm font-semibold text-emerald-600">
                        {selectedProduct.interestRate.toFixed(
                          2,
                        )}
                        %
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-500">
                        Withdrawals
                      </span>

                      <span className="text-sm font-semibold text-slate-900">
                        {selectedProduct.withdrawalsAllowed
                          ? "Allowed"
                          : "Restricted"}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* --------------------------------------------------------
                  MOBILE SECURITY NOTE
              -------------------------------------------------------- */}

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:hidden">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-xs leading-5 text-slate-600">
                  Savings creation is processed through
                  your authenticated Epex Bank account.
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
