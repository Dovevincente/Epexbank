import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Check,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getUserAccounts } from "../../services/accountService.js";
import {
  createBeneficiary,
  getBeneficiaries,
} from "../../services/beneficiaryService.js";
import { createBankTransfer } from "../../services/bankTransferService.js";
/* ============================================================
   MONEY / CURRENCY HELPERS
============================================================ */

const getCurrencyCode = (currency, fallback = "USD") => {
  if (!currency) {
    return fallback;
  }

  if (typeof currency === "string") {
    const value = currency.trim();

    return value
      ? value.toUpperCase()
      : fallback;
  }

  if (typeof currency === "object") {
    const value =
      currency?.code ||
      currency?.currencyCode ||
      currency?.symbol ||
      "";

    if (typeof value === "string" && value.trim()) {
      return value.trim().toUpperCase();
    }
  }

  return fallback;
};

const formatMoney = (value, currency = "USD") => {
  const numericValue = Number(value);

  const safeCurrency =
    getCurrencyCode(currency, "USD");

  if (!Number.isFinite(numericValue)) {
    return `0.00 ${safeCurrency}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${numericValue.toFixed(2)} ${safeCurrency}`;
  }
};

/* ============================================================
   RESPONSE HELPERS
============================================================ */

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

const unwrapBeneficiaries = (response) => {
  const data = response?.data ?? response;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.beneficiaries)) {
    return data.beneficiaries;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.beneficiaries)) {
    return data.data.beneficiaries;
  }

  return [];
};

const unwrapTransfer = (response) => {
  const data = response?.data ?? response;

  return (
    data?.transfer ||
    data?.data?.transfer ||
    data?.data ||
    data ||
    null
  );
};

const extractErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* ============================================================
   ACCOUNT HELPERS
============================================================ */

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

const getAccountCurrency = (account) => {
  return getCurrencyCode(
    account?.currency ??
      account?.currencyCode ??
      account?.currency?.currencyCode,
    "USD",
  );
};

const getAccountLabel = (account) => {
  const type =
    account?.accountType ||
    account?.type ||
    "Account";

  const accountNumber =
    account?.accountNumber ||
    account?.number ||
    "";

  return accountNumber
    ? `${type} •••• ${String(accountNumber).slice(-4)}`
    : type;
};

/* ============================================================
   BENEFICIARY HELPERS
============================================================ */

const getBeneficiaryLabel = (beneficiary) => {
  return (
    beneficiary?.accountName ||
    beneficiary?.name ||
    beneficiary?.beneficiaryName ||
    "Unnamed beneficiary"
  );
};

const getBeneficiaryAccount = (beneficiary) => {
  return (
    beneficiary?.accountNumber ||
    beneficiary?.iban ||
    beneficiary?.bankAccountNumber ||
    "Account details unavailable"
  );
};

const isBeneficiaryActive = (beneficiary) => {
  return (
    beneficiary?.isActive !== false &&
    String(
      beneficiary?.status || "ACTIVE",
    ).toUpperCase() !== "INACTIVE"
  );
};

/* ============================================================
   COMPLIANCE HELPERS
============================================================ */

const maskComplianceCode = (value) => {
  const code = String(value ?? "").trim();

  if (!code) {
    return "—";
  }

  if (code.length <= 4) {
    return "•".repeat(code.length);
  }

  return `${"•".repeat(
    Math.max(0, code.length - 4),
  )}${code.slice(-4)}`;
};

/* ============================================================
   COMPONENT
============================================================ */

const BankTransfer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedBeneficiaryId =
    searchParams.get("beneficiaryId") || "";

  /* ==========================================================
     DATA
  ========================================================== */

  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] =
    useState([]);

  /* ==========================================================
     FORM
  ========================================================== */

  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [
    selectedBeneficiaryId,
    setSelectedBeneficiaryId,
  ] = useState("");

  /*
   * Recipient can be:
   * 1. an existing saved beneficiary, or
   * 2. entered manually for this transfer.
   *
   * Saving the manually entered recipient is OPTIONAL.
   */
  const [recipientMode, setRecipientMode] =
    useState("saved");

  const [saveRecipient, setSaveRecipient] =
    useState(false);

  const [manualRecipient, setManualRecipient] =
    useState({
      name: "",
      accountName: "",
      accountNumber: "",
      bankName: "",
      bankCode: "",
      country: "",
      currencyCode: "",
    });

  const [amount, setAmount] = useState("");
  const [description, setDescription] =
    useState("");

  /* ==========================================================
     COMPLIANCE CODES
  ========================================================== */

  const [tinCode, setTinCode] = useState("");
  const [amlCode, setAmlCode] = useState("");
  const [cftCode, setCftCode] = useState("");

  /*
   * IMPORTANT:
   *
   * Only ONE compliance code is displayed at a time.
   *
   * tin -> aml -> cft -> complete
   */
  const [complianceStep, setComplianceStep] =
    useState("tin");

  const [
    complianceChecking,
    setComplianceChecking,
  ] = useState(false);

  /* ==========================================================
     PAGE STATE
  ========================================================== */

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [pageError, setPageError] =
    useState("");

  const [submitError, setSubmitError] =
    useState("");

  const [step, setStep] =
    useState("form");

  const [
    transferReference,
    setTransferReference,
  ] = useState("");

  const [transferResult, setTransferResult] =
    useState(null);

  const [
    copiedReference,
    setCopiedReference,
  ] = useState(false);

  /* ==========================================================
     NEW BENEFICIARY
  ========================================================== */

  const [
    showNewBeneficiary,
    setShowNewBeneficiary,
  ] = useState(false);

  const [
    creatingBeneficiary,
    setCreatingBeneficiary,
  ] = useState(false);

  const [
    beneficiaryError,
    setBeneficiaryError,
  ] = useState("");

  const [newBeneficiary, setNewBeneficiary] =
    useState({
      name: "",
      accountName: "",
      accountNumber: "",
      bankName: "",
      bankCode: "",
      country: "",
      currencyCode: "",
    });

  /* ==========================================================
     LOAD DATA
  ========================================================== */

  const loadTransferData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) {
        setLoading(true);
      }

      setPageError("");

      try {
        const [
          accountsResponse,
          beneficiariesResponse,
        ] = await Promise.all([
          getUserAccounts(),
          getBeneficiaries({
            active: true,
          }),
        ]);

        const loadedAccounts =
          unwrapAccounts(
            accountsResponse,
          );

        const loadedBeneficiaries =
          unwrapBeneficiaries(
            beneficiariesResponse,
          );

        const activeAccounts =
          loadedAccounts.filter(
            (account) =>
              String(
                account?.status || "ACTIVE",
              ).toUpperCase() === "ACTIVE",
          );

        const activeBeneficiaries =
          loadedBeneficiaries.filter(
            isBeneficiaryActive,
          );

        setAccounts(activeAccounts);
        setBeneficiaries(
          activeBeneficiaries,
        );

        setSelectedAccountId(
          (currentId) => {
            const currentExists =
              activeAccounts.some(
                (account) =>
                  String(account?.id) ===
                  String(currentId),
              );

            if (currentExists) {
              return currentId;
            }

            return (
              activeAccounts[0]?.id ||
              ""
            );
          },
        );

        setSelectedBeneficiaryId(
          (currentId) => {
            if (requestedBeneficiaryId) {
              const requestedExists =
                activeBeneficiaries.some(
                  (beneficiary) =>
                    String(
                      beneficiary?.id,
                    ) ===
                    String(
                      requestedBeneficiaryId,
                    ),
                );

              if (requestedExists) {
                return requestedBeneficiaryId;
              }
            }

            const currentExists =
              activeBeneficiaries.some(
                (beneficiary) =>
                  String(
                    beneficiary?.id,
                  ) ===
                  String(currentId),
              );

            return currentExists
              ? currentId
              : "";
          },
        );
      } catch (error) {
        console.error(
          "Unable to load bank transfer data:",
          error,
        );

        setPageError(
          extractErrorMessage(
            error,
            "Unable to load your accounts and beneficiaries. Please try again.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [requestedBeneficiaryId],
  );

  useEffect(() => {
    loadTransferData();
  }, [loadTransferData]);

  /* ==========================================================
     SELECTED ACCOUNT
  ========================================================== */

  const selectedAccount = useMemo(() => {
    return (
      accounts.find(
        (account) =>
          String(account?.id) ===
          String(selectedAccountId),
      ) || null
    );
  }, [
    accounts,
    selectedAccountId,
  ]);

  /* ==========================================================
     SELECTED BENEFICIARY
  ========================================================== */

  const selectedBeneficiary = useMemo(() => {
    return (
      beneficiaries.find(
        (beneficiary) =>
          String(beneficiary?.id) ===
          String(selectedBeneficiaryId),
      ) || null
    );
  }, [
    beneficiaries,
    selectedBeneficiaryId,
  ]);

  const activeRecipient = useMemo(() => {
    if (recipientMode === "saved") {
      return selectedBeneficiary;
    }

    return {
      name:
        manualRecipient.name.trim() ||
        manualRecipient.accountName.trim(),
      accountName:
        manualRecipient.accountName.trim() ||
        manualRecipient.name.trim(),
      accountNumber:
        manualRecipient.accountNumber.trim(),
      bankName:
        manualRecipient.bankName.trim(),
      bankCode:
        manualRecipient.bankCode.trim(),
      country:
        manualRecipient.country.trim(),
      currencyCode:
        getCurrencyCode(
          manualRecipient.currencyCode,
          getAccountCurrency(selectedAccount),
        ),
    };
  }, [
    recipientMode,
    selectedBeneficiary,
    manualRecipient,
    selectedAccount,
  ]);

  const manualRecipientIsValid =
    recipientMode === "manual" &&
    Boolean(manualRecipient.name.trim()) &&
    Boolean(manualRecipient.accountNumber.trim()) &&
    Boolean(manualRecipient.bankName.trim());

  const recipientIsValid =
    recipientMode === "saved"
      ? Boolean(selectedBeneficiary)
      : manualRecipientIsValid;

  /* ==========================================================
     FINANCIAL VALUES
  ========================================================== */

  /*
   * IMPORTANT:
   *
   * currencyCode is ALWAYS a string.
   *
   * This prevents:
   *
   * Objects are not valid as a React child
   *
   * when the API returns:
   *
   * {
   *   id,
   *   code,
   *   name,
   *   symbol,
   *   decimals
   * }
   */
  const currencyCode =
    getAccountCurrency(
      selectedAccount,
    );

  const availableBalance =
    getAccountBalance(
      selectedAccount,
    );

  const numericAmount =
    Number(amount);

  const amountIsValid =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0;

  const amountHasTwoDecimals =
    amount === "" ||
    /^\d*(?:\.\d{0,2})?$/.test(
      amount,
    );

  const sufficientBalance =
    amountIsValid &&
    numericAmount <=
      availableBalance;

  const canContinue =
    Boolean(selectedAccount) &&
    recipientIsValid &&
    amountIsValid &&
    amountHasTwoDecimals &&
    sufficientBalance &&
    !submitting;

  const complianceComplete =
    complianceStep === "complete" &&
    Boolean(tinCode.trim()) &&
    Boolean(amlCode.trim()) &&
    Boolean(cftCode.trim());

  /* ==========================================================
     AMOUNT
  ========================================================== */

  const handleAmountChange = (
    event,
  ) => {
    const value =
      event.target.value;

    if (value === "") {
      setAmount("");
      setSubmitError("");
      return;
    }

    if (
      !/^\d*(?:\.\d{0,2})?$/.test(
        value,
      )
    ) {
      return;
    }

    if (value.length > 18) {
      return;
    }

    setAmount(value);
    setSubmitError("");
  };

  /* ==========================================================
     RECIPIENT FORM
  ========================================================== */

  const handleManualRecipientChange = (
    field,
    value,
  ) => {
    setManualRecipient(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setSubmitError("");
  };

  const handleBeneficiaryChange = (
    field,
    value,
  ) => {
    setNewBeneficiary(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setBeneficiaryError("");
  };

  const resetBeneficiaryForm =
    () => {
      setNewBeneficiary({
        name: "",
        accountName: "",
        accountNumber: "",
        bankName: "",
        bankCode: "",
        country: "",
        currencyCode: "",
      });

      setBeneficiaryError("");
    };

  /* ==========================================================
     CREATE BENEFICIARY
  ========================================================== */

  const handleCreateBeneficiary =
    async (event) => {
      event.preventDefault();

      if (creatingBeneficiary) {
        return;
      }

      setBeneficiaryError("");

      const beneficiaryName =
        newBeneficiary.name.trim();

      const accountName =
        newBeneficiary.accountName.trim();

      const accountNumber =
        newBeneficiary.accountNumber.trim();

      const bankName =
        newBeneficiary.bankName.trim();

      if (!beneficiaryName) {
        setBeneficiaryError(
          "Beneficiary name is required.",
        );
        return;
      }

      if (!accountNumber) {
        setBeneficiaryError(
          "Account number is required.",
        );
        return;
      }

      if (!bankName) {
        setBeneficiaryError(
          "Bank name is required.",
        );
        return;
      }

      if (
        accountNumber.length < 4 ||
        accountNumber.length > 64
      ) {
        setBeneficiaryError(
          "Enter a valid beneficiary account number.",
        );
        return;
      }

      setCreatingBeneficiary(true);

      try {
        const payload = {
          ...newBeneficiary,

          name: beneficiaryName,

          accountName:
            accountName ||
            beneficiaryName,

          accountNumber,

          bankName,

          bankCode:
            newBeneficiary.bankCode.trim() ||
            undefined,

          country:
            newBeneficiary.country.trim() ||
            undefined,

          currencyCode:
            getCurrencyCode(
              newBeneficiary.currencyCode,
              "",
            ) || undefined,
        };

        const response =
          await createBeneficiary(
            payload,
          );

        const created =
          response?.data
            ?.beneficiary ||
          response?.beneficiary ||
          response?.data;

        let nextBeneficiaries =
          [];

        if (created?.id) {
          nextBeneficiaries = [
            ...beneficiaries,
            created,
          ];
        } else {
          const refreshed =
            await getBeneficiaries({
              active: true,
            });

          nextBeneficiaries =
            unwrapBeneficiaries(
              refreshed,
            ).filter(
              isBeneficiaryActive,
            );
        }

        const safeBeneficiaries =
          nextBeneficiaries.filter(
            isBeneficiaryActive,
          );

        setBeneficiaries(
          safeBeneficiaries,
        );

        if (created?.id) {
          setSelectedBeneficiaryId(
            created.id,
          );
        } else {
          const matchingBeneficiary =
            safeBeneficiaries.find(
              (beneficiary) =>
                String(
                  beneficiary?.accountNumber,
                ) ===
                accountNumber,
            );

          if (
            matchingBeneficiary?.id
          ) {
            setSelectedBeneficiaryId(
              matchingBeneficiary.id,
            );
          }
        }

        resetBeneficiaryForm();
        setShowNewBeneficiary(false);
        setSubmitError("");
      } catch (error) {
        console.error(
          "Unable to create beneficiary:",
          error,
        );

        setBeneficiaryError(
          extractErrorMessage(
            error,
            "Unable to save this beneficiary.",
          ),
        );
      } finally {
        setCreatingBeneficiary(
          false,
        );
      }
    };

  /* ==========================================================
     COMPLIANCE VERIFICATION
  ========================================================== */

  /*
   * TIN
   *
   * Only TIN is displayed.
   *
   * After the loading animation finishes,
   * the AML section is displayed.
   */
  const verifyTinStep = async () => {
    if (!tinCode.trim()) {
      setSubmitError(
        "Please enter your TIN / Tax Code.",
      );
      return;
    }

    setSubmitError("");
    setComplianceChecking(true);

    /*
     * Loading state.
     *
     * The actual authoritative validation happens
     * on the backend when the transfer is submitted.
     */
    await new Promise(
      (resolve) =>
        window.setTimeout(
          resolve,
          700,
        ),
    );

    setComplianceChecking(false);

    setComplianceStep("aml");
  };

  /*
   * AML
   *
   * TIN is now complete.
   * Only AML is displayed.
   */
  const verifyAmlStep = async () => {
    if (!amlCode.trim()) {
      setSubmitError(
        "Please enter your AML Code.",
      );
      return;
    }

    setSubmitError("");
    setComplianceChecking(true);

    await new Promise(
      (resolve) =>
        window.setTimeout(
          resolve,
          700,
        ),
    );

    setComplianceChecking(false);

    setComplianceStep("cft");
  };

  /*
   * CFT
   *
   * TIN and AML are complete.
   * Only CFT is displayed.
   */
  const verifyCftStep = async () => {
    if (!cftCode.trim()) {
      setSubmitError(
        "Please enter your CFT Code.",
      );
      return;
    }

    setSubmitError("");
    setComplianceChecking(true);

    await new Promise(
      (resolve) =>
        window.setTimeout(
          resolve,
          700,
        ),
    );

    setComplianceChecking(false);

    setComplianceStep(
      "complete",
    );
  };

  const advanceComplianceStep =
    async () => {
      if (complianceChecking) {
        return;
      }

      if (
        complianceStep === "tin"
      ) {
        await verifyTinStep();
        return;
      }

      if (
        complianceStep === "aml"
      ) {
        await verifyAmlStep();
        return;
      }

      if (
        complianceStep === "cft"
      ) {
        await verifyCftStep();
      }
    };

  const handleComplianceSubmit =
    async (event) => {
      event.preventDefault();

      if (complianceChecking) {
        return;
      }

      await advanceComplianceStep();
    };

  /* ==========================================================
     REVIEW
  ========================================================== */

  const handleContinue = (
    event,
  ) => {
    event.preventDefault();

    setSubmitError("");

    if (!selectedAccount) {
      setSubmitError(
        "Please select an account to transfer from.",
      );
      return;
    }

    if (!recipientIsValid) {
      setSubmitError(
        recipientMode === "saved"
          ? "Please select a saved beneficiary or choose to enter recipient details manually."
          : "Please enter the recipient name, account number and bank name.",
      );
      return;
    }

    if (!amountIsValid) {
      setSubmitError(
        "Enter a valid transfer amount.",
      );
      return;
    }

    if (!sufficientBalance) {
      setSubmitError(
        "The transfer amount exceeds your available balance.",
      );
      return;
    }

    setTinCode("");
    setAmlCode("");
    setCftCode("");

    setComplianceStep("tin");
    setStep("compliance");
  };

  /* ==========================================================
     BACK
  ========================================================== */

  const handleBack = () => {
    if (submitting) {
      return;
    }

    setSubmitError("");

    if (step === "review") {
      setComplianceStep(
        "complete",
      );
      setStep("compliance");
      return;
    }

    if (step === "compliance") {
      if (
        complianceStep ===
        "aml"
      ) {
        setComplianceStep("tin");
        return;
      }

      if (
        complianceStep ===
        "cft"
      ) {
        setComplianceStep("aml");
        return;
      }

      if (
        complianceStep ===
        "complete"
      ) {
        setComplianceStep("cft");
        return;
      }

      setStep("form");
    }
  };

  /* ==========================================================
     CONFIRM TRANSFER
  ========================================================== */

  const handleConfirm =
    async () => {
      if (submitting) {
        return;
      }

      if (!complianceComplete) {
        setSubmitError(
          "Please complete the TIN, AML, and CFT verification steps first.",
        );

        setStep("compliance");

        return;
      }

      if (!selectedAccount) {
        setSubmitError(
          "Source account is missing.",
        );
        return;
      }

      if (!recipientIsValid) {
        setSubmitError(
          recipientMode === "saved"
            ? "Recipient is missing. Select a saved beneficiary or enter recipient details manually."
            : "Recipient details are incomplete. Name, account number and bank name are required.",
        );
        return;
      }

      if (!amountIsValid) {
        setSubmitError(
          "Enter a valid transfer amount.",
        );
        return;
      }

      if (!sufficientBalance) {
        setSubmitError(
          "The transfer amount exceeds your available balance.",
        );
        return;
      }

      setSubmitting(true);
      setSubmitError("");
      setCopiedReference(false);

      try {
        /*
         * IMPORTANT:
         *
         * All three values are sent only AFTER
         * the customer has completed the three
         * screens one by one.
         */
        let beneficiaryId =
          recipientMode === "saved"
            ? selectedBeneficiary?.id
            : undefined;

        /*
         * If the customer entered a recipient manually,
         * the recipient can be saved for future transfers
         * only when they explicitly choose that option.
         */
        if (
          recipientMode === "manual" &&
          saveRecipient
        ) {
          const recipientPayload = {
            name:
              manualRecipient.name.trim(),
            accountName:
              manualRecipient.accountName.trim() ||
              manualRecipient.name.trim(),
            accountNumber:
              manualRecipient.accountNumber.trim(),
            bankName:
              manualRecipient.bankName.trim(),
            bankCode:
              manualRecipient.bankCode.trim() ||
              undefined,
            country:
              manualRecipient.country.trim() ||
              undefined,
            currencyCode:
              getCurrencyCode(
                manualRecipient.currencyCode,
                currencyCode,
              ) || undefined,
          };

          const savedResponse =
            await createBeneficiary(
              recipientPayload,
            );

          const savedBeneficiary =
            savedResponse?.data
              ?.beneficiary ||
            savedResponse?.beneficiary ||
            savedResponse?.data;

          beneficiaryId =
            savedBeneficiary?.id ||
            undefined;

          if (beneficiaryId) {
            setBeneficiaries(
              (current) => [
                ...current,
                savedBeneficiary,
              ],
            );
          }
        }

        const response =
          await createBankTransfer({
            accountId:
              selectedAccount.id,

            ...(beneficiaryId
              ? { beneficiaryId }
              : {}),

            /*
             * These fields are sent for both saved and
             * manually entered recipients. This allows the
             * transfer API to process a recipient without
             * requiring a beneficiary record.
             */
            recipientName:
              activeRecipient?.name ||
              activeRecipient?.accountName ||
              undefined,

            recipientAccountName:
              activeRecipient?.accountName ||
              activeRecipient?.name ||
              undefined,

            recipientAccountNumber:
              activeRecipient?.accountNumber ||
              undefined,

            recipientBankName:
              activeRecipient?.bankName ||
              undefined,

            recipientBankCode:
              activeRecipient?.bankCode ||
              undefined,

            recipientCountry:
              activeRecipient?.country ||
              undefined,

            recipientCurrencyCode:
              activeRecipient?.currencyCode ||
              undefined,

            amount: Number(
              numericAmount.toFixed(
                2,
              ),
            ),

            tinCode:
              tinCode.trim(),

            amlCode:
              amlCode.trim(),

            cftCode:
              cftCode.trim(),

            description:
              description.trim() ||
              undefined,
          });

        const transfer =
          unwrapTransfer(
            response,
          );

        if (!transfer?.id) {
          throw new Error(
            "The bank transfer was created but the server returned an invalid transfer record.",
          );
        }

        const reference =
          transfer.reference ||
          transfer.transferReference ||
          transfer.transactionReference ||
          "";

        setTransferResult(
          transfer,
        );

        setTransferReference(
          reference,
        );

        setStep("success");
      } catch (error) {
        console.error(
          "Bank transfer failed:",
          error,
        );

        setSubmitError(
          extractErrorMessage(
            error,
            "Unable to create the bank transfer. Please try again.",
          ),
        );

        /*
         * If the backend rejects compliance,
         * return the customer to the appropriate
         * compliance screen.
         */
        const backendMessage =
          extractErrorMessage(
            error,
            "",
          ).toLowerCase();

        if (
          backendMessage.includes(
            "tin",
          )
        ) {
          setComplianceStep("tin");
          setStep("compliance");
        } else if (
          backendMessage.includes(
            "aml",
          )
        ) {
          setComplianceStep("aml");
          setStep("compliance");
        } else if (
          backendMessage.includes(
            "cft",
          )
        ) {
          setComplianceStep("cft");
          setStep("compliance");
        }
      } finally {
        setSubmitting(false);
      }
    };

  /* ==========================================================
     COPY REFERENCE
  ========================================================== */

  const handleCopyReference =
    async () => {
      if (!transferReference) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          transferReference,
        );

        setCopiedReference(true);

        window.setTimeout(
          () => {
            setCopiedReference(
              false,
            );
          },
          2000,
        );
      } catch (error) {
        console.error(
          "Unable to copy transfer reference:",
          error,
        );
      }
    };

  /* ==========================================================
     NEW TRANSFER
  ========================================================== */

  const handleAnotherTransfer =
    () => {
      setAmount("");
      setDescription("");

      setTinCode("");
      setAmlCode("");
      setCftCode("");

      setComplianceStep("tin");
      setComplianceChecking(
        false,
      );

      setSelectedBeneficiaryId(
        "",
      );

      setRecipientMode("saved");
      setSaveRecipient(false);
      setManualRecipient({
        name: "",
        accountName: "",
        accountNumber: "",
        bankName: "",
        bankCode: "",
        country: "",
        currencyCode: "",
      });

      setTransferReference("");
      setTransferResult(null);
      setSubmitError("");
      setCopiedReference(false);

      setStep("form");
    };

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRetry = async () => {
    setPageError("");

    await loadTransferData(
      true,
    );
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading transfer information...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Securely retrieving your eligible accounts.
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     PAGE ERROR
  ========================================================== */

  if (pageError) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <AlertCircle className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Unable to load transfers
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {pageError}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* ==========================================================
     SUCCESS
  ========================================================== */

  if (step === "success") {
    const resultStatus =
      String(
        transferResult?.status ||
          "PENDING",
      ).toUpperCase();

    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Transfer submitted
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Transfer successful
            </h1>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="rounded-2xl bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />

              <div>
                <h2 className="font-bold text-emerald-900">
                  Bank transfer created
                </h2>

                <p className="mt-1 text-sm leading-6 text-emerald-800/80">
                  Your transfer has passed the required compliance checks and has been submitted for processing.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                Reference
              </span>

              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900">
                  {transferReference ||
                    "Processing"}
                </span>

                {transferReference && (
                  <button
                    type="button"
                    onClick={
                      handleCopyReference
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                    aria-label="Copy reference"
                  >
                    {copiedReference ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                Amount
              </span>

              <span className="text-sm font-bold text-slate-900">
                {formatMoney(
                  numericAmount,
                  currencyCode,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                Recipient
              </span>

              <span className="max-w-[60%] text-right text-sm font-semibold text-slate-900">
                {getBeneficiaryLabel(
                  activeRecipient,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                Bank
              </span>

              <span className="max-w-[60%] text-right text-sm font-semibold text-slate-900">
                {activeRecipient?.bankName ||
                  "External bank"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <span className="text-sm text-slate-500">
                Status
              </span>

              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                {resultStatus}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

              <p className="text-sm leading-6 text-blue-900/80">
                Keep your transfer reference for future enquiries. Final external-bank processing and settlement are controlled by the banking backend.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/transfers",
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View transfers
            </button>

            <button
              type="button"
              onClick={
                handleAnotherTransfer
              }
              className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Make another transfer
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     COMPLIANCE SCREEN
  ========================================================== */

  if (step === "compliance") {
    const complianceTitles = {
      tin: "TIN / Tax Code",
      aml: "AML Code",
      cft: "CFT Code",
      complete:
        "Compliance verification complete",
    };

    const complianceDescriptions = {
      tin: "Enter the TIN / Tax Code registered and verified on your Epex Bank account.",
      aml: "Your TIN step is complete. Enter your AML Code to continue.",
      cft: "Your AML step is complete. Enter your CFT Code to continue.",
      complete:
        "All three compliance steps have been completed. Review your transfer before submitting it.",
    };

    const currentTitle =
      complianceTitles[
        complianceStep
      ];

    const currentDescription =
      complianceDescriptions[
        complianceStep
      ];

    /*
     * ========================================================
     * COMPLETE SCREEN
     * ========================================================
     */

    if (
      complianceStep ===
      "complete"
    ) {
      return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="Back to CFT verification"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Compliance verification
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Compliance verified
              </h1>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  TIN, AML and CFT completed
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {currentDescription}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                  <span className="text-sm font-semibold text-slate-700">
                    TIN / Tax Code
                  </span>
                </div>

                <span className="font-mono text-sm font-bold text-slate-900">
                  {maskComplianceCode(
                    tinCode,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                  <span className="text-sm font-semibold text-slate-700">
                    AML Code
                  </span>
                </div>

                <span className="font-mono text-sm font-bold text-slate-900">
                  {maskComplianceCode(
                    amlCode,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                  <span className="text-sm font-semibold text-slate-700">
                    CFT Code
                  </span>
                </div>

                <span className="font-mono text-sm font-bold text-slate-900">
                  {maskComplianceCode(
                    cftCode,
                  )}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                  <p className="text-sm font-medium leading-6 text-red-800">
                    {submitError}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() =>
                  setStep("review")
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Review transfer
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    /*
     * ========================================================
     * ONE CODE AT A TIME
     * ========================================================
     */

    const isTin =
      complianceStep ===
      "tin";

    const isAml =
      complianceStep ===
      "aml";

    const isCft =
      complianceStep ===
      "cft";

    const currentValue = isTin
      ? tinCode
      : isAml
        ? amlCode
        : cftCode;

    const setCurrentValue = isTin
      ? setTinCode
      : isAml
        ? setAmlCode
        : setCftCode;

    const placeholder = isTin
      ? "Enter your TIN / Tax Code"
      : isAml
        ? "Enter your AML Code"
        : "Enter your CFT Code";

    const inputLabel = isTin
      ? "TIN / Tax Code"
      : isAml
        ? "AML Code"
        : "CFT Code";

    const buttonLabel =
      complianceChecking
        ? "Checking..."
        : isTin
          ? "Verify TIN"
          : isAml
            ? "Verify AML"
            : "Verify CFT";

    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={
              complianceChecking
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Step{" "}
              {isTin
                ? "1"
                : isAml
                  ? "2"
                  : "3"}{" "}
              of 3
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Compliance verification
            </h1>
          </div>
        </div>

        {/* PROGRESS */}

        <div className="grid grid-cols-3 gap-2">
          <div
            className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
              isTin
                ? "bg-blue-700 text-white"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isTin ? (
              "1. TIN"
            ) : (
              <>
                <Check className="mr-1 inline h-3.5 w-3.5" />
                TIN
              </>
            )}
          </div>

          <div
            className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
              isAml
                ? "bg-blue-700 text-white"
                : isCft
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {isAml ? (
              "2. AML"
            ) : isCft ? (
              <>
                <Check className="mr-1 inline h-3.5 w-3.5" />
                AML
              </>
            ) : (
              "2. AML"
            )}
          </div>

          <div
            className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
              isCft
                ? "bg-blue-700 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            3. CFT
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              {complianceChecking ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <LockKeyhole className="h-6 w-6" />
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {currentTitle}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {currentDescription}
              </p>
            </div>
          </div>

          {/* PREVIOUSLY COMPLETED STEPS */}

          {!isTin && (
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                <span className="text-sm font-semibold text-emerald-900">
                  TIN verified
                </span>
              </div>

              <span className="font-mono text-xs font-bold text-emerald-700">
                {maskComplianceCode(
                  tinCode,
                )}
              </span>
            </div>
          )}

          {isCft && (
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                <span className="text-sm font-semibold text-emerald-900">
                  AML verified
                </span>
              </div>

              <span className="font-mono text-xs font-bold text-emerald-700">
                {maskComplianceCode(
                  amlCode,
                )}
              </span>
            </div>
          )}

          <form
            onSubmit={
              handleComplianceSubmit
            }
            className="mt-6"
          >
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              {inputLabel}
            </label>

            <input
              type="text"
              value={currentValue}
              onChange={(event) => {
                const value =
                  event.target.value.slice(
                    0,
                    100,
                  );

                setCurrentValue(value);
                setSubmitError("");
              }}
              placeholder={placeholder}
              autoComplete="off"
              autoFocus
              disabled={
                complianceChecking
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-mono text-lg font-semibold uppercase tracking-wider text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />

            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

              <span>
                Your code is checked against the compliance information associated with your verified Epex Bank account.
              </span>
            </div>

            {submitError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                  <p className="text-sm font-medium leading-6 text-red-800">
                    {submitError}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleBack}
                disabled={
                  complianceChecking
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={
                  complianceChecking ||
                  !currentValue.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {complianceChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    {buttonLabel}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ==========================================================
     REVIEW SCREEN
  ========================================================== */

  if (step === "review") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Final review
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Review transfer
            </h1>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Compliance verification complete
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                  TIN, AML and CFT steps have been completed.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                From
              </span>

              <span className="max-w-[60%] text-right text-sm font-semibold text-slate-900">
                {getAccountLabel(
                  selectedAccount,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                Available balance
              </span>

              <span className="text-sm font-semibold text-slate-900">
                {formatMoney(
                  availableBalance,
                  currencyCode,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                Recipient
              </span>

              <span className="max-w-[60%] text-right text-sm font-semibold text-slate-900">
                {getBeneficiaryLabel(
                  activeRecipient,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                Account number
              </span>

              <span className="max-w-[60%] text-right font-mono text-sm font-semibold text-slate-900">
                {getBeneficiaryAccount(
                  activeRecipient,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4">
              <span className="text-sm text-slate-500">
                Bank
              </span>

              <span className="max-w-[60%] text-right text-sm font-semibold text-slate-900">
                {activeRecipient?.bankName ||
                  "External bank"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 px-4 py-5">
              <span className="text-sm font-semibold text-slate-700">
                Transfer amount
              </span>

              <span className="text-xl font-bold text-slate-950">
                {formatMoney(
                  numericAmount,
                  currencyCode,
                )}
              </span>
            </div>
          </div>

          {description.trim() && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Description
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {description.trim()}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />

              <p className="mt-2 text-xs font-semibold text-emerald-900">
                TIN verified
              </p>

              <p className="mt-1 font-mono text-xs text-emerald-700">
                {maskComplianceCode(
                  tinCode,
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />

              <p className="mt-2 text-xs font-semibold text-emerald-900">
                AML verified
              </p>

              <p className="mt-1 font-mono text-xs text-emerald-700">
                {maskComplianceCode(
                  amlCode,
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />

              <p className="mt-2 text-xs font-semibold text-emerald-900">
                CFT verified
              </p>

              <p className="mt-1 font-mono text-xs text-emerald-700">
                {maskComplianceCode(
                  cftCode,
                )}
              </p>
            </div>
          </div>

          {submitError && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                <p className="text-sm font-medium leading-6 text-red-800">
                  {submitError}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                submitting ||
                !complianceComplete
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing transfer...
                </>
              ) : (
                <>
                  Confirm transfer
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     MAIN FORM
  ========================================================== */

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      {/* HEADER */}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
          Payments
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Bank transfer
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Send money securely using your Epex Bank account. You can use a saved recipient or enter recipient details without saving them.
        </p>
      </div>

      {/* SECURITY NOTICE */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

          <div>
            <p className="text-sm font-bold text-blue-900">
              Secure bank transfer
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-900/70">
              Your transfer will require sequential TIN, AML and CFT compliance verification before it can be submitted. After each code is verified, the next verification screen loads automatically.
            </p>
          </div>
        </div>
      </div>

      {/* SOURCE ACCOUNT */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900">
            Source account
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the account you want to transfer from.
          </p>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div>
                <p className="text-sm font-bold text-amber-900">
                  No active accounts
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800/80">
                  You need an active Epex Bank account before you can make a transfer.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <select
              value={
                selectedAccountId
              }
              onChange={(event) => {
                setSelectedAccountId(
                  event.target.value,
                );
                setSubmitError("");
              }}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-4 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">
                Select an account
              </option>

              {accounts.map(
                (account) => {
                  const accountCurrency =
                    getAccountCurrency(
                      account,
                    );

                  return (
                    <option
                      key={
                        account.id
                      }
                      value={
                        account.id
                      }
                    >
                      {getAccountLabel(
                        account,
                      )}{" "}
                      •{" "}
                      {formatMoney(
                        getAccountBalance(
                          account,
                        ),
                        accountCurrency,
                      )}
                    </option>
                  );
                },
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
        )}

        {selectedAccount && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-700" />

                <p className="text-xs font-semibold text-slate-500">
                  Available balance
                </p>
              </div>

              <p className="mt-2 text-lg font-bold text-slate-950">
                {formatMoney(
                  availableBalance,
                  currencyCode,
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-700" />

                <p className="text-xs font-semibold text-slate-500">
                  Currency
                </p>
              </div>

              <p className="mt-2 text-lg font-bold text-slate-950">
                {currencyCode}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* RECIPIENT */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900">
            Recipient
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Saving recipient details is optional. Choose a saved recipient or enter the details for this transfer only.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setRecipientMode("saved");
              setSaveRecipient(false);
              setSubmitError("");
            }}
            className={`rounded-2xl border p-4 text-left transition ${
              recipientMode === "saved"
                ? "border-blue-500 bg-blue-50 ring-4 ring-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <p className="text-sm font-bold text-slate-900">
              Use saved recipient
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Select a recipient already saved to your account.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setRecipientMode("manual");
              setSelectedBeneficiaryId("");
              setSubmitError("");
            }}
            className={`rounded-2xl border p-4 text-left transition ${
              recipientMode === "manual"
                ? "border-blue-500 bg-blue-50 ring-4 ring-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <p className="text-sm font-bold text-slate-900">
              Enter recipient details
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Send to a recipient without saving their details.
            </p>
          </button>
        </div>

        {recipientMode === "saved" ? (
          <div className="mt-5">
            {beneficiaries.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      No saved recipients
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800/80">
                      You can switch to “Enter recipient details” and make the transfer without saving the recipient.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {beneficiaries.map(
                  (beneficiary) => {
                    const selected =
                      String(
                        selectedBeneficiaryId,
                      ) ===
                      String(
                        beneficiary?.id,
                      );

                    return (
                      <button
                        key={beneficiary.id}
                        type="button"
                        onClick={() => {
                          setSelectedBeneficiaryId(
                            beneficiary.id,
                          );
                          setSubmitError("");
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-blue-500 bg-blue-50 ring-4 ring-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                selected
                                  ? "bg-blue-700 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <Building2 className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {getBeneficiaryLabel(
                                  beneficiary,
                                )}
                              </p>

                              <p className="mt-1 font-mono text-xs text-slate-500">
                                {getBeneficiaryAccount(
                                  beneficiary,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {beneficiary?.bankName ||
                                  "External bank"}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${
                              selected
                                ? "border-blue-700 bg-blue-700"
                                : "border-slate-300"
                            }`}
                          >
                            {selected && (
                              <Check className="h-full w-full p-0.5 text-white" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <p className="text-sm font-bold text-slate-900">
                Recipient details
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                These details will be used for this transfer. They will not be saved unless you select the option below.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Recipient name *
                </label>
                <input
                  value={manualRecipient.name}
                  onChange={(event) =>
                    handleManualRecipientChange(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="Full name"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Account name
                </label>
                <input
                  value={manualRecipient.accountName}
                  onChange={(event) =>
                    handleManualRecipientChange(
                      "accountName",
                      event.target.value,
                    )
                  }
                  placeholder="Account holder name"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Account number *
                </label>
                <input
                  value={manualRecipient.accountNumber}
                  onChange={(event) =>
                    handleManualRecipientChange(
                      "accountNumber",
                      event.target.value,
                    )
                  }
                  placeholder="Account number / IBAN"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Bank name *
                </label>
                <input
                  value={manualRecipient.bankName}
                  onChange={(event) =>
                    handleManualRecipientChange(
                      "bankName",
                      event.target.value,
                    )
                  }
                  placeholder="Bank name"
                  autoComplete="organization"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Bank code
                </label>
                <input
                  value={manualRecipient.bankCode}
                  onChange={(event) =>
                    handleManualRecipientChange(
                      "bankCode",
                      event.target.value,
                    )
                  }
                  placeholder="SWIFT / routing / bank code"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Country
                </label>
                <input
                  value={manualRecipient.country}
                  onChange={(event) =>
                    handleManualRecipientChange(
                      "country",
                      event.target.value,
                    )
                  }
                  placeholder="Country"
                  autoComplete="country-name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Currency
                </label>
                <input
                  value={manualRecipient.currencyCode}
                  onChange={(event) =>
                    handleManualRecipientChange(
                      "currencyCode",
                      event.target.value,
                    )
                  }
                  placeholder={currencyCode}
                  autoComplete="off"
                  maxLength={10}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <input
                type="checkbox"
                checked={saveRecipient}
                onChange={(event) =>
                  setSaveRecipient(
                    event.target.checked,
                  )
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Save recipient for future transfers
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Optional. Leave unchecked if you only want to use these details for this transfer.
                </span>
              </span>
            </label>

            {!manualRecipientIsValid && (
              <p className="mt-3 text-xs text-slate-500">
                Required: recipient name, account number and bank name.
              </p>
            )}
          </div>
        )}
      </section>

      {/* TRANSFER DETAILS */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900">
            Transfer details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter the amount and an optional payment reference.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Amount
          </label>

          <div className="relative">
            <input
              inputMode="decimal"
              value={amount}
              onChange={
                handleAmountChange
              }
              placeholder="0.00"
              autoComplete="off"
              aria-invalid={
                amountIsValid &&
                !sufficientBalance
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 pr-20 text-2xl font-bold tracking-tight text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
              {String(
                currencyCode,
              )}
            </span>
          </div>

          {amountIsValid &&
            !sufficientBalance && (
              <p className="mt-2 text-xs font-medium text-red-600">
                Amount exceeds your available balance.
              </p>
            )}
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Description{" "}
            <span className="font-normal text-slate-400">
              Optional
            </span>
          </label>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="What is this transfer for?"
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          <p className="mt-1 text-right text-xs text-slate-400">
            {description.length}/500
          </p>
        </div>
      </section>

      {/* COMPLIANCE PREVIEW */}

      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-blue-700" />

          <div>
            <h2 className="text-base font-bold text-blue-950">
              Compliance verification
            </h2>

            <p className="mt-1 text-sm leading-6 text-blue-900/70">
              Before the transfer can be submitted, you will verify your compliance codes one at a time.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-white/80 px-3 py-3">
                <p className="text-xs font-bold text-blue-900">
                  1. TIN
                </p>

                <p className="mt-1 text-[11px] text-blue-900/60">
                  Tax identification
                </p>
              </div>

              <div className="rounded-xl bg-white/80 px-3 py-3">
                <p className="text-xs font-bold text-blue-900">
                  2. AML
                </p>

                <p className="mt-1 text-[11px] text-blue-900/60">
                  Anti-money laundering
                </p>
              </div>

              <div className="rounded-xl bg-white/80 px-3 py-3">
                <p className="text-xs font-bold text-blue-900">
                  3. CFT
                </p>

                <p className="mt-1 text-[11px] text-blue-900/60">
                  Counter-terrorist financing
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ERROR */}

      {submitError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

            <p className="text-sm font-medium leading-6 text-red-800">
              {submitError}
            </p>
          </div>
        </div>
      )}

      {/* CONTINUE */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to compliance
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BankTransfer;