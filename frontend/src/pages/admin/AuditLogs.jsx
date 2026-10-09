import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";

const PAGE_SIZE = 15;

const normalizeLogs = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.logs)) {
    return payload.logs;
  }

  if (Array.isArray(payload?.auditLogs)) {
    return payload.auditLogs;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.logs)) {
    return payload.data.logs;
  }

  if (Array.isArray(payload?.data?.auditLogs)) {
    return payload.data.auditLogs;
  }

  return [];
};

const getActor = (log) => {
  const actor =
    log?.actor ||
    log?.admin ||
    log?.user ||
    log?.performedBy ||
    log?.performedByUser ||
    null;

  return {
    id: actor?.id || log?.actorId || log?.adminId || "",
    name:
      actor?.name ||
      actor?.fullName ||
      [actor?.firstName, actor?.lastName]
        .filter(Boolean)
        .join(" ") ||
      actor?.email ||
      "Administrator",
    email: actor?.email || "",
  };
};

const getAction = (log) =>
  String(
    log?.action ||
      log?.event ||
      log?.eventType ||
      log?.activity ||
      log?.operation ||
      "UNKNOWN",
  );

const getResource = (log) =>
  String(
    log?.resource ||
      log?.resourceType ||
      log?.entity ||
      log?.entityType ||
      "—",
  );

const getResourceId = (log) =>
  log?.resourceId ||
  log?.entityId ||
  log?.targetId ||
  log?.target?.id ||
  "";

const getDescription = (log) =>
  log?.description ||
  log?.message ||
  log?.details ||
  log?.summary ||
  "";

const getStatus = (log) =>
  String(log?.status || log?.result || "SUCCESS").toUpperCase();

const getTimestamp = (log) =>
  log?.createdAt ||
  log?.timestamp ||
  log?.occurredAt ||
  log?.date ||
  null;

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatRelativeDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference = Date.now() - date.getTime();
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return "";
};

const formatLabel = (value) =>
  String(value || "—")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const statusClass = (status) => {
  switch (String(status).toUpperCase()) {
    case "SUCCESS":
    case "COMPLETED":
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "FAILED":
    case "ERROR":
    case "DENIED":
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "PENDING":
    case "PROCESSING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const actionClass = (action) => {
  const normalized = String(action).toUpperCase();

  if (
    normalized.includes("DELETE") ||
    normalized.includes("REVOKE") ||
    normalized.includes("SUSPEND") ||
    normalized.includes("BLOCK") ||
    normalized.includes("DEBIT")
  ) {
    return "bg-red-50 text-red-700";
  }

  if (
    normalized.includes("CREATE") ||
    normalized.includes("CREDIT") ||
    normalized.includes("APPROVE") ||
    normalized.includes("ENABLE")
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized.includes("LOGIN") ||
    normalized.includes("AUTH") ||
    normalized.includes("SECURITY")
  ) {
    return "bg-violet-50 text-violet-700";
  }

  return "bg-slate-100 text-slate-700";
};

const AdminAuditLogs = () => {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/admin/audit-logs");

      setLogs(normalizeLogs(response?.data));
      setPage(1);
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to load administrative audit logs.";

      setError(message);
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const statuses = useMemo(() => {
    const values = new Set();

    logs.forEach((log) => {
      const status = getStatus(log);

      if (status) {
        values.add(status);
      }
    });

    return Array.from(values).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const actor = getActor(log);
      const action = getAction(log);
      const resource = getResource(log);
      const resourceId = getResourceId(log);
      const description = getDescription(log);
      const status = getStatus(log);

      const searchableText = [
        actor.name,
        actor.email,
        action,
        resource,
        resourceId,
        description,
        status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredLogs]);

  const summary = useMemo(() => {
    let successful = 0;
    let failed = 0;
    let security = 0;

    logs.forEach((log) => {
      const status = getStatus(log);
      const action = getAction(log).toUpperCase();

      if (
        status === "SUCCESS" ||
        status === "COMPLETED" ||
        status === "APPROVED"
      ) {
        successful += 1;
      }

      if (
        status === "FAILED" ||
        status === "ERROR" ||
        status === "DENIED" ||
        status === "REJECTED"
      ) {
        failed += 1;
      }

      if (
        action.includes("LOGIN") ||
        action.includes("AUTH") ||
        action.includes("SECURITY") ||
        action.includes("PASSWORD") ||
        action.includes("ROLE")
      ) {
        security += 1;
      }
    });

    return {
      total: logs.length,
      successful,
      failed,
      security,
    };
  }, [logs]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
              <p className="mt-4 font-semibold text-slate-950">
                Loading audit logs
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Retrieving protected administrative activity.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !logs.length) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              Audit logs unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadLogs()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Security audit trail
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Audit Logs
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Review security-sensitive administrative and financial
                activity recorded by the Epex Bank backend.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadLogs(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Refresh warning</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Recorded events
              </p>
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Successful
              </p>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.successful}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Failed / denied
              </p>
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.failed}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Security events
              </p>
              <Clock3 className="h-5 w-5 text-violet-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.security}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Activity trail
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredLogs.length} event
                  {filteredLogs.length === 1 ? "" : "s"} match the
                  current filters.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search action, user, resource..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All results</option>

                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>

                {(search || statusFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {visibleLogs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FileText className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-950">
                No audit events found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                There are no audit events matching the current search and
                filter settings.
              </p>

              {(search || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Time</th>
                      <th className="px-5 py-4">Administrator</th>
                      <th className="px-5 py-4">Action</th>
                      <th className="px-5 py-4">Resource</th>
                      <th className="px-5 py-4">Result</th>
                      <th className="px-5 py-4 text-right">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleLogs.map((log, index) => {
                      const actor = getActor(log);
                      const action = getAction(log);
                      const resource = getResource(log);
                      const resourceId = getResourceId(log);
                      const status = getStatus(log);
                      const timestamp = getTimestamp(log);
                      const description = getDescription(log);

                      return (
                        <tr
                          key={
                            log?.id ||
                            `${timestamp || "log"}-${action}-${index}`
                          }
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <p className="text-sm font-medium text-slate-800">
                              {formatDateTime(timestamp)}
                            </p>

                            {formatRelativeDate(timestamp) ? (
                              <p className="mt-1 text-xs text-slate-400">
                                {formatRelativeDate(timestamp)}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex min-w-[190px] items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <UserRound className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {actor.name}
                                </p>

                                {actor.email ? (
                                  <p className="truncate text-xs text-slate-500">
                                    {actor.email}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-xl px-2.5 py-1.5 text-xs font-semibold ${actionClass(
                                action,
                              )}`}
                            >
                              {formatLabel(action)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {formatLabel(resource)}
                            </p>

                            {resourceId ? (
                              <p className="mt-1 max-w-[180px] truncate font-mono text-xs text-slate-400">
                                {resourceId}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                status,
                              )}`}
                            >
                              {formatLabel(status)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          </td>

                          {description ? null : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-100 lg:hidden">
                {visibleLogs.map((log, index) => {
                  const actor = getActor(log);
                  const action = getAction(log);
                  const resource = getResource(log);
                  const resourceId = getResourceId(log);
                  const status = getStatus(log);
                  const timestamp = getTimestamp(log);
                  const description = getDescription(log);

                  return (
                    <article
                      key={
                        log?.id ||
                        `${timestamp || "log"}-${action}-${index}`
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <UserRound className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {actor.name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatDateTime(timestamp)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass(
                            status,
                          )}`}
                        >
                          {formatLabel(status)}
                        </span>
                      </div>

                      <div className="mt-4">
                        <span
                          className={`inline-flex rounded-xl px-2.5 py-1.5 text-xs font-semibold ${actionClass(
                            action,
                          )}`}
                        >
                          {formatLabel(action)}
                        </span>

                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          {formatLabel(resource)}
                        </p>

                        {resourceId ? (
                          <p className="mt-1 break-all font-mono text-xs text-slate-400">
                            {resourceId}
                          </p>
                        ) : null}

                        {description ? (
                          <p className="mt-3 text-sm leading-6 text-slate-500">
                            {description}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        View event details
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredLogs.length,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredLogs.length}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1),
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>
            Audit records are security-sensitive information. This interface
            is only a presentation layer; authorization, audit integrity and
            access control must remain enforced by the Epex Bank backend.
          </p>
        </div>
      </div>

      {selectedLog ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-event-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLog(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <FileText className="h-3.5 w-3.5" />
                  Audit event
                </div>

                <h2
                  id="audit-event-title"
                  className="text-xl font-bold text-slate-950"
                >
                  {formatLabel(getAction(selectedLog))}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {formatDateTime(getTimestamp(selectedLog))}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                aria-label="Close audit event"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Administrator
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {getActor(selectedLog).name}
                  </p>

                  {getActor(selectedLog).email ? (
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {getActor(selectedLog).email}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Result
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                      getStatus(selectedLog),
                    )}`}
                  >
                    {formatLabel(getStatus(selectedLog))}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Resource
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatLabel(getResource(selectedLog))}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Resource ID
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-700">
                    {getResourceId(selectedLog) || "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>

                <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                  {getDescription(selectedLog) ||
                    "No description was recorded for this event."}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Event record
                </p>

                <pre className="mt-2 max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminAuditLogs;