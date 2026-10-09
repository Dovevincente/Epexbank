import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  activateBeneficiary,
  createBeneficiary,
  deactivateBeneficiary,
  getBeneficiaries,
  updateBeneficiary,
} from "../../services/beneficiaryService.js";

const EMPTY_FORM = {
  name: "",
  accountName: "",
  accountNumber: "",
  bankName: "",
  bankCode: "",
  country: "",
  currencyCode: "USD",
};

const getBeneficiaryId = (beneficiary) =>
  beneficiary?.id ||
  beneficiary?._id ||
  beneficiary?.beneficiaryId ||
  "";

const getErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizeBeneficiaryStatus = (beneficiary) =>
  beneficiary?.isActive === false ? "INACTIVE" : "ACTIVE";

const isBeneficiaryActive = (beneficiary) =>
  normalizeBeneficiaryStatus(beneficiary) === "ACTIVE";

const maskAccountNumber = (value) => {
  if (!value) {
    return "Not provided";
  }

  const account = String(value);

  if (account.length <= 4) {
    return account;
  }

  return `${"•".repeat(Math.min(account.length - 4, 8))}${account.slice(-4)}`;
};

const formatDate = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const getInitials = (name) => {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "B";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const normalizeBeneficiaryResponse = (response) => {
  const candidates = [
    response?.data?.beneficiaries,
    response?.data?.data?.beneficiaries,
    response?.data?.data,
    response?.data?.items,
    response?.beneficiaries,
    response?.items,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
};

const normalizeSingleBeneficiaryResponse = (response) =>
  response?.data?.beneficiary ||
  response?.data?.data?.beneficiary ||
  response?.data?.data ||
  response?.beneficiary ||
  response?.data ||
  null;

const getCurrencyCode = (beneficiary) =>
  String(
    beneficiary?.currencyCode ||
      beneficiary?.currency?.code ||
      beneficiary?.currency ||
      "USD",
  ).toUpperCase();

const Modal = ({
  title,
  description,
  onClose,
  children,
  wide = false,
  closeDisabled = false,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !closeDisabled) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDisabled, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beneficiary-modal-title"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !closeDisabled
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl ${
          wide ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0 pr-4">
            <h2
              id="beneficiary-modal-title"
              className="text-lg font-bold text-slate-950"
            >
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close beneficiary dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

const FormField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
  maxLength,
  autoComplete,
  disabled = false,
}) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
      {label}

      {required ? (
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </span>

    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      autoComplete={autoComplete}
      disabled={disabled}
      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
    />
  </label>
);

const StatusBadge = ({ active }) => {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
      <XCircle className="h-3.5 w-3.5" />
      Inactive
    </span>
  );
};

const Beneficiaries = () => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [actionId, setActionId] = useState("");
  const [actionType, setActionType] = useState("");

  const loadBeneficiaries = useCallback(
    async ({ refresh = false } = {}) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await getBeneficiaries({
          includeInactive: true,
        });

        const nextBeneficiaries =
          normalizeBeneficiaryResponse(response);

        setBeneficiaries(
          Array.isArray(nextBeneficiaries)
            ? nextBeneficiaries
            : [],
        );
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Unable to load your beneficiaries.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  const activeCount = useMemo(
    () =>
      beneficiaries.filter(isBeneficiaryActive).length,
    [beneficiaries],
  );

  const inactiveCount = useMemo(
    () =>
      beneficiaries.filter(
        (beneficiary) =>
          !isBeneficiaryActive(beneficiary),
      ).length,
    [beneficiaries],
  );

  const visibleBeneficiaries = useMemo(() => {
    const query = normalizeText(search);

    return beneficiaries.filter((beneficiary) => {
      const active = isBeneficiaryActive(beneficiary);

      if (filter === "active" && !active) {
        return false;
      }

      if (filter === "inactive" && active) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        beneficiary?.name,
        beneficiary?.accountName,
        beneficiary?.accountNumber,
        beneficiary?.bankName,
        beneficiary?.bankCode,
        beneficiary?.country,
        beneficiary?.currencyCode,
        beneficiary?.currency?.code,
      ]
        .map(normalizeText)
        .join(" ");

      return searchable.includes(query);
    });
  }, [beneficiaries, filter, search]);

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setModal({ type: "create" });
  };

  const openEditModal = (beneficiary) => {
    setForm({
      name: beneficiary?.name || "",
      accountName: beneficiary?.accountName || "",
      accountNumber: beneficiary?.accountNumber || "",
      bankName: beneficiary?.bankName || "",
      bankCode: beneficiary?.bankCode || "",
      country: beneficiary?.country || "",
      currencyCode: getCurrencyCode(beneficiary),
    });

    setFormError("");

    setModal({
      type: "edit",
      beneficiary,
    });
  };

  const closeModal = useCallback(() => {
    if (saving) {
      return;
    }

    setModal(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
  }, [saving]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "currencyCode"
          ? value.toUpperCase()
          : value,
    }));

    if (formError) {
      setFormError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setFormError("");

    const name = form.name.trim();
    const accountName = form.accountName.trim();
    const accountNumber = form.accountNumber.trim();
    const bankName = form.bankName.trim();
    const bankCode = form.bankCode.trim();
    const country = form.country.trim();
    const currencyCode = form.currencyCode
      .trim()
      .toUpperCase();

    if (!name) {
      setFormError("Beneficiary name is required.");
      return;
    }

    if (!accountNumber) {
      setFormError("Account number is required.");
      return;
    }

    if (!bankName) {
      setFormError("Bank name is required.");
      return;
    }

    if (!country) {
      setFormError("Country is required.");
      return;
    }

    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      setFormError(
        "Currency must be a valid 3-letter currency code, such as USD.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        accountName: accountName || undefined,
        accountNumber,
        bankName,
        bankCode: bankCode || undefined,
        country,
        currencyCode,
      };

      if (modal?.type === "edit") {
        const id = getBeneficiaryId(
          modal?.beneficiary,
        );

        if (!id) {
          setFormError(
            "This beneficiary could not be identified.",
          );
          return;
        }

        const response = await updateBeneficiary(
          id,
          payload,
        );

        const updated =
          normalizeSingleBeneficiaryResponse(
            response,
          );

        if (updated?.id || updated?._id) {
          setBeneficiaries((current) =>
            current.map((beneficiary) =>
              getBeneficiaryId(beneficiary) ===
              id
                ? updated
                : beneficiary,
            ),
          );
        } else {
          await loadBeneficiaries({
            refresh: true,
          });
        }
      } else {
        const response = await createBeneficiary(
          payload,
        );

        const created =
          normalizeSingleBeneficiaryResponse(
            response,
          );

        if (created?.id || created?._id) {
          setBeneficiaries((current) => [
            created,
            ...current,
          ]);
        } else {
          await loadBeneficiaries({
            refresh: true,
          });
        }
      }

      setModal(null);
      setForm({ ...EMPTY_FORM });
      setFormError("");
    } catch (requestError) {
      setFormError(
        getErrorMessage(
          requestError,
          "Unable to save this beneficiary.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (beneficiary) => {
    const id = getBeneficiaryId(beneficiary);

    if (!id || actionId) {
      return;
    }

    const name =
      beneficiary?.name || "this beneficiary";

    const confirmed = window.confirm(
      `Deactivate "${name}"? You can reactivate it later.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(id);
      setActionType("deactivate");
      setError("");

      const response =
        await deactivateBeneficiary(id);

      const updated =
        normalizeSingleBeneficiaryResponse(
          response,
        );

      if (updated?.id || updated?._id) {
        setBeneficiaries((current) =>
          current.map((item) =>
            getBeneficiaryId(item) === id
              ? updated
              : item,
          ),
        );
      } else {
        await loadBeneficiaries({
          refresh: true,
        });
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to deactivate the beneficiary.",
        ),
      );
    } finally {
      setActionId("");
      setActionType("");
    }
  };

  const handleActivate = async (beneficiary) => {
    const id = getBeneficiaryId(beneficiary);

    if (!id || actionId) {
      return;
    }

    try {
      setActionId(id);
      setActionType("activate");
      setError("");

      const response =
        await activateBeneficiary(id);

      const updated =
        normalizeSingleBeneficiaryResponse(
          response,
        );

      if (updated?.id || updated?._id) {
        setBeneficiaries((current) =>
          current.map((item) =>
            getBeneficiaryId(item) === id
              ? updated
              : item,
          ),
        );
      } else {
        await loadBeneficiaries({
          refresh: true,
        });
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to activate the beneficiary.",
        ),
      );
    } finally {
      setActionId("");
      setActionType("");
    }
  };

  const handleRefresh = () => {
    loadBeneficiaries({ refresh: true });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <Users className="h-3.5 w-3.5" />
            Recipients
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Beneficiaries
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Manage the recipients you use for bank
            and international transfers.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            Add beneficiary
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <p className="text-sm font-bold text-blue-950">
              Your beneficiary list is private
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800/80">
              Beneficiaries are linked to your
              authenticated Epex Bank profile and
              cannot be accessed by another customer.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Total beneficiaries
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {loading ? "—" : beneficiaries.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Active
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? "—" : activeCount}
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <p className="text-xs font-medium text-slate-500">
            Inactive
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-500">
            {loading ? "—" : inactiveCount}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, account, bank or country..."
                aria-label="Search beneficiaries"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 lg:w-64">
              <button
                type="button"
                onClick={() => setFilter("active")}
                aria-pressed={filter === "active"}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  filter === "active"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Active ({activeCount})
              </button>

              <button
                type="button"
                onClick={() => setFilter("inactive")}
                aria-pressed={filter === "inactive"}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  filter === "inactive"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Inactive ({inactiveCount})
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 sm:m-5">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-red-800">
                  Beneficiary request failed
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                className="rounded-md p-1 text-red-400 hover:bg-red-100 hover:text-red-700"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center px-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                Loading beneficiaries...
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Retrieving your secure recipient list.
              </p>
            </div>
          </div>
        ) : null}

        {!loading &&
        !error &&
        visibleBeneficiaries.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center px-6">
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                {search ? (
                  <Search className="h-6 w-6" />
                ) : (
                  <Users className="h-6 w-6" />
                )}
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-950">
                {search
                  ? "No beneficiaries found"
                  : filter === "inactive"
                    ? "No inactive beneficiaries"
                    : "No beneficiaries yet"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {search
                  ? "Try another name, account number, bank or country."
                  : filter === "inactive"
                    ? "Deactivated beneficiaries will appear here."
                    : "Add a recipient once and reuse their details for supported transfers."}
              </p>

              {!search && filter === "active" ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add your first beneficiary
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!loading &&
        visibleBeneficiaries.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Beneficiary
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Bank
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Account
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Country
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {visibleBeneficiaries.map(
                    (beneficiary) => {
                      const id =
                        getBeneficiaryId(
                          beneficiary,
                        );

                      const active =
                        isBeneficiaryActive(
                          beneficiary,
                        );

                      const busy =
                        actionId === id;

                      return (
                        <tr
                          key={id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                                {getInitials(
                                  beneficiary?.name,
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">
                                  {beneficiary?.name ||
                                    "Unnamed beneficiary"}
                                </p>

                                {beneficiary?.accountName ? (
                                  <p className="mt-1 truncate text-xs text-slate-400">
                                    {
                                      beneficiary.accountName
                                    }
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400" />

                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {beneficiary?.bankName ||
                                    "Bank not provided"}
                                </p>

                                {beneficiary?.bankCode ? (
                                  <p className="mt-0.5 font-mono text-xs text-slate-400">
                                    {
                                      beneficiary.bankCode
                                    }
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-mono text-sm font-semibold text-slate-700">
                              {maskAccountNumber(
                                beneficiary?.accountNumber,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Globe2 className="h-4 w-4 text-slate-400" />

                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {beneficiary?.country ||
                                    "Not provided"}
                                </p>

                                <p className="mt-0.5 text-xs font-semibold text-slate-400">
                                  {getCurrencyCode(
                                    beneficiary,
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge active={active} />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    beneficiary,
                                  )
                                }
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>

                              {active ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeactivate(
                                      beneficiary,
                                    )
                                  }
                                  disabled={
                                    busy ||
                                    Boolean(actionId)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busy &&
                                  actionType ===
                                    "deactivate" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleActivate(
                                      beneficiary,
                                    )
                                  }
                                  disabled={
                                    busy ||
                                    Boolean(actionId)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busy &&
                                  actionType ===
                                    "activate" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  Activate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {visibleBeneficiaries.map(
                (beneficiary) => {
                  const id =
                    getBeneficiaryId(
                      beneficiary,
                    );

                  const active =
                    isBeneficiaryActive(
                      beneficiary,
                    );

                  const busy =
                    actionId === id;

                  return (
                    <article
                      key={id}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                          {getInitials(
                            beneficiary?.name,
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-950">
                                {beneficiary?.name ||
                                  "Unnamed beneficiary"}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-400">
                                {beneficiary?.accountName ||
                                  "Recipient account"}
                              </p>
                            </div>

                            <StatusBadge active={active} />
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Bank
                              </p>

                              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">
                                  {beneficiary?.bankName ||
                                    "Not provided"}
                                </span>
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Account
                              </p>

                              <p className="mt-1 font-mono text-xs font-semibold text-slate-700">
                                {maskAccountNumber(
                                  beneficiary?.accountNumber,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Country
                              </p>

                              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <Globe2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">
                                  {beneficiary?.country ||
                                    "Not provided"}
                                </span>
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Currency
                              </p>

                              <p className="mt-1 text-xs font-semibold text-slate-700">
                                {getCurrencyCode(
                                  beneficiary,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  beneficiary,
                                )
                              }
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>

                            {active ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeactivate(
                                    beneficiary,
                                  )
                                }
                                disabled={
                                  busy ||
                                  Boolean(actionId)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busy &&
                                actionType ===
                                  "deactivate" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleActivate(
                                    beneficiary,
                                  )
                                }
                                disabled={
                                  busy ||
                                  Boolean(actionId)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busy &&
                                actionType ===
                                  "activate" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Activate
                              </button>
                            )}

                            {active ? (
                              <Link
                                to="/transfers/bank"
                                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
                              >
                                Transfer
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                            ) : null}
                          </div>

                          <p className="mt-3 text-[11px] text-slate-400">
                            Added{" "}
                            {formatDate(
                              beneficiary?.createdAt,
                            )}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </>
        ) : null}
      </div>

      {modal ? (
        <Modal
          title={
            modal.type === "edit"
              ? "Edit beneficiary"
              : "Add beneficiary"
          }
          description={
            modal.type === "edit"
              ? "Update the recipient information used for supported transfers."
              : "Save a recipient securely for future bank or international transfers."
          }
          onClose={closeModal}
          closeDisabled={saving}
          wide
        >
          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-6"
            noValidate
          >
            {formError ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5">
                <div className="flex items-start gap-2.5">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                  <p className="text-sm leading-5 text-red-700">
                    {formError}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />

                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Recipient information
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Enter the beneficiary's details
                    exactly as supplied by their bank.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Beneficiary name"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Full recipient name"
                required
                maxLength={120}
                autoComplete="name"
                disabled={saving}
              />

              <FormField
                label="Account name"
                name="accountName"
                value={form.accountName}
                onChange={handleFormChange}
                placeholder="Name registered on account"
                maxLength={120}
                disabled={saving}
              />

              <FormField
                label="Account number"
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleFormChange}
                placeholder="Recipient account number"
                required
                maxLength={50}
                autoComplete="off"
                disabled={saving}
              />

              <FormField
                label="Bank name"
                name="bankName"
                value={form.bankName}
                onChange={handleFormChange}
                placeholder="Recipient bank"
                required
                maxLength={150}
                disabled={saving}
              />

              <FormField
                label="Bank code"
                name="bankCode"
                value={form.bankCode}
                onChange={handleFormChange}
                placeholder="Optional bank/routing code"
                maxLength={50}
                disabled={saving}
              />

              <FormField
                label="Country"
                name="country"
                value={form.country}
                onChange={handleFormChange}
                placeholder="Recipient country"
                required
                maxLength={100}
                disabled={saving}
              />

              <FormField
                label="Currency"
                name="currencyCode"
                value={form.currencyCode}
                onChange={handleFormChange}
                placeholder="USD"
                required
                maxLength={3}
                disabled={saving}
              />
            </div>

            <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3.5">
              <p className="text-xs leading-5 text-amber-800">
                Check the account information carefully
                before saving. Incorrect recipient
                information can cause a transfer to be
                rejected or sent to the wrong account.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {modal.type === "edit"
                      ? "Save changes"
                      : "Add beneficiary"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
};

export default Beneficiaries;