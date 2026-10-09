import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Globe2,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Save,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";

const normalizeSettings = (payload) => {
  const source =
    payload?.settings ??
    payload?.configuration ??
    payload?.config ??
    payload?.data ??
    payload ??
    {};

  return {
    environment:
      source?.environment ??
      source?.nodeEnv ??
      source?.appEnvironment ??
      "Unknown",

    apiStatus:
      source?.apiStatus ??
      source?.api?.status ??
      source?.serverStatus ??
      "Unknown",

    databaseStatus:
      source?.databaseStatus ??
      source?.database?.status ??
      source?.databaseConnection ??
      "Unknown",

    realtimeStatus:
      source?.realtimeStatus ??
      source?.socketStatus ??
      source?.socket?.status ??
      "Unknown",

    maintenanceMode:
      typeof source?.maintenanceMode === "boolean"
        ? source.maintenanceMode
        : null,

    registrationEnabled:
      typeof source?.registrationEnabled === "boolean"
        ? source.registrationEnabled
        : null,

    transfersEnabled:
      typeof source?.transfersEnabled === "boolean"
        ? source.transfersEnabled
        : null,

    withdrawalsEnabled:
      typeof source?.withdrawalsEnabled === "boolean"
        ? source.withdrawalsEnabled
        : null,

    depositsEnabled:
      typeof source?.depositsEnabled === "boolean"
        ? source.depositsEnabled
        : null,

    kycRequired:
      typeof source?.kycRequired === "boolean"
        ? source.kycRequired
        : null,

    lastUpdated:
      source?.lastUpdated ??
      source?.updatedAt ??
      source?.configurationUpdatedAt ??
      null,

    version:
      source?.version ??
      source?.appVersion ??
      source?.applicationVersion ??
      "Not reported",

    apiVersion:
      source?.apiVersion ??
      source?.api?.version ??
      "Not reported",

    timezone:
      source?.timezone ??
      source?.serverTimezone ??
      "Not reported",

    currency:
      source?.defaultCurrency ??
      source?.currency ??
      "Not reported",
  };
};

const normalizeComplianceSettings = (payload) => {
  const source =
    payload?.data?.settings ??
    payload?.settings ??
    payload?.configuration ??
    payload?.config ??
    payload?.data ??
    payload ??
    {};

  return {
    id: source?.id ?? null,

    tinCheckEnabled:
      source?.tinCheckEnabled === true,

    amlCheckEnabled:
      source?.amlCheckEnabled === true,

    cftCheckEnabled:
      source?.cftCheckEnabled === true,

    emailDebitAlertsEnabled:
      source?.emailDebitAlertsEnabled !== false,

    smsDebitAlertsEnabled:
      source?.smsDebitAlertsEnabled !== false,

    inAppDebitAlertsEnabled:
      source?.inAppDebitAlertsEnabled !== false,

    createdAt:
      source?.createdAt ?? null,

    updatedAt:
      source?.updatedAt ?? null,
  };
};
const normalizeStatus = (value) => {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (
    ["CONNECTED", "ONLINE", "HEALTHY", "RUNNING", "ACTIVE", "OK"].includes(
      normalized,
    )
  ) {
    return "healthy";
  }

  if (
    ["DISCONNECTED", "OFFLINE", "FAILED", "ERROR", "DOWN"].includes(
      normalized,
    )
  ) {
    return "error";
  }

  return "unknown";
};

const formatDateTime = (value) => {
  if (!value) return "Not reported";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatBoolean = (value) => {
  if (value === true) return "Enabled";
  if (value === false) return "Disabled";
  return "Not reported";
};

const StatusBadge = ({ value }) => {
  const status = normalizeStatus(value);

  const styles = {
    healthy:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
    error:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
    unknown:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };

  const icons = {
    healthy: CheckCircle2,
    error: XCircle,
    unknown: Clock3,
  };

  const Icon = icons[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {String(value ?? "Unknown")}
    </span>
  );
};

const SettingValue = ({ value }) => {
  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
          value
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {value ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        {formatBoolean(value)}
      </span>
    );
  }

  return (
    <span className="text-sm font-semibold text-slate-900 dark:text-white">
      {value || "Not reported"}
    </span>
  );
};

const Toggle = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
      checked
        ? "bg-blue-600"
        : "bg-slate-300 dark:bg-slate-700"
    } ${
      disabled
        ? "cursor-not-allowed opacity-60"
        : "cursor-pointer"
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

const SystemSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [complianceSettings, setComplianceSettings] = useState(null);
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [complianceSaving, setComplianceSaving] = useState(false);
  const [complianceError, setComplianceError] = useState("");
  const [complianceSuccess, setComplianceSuccess] = useState("");

  const fetchSettings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/admin/settings");
      setSettings(normalizeSettings(response?.data));
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Unable to load system settings.";

      setError(message);
      setSettings(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchComplianceSettings = useCallback(async () => {
    setComplianceLoading(true);
    setComplianceError("");

    try {
      const response = await api.get("/admin/compliance/settings");

      setComplianceSettings(
        normalizeComplianceSettings(response?.data),
      );
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Unable to load compliance settings.";

      setComplianceError(message);
      setComplianceSettings(null);
    } finally {
      setComplianceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchComplianceSettings();
  }, [fetchSettings, fetchComplianceSettings]);

  const updateComplianceField = (field, value) => {
    setComplianceSuccess("");
    setComplianceError("");

    setComplianceSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveComplianceSettings = async () => {
    if (!complianceSettings || complianceSaving) return;

    setComplianceSaving(true);
    setComplianceError("");
    setComplianceSuccess("");

    try {
      const payload = {
        tinCheckEnabled: Boolean(
          complianceSettings.tinCheckEnabled,
        ),
        amlCheckEnabled: Boolean(
          complianceSettings.amlCheckEnabled,
        ),
        cftCheckEnabled: Boolean(
          complianceSettings.cftCheckEnabled,
        ),
        emailDebitAlertsEnabled: Boolean(
          complianceSettings.emailDebitAlertsEnabled,
        ),
        smsDebitAlertsEnabled: Boolean(
          complianceSettings.smsDebitAlertsEnabled,
        ),
        inAppDebitAlertsEnabled: Boolean(
          complianceSettings.inAppDebitAlertsEnabled,
        ),
      };

      const response = await api.put(
        "/admin/compliance/settings",
        payload,
      );

      setComplianceSettings(
        normalizeComplianceSettings(response?.data),
      );

      setComplianceSuccess(
        "Compliance and debit alert settings saved successfully.",
      );
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Unable to save compliance settings.";

      setComplianceError(message);
    } finally {
      setComplianceSaving(false);
    }
  };

  const serviceChecks = useMemo(
    () => [
      {
        label: "API service",
        description: "Core Epex Bank API availability",
        value: settings?.apiStatus,
        icon: ServerCog,
      },
      {
        label: "Database",
        description: "Primary banking database connection",
        value: settings?.databaseStatus,
        icon: Database,
      },
      {
        label: "Realtime service",
        description: "Socket and realtime event availability",
        value: settings?.realtimeStatus,
        icon: Wifi,
      },
    ],
    [settings],
  );

  const operationalSettings = useMemo(
    () => [
      {
        label: "Maintenance mode",
        description:
          "Controls whether the platform is operating in maintenance mode.",
        value: settings?.maintenanceMode,
      },
      {
        label: "Customer registration",
        description:
          "Controls whether new customer registrations are currently enabled.",
        value: settings?.registrationEnabled,
      },
      {
        label: "Transfers",
        description:
          "Controls whether customer transfer functionality is enabled.",
        value: settings?.transfersEnabled,
      },
      {
        label: "Withdrawals",
        description:
          "Controls whether withdrawal functionality is enabled.",
        value: settings?.withdrawalsEnabled,
      },
      {
        label: "Deposits",
        description:
          "Controls whether deposit functionality is enabled.",
        value: settings?.depositsEnabled,
      },
      {
        label: "KYC requirement",
        description:
          "Indicates whether customer verification is required by the platform configuration.",
        value: settings?.kycRequired,
      },
    ],
    [settings],
  );

  const hasOperationalValues = operationalSettings.some(
    (item) => item.value !== null && item.value !== undefined,
  );

  const complianceControls = [
    {
      key: "tinCheckEnabled",
      title: "TIN / Tax Code Check",
      description:
        "Require a verified Tax Identification Number before an eligible transfer can proceed.",
    },
    {
      key: "amlCheckEnabled",
      title: "AML Check",
      description:
        "Enable the internal AML compliance gate for transfers using the customer's verified KYC status.",
    },
    {
      key: "cftCheckEnabled",
      title: "CFT Check",
      description:
        "Enable the internal CFT compliance gate for transfers using the customer's verified KYC status.",
    },
    {
      key: "emailDebitAlertsEnabled",
      title: "Email Debit Alerts",
      description:
        "Send an email notification after a completed transfer debits the customer's account.",
    },
    {
      key: "smsDebitAlertsEnabled",
      title: "SMS Debit Alerts",
      description:
        "Enable SMS debit notifications after a completed transfer.",
    },
    {
      key: "inAppDebitAlertsEnabled",
      title: "In-App Debit Alerts",
      description:
        "Create an in-app transaction notification after a completed transfer.",
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <SlidersHorizontal className="h-6 w-6" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                    System Settings
                  </h1>

                  {settings?.environment &&
                    settings.environment !== "Unknown" && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {settings.environment}
                      </span>
                    )}
                </div>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Review platform configuration, service health and
                  administrator-controlled banking compliance and alert
                  settings.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchSettings(true);
                fetchComplianceSettings();
              }}
              disabled={
                loading ||
                refreshing ||
                complianceLoading ||
                complianceSaving
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing || complianceLoading
                    ? "animate-spin"
                    : ""
                }`}
              />
              {refreshing || complianceLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

              <div className="min-w-0">
                <h2 className="font-semibold text-red-800 dark:text-red-300">
                  Settings could not be loaded
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => fetchSettings()}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : settings ? (
          <>
            <section>
              <div className="mb-3">
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Service health
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Current platform service status reported by the backend.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {serviceChecks.map((service) => {
                  const Icon = service.icon;

                  return (
                    <article
                      key={service.label}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <Icon className="h-5 w-5" />
                        </div>

                        <StatusBadge value={service.value} />
                      </div>

                      <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">
                        {service.label}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                        {service.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    <Globe2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      Platform
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Runtime information
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Environment
                    </dt>
                    <dd>
                      <SettingValue value={settings.environment} />
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Application version
                    </dt>
                    <dd>
                      <SettingValue value={settings.version} />
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      API version
                    </dt>
                    <dd>
                      <SettingValue value={settings.apiVersion} />
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Database className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      Banking configuration
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      General platform values
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Default currency
                    </dt>
                    <dd>
                      <SettingValue value={settings.currency} />
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Server timezone
                    </dt>
                    <dd className="text-right">
                      <SettingValue value={settings.timezone} />
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Last configuration update
                    </dt>
                    <dd className="text-right">
                      <SettingValue
                        value={formatDateTime(settings.lastUpdated)}
                      />
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
                    <LockKeyhole className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold text-amber-950 dark:text-amber-200">
                      Administrative security
                    </h2>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Protected configuration
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-amber-900 dark:text-amber-200">
                  Sensitive credentials, signing secrets, database passwords
                  and private keys are intentionally not exposed through the
                  administration interface.
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4" />
                  Server-side authorization required
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900/60 dark:bg-slate-900">
              <div className="border-b border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Transfer Compliance & Debit Alerts
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Control which compliance gates are applied to transfers
                      and which debit notifications are generated after
                      completed transfers.
                    </p>
                  </div>
                </div>
              </div>

              {complianceError && (
                <div className="border-b border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/60 dark:bg-red-950/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        Compliance settings error
                      </p>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                        {complianceError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {complianceSuccess && (
                <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      {complianceSuccess}
                    </p>
                  </div>
                </div>
              )}

              {complianceLoading ? (
                <div className="space-y-4 p-5">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                    />
                  ))}
                </div>
              ) : complianceSettings ? (
                <>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {complianceControls.map((control) => (
                      <div
                        key={control.key}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {control.title}
                            </h3>

                            {complianceSettings[control.key] ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                Enabled
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                Disabled
                              </span>
                            )}
                          </div>

                          <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500 dark:text-slate-400">
                            {control.description}
                          </p>
                        </div>

                        <div className="shrink-0">
                          <Toggle
                            checked={Boolean(
                              complianceSettings[control.key],
                            )}
                            disabled={complianceSaving}
                            onChange={(value) =>
                              updateComplianceField(
                                control.key,
                                value,
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Save administrator controls
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Changes are saved securely through the protected admin
                        API and recorded in the audit log.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={saveComplianceSettings}
                      disabled={complianceSaving}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {complianceSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      {complianceSaving
                        ? "Saving..."
                        : "Save Settings"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />

                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                    Compliance settings unavailable
                  </h3>

                  <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                    The protected administration API did not return the
                    compliance configuration.
                  </p>

                  <button
                    type="button"
                    onClick={fetchComplianceSettings}
                    className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <ServerCog className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Operational controls
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Read the controls reported by the current backend
                      configuration.
                    </p>
                  </div>
                </div>
              </div>

              {hasOperationalValues ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {operationalSettings.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {item.label}
                        </h3>

                        <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500 dark:text-slate-400">
                          {item.description}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <SettingValue value={item.value} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <SlidersHorizontal className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />

                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                    No operational controls reported
                  </h3>

                  <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                    The current backend settings endpoint did not expose
                    editable operational flags. No values have been invented
                    on the client.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" />

                  <div>
                    <h2 className="font-semibold text-blue-950 dark:text-blue-200">
                      Configuration changes remain server-controlled
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                      This interface uses the authenticated administrator API.
                      Secrets and sensitive infrastructure credentials remain
                      outside the client application.
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin/audit-logs"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  View audit logs
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <ServerCog className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

            <h2 className="mt-4 font-semibold text-slate-950 dark:text-white">
              No system configuration available
            </h2>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              The administration API did not return configuration data.
            </p>

            <button
              type="button"
              onClick={() => fetchSettings()}
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </section>
        )}

        <footer className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Administrative controls are protected
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Configuration data is requested from the authenticated admin
                API. Secrets and sensitive infrastructure credentials should
                remain on the server and outside the client application.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SystemSettings;