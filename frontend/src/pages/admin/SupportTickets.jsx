import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.tickets)) return payload.tickets;
  if (Array.isArray(payload?.supportTickets)) return payload.supportTickets;
  if (Array.isArray(payload?.requests)) return payload.requests;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;

  if (Array.isArray(payload?.data?.tickets)) {
    return payload.data.tickets;
  }

  if (Array.isArray(payload?.data?.supportTickets)) {
    return payload.data.supportTickets;
  }

  if (Array.isArray(payload?.data?.requests)) {
    return payload.data.requests;
  }

  if (Array.isArray(payload?.data?.results)) {
    return payload.data.results;
  }

  return [];
};

const normalizeStatus = (value) => {
  const status = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    status === "NEW" ||
    status === "SUBMITTED" ||
    status === "AWAITING_RESPONSE"
  ) {
    return "OPEN";
  }

  if (
    status === "PROCESSING" ||
    status === "WORKING" ||
    status === "ASSIGNED"
  ) {
    return "IN_PROGRESS";
  }

  if (status === "DONE" || status === "SOLVED") {
    return "RESOLVED";
  }

  if (status === "COMPLETED") {
    return "CLOSED";
  }

  return status || "OPEN";
};

const normalizePriority = (value) => {
  const priority = String(value ?? "")
    .trim()
    .toUpperCase();

  if (priority === "MEDIUM") return "NORMAL";

  return priority || "NORMAL";
};

const getCustomer = (ticket) =>
  ticket?.user ||
  ticket?.customer ||
  ticket?.requester ||
  ticket?.createdBy ||
  {};

const getCustomerName = (ticket) => {
  const customer = getCustomer(ticket);

  return (
    customer?.name ||
    customer?.fullName ||
    [customer?.firstName, customer?.lastName]
      .filter(Boolean)
      .join(" ") ||
    ticket?.customerName ||
    ticket?.requesterName ||
    "Customer"
  );
};

const getCustomerEmail = (ticket) => {
  const customer = getCustomer(ticket);

  return (
    customer?.email ||
    ticket?.email ||
    ticket?.customerEmail ||
    ticket?.requesterEmail ||
    "—"
  );
};

const getTicketId = (ticket) =>
  ticket?.id ||
  ticket?.ticketId ||
  ticket?.reference ||
  ticket?.ticketNumber ||
  "";

const getSubject = (ticket) =>
  ticket?.subject ||
  ticket?.title ||
  ticket?.summary ||
  "Support request";

const getMessage = (ticket) =>
  ticket?.message ||
  ticket?.description ||
  ticket?.body ||
  ticket?.details ||
  "";

const getCategory = (ticket) =>
  ticket?.category ||
  ticket?.topic ||
  ticket?.department ||
  "General";

const getPriority = (ticket) =>
  normalizePriority(
    ticket?.priority ||
      ticket?.urgency ||
      ticket?.severity,
  );

const getCreatedAt = (ticket) =>
  ticket?.createdAt ||
  ticket?.submittedAt ||
  ticket?.openedAt ||
  ticket?.created_at ||
  null;

const getUpdatedAt = (ticket) =>
  ticket?.updatedAt ||
  ticket?.lastUpdatedAt ||
  ticket?.modifiedAt ||
  null;

const getAssignedAgent = (ticket) =>
  ticket?.assignedTo ||
  ticket?.assignedAgent ||
  ticket?.assignee ||
  ticket?.staff ||
  null;

const getAgentName = (ticket) => {
  const agent = getAssignedAgent(ticket);

  if (!agent) return "Unassigned";

  if (typeof agent === "string") return agent;

  return (
    agent?.name ||
    agent?.fullName ||
    [agent?.firstName, agent?.lastName]
      .filter(Boolean)
      .join(" ") ||
    agent?.email ||
    "Assigned"
  );
};

const getStatusMeta = (status) => {
  switch (normalizeStatus(status)) {
    case "RESOLVED":
      return {
        label: "Resolved",
        icon: CheckCircle2,
        className:
          "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      };

    case "CLOSED":
      return {
        label: "Closed",
        icon: CheckCircle2,
        className:
          "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
      };

    case "IN_PROGRESS":
      return {
        label: "In progress",
        icon: Clock3,
        className:
          "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
      };

    case "PENDING":
      return {
        label: "Pending",
        icon: Clock3,
        className:
          "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      };

    default:
      return {
        label: "Open",
        icon: MessageSquare,
        className:
          "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
      };
  }
};

const getPriorityMeta = (priority) => {
  switch (normalizePriority(priority)) {
    case "URGENT":
      return {
        label: "Urgent",
        className:
          "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      };

    case "HIGH":
      return {
        label: "High",
        className:
          "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
      };

    case "LOW":
      return {
        label: "Low",
        className:
          "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
      };

    default:
      return {
        label: "Normal",
        className:
          "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
      };
  }
};

const getPagination = (payload) => {
  const pagination =
    payload?.pagination ||
    payload?.meta?.pagination ||
    payload?.meta ||
    {};

  return {
    nextCursor:
      pagination?.nextCursor ||
      pagination?.next_cursor ||
      payload?.nextCursor ||
      payload?.next_cursor ||
      null,
    hasNextPage: Boolean(
      pagination?.hasNextPage ??
        pagination?.has_next_page ??
        payload?.hasNextPage ??
        payload?.has_next_page,
    ),
    total:
      pagination?.total ??
      payload?.total ??
      payload?.count ??
      null,
  };
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatRelativeDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(value);
};

const AdminSupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(null);

  const loadTickets = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      if (append) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = {
          limit: PAGE_SIZE,
        };

        if (status !== "ALL") {
          params.status = status;
        }

        if (priority !== "ALL") {
          params.priority = priority;
        }

        if (cursor) {
          params.cursor = cursor;
        }

        const trimmedSearch = search.trim();

        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        const response = await api.get("/admin/support/tickets", {
          params,
        });

        const payload = response?.data;
        const incomingTickets = normalizeCollection(payload);
        const pagination = getPagination(payload);

        setTickets((current) =>
          append ? [...current, ...incomingTickets] : incomingTickets,
        );

        setNextCursor(pagination.nextCursor);

        setHasNextPage(
          Boolean(
            pagination.hasNextPage ||
              pagination.nextCursor ||
              incomingTickets.length === PAGE_SIZE,
          ),
        );

        setTotal(pagination.total);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load support tickets.";

        setError(message);

        if (!append) {
          setTickets([]);
          setNextCursor(null);
          setHasNextPage(false);
          setTotal(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [priority, search, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTickets();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (
        status !== "ALL" &&
        normalizeStatus(ticket?.status) !== status
      ) {
        return false;
      }

      if (
        priority !== "ALL" &&
        normalizePriority(ticket?.priority) !== priority
      ) {
        return false;
      }

      if (!query) return true;

      const customer = getCustomer(ticket);

      const values = [
        getTicketId(ticket),
        getSubject(ticket),
        getMessage(ticket),
        getCategory(ticket),
        getCustomerName(ticket),
        getCustomerEmail(ticket),
        customer?.phone,
        ticket?.reference,
      ];

      return values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [priority, search, status, tickets]);

  const summary = useMemo(() => {
    return tickets.reduce(
      (result, ticket) => {
        const normalizedStatus = normalizeStatus(ticket?.status);

        const normalizedPriority = normalizePriority(
          ticket?.priority,
        );

        result.total += 1;

        if (normalizedStatus === "OPEN") result.open += 1;
        if (normalizedStatus === "PENDING") result.pending += 1;
        if (normalizedStatus === "IN_PROGRESS") result.inProgress += 1;
        if (normalizedStatus === "RESOLVED") result.resolved += 1;
        if (normalizedStatus === "CLOSED") result.closed += 1;

        if (normalizedPriority === "URGENT") result.urgent += 1;
        if (normalizedPriority === "HIGH") result.high += 1;

        return result;
      },
      {
        total: 0,
        open: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        urgent: 0,
        high: 0,
      },
    );
  }, [tickets]);

  const handleRefresh = () => {
    loadTickets();
  };

  const handleLoadMore = () => {
    if (!nextCursor || refreshing || loading) return;

    loadTickets({
      append: true,
      cursor: nextCursor,
    });
  };

  const getDetailPath = (ticket) => {
    const id = getTicketId(ticket);

    if (!id) return null;

    return `/admin/support/tickets/${encodeURIComponent(id)}`;
  };

  const summaryCards = [
    {
      label: "Total tickets",
      value: total ?? summary.total,
      icon: MessageSquare,
    },
    {
      label: "Open",
      value: summary.open,
      icon: MessageSquare,
    },
    {
      label: "In progress",
      value: summary.inProgress,
      icon: Clock3,
    },
    {
      label: "Resolved",
      value: summary.resolved,
      icon: CheckCircle2,
    },
    {
      label: "Urgent",
      value: summary.urgent,
      icon: AlertCircle,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <MessageSquare className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Customer service
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Support Tickets
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review and manage customer support requests using live
                  administrative support data.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {summaryCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          {card.label}
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {loading ? "—" : card.value}
                        </p>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, ticket ID, subject or reference"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="relative xl:w-52">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter support tickets by status"
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative xl:w-52">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />

              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                aria-label="Filter support tickets by priority"
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">
                  Unable to load support tickets
                </p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : summary.pending}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Waiting for support action or response.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              In progress
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : summary.inProgress}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Tickets currently being handled.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              High priority
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : summary.high}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              High-priority customer requests.
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-red-600">
              Urgent
            </p>

            <p className="mt-2 text-2xl font-bold text-red-700">
              {loading ? "—" : summary.urgent}
            </p>

            <p className="mt-1 text-xs text-red-600">
              Requires priority administrative attention.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Customer support requests
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredTickets.length} ticket
                {filteredTickets.length === 1 ? "" : "s"} currently loaded
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Protected administrative data
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <MessageSquare className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No support tickets found
              </h3>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                No customer support requests match the current search and
                filters.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Request
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Priority
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Updated
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTickets.map((ticket) => {
                      const id = getTicketId(ticket);
                      const statusMeta = getStatusMeta(ticket?.status);
                      const priorityMeta = getPriorityMeta(
                        ticket?.priority,
                      );
                      const StatusIcon = statusMeta.icon;
                      const detailPath = getDetailPath(ticket);

                      return (
                        <tr
                          key={
                            id ||
                            `${getCustomerEmail(ticket)}-${getCreatedAt(ticket)}`
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {getCustomerName(ticket)}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {getCustomerEmail(ticket)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="max-w-[360px] px-5 py-4">
                            <p className="truncate font-semibold text-slate-800">
                              {getSubject(ticket)}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {getCategory(ticket)} · {id || "No ID"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityMeta.className}`}
                            >
                              {priorityMeta.label}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusMeta.label}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-800">
                              {formatRelativeDate(
                                getUpdatedAt(ticket) ||
                                  getCreatedAt(ticket),
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getAgentName(ticket)}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-right">
                            {detailPath ? (
                              <Link
                                to={detailPath}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4" />
                                Review
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">
                                No ticket ID
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredTickets.map((ticket) => {
                  const id = getTicketId(ticket);
                  const statusMeta = getStatusMeta(ticket?.status);
                  const priorityMeta = getPriorityMeta(
                    ticket?.priority,
                  );
                  const StatusIcon = statusMeta.icon;
                  const detailPath = getDetailPath(ticket);

                  return (
                    <article
                      key={
                        id ||
                        `${getCustomerEmail(ticket)}-${getCreatedAt(ticket)}`
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-slate-900">
                              {getCustomerName(ticket)}
                            </h3>

                            <p className="truncate text-xs text-slate-500">
                              {getCustomerEmail(ticket)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              {getCategory(ticket)}
                            </p>

                            <p className="mt-1 line-clamp-2 font-semibold text-slate-900">
                              {getSubject(ticket)}
                            </p>

                            <p className="mt-1 break-all text-xs text-slate-500">
                              {id || "No ticket ID"}
                            </p>
                          </div>

                          <span
                            className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityMeta.className}`}
                          >
                            {priorityMeta.label}
                          </span>
                        </div>

                        {getMessage(ticket) && (
                          <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">
                            {getMessage(ticket)}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>
                            Updated{" "}
                            {formatRelativeDate(
                              getUpdatedAt(ticket) ||
                                getCreatedAt(ticket),
                            )}
                          </span>

                          <span>{getAgentName(ticket)}</span>
                        </div>
                      </div>

                      {detailPath && (
                        <Link
                          to={detailPath}
                          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <Eye className="h-4 w-4" />
                          Review ticket
                        </Link>
                      )}
                    </article>
                  );
                })}
              </div>

              {(hasNextPage || nextCursor) && (
                <div className="border-t border-slate-200 p-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={!nextCursor || refreshing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                    {refreshing ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Support administration
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Customer support records may contain personal and financial
                information. Review, assignment, status changes and responses
                should remain within authorized server-side administrative
                workflows and be recorded in the audit trail.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminSupportTickets;