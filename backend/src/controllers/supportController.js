import {
  createSupportTicket,
  getUserSupportTickets,
  getSupportTicket,
  updateCustomerSupportTicket,
} from "../services/supportService.js";

const getUserId = (req) => {
  if (!req.user?.id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return req.user.id;
};

const getRequestIp = (req) => {
  return (
    req.ip ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
};

const getTicketId = (req) => {
  const ticketId = String(
    req.params?.ticketId || "",
  ).trim();

  if (!ticketId) {
    const error = new Error("Ticket ID is required");
    error.statusCode = 400;
    throw error;
  }

  return ticketId;
};

/* =========================================================
   CREATE SUPPORT TICKET
========================================================= */

export const createTicket = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      subject,
      description,
      priority,
    } = req.body || {};

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Support ticket subject is required",
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message:
          "Support ticket description is required",
      });
    }

    const ticket = await createSupportTicket({
      userId,
      subject,
      description,
      priority,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   LIST CUSTOMER SUPPORT TICKETS
========================================================= */

export const listTickets = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const result =
      await getUserSupportTickets({
        userId,
        ...(req.query || {}),
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET CUSTOMER SUPPORT TICKET
========================================================= */

export const getTicket = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ticketId = getTicketId(req);

    const ticket = await getSupportTicket({
      userId,
      ticketId,
    });

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   UPDATE CUSTOMER SUPPORT TICKET
========================================================= */

export const updateTicket = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ticketId = getTicketId(req);
    const ipAddress = getRequestIp(req);

    const {
      subject,
      description,
      priority,
    } = req.body || {};

    if (
      subject === undefined &&
      description === undefined &&
      priority === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "No ticket changes supplied",
      });
    }

    const ticket =
      await updateCustomerSupportTicket({
        userId,
        ticketId,
        subject,
        description,
        priority,
        ipAddress,
      });

    return res.status(200).json({
      success: true,
      message: "Support ticket updated successfully",
      data: ticket,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   CLOSE CUSTOMER SUPPORT TICKET
=========================================================

   The current support service does not expose a
   customer-specific close function.

   Therefore this endpoint intentionally returns a clear
   error instead of incorrectly calling the admin-only
   closeSupportTicket() service with a customer userId.
========================================================= */

export const closeTicket = async (
  req,
  res,
  next,
) => {
  try {
    getUserId(req);
    getTicketId(req);

    return res.status(403).json({
      success: false,
      message:
        "Customers cannot directly close support tickets. Please wait for support to resolve or close the ticket.",
    });
  } catch (error) {
    return next(error);
  }
};