import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Headphones,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api.js";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const getTicketFromResponse = (payload) =>
  payload?.ticket ||
  payload?.data?.ticket ||
  payload?.data ||
  payload ||
  null;

const getStatus = (ticket) =>
  String(
    ticket?.status ||
      ticket?.ticketStatus ||
      ticket?.state ||
      "OPEN",
  ).toUpperCase();

const getCategory = (ticket) =>
  ticket?.category ||
  ticket?.type ||
  ticket?.topic ||
  "GENERAL";

const getSubject = (ticket) =>
  ticket?.subject ||
  ticket?.title ||
  "Support request";

const getMessage = (ticket) =>
  ticket?.message ||
  ticket?.description ||
  ticket?.content ||
  "";

const getCreatedAt = (ticket) =>
  ticket?.createdAt ||
  ticket?.created_at ||
  ticket?.dateCreated ||
  ticket?.created ||
  null;

const getUpdatedAt = (ticket) =>
  ticket?.updatedAt ||
  ticket?.updated_at ||
  ticket?.lastUpdated ||
  ticket?.modifiedAt ||
  null;

const getTicketReference = (ticket) =>
  ticket?.ticketNumber ||
  ticket?.reference ||
  ticket?.ticketReference ||
  ticket?.code ||
  ticket?.id ||
  "—";

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getStatusMeta = (status) => {
  switch (status) {
    case "RESOLVED":
    case "CLOSED":
      return {
        label: status === "CLOSED" ? "Closed" : "Resolved",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };

    case "IN_PROGRESS":
    case "PROCESSING":
    case "PENDING_REVIEW":
      return {
        label:
          status === "PENDING_REVIEW"
            ? "Pending review"
            : "In progress",
        className:
          "border-blue-200 bg-blue-50 text-blue-700",
        icon: Clock3,
      };

    case "CANCELLED":
    case "REJECTED":
      return {
        label:
          status === "CANCELLED"
            ? "Cancelled"
            : "Rejected",
        className:
          "border-red-200 bg-red-50 text-red-700",
        icon: XCircle,
      };

    default:
      return {
        label: "Open",
        className:
          "border-amber-200 bg-amber-50 text-amber-700",
        icon: MessageSquare,
      };
  }
};

const normalizeReplies = (ticket) => {
  const replies =
    ticket?.replies ||
    ticket?.messages ||
    ticket?.responses ||
    ticket?.comments ||
    [];

  if (!Array.isArray(replies)) {
    return [];
  }

  return replies;
};

const getReplyMessage = (reply) =>
  reply?.message ||
  reply?.content ||
  reply?.body ||
  reply?.text ||
  "";

const getReplyAuthor = (reply) =>
  reply?.authorName ||
  reply?.agentName ||
  reply?.userName ||
  reply?.author?.name ||
  reply?.agent?.name ||
  reply?.user?.name ||
  (reply?.isStaff || reply?.isAgent
    ? "Epex Bank Support"
    : "You");

const isStaffReply = (reply) =>
  Boolean(
    reply?.isStaff ||
      reply?.isAgent ||
      reply?.authorType === "STAFF" ||
      reply?.authorType === "ADMIN" ||
      reply?.senderType === "STAFF" ||
      reply?.senderType === "ADMIN",
  );

const TicketDetails = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /*
   * IMPORTANT:
   * "new" is not a real ticket ID.
   *
   * If the application ever reaches TicketDetails with
   * /support/tickets/new, immediately send the user to
   * the actual create-ticket page instead of calling:
   *
   * GET /api/support/tickets/new
   */
  useEffect(() => {
    if (String(ticketId || "").trim().toLowerCase() === "new") {
      navigate("/support/create", { replace: true });
    }
  }, [ticketId, navigate]);

  const fetchTicket = useCallback(
    async ({ silent = false } = {}) => {
      const normalizedTicketId = String(ticketId || "").trim();

      /*
       * Never request /support/tickets/new from the API.
       */
      if (
        !normalizedTicketId ||
        normalizedTicketId.toLowerCase() === "new"
      ) {
        setTicket(null);
        setError(
          normalizedTicketId.toLowerCase() === "new"
            ? ""
            : "No support ticket was specified.",
        );
        setLoading(false);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.get(
          `/support/tickets/${encodeURIComponent(
            normalizedTicketId,
          )}`,
        );

        const nextTicket = getTicketFromResponse(
          response?.data,
        );

        if (
          !nextTicket ||
          typeof nextTicket !== "object"
        ) {
          throw new Error(
            "The support ticket could not be found.",
          );
        }

        setTicket(nextTicket);
      } catch (requestError) {
        setTicket(null);

        setError(
          getErrorMessage(
            requestError,
            "Unable to load this support ticket.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ticketId],
  );

  useEffect(() => {
    /*
     * Do not fetch when the route is the create-ticket route.
     */
    if (
      String(ticketId || "").trim().toLowerCase() ===
      "new"
    ) {
      return;
    }

    fetchTicket();
  }, [fetchTicket, ticketId]);

  const status = useMemo(
    () => getStatus(ticket),
    [ticket],
  );

  const statusMeta = useMemo(
    () => getStatusMeta(status),
    [status],
  );

  const StatusIcon = statusMeta.icon;

  const replies = useMemo(
    () => normalizeReplies(ticket),
    [ticket],
  );

  const category = getCategory(ticket);
  const subject = getSubject(ticket);
  const message = getMessage(ticket);
  const reference = getTicketReference(ticket);
  const createdAt = getCreatedAt(ticket);
  const updatedAt = getUpdatedAt(ticket);

  if (
    String(ticketId || "").trim().toLowerCase() ===
    "new"
  ) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
              <Loader2
                size={23}
                className="animate-spin"
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              Loading support ticket...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Please wait while we retrieve the latest details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft size={17} />
            Back to support
          </button>

          <div className="rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle size={23} />
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-950">
              Unable to load ticket
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                "The requested support ticket could not be found."}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => fetchTicket()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <RefreshCw size={16} />
                Try again
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/support")
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                Support
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/support")}
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="Back to support"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <Headphones
                  size={20}
                  className="text-blue-700"
                />

                <span className="text-sm font-semibold text-blue-700">
                  Epex Bank Support
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Support ticket
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Review your support request and its current status.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              fetchTicket({ silent: true })
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {category}
                    </p>

                    <h2 className="mt-2 break-words text-xl font-bold text-slate-950">
                      {subject}
                    </h2>
                  </div>

                  <div
                    className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusMeta.className}`}
                  >
                    <StatusIcon size={14} />
                    {statusMeta.label}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <div className="grid gap-4 border-b border-slate-100 pb-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Ticket reference
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                      {reference}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Category
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {category}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDateTime(createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Last updated
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDateTime(
                        updatedAt || createdAt,
                      )}
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare
                      size={17}
                      className="text-blue-700"
                    />

                    <h3 className="text-sm font-semibold text-slate-950">
                      Your request
                    </h3>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 sm:p-5">
                    {message ? (
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {message}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No message was provided with this ticket.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <MessageSquare size={19} />
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-950">
                      Conversation
                    </h2>

                    <p className="text-sm text-slate-500">
                      Responses and updates from support.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                {replies.length > 0 ? (
                  <div className="space-y-5">
                    {replies.map((reply, index) => {
                      const staff = isStaffReply(reply);
                      const replyMessage =
                        getReplyMessage(reply);

                      return (
                        <div
                          key={
                            reply?.id ||
                            `${ticketId}-reply-${index}`
                          }
                          className={`flex gap-3 ${
                            staff
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          {staff ? (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <Headphones size={16} />
                            </div>
                          ) : null}

                          <div
                            className={`max-w-2xl rounded-2xl p-4 ${
                              staff
                                ? "border border-slate-200 bg-white"
                                : "bg-blue-700 text-white"
                            }`}
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`text-xs font-semibold ${
                                  staff
                                    ? "text-slate-800"
                                    : "text-white"
                                }`}
                              >
                                {getReplyAuthor(reply)}
                              </span>

                              {reply?.createdAt ||
                              reply?.created_at ? (
                                <span
                                  className={`text-[11px] ${
                                    staff
                                      ? "text-slate-400"
                                      : "text-blue-100"
                                  }`}
                                >
                                  {formatDateTime(
                                    reply?.createdAt ||
                                      reply?.created_at,
                                  )}
                                </span>
                              ) : null}
                            </div>

                            <p
                              className={`whitespace-pre-wrap text-sm leading-6 ${
                                staff
                                  ? "text-slate-600"
                                  : "text-white"
                              }`}
                            >
                              {replyMessage ||
                                "No message content."}
                            </p>
                          </div>

                          {!staff ? (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <UserRound size={16} />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                      <MessageSquare size={19} />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-slate-900">
                      No responses yet
                    </h3>

                    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                      Your request has been received. Any available
                      support response will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {status !== "CLOSED" &&
            status !== "RESOLVED" ? (
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <MessageSquare
                    size={19}
                    className="mt-0.5 shrink-0 text-blue-700"
                  />

                  <div>
                    <h3 className="text-sm font-semibold text-blue-950">
                      Need to provide more information?
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-blue-800">
                      If your issue requires additional information,
                      you can create a follow-up support request.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigate("/support/create")
                      }
                      className="mt-3 text-xs font-semibold text-blue-700 underline underline-offset-2"
                    >
                      Create follow-up ticket
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </main>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FileText size={18} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Ticket information
                  </h2>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Status
                      </p>

                      <div
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                      >
                        <StatusIcon size={13} />
                        {statusMeta.label}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Reference
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                        {reference}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Category
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {category}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Security reminder
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Never send your password, card PIN, OTP or
                    authentication codes in a support conversation.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/support/faq")}
              className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Need general help?
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Browse frequently asked questions.
                  </p>
                </div>

                <ArrowLeft
                  size={17}
                  className="rotate-180 text-slate-400"
                />
              </div>
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;