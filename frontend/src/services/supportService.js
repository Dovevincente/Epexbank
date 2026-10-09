import api from "./api.js";

/*
 * ============================================================
 * EPEX BANK — SUPPORT SERVICE
 * ============================================================
 *
 * Centralized customer-support API access.
 *
 * No tickets or messages are stored locally as fake data.
 * Ticket state belongs to the backend.
 */

/* ============================================================
   HELPERS
============================================================ */

const unwrap = (response) => {
  return response?.data ?? response;
};

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (
          item !== undefined &&
          item !== null &&
          item !== ""
        ) {
          searchParams.append(key, String(item));
        }
      });

      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

const requireId = (value, name) => {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

const requirePayload = (
  payload,
  name = "Support data",
) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(`${name} is required.`);
  }

  return payload;
};

/* ============================================================
   ERROR HANDLING
============================================================ */

export const getSupportErrorMessage = (
  error,
  fallback = "Unable to complete the support request.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
};

/* ============================================================
   TICKETS
============================================================ */

/**
 * GET /api/support/tickets
 *
 * List tickets belonging to the authenticated customer.
 */
export const getTickets = async (params = {}) => {
  const response = await api.get(
    `/support/tickets${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const listTickets = getTickets;

/**
 * GET /api/support/tickets/:ticketId
 */
export const getTicket = async (ticketId) => {
  requireId(ticketId, "Ticket ID");

  const response = await api.get(
    `/support/tickets/${encodeURIComponent(
      ticketId,
    )}`,
  );

  return unwrap(response);
};

/**
 * POST /api/support/tickets
 *
 * Create a new support ticket.
 */
export const createTicket = async (payload) => {
  requirePayload(payload, "Ticket data");

  const response = await api.post(
    "/support/tickets",
    payload,
  );

  return unwrap(response);
};

/**
 * PATCH /api/support/tickets/:ticketId
 *
 * Update eligible customer-owned ticket fields.
 */
export const updateTicket = async (
  ticketId,
  payload,
) => {
  requireId(ticketId, "Ticket ID");
  requirePayload(payload, "Ticket update data");

  const response = await api.patch(
    `/support/tickets/${encodeURIComponent(
      ticketId,
    )}`,
    payload,
  );

  return unwrap(response);
};

/* ============================================================
   TICKET MESSAGES
============================================================ */

/**
 * GET /api/support/tickets/:ticketId/messages
 */
export const getTicketMessages = async (
  ticketId,
  params = {},
) => {
  requireId(ticketId, "Ticket ID");

  const response = await api.get(
    `/support/tickets/${encodeURIComponent(
      ticketId,
    )}/messages${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * POST /api/support/tickets/:ticketId/messages
 *
 * Add a customer reply to an existing ticket.
 */
export const replyToTicket = async (
  ticketId,
  payload,
) => {
  requireId(ticketId, "Ticket ID");
  requirePayload(payload, "Reply data");

  const response = await api.post(
    `/support/tickets/${encodeURIComponent(
      ticketId,
    )}/messages`,
    payload,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const addTicketMessage = replyToTicket;

/* ============================================================
   TICKET STATUS
============================================================ */

/**
 * POST /api/support/tickets/:ticketId/close
 */
export const closeTicket = async (ticketId) => {
  requireId(ticketId, "Ticket ID");

  const response = await api.post(
    `/support/tickets/${encodeURIComponent(
      ticketId,
    )}/close`,
  );

  return unwrap(response);
};

/**
 * POST /api/support/tickets/:ticketId/reopen
 */
export const reopenTicket = async (ticketId) => {
  requireId(ticketId, "Ticket ID");

  const response = await api.post(
    `/support/tickets/${encodeURIComponent(
      ticketId,
    )}/reopen`,
  );

  return unwrap(response);
};

/**
 * POST /api/support/tickets/:ticketId/cancel
 */
export const cancelTicket = async (ticketId) => {
  requireId(ticketId, "Ticket ID");

  const response = await api.post(
    `/support/tickets/${encodeURIComponent(
      ticketId,
    )}/cancel`,
  );

  return unwrap(response);
};

/* ============================================================
   FAQ / SUPPORT INFORMATION
============================================================ */

/**
 * GET /api/support/faq
 */
export const getFaq = async (params = {}) => {
  const response = await api.get(
    `/support/faq${buildQuery(params)}`,
  );

  return unwrap(response);
};

/**
 * Alias.
 */
export const getFAQs = getFaq;

/**
 * GET /api/support/categories
 */
export const getSupportCategories = async (
  params = {},
) => {
  const response = await api.get(
    `/support/categories${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

const supportService = {
  getTickets,
  listTickets,
  getTicket,
  createTicket,
  updateTicket,

  getTicketMessages,
  replyToTicket,
  addTicketMessage,

  closeTicket,
  reopenTicket,
  cancelTicket,

  getFaq,
  getFAQs,
  getSupportCategories,

  getSupportErrorMessage,
};

export default supportService;