import {
  AlertCircle,
  CheckCircle2,
  Globe2,
  KeyRound,
  LoaderCircle,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import api from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

const getRoot = (payload) =>
  payload?.data ?? payload ?? {};

const normalizeSessions = (
  payload,
) => {
  const root = getRoot(payload);

  if (Array.isArray(root)) {
    return root;
  }

  return (
    root?.sessions ??
    root?.items ??
    root?.records ??
    root?.results ??
    root?.data?.sessions ??
    []
  );
};

const getApiMessage = (
  requestError,
  fallback,
) =>
  requestError?.response?.data
    ?.message ||
  requestError?.message ||
  fallback;

const formatStatus = (
  value,
) => {
  if (!value) return "Unknown";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
};

const formatDateTime = (
  value,
) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
};

const getSessionId = (
  session,
) =>
  session?.id ??
  session?.sessionId ??
  "";

const getSessionStatus = (
  session,
) =>
  String(
    session?.status ??
      session?.sessionStatus ??
      "ACTIVE",
  ).toUpperCase();

const getSessionDevice = (
  session,
) =>
  session?.deviceName ??
  session?.device ??
  session?.deviceName ??
  session?.userAgent ??
  "Authenticated device";

const getSessionBrowser = (
  session,
) =>
  session?.browser ??
  session?.client ??
  "Browser session";

const getSessionPlatform = (
  session,
) =>
  session?.platform ??
  session?.os ??
  session?.operatingSystem ??
  "Platform not provided";

const getSessionLocation = (
  session,
) =>
  session?.location ??
  session?.city ??
  session?.country ??
  "Location not provided";

const getSessionIp = (
  session,
) =>
  session?.ipAddress ??
  session?.ip ??
  "IP address not provided";

const getSessionCreatedAt = (
  session,
) =>
  session?.createdAt ??
  session?.startedAt ??
  session?.loginAt ??
  null;

const getSessionLastActive = (
  session,
) =>
  session?.lastActiveAt ??
  session?.lastSeenAt ??
  session?.updatedAt ??
  null;

const Sessions = () => {
  const { user } = useAuth();

  const [sessions, setSessions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [revoking, setRevoking] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadSessions =
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
              "/users/sessions",
            );
          } catch (requestError) {
            if (
              [404, 501].includes(
                requestError?.response?.status,
              )
            ) {
              response = await api.get(
                "/sessions",
              );
            } else {
              throw requestError;
            }
          }

          setSessions(
            normalizeSessions(
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
             * The current backend does not expose
             * a sessions endpoint yet.
             *
             * Do not manufacture session/device
             * records. The authenticated browser
             * session is shown below instead.
             */
            setSessions([]);
            setError("");
          } else {
            setSessions([]);

            setError(
              getApiMessage(
                requestError,
                "Unable to load your active sessions.",
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
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!success) return undefined;

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 3000);

    return () =>
      window.clearTimeout(timer);
  }, [success]);

  const revokeAllOtherSessions =
    async () => {
      if (revoking) return;

      setRevoking(true);
      setError("");
      setSuccess("");

      try {
        let response;

        try {
          response = await api.post(
            "/users/sessions/revoke-all",
          );
        } catch (requestError) {
          if (
            [404, 501].includes(
              requestError?.response?.status,
            )
          ) {
            response = await api.post(
              "/sessions/revoke-all",
            );
          } else {
            throw requestError;
          }
        }

        setSuccess(
          response?.data?.message ||
            "Other active sessions have been revoked.",
        );

        await loadSessions(true);
      } catch (requestError) {
        const status =
          requestError?.response?.status;

        if (
          status === 404 ||
          status === 501
        ) {
          setError(
            "Session management is not enabled by the current banking API yet.",
          );
        } else {
          setError(
            getApiMessage(
              requestError,
              "Unable to revoke the other sessions.",
            ),
          );
        }
      } finally {
        setRevoking(false);
      }
    };

  const hasSessionEndpoint =
    sessions.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <MonitorSmartphone className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Sessions
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review authenticated sessions associated with your Epex Bank
                account.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadSessions(true)
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
              Session action failed
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

      {/* Current authenticated session */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-8">
          <div className="flex items-center gap-3">
            <MonitorSmartphone className="h-5 w-5 text-slate-600 dark:text-slate-400" />

            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Current session
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                This is the authenticated browser session currently being used.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-emerald-700 dark:text-emerald-400" />

            <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
              Checking session information...
            </p>
          </div>
        ) : (
          <div className="p-5 sm:p-8">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold text-emerald-950 dark:text-emerald-300">
                    Active authenticated session
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-400">
                    Your current Epex Bank session is authenticated and active.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SessionDetail
                icon={MonitorSmartphone}
                label="Account"
                value={
                  user?.email ||
                  "Authenticated user"
                }
              />

              <SessionDetail
                icon={Smartphone}
                label="Authentication"
                value="Secure browser session"
              />

              <SessionDetail
                icon={Globe2}
                label="Session status"
                value="Active"
              />

              <SessionDetail
                icon={ShieldCheck}
                label="Account status"
                value={
                  formatStatus(
                    user?.status ||
                      "ACTIVE",
                  )
                }
              />
            </div>
          </div>
        )}
      </section>

      {/* Sessions returned by API */}
      {hasSessionEndpoint && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-8">
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              Authenticated sessions
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sessions returned by the authenticated banking service.
            </p>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {sessions.map(
              (session, index) => {
                const sessionId =
                  getSessionId(
                    session,
                  );

                const status =
                  getSessionStatus(
                    session,
                  );

                const isActive =
                  status ===
                  "ACTIVE";

                return (
                  <div
                    key={
                      sessionId ||
                      index
                    }
                    className="p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <MonitorSmartphone className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-950 dark:text-white">
                              {getSessionDevice(
                                session,
                              )}
                            </p>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                isActive
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {formatStatus(
                                status,
                              )}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {getSessionBrowser(
                              session,
                            )}{" "}
                            •{" "}
                            {getSessionPlatform(
                              session,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 text-xs sm:grid-cols-2 lg:min-w-[420px]">
                        <SessionMeta
                          label="Location"
                          value={getSessionLocation(
                            session,
                          )}
                        />

                        <SessionMeta
                          label="IP address"
                          value={getSessionIp(
                            session,
                          )}
                        />

                        <SessionMeta
                          label="Started"
                          value={formatDateTime(
                            getSessionCreatedAt(
                              session,
                            ),
                          )}
                        />

                        <SessionMeta
                          label="Last active"
                          value={formatDateTime(
                            getSessionLastActive(
                              session,
                            ),
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </section>
      )}

      {/* Session management */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Session management
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Revoking other sessions signs out authenticated sessions on
              other devices when supported by the banking API. Your current
              session is not intentionally revoked by this action.
            </p>

            <button
              type="button"
              onClick={
                revokeAllOtherSessions
              }
              disabled={
                revoking ||
                !hasSessionEndpoint
              }
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              {revoking ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}

              {revoking
                ? "Revoking sessions..."
                : "Sign out other sessions"}
            </button>

            {!hasSessionEndpoint &&
              !loading && (
                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Multi-session management is not exposed by the current
                  backend yet. Only the current authenticated session can be
                  confirmed here.
                </p>
              )}
          </div>
        </div>
      </section>

      {/* Security notice */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />

          <div>
            <p className="text-sm font-bold text-amber-950 dark:text-amber-300">
              Security notice
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-400">
              If you believe someone else has accessed your account, change
              your password immediately and contact Epex Bank support. Never
              share your password, access token or one-time authentication
              codes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const SessionDetail = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const SessionMeta = ({
  label,
  value,
}) => (
  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <p className="mt-1 break-words text-xs font-semibold text-slate-700 dark:text-slate-300">
      {value}
    </p>
  </div>
);

export default Sessions;
