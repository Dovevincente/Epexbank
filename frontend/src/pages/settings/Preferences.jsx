import {
  Check,
  Globe2,
  Languages,
  LoaderCircle,
  Palette,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import api from "../../services/api.js";
import { useTheme } from "../../hooks/useTheme.js";

const DEFAULT_PREFERENCES = {
  currency: "USD",
  language: "English",
};

const CURRENCY_OPTIONS = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
];

const LANGUAGE_OPTIONS = [
  "English",
];

const THEME_OPTIONS = [
  "System",
  "Light",
  "Dark",
];

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const normalizePreferences = (
  payload,
) => {
  const root = getRoot(payload);

  const source =
    root?.preferences ??
    root?.userPreferences ??
    root?.settings?.preferences ??
    root;

  return {
    currency:
      source?.currency ??
      source?.preferredCurrency ??
      DEFAULT_PREFERENCES.currency,

    language:
      source?.language ??
      source?.preferredLanguage ??
      DEFAULT_PREFERENCES.language,
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

const getPreferenceLabel = (
  key,
) => {
  switch (key) {
    case "currency":
      return "Preferred currency";

    case "language":
      return "Language";

    default:
      return "Preference";
  }
};

const Preferences = () => {
  const {
    theme,
    setTheme,
  } = useTheme();

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

  /*
   * Load currency and language preferences
   * from the backend.
   */
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
              "/users/preferences",
            );
          } catch (requestError) {
            /*
             * Keep the fallback for installations
             * that expose /preferences instead.
             */
            if (
              [404, 501].includes(
                requestError?.response?.status,
              )
            ) {
              response = await api.get(
                "/preferences",
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
              "Unable to load your preferences.",
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
    if (!success) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 2500);

    return () =>
      window.clearTimeout(timer);
  }, [success]);

  /*
   * Save currency or language.
   *
   * IMPORTANT:
   * Theme is NOT sent to this endpoint because
   * UserPreference only stores currency/language.
   */
  const savePreference = async (
    key,
    value,
  ) => {
    if (saving[key]) {
      return;
    }

    if (
      key !== "currency" &&
      key !== "language"
    ) {
      return;
    }

    const previousValue =
      preferences[key];

    setPreferences((current) => ({
      ...current,
      [key]: value,
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
        [key]: value,
      };

      try {
        response = await api.patch(
          "/users/preferences",
          payload,
        );
      } catch (requestError) {
        if (
          [404, 501].includes(
            requestError?.response?.status,
          )
        ) {
          response = await api.patch(
            "/preferences",
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
        `${getPreferenceLabel(
          key,
        )} updated successfully.`,
      );
    } catch (requestError) {
      setPreferences((current) => ({
        ...current,
        [key]: previousValue,
      }));

      setError(
        getApiMessage(
          requestError,
          `Unable to update ${getPreferenceLabel(
            key,
          ).toLowerCase()}.`,
        ),
      );
    } finally {
      setSaving((current) => ({
        ...current,
        [key]: false,
      }));
    }
  };

  /*
   * Theme is handled locally by ThemeContext.
   *
   * We intentionally DO NOT call:
   * PATCH /users/preferences
   *
   * because the UserPreference database model
   * only contains currency and language.
   */
  const handleThemeChange = (
    nextTheme,
  ) => {
    const previousTheme =
      theme || "System";

    if (
      nextTheme === previousTheme
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      setSaving((current) => ({
        ...current,
        theme: true,
      }));

      setTheme(nextTheme);

      setSuccess(
        "Appearance preference updated successfully.",
      );
    } catch (requestError) {
      setTheme(previousTheme);

      setError(
        getApiMessage(
          requestError,
          "Unable to save your appearance preference.",
        ),
      );
    } finally {
      setSaving((current) => ({
        ...current,
        theme: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Preferences
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Customize your Epex Bank experience.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-slate-700 dark:text-slate-300" />

          <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading your preferences...
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
              <Settings2 className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Preferences
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Customize your Epex Bank experience.
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
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-400">
            !
          </span>

          <div>
            <p className="text-sm font-bold text-red-900 dark:text-red-300">
              Preference update failed
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
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />

          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {success}
          </p>
        </div>
      )}

      {/* Preferences */}
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <PreferenceSelect
          icon={Globe2}
          title="Preferred currency"
          description="Choose the currency used for supported account displays."
          value={preferences.currency}
          options={CURRENCY_OPTIONS}
          saving={Boolean(
            saving.currency,
          )}
          onChange={(value) =>
            savePreference(
              "currency",
              value,
            )
          }
        />

        <PreferenceSelect
          icon={Languages}
          title="Language"
          description="Select your preferred language for the banking interface."
          value={preferences.language}
          options={LANGUAGE_OPTIONS}
          saving={Boolean(
            saving.language,
          )}
          onChange={(value) =>
            savePreference(
              "language",
              value,
            )
          }
        />

        <PreferenceSelect
          icon={Palette}
          title="Appearance"
          description="Choose how the banking interface should appear."
          value={
            theme || "System"
          }
          options={THEME_OPTIONS}
          saving={Boolean(
            saving.theme,
          )}
          onChange={
            handleThemeChange
          }
        />
      </section>

      {/* Explanation */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />

          <p className="text-xs leading-5 text-blue-700 dark:text-blue-300">
            These settings control your Epex Bank interface experience.
            They do not change the currency, ownership, balance, legal
            status or configuration of your underlying banking accounts.
          </p>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Account configuration
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Changing your preferred display currency does not perform
              a currency conversion and does not move funds between
              accounts. Actual account currency remains controlled by
              the banking account configuration.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const PreferenceSelect = ({
  icon: Icon,
  title,
  description,
  value,
  options,
  saving,
  onChange,
}) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
      <Icon className="h-5 w-5" />
    </div>

    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-bold text-slate-950 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>

      {saving && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <LoaderCircle className="h-3 w-3 animate-spin" />
          Saving preference...
        </div>
      )}
    </div>

    <div className="relative sm:w-40">
      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        disabled={saving}
        className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:focus:border-slate-500 dark:focus:ring-slate-800"
      >
        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ),
        )}
      </select>
    </div>
  </div>
);

export default Preferences;