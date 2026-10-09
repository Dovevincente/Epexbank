import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../../services/api.js";

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const getApiMessage = (
  error,
  fallback,
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const normalizeTwoFactor = (
  payload,
) => {
  const root = getRoot(payload);

  return {
    enabled: Boolean(
      root?.enabled ??
        root?.twoFactorEnabled ??
        root?.isEnabled ??
        root?.data?.enabled ??
        root?.data?.twoFactorEnabled ??
        false,
    ),

    method:
      root?.method ??
      root?.twoFactorMethod ??
      root?.data?.method ??
      root?.data?.twoFactorMethod ??
      null,

    setupRequired: Boolean(
      root?.setupRequired ??
        root?.requiresSetup ??
        root?.data?.setupRequired ??
        false,
    ),

    secret:
      root?.secret ??
      root?.totpSecret ??
      root?.data?.secret ??
      root?.data?.totpSecret ??
      null,

    qrCode:
      root?.qrCode ??
      root?.qrCodeDataUrl ??
      root?.data?.qrCode ??
      root?.data?.qrCodeDataUrl ??
      null,

    otpauthUrl:
      root?.otpauthUrl ??
      root?.otpAuthUrl ??
      root?.data?.otpauthUrl ??
      root?.data?.otpAuthUrl ??
      null,

    backupCodes:
      root?.backupCodes ??
      root?.recoveryCodes ??
      root?.data?.backupCodes ??
      root?.data?.recoveryCodes ??
      [],
  };
};

const TwoFactor = () => {
  const [twoFactor, setTwoFactor] =
    useState({
      enabled: false,
      method: null,
      setupRequired: false,
      secret: null,
      qrCode: null,
      otpauthUrl: null,
      backupCodes: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [startingSetup, setStartingSetup] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  const [disabling, setDisabling] =
    useState(false);

  const [verificationCode, setVerificationCode] =
    useState("");

  const [disableCode, setDisableCode] =
    useState("");

  const [setupStarted, setSetupStarted] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [copied, setCopied] =
    useState("");

  const loadTwoFactor =
    useCallback(
      async (background = false) => {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          let response;

          try {
            response = await api.get(
              "/users/two-factor",
            );
          } catch (requestError) {
            if (
              [404, 501].includes(
                requestError?.response?.status,
              )
            ) {
              response = await api.get(
                "/two-factor",
              );
            } else {
              throw requestError;
            }
          }

          setTwoFactor(
            normalizeTwoFactor(
              response?.data,
            ),
          );
        } catch (requestError) {
          const status =
            requestError?.response?.status;

          if (
            status === 404 ||
            status === 501
          ) {
            /*
             * Do not fabricate a 2FA status.
             * The current backend simply does
             * not expose the endpoint yet.
             */
            setTwoFactor({
              enabled: false,
              method: null,
              setupRequired: false,
              secret: null,
              qrCode: null,
              otpauthUrl: null,
              backupCodes: [],
            });
          } else {
            setError(
              getApiMessage(
                requestError,
                "Unable to load your two-factor authentication settings.",
              ),
            );
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    loadTwoFactor();
  }, [loadTwoFactor]);

  useEffect(() => {
    if (!success) return undefined;

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 4000);

    return () =>
      window.clearTimeout(timer);
  }, [success]);

  const startSetup =
    async () => {
      if (startingSetup) return;

      setStartingSetup(true);
      setError("");
      setSuccess("");

      try {
        let response;

        try {
          response = await api.post(
            "/users/two-factor/setup",
          );
        } catch (requestError) {
          if (
            [404, 501].includes(
              requestError?.response?.status,
            )
          ) {
            response = await api.post(
              "/two-factor/setup",
            );
          } else {
            throw requestError;
          }
        }

        const setup =
          normalizeTwoFactor(
            response?.data,
          );

        setTwoFactor((current) => ({
          ...current,
          ...setup,
          setupRequired: true,
        }));

        setSetupStarted(true);

        setSuccess(
          "Two-factor setup has been initialized. Scan the QR code or use the provided secret in your authenticator app.",
        );
      } catch (requestError) {
        const status =
          requestError?.response?.status;

        if (
          status === 404 ||
          status === 501
        ) {
          setError(
            "Two-factor setup is not enabled by the current banking API yet.",
          );
        } else {
          setError(
            getApiMessage(
              requestError,
              "Unable to initialize two-factor authentication.",
            ),
          );
        }
      } finally {
        setStartingSetup(false);
      }
    };

  const verifySetup =
    async (event) => {
      event.preventDefault();

      const code =
        verificationCode
          .replace(/\D/g, "")
          .slice(0, 6);

      if (code.length !== 6) {
        setError(
          "Enter the six-digit authentication code from your authenticator app.",
        );
        return;
      }

      if (verifying) return;

      setVerifying(true);
      setError("");
      setSuccess("");

      try {
        let response;

        const body = {
          code,
          token: code,
        };

        try {
          response = await api.post(
            "/users/two-factor/verify",
            body,
          );
        } catch (requestError) {
          if (
            [404, 501].includes(
              requestError?.response?.status,
            )
          ) {
            response = await api.post(
              "/two-factor/verify",
              body,
            );
          } else {
            throw requestError;
          }
        }

        const updated =
          normalizeTwoFactor(
            response?.data,
          );

        setTwoFactor((current) => ({
          ...current,
          ...updated,
          enabled: true,
        }));

        setVerificationCode("");
        setSetupStarted(false);

        setSuccess(
          response?.data?.message ||
            "Two-factor authentication has been enabled successfully.",
        );

        await loadTwoFactor(true);
      } catch (requestError) {
        const status =
          requestError?.response?.status;

        if (
          status === 404 ||
          status === 501
        ) {
          setError(
            "Two-factor verification is not enabled by the current banking API yet.",
          );
        } else {
          setError(
            getApiMessage(
              requestError,
              "The authentication code could not be verified.",
            ),
          );
        }
      } finally {
        setVerifying(false);
      }
    };

  const disableTwoFactor =
    async (event) => {
      event.preventDefault();

      const code =
        disableCode
          .replace(/\D/g, "")
          .slice(0, 6);

      if (code.length !== 6) {
        setError(
          "Enter your current six-digit authentication code to disable two-factor authentication.",
        );
        return;
      }

      if (disabling) return;

      setDisabling(true);
      setError("");
      setSuccess("");

      try {
        let response;

        const body = {
          code,
          token: code,
        };

        try {
          response = await api.post(
            "/users/two-factor/disable",
            body,
          );
        } catch (requestError) {
          if (
            [404, 501].includes(
              requestError?.response?.status,
            )
          ) {
            response = await api.post(
              "/two-factor/disable",
              body,
            );
          } else {
            throw requestError;
          }
        }

        setTwoFactor((current) => ({
          ...current,
          enabled: false,
          setupRequired: false,
          secret: null,
          qrCode: null,
          otpauthUrl: null,
          backupCodes: [],
        }));

        setDisableCode("");

        setSuccess(
          response?.data?.message ||
            "Two-factor authentication has been disabled.",
        );
      } catch (requestError) {
        const status =
          requestError?.response?.status;

        if (
          status === 404 ||
          status === 501
        ) {
          setError(
            "Two-factor management is not enabled by the current banking API yet.",
          );
        } else {
          setError(
            getApiMessage(
              requestError,
              "Two-factor authentication could not be disabled.",
            ),
          );
        }
      } finally {
        setDisabling(false);
      }
    };

  const copyValue =
    async (value, label) => {
      if (!value) return;

      try {
        await navigator.clipboard.writeText(
          String(value),
        );

        setCopied(label);

        window.setTimeout(() => {
          setCopied("");
        }, 2000);
      } catch {
        setError(
          `Unable to copy the ${label.toLowerCase()}.`,
        );
      }
    };

  const formattedMethod =
    useMemo(() => {
      if (!twoFactor.method) {
        return "Authenticator app";
      }

      return String(twoFactor.method)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) =>
          character.toUpperCase(),
        );
    }, [twoFactor.method]);

  const hasSetupData =
    Boolean(
      twoFactor.qrCode ||
        twoFactor.otpauthUrl ||
        twoFactor.secret,
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Two-factor authentication
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Add an additional authentication layer to protect your Epex Bank
              account.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadTwoFactor(true)
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

          <div>
            <p className="text-sm font-bold text-red-900 dark:text-red-300">
              Security action failed
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

      {/* Status card */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Authentication status
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Current two-factor protection configured on your account.
              </p>
            </div>

            {!loading && (
              <span
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  twoFactor.enabled
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                }`}
              >
                {twoFactor.enabled
                  ? "Enabled"
                  : "Not enabled"}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-emerald-700 dark:text-emerald-400" />

            <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
              Checking two-factor settings...
            </p>
          </div>
        ) : (
          <div className="p-5 sm:p-7">
            <div
              className={`rounded-2xl border p-5 ${
                twoFactor.enabled
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                  {twoFactor.enabled ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  ) : (
                    <KeyRound className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                  )}
                </div>

                <div>
                  <p
                    className={`text-sm font-bold ${
                      twoFactor.enabled
                        ? "text-emerald-950 dark:text-emerald-300"
                        : "text-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {twoFactor.enabled
                      ? "Your account has two-factor protection"
                      : "Two-factor protection is not enabled"}
                  </p>

                  <p
                    className={`mt-1 text-xs leading-5 ${
                      twoFactor.enabled
                        ? "text-emerald-800 dark:text-emerald-400"
                        : "text-amber-800 dark:text-amber-400"
                    }`}
                  >
                    {twoFactor.enabled
                      ? `Authentication method: ${formattedMethod}.`
                      : "Use an authenticator application to add an additional verification step when signing in."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Setup */}
      {!loading &&
        !twoFactor.enabled && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Smartphone className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Set up authenticator
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Use a compatible authenticator application to generate
                    verification codes.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {!setupStarted ? (
                <div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <SetupStep
                      number="1"
                      title="Start setup"
                      description="Generate the secure authenticator configuration for your account."
                    />

                    <SetupStep
                      number="2"
                      title="Scan the code"
                      description="Add Epex Bank to your authenticator application."
                    />

                    <SetupStep
                      number="3"
                      title="Verify"
                      description="Enter the six-digit code generated by your authenticator."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={startSetup}
                    disabled={startingSetup}
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 sm:w-auto"
                  >
                    {startingSetup ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}

                    {startingSetup
                      ? "Starting setup..."
                      : "Set up two-factor authentication"}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* QR code */}
                  {twoFactor.qrCode && (
                    <div className="flex justify-center">
                      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700">
                        <img
                          src={twoFactor.qrCode}
                          alt="Two-factor authentication QR code"
                          className="h-52 w-52 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Secret */}
                  {twoFactor.secret && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Manual setup key
                      </p>

                      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-3 text-sm font-bold tracking-wider text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                          {twoFactor.secret}
                        </code>

                        <button
                          type="button"
                          onClick={() =>
                            copyValue(
                              twoFactor.secret,
                              "Setup key",
                            )
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          {copied ===
                          "Setup key"
                            ? "Copied"
                            : "Copy key"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Authenticator link */}
                  {twoFactor.otpauthUrl && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Authenticator configuration
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          copyValue(
                            twoFactor.otpauthUrl,
                            "Authenticator link",
                          )
                        }
                        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                        {copied ===
                        "Authenticator link"
                          ? "Copied"
                          : "Copy configuration"}
                      </button>
                    </div>
                  )}

                  {!hasSetupData && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                        Setup information unavailable
                      </p>

                      <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-400">
                        The banking service initialized the setup but did not
                        return a QR code or authenticator secret.
                      </p>
                    </div>
                  )}

                  {/* Verification */}
                  <form
                    onSubmit={
                      verifySetup
                    }
                    className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
                  >
                    <label
                      htmlFor="two-factor-code"
                      className="text-sm font-bold text-slate-900 dark:text-white"
                    >
                      Verification code
                    </label>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Enter the six-digit code currently displayed in your
                      authenticator application.
                    </p>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        id="two-factor-code"
                        name="twoFactorCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={
                          verificationCode
                        }
                        onChange={(event) =>
                          setVerificationCode(
                            event.target.value
                              .replace(
                                /\D/g,
                                "",
                              )
                              .slice(
                                0,
                                6,
                              ),
                          )
                        }
                        placeholder="000000"
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-center text-lg font-bold tracking-[0.35em] text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-700 dark:focus:border-white"
                      />

                      <button
                        type="submit"
                        disabled={
                          verifying ||
                          verificationCode.length !==
                            6
                        }
                        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {verifying ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}

                        {verifying
                          ? "Verifying..."
                          : "Verify and enable"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        )}

      {/* Backup codes */}
      {twoFactor.enabled &&
        twoFactor.backupCodes?.length >
          0 && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Recovery codes
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Store these codes somewhere secure. They can be used if you
                cannot access your authenticator.
              </p>
            </div>

            <div className="p-5 sm:p-7">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {twoFactor.backupCodes.map(
                  (code, index) => (
                    <code
                      key={`${code}-${index}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-bold tracking-wider text-slate-800 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200"
                    >
                      {code}
                    </code>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  copyValue(
                    twoFactor.backupCodes.join(
                      "\n",
                    ),
                    "Recovery codes",
                  )
                }
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />

                {copied ===
                "Recovery codes"
                  ? "Copied"
                  : "Copy recovery codes"}
              </button>
            </div>
          </section>
        )}

      {/* Disable 2FA */}
      {!loading &&
        twoFactor.enabled && (
          <section className="rounded-3xl border border-red-200 bg-white shadow-sm dark:border-red-900/50 dark:bg-slate-900">
            <div className="border-b border-red-100 px-5 py-5 dark:border-red-900/50 sm:px-7">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Disable two-factor authentication
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    This removes the additional authentication requirement from
                    your account. You will need your current authenticator code
                    to continue.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={
                disableTwoFactor
              }
              className="p-5 sm:p-7"
            >
              <label
                htmlFor="disable-two-factor-code"
                className="text-sm font-bold text-slate-900 dark:text-white"
              >
                Current authentication code
              </label>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="disable-two-factor-code"
                  name="disableTwoFactorCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={disableCode}
                  onChange={(event) =>
                    setDisableCode(
                      event.target.value
                        .replace(
                          /\D/g,
                          "",
                        )
                        .slice(
                          0,
                          6,
                        ),
                    )
                  }
                  placeholder="000000"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-center text-lg font-bold tracking-[0.35em] text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-700"
                />

                <button
                  type="submit"
                  disabled={
                    disabling ||
                    disableCode.length !==
                      6
                  }
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  {disabling ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}

                  {disabling
                    ? "Disabling..."
                    : "Disable 2FA"}
                </button>
              </div>
            </form>
          </section>
        )}

      {/* Security notice */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />

          <div>
            <p className="text-sm font-bold text-amber-950 dark:text-amber-300">
              Security notice
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-400">
              Never share your authenticator secret, verification codes or
              recovery codes with anyone. Epex Bank support will never ask you
              to disclose these credentials.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const SetupStep = ({
  number,
  title,
  description,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
        {number}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  </div>
);

export default TwoFactor;