import {
  Bell,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import api from "../../services/api.js";

const notificationOptions = [
  {
    key: "transactions",
    title: "Transaction alerts",
    description:
      "Receive alerts for deposits, withdrawals, transfers and payments.",
    icon: CreditCard,
  },
  {
    key: "security",
    title: "Security alerts",
    description:
      "Get notified about sign-ins, security changes and sensitive activity.",
    icon: ShieldCheck,
    locked: true,
  },
  {
    key: "account",
    title: "Account notifications",
    description:
      "Receive important updates about your account and services.",
    icon: Bell,
  },
  {
    key: "email",
    title: "Email notifications",
    description:
      "Receive important banking information by email.",
    icon: Mail,
  },
  {
    key: "mobile",
    title: "Mobile notifications",
    description:
      "Allow supported banking alerts to be delivered to your device.",
    icon: Smartphone,
  },
];

const DEFAULT_PREFERENCES = {
  transactions: true,
  security: true,
  account: true,
  email: true,
  mobile: true,
};

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const normalizePreferences = (
  payload,
) => {
  const root = getRoot(payload);

  const source =
    root?.preferences ??
    root?.notificationPreferences ??
    root?.notifications ??
    root?.settings?.notifications ??
    root;

  return {
    transactions:
      source?.transactions ??
      source?.transactionAlerts ??
      DEFAULT_PREFERENCES.transactions,

    security:
      source?.security ??
      source?.securityAlerts ??
      DEFAULT_PREFERENCES.security,

    account:
      source?.account ??
      source?.accountNotifications ??
      DEFAULT_PREFERENCES.account,

    email:
      source?.email ??
      source?.emailNotifications ??
      DEFAULT_PREFERENCES.email,

    mobile:
      source?.mobile ??
      source?.mobileNotifications ??
      DEFAULT_PREFERENCES.mobile,
  };
};

const getApiMessage = (
  requestError,
  fallback,
) =>
  requestError?.response?.data
    ?.message ||
  requestError?.message ||
  fallback;

const Notifications = () => {
  const [preferences, setPreferences] =
    useState(
      DEFAULT_PREFERENCES,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState({});

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadPreferences =
    useCallback(
      async (background = false) => {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
        setSuccess("");

        try {
          let response;

          try {
            response = await api.get(
              "/users/notification-preferences",
            );
          } catch (requestError) {
            if (
              [404, 501].includes(
                requestError?.response?.status,
              )
            ) {
              response = await api.get(
                "/notifications/preferences",
              );
            } else {
              throw requestError;
            }
          }

          setPreferences(
            normalizePreferences(
              response?.data,
            ),
          );
        } catch (requestError) {
          setError(
            getApiMessage(
              requestError,
              "Unable to load your notification preferences.",
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
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (!success) return undefined;

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 2500);

    return () =>
      window.clearTimeout(timer);
  }, [success]);

  const togglePreference = async (
    key,
  ) => {
    const option =
      notificationOptions.find(
        (item) => item.key === key,
      );

    if (!option || option.locked) {
      return;
    }

    if (saving[key]) {
      return;
    }

    const previousValue =
      Boolean(preferences[key]);

    const nextValue =
      !previousValue;

    setPreferences((current) => ({
      ...current,
      [key]: nextValue,
    }));

    setSaving((current) => ({
      ...current,
      [key]: true,
    }));

    setError("");
    setSuccess("");

    try {
      let response;

      const payload = {
        [key]: nextValue,
      };

      try {
        response = await api.patch(
          "/users/notification-preferences",
          payload,
        );
      } catch (requestError) {
        if (
          [404, 501].includes(
            requestError?.response?.status,
          )
        ) {
          response = await api.patch(
            "/notifications/preferences",
            payload,
          );
        } else {
          throw requestError;
        }
      }

      const returnedPreferences =
        normalizePreferences(
          response?.data,
        );

      setPreferences(
        returnedPreferences,
      );

      setSuccess(
        `${option.title} updated successfully.`,
      );
    } catch (requestError) {
      setPreferences((current) => ({
        ...current,
        [key]: previousValue,
      }));

      setError(
        getApiMessage(
          requestError,
          `Unable to update ${option.title.toLowerCase()}.`,
        ),
      );
    } finally {
      setSaving((current) => ({
        ...current,
        [key]: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Notifications
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Choose how Epex Bank communicates important account activity.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-slate-700 dark:text-slate-300" />

          <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading notification preferences...
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Notifications
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose how Epex Bank communicates important account activity.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadPreferences(true)
          }
          disabled={refreshing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />
          Refresh
        </button>
      </section>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-red-900 dark:text-red-300">
              Notification settings update failed
            </p>

            <p className="mt-1 text-sm leading-5 text-red-800 dark:text-red-400">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />

          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {success}
          </p>
        </div>
      )}

      {/* Preferences */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-8">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Notification preferences
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Changes are saved to your authenticated Epex Bank profile.
            Critical security and regulatory communications may still be
            delivered when required.
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {notificationOptions.map(
            (option) => {
              const Icon =
                option.icon;

              const enabled =
                Boolean(
                  preferences[
                    option.key
                  ],
                );

              const isSaving =
                Boolean(
                  saving[
                    option.key
                  ],
                );

              return (
                <div
                  key={option.key}
                  className="flex items-center gap-4 px-5 py-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/30 sm:px-8"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      enabled
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                        {option.title}
                      </h3>

                      {option.locked && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Required
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {option.description}
                    </p>

                    {isSaving && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                        Saving preference...
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={
                      enabled
                    }
                    aria-label={`${option.title}: ${
                      enabled
                        ? "enabled"
                        : "disabled"
                    }`}
                    disabled={
                      option.locked ||
                      isSaving
                    }
                    onClick={() =>
                      togglePreference(
                        option.key,
                      )
                    }
                    className={[
                      "relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-slate-700",
                      enabled
                        ? "bg-slate-950 dark:bg-white"
                        : "bg-slate-200 dark:bg-slate-700",
                      option.locked ||
                      isSaving
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-1 h-5 w-5 rounded-full shadow-sm transition",
                        enabled
                          ? "left-6 bg-white dark:bg-slate-950"
                          : "left-1 bg-white",
                      ].join(" ")}
                    />
                  </button>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* Security notice */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Important communications
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Some communications may be required for security, fraud
              prevention, legal, regulatory or account-service reasons. These
              important notices may be delivered even when optional notification
              preferences are disabled.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Notifications;