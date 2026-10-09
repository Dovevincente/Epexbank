// ============================================================
// EPEX BANK - SUPPORT SERVICE
// ============================================================
// Customer support ticket lifecycle.
//
// Supported by the current Prisma schema:
//
// SupportTicket
// - id
// - userId
// - subject
// - description
// - status
// - priority
// - createdAt
// - updatedAt
//
// AuditLog
// - userId
// - adminId
// - action
// - entity
// - entityId
// - description
// - metadata
// - ipAddress
// - createdAt
//
// IMPORTANT:
// There is currently no SupportMessage/SupportReply model in
// the Prisma schema. Therefore this service does not pretend
// to support threaded messages until such a model exists.
// ============================================================

import prisma from "../config/database.js";
import logger from "../utils/logger.js";

// ============================================================
// CONSTANTS
// ============================================================

const SUPPORT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

const SUPPORT_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

// ============================================================
// HELPERS
// ============================================================

function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeStatus(value) {
  return normalizeString(value).toUpperCase();
}

function normalizePriority(value) {
  return normalizeString(value).toUpperCase();
}

function assertValidStatus(status) {
  if (!SUPPORT_STATUSES.includes(status)) {
    const error = new Error(
      `Invalid support ticket status. Allowed values: ${SUPPORT_STATUSES.join(
        ", "
      )}`
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertValidPriority(priority) {
  if (!SUPPORT_PRIORITIES.includes(priority)) {
    const error = new Error(
      `Invalid support ticket priority. Allowed values: ${SUPPORT_PRIORITIES.join(
        ", "
      )}`
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertRequiredText(value, fieldName) {
  const normalized = normalizeString(value);

  if (!normalized) {
    const error = new Error(`${fieldName} is required.`);
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function getPagination(input = {}) {
  const page = Math.max(
    1,
    Number.parseInt(input.page, 10) || 1
  );

  const requestedLimit = Number.parseInt(input.limit, 10) || 20;

  const limit = Math.min(
    Math.max(requestedLimit, 1),
    100
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function serializeTicket(ticket) {
  if (!ticket) {
    return null;
  }

  return {
    id: ticket.id,
    userId: ticket.userId,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function buildPagination({
  page,
  limit,
  total,
}) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

async function createAuditLog({
  userId = null,
  adminId = null,
  action,
  entityId,
  description,
  metadata = {},
  ipAddress = null,
  tx = prisma,
}) {
  return tx.auditLog.create({
    data: {
      userId,
      adminId,
      action,
      entity: "SupportTicket",
      entityId,
      description,
      metadata,
      ipAddress,
    },
  });
}

// ============================================================
// CREATE SUPPORT TICKET
// ============================================================

export async function createSupportTicket({
  userId,
  subject,
  description,
  priority = "NORMAL",
  ipAddress = null,
}) {
  const normalizedUserId = assertRequiredText(
    userId,
    "User ID"
  );

  const normalizedSubject = assertRequiredText(
    subject,
    "Subject"
  );

  const normalizedDescription = assertRequiredText(
    description,
    "Description"
  );

  const normalizedPriority = normalizePriority(priority);

  assertValidPriority(normalizedPriority);

  if (normalizedSubject.length > 200) {
    const error = new Error(
      "Support ticket subject cannot exceed 200 characters."
    );

    error.statusCode = 400;
    throw error;
  }

  if (normalizedDescription.length > 10000) {
    const error = new Error(
      "Support ticket description cannot exceed 10,000 characters."
    );

    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: normalizedUserId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          userId: normalizedUserId,
          subject: normalizedSubject,
          description: normalizedDescription,
          status: "OPEN",
          priority: normalizedPriority,
        },
      });

      await createAuditLog({
        userId: normalizedUserId,
        action: "CREATE",
        entityId: ticket.id,
        description: "Customer created a support ticket.",
        metadata: {
          subject: normalizedSubject,
          priority: normalizedPriority,
        },
        ipAddress,
        tx,
      });

      return ticket;
    },
    {
      isolationLevel: "ReadCommitted",
    }
  );

  logger.info("Support ticket created", {
    ticketId: result.id,
    userId: normalizedUserId,
    priority: normalizedPriority,
  });

  return serializeTicket(result);
}

// ============================================================
// GET CUSTOMER SUPPORT TICKET
// ============================================================

export async function getSupportTicket({
  ticketId,
  userId,
}) {
  const normalizedTicketId = assertRequiredText(
    ticketId,
    "Ticket ID"
  );

  const normalizedUserId = assertRequiredText(
    userId,
    "User ID"
  );

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: normalizedTicketId,
      userId: normalizedUserId,
    },
  });

  if (!ticket) {
    const error = new Error(
      "Support ticket not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeTicket(ticket);
}

// ============================================================
// GET CUSTOMER SUPPORT TICKETS
// ============================================================

export async function getUserSupportTickets({
  userId,
  page,
  limit,
  status,
  priority,
}) {
  const normalizedUserId = assertRequiredText(
    userId,
    "User ID"
  );

  const pagination = getPagination({
    page,
    limit,
  });

  const where = {
    userId: normalizedUserId,
  };

  if (status) {
    const normalizedStatus = normalizeStatus(status);

    assertValidStatus(normalizedStatus);

    where.status = normalizedStatus;
  }

  if (priority) {
    const normalizedPriority = normalizePriority(priority);

    assertValidPriority(normalizedPriority);

    where.priority = normalizedPriority;
  }

  const [tickets, total] = await prisma.$transaction([
    prisma.supportTicket.findMany({
      where,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      skip: pagination.skip,
      take: pagination.limit,
    }),

    prisma.supportTicket.count({
      where,
    }),
  ]);

  return {
    tickets: tickets.map(serializeTicket),
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  };
}

// ============================================================
// UPDATE CUSTOMER TICKET
// ============================================================
// Customers are allowed to update the subject, description and
// priority of their own ticket only while it is OPEN.
//
// This prevents customers from rewriting closed support records.
// ============================================================

export async function updateCustomerSupportTicket({
  ticketId,
  userId,
  subject,
  description,
  priority,
  ipAddress = null,
}) {
  const normalizedTicketId = assertRequiredText(
    ticketId,
    "Ticket ID"
  );

  const normalizedUserId = assertRequiredText(
    userId,
    "User ID"
  );

  const existingTicket =
    await prisma.supportTicket.findFirst({
      where: {
        id: normalizedTicketId,
        userId: normalizedUserId,
      },
    });

  if (!existingTicket) {
    const error = new Error(
      "Support ticket not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (existingTicket.status !== "OPEN") {
    const error = new Error(
      "Only open support tickets can be edited."
    );

    error.statusCode = 400;
    throw error;
  }

  const data = {};

  if (subject !== undefined) {
    const normalizedSubject = assertRequiredText(
      subject,
      "Subject"
    );

    if (normalizedSubject.length > 200) {
      const error = new Error(
        "Support ticket subject cannot exceed 200 characters."
      );

      error.statusCode = 400;
      throw error;
    }

    data.subject = normalizedSubject;
  }

  if (description !== undefined) {
    const normalizedDescription = assertRequiredText(
      description,
      "Description"
    );

    if (normalizedDescription.length > 10000) {
      const error = new Error(
        "Support ticket description cannot exceed 10,000 characters."
      );

      error.statusCode = 400;
      throw error;
    }

    data.description = normalizedDescription;
  }

  if (priority !== undefined) {
    const normalizedPriority = normalizePriority(
      priority
    );

    assertValidPriority(normalizedPriority);

    data.priority = normalizedPriority;
  }

  if (Object.keys(data).length === 0) {
    const error = new Error(
      "No support ticket changes were provided."
    );

    error.statusCode = 400;
    throw error;
  }

  const updatedTicket = await prisma.$transaction(
    async (tx) => {
      const ticket = await tx.supportTicket.update({
        where: {
          id: normalizedTicketId,
        },
        data,
      });

      await createAuditLog({
        userId: normalizedUserId,
        action: "UPDATE",
        entityId: normalizedTicketId,
        description: "Customer updated a support ticket.",
        metadata: {
          changes: data,
        },
        ipAddress,
        tx,
      });

      return ticket;
    }
  );

  logger.info("Support ticket updated by customer", {
    ticketId: normalizedTicketId,
    userId: normalizedUserId,
  });

  return serializeTicket(updatedTicket);
}

// ============================================================
// ADMIN - GET ALL SUPPORT TICKETS
// ============================================================

export async function getAllSupportTickets({
  page,
  limit,
  status,
  priority,
  userId,
}) {
  const pagination = getPagination({
    page,
    limit,
  });

  const where = {};

  if (status) {
    const normalizedStatus = normalizeStatus(status);

    assertValidStatus(normalizedStatus);

    where.status = normalizedStatus;
  }

  if (priority) {
    const normalizedPriority = normalizePriority(
      priority
    );

    assertValidPriority(normalizedPriority);

    where.priority = normalizedPriority;
  }

  if (userId) {
    where.userId = normalizeString(userId);
  }

  const [tickets, total] = await prisma.$transaction([
    prisma.supportTicket.findMany({
      where,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      skip: pagination.skip,
      take: pagination.limit,
    }),

    prisma.supportTicket.count({
      where,
    }),
  ]);

  return {
    tickets: tickets.map(serializeTicket),
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  };
}

// ============================================================
// ADMIN - GET TICKET BY ID
// ============================================================

export async function getSupportTicketById({
  ticketId,
}) {
  const normalizedTicketId = assertRequiredText(
    ticketId,
    "Ticket ID"
  );

  const ticket =
    await prisma.supportTicket.findUnique({
      where: {
        id: normalizedTicketId,
      },
    });

  if (!ticket) {
    const error = new Error(
      "Support ticket not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeTicket(ticket);
}

// ============================================================
// ADMIN - UPDATE STATUS
// ============================================================

export async function updateSupportTicketStatus({
  ticketId,
  adminId,
  status,
  ipAddress = null,
}) {
  const normalizedTicketId = assertRequiredText(
    ticketId,
    "Ticket ID"
  );

  const normalizedAdminId = assertRequiredText(
    adminId,
    "Admin ID"
  );

  const normalizedStatus = normalizeStatus(status);

  assertValidStatus(normalizedStatus);

  const admin = await prisma.user.findUnique({
    where: {
      id: normalizedAdminId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!admin) {
    const error = new Error("Admin user not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingTicket =
    await prisma.supportTicket.findUnique({
      where: {
        id: normalizedTicketId,
      },
    });

  if (!existingTicket) {
    const error = new Error(
      "Support ticket not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (existingTicket.status === normalizedStatus) {
    return serializeTicket(existingTicket);
  }

  const updatedTicket = await prisma.$transaction(
    async (tx) => {
      const ticket = await tx.supportTicket.update({
        where: {
          id: normalizedTicketId,
        },
        data: {
          status: normalizedStatus,
        },
      });

      await createAuditLog({
        adminId: normalizedAdminId,
        action: "UPDATE",
        entityId: normalizedTicketId,
        description:
          "Administrator updated support ticket status.",
        metadata: {
          previousStatus: existingTicket.status,
          newStatus: normalizedStatus,
        },
        ipAddress,
        tx,
      });

      return ticket;
    }
  );

  logger.info("Support ticket status updated", {
    ticketId: normalizedTicketId,
    adminId: normalizedAdminId,
    previousStatus: existingTicket.status,
    newStatus: normalizedStatus,
  });

  return serializeTicket(updatedTicket);
}

// ============================================================
// ADMIN - UPDATE PRIORITY
// ============================================================

export async function updateSupportTicketPriority({
  ticketId,
  adminId,
  priority,
  ipAddress = null,
}) {
  const normalizedTicketId = assertRequiredText(
    ticketId,
    "Ticket ID"
  );

  const normalizedAdminId = assertRequiredText(
    adminId,
    "Admin ID"
  );

  const normalizedPriority = normalizePriority(
    priority
  );

  assertValidPriority(normalizedPriority);

  const existingTicket =
    await prisma.supportTicket.findUnique({
      where: {
        id: normalizedTicketId,
      },
    });

  if (!existingTicket) {
    const error = new Error(
      "Support ticket not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (existingTicket.priority === normalizedPriority) {
    return serializeTicket(existingTicket);
  }

  const updatedTicket = await prisma.$transaction(
    async (tx) => {
      const ticket = await tx.supportTicket.update({
        where: {
          id: normalizedTicketId,
        },
        data: {
          priority: normalizedPriority,
        },
      });

      await createAuditLog({
        adminId: normalizedAdminId,
        action: "UPDATE",
        entityId: normalizedTicketId,
        description:
          "Administrator updated support ticket priority.",
        metadata: {
          previousPriority: existingTicket.priority,
          newPriority: normalizedPriority,
        },
        ipAddress,
        tx,
      });

      return ticket;
    }
  );

  logger.info("Support ticket priority updated", {
    ticketId: normalizedTicketId,
    adminId: normalizedAdminId,
    previousPriority: existingTicket.priority,
    newPriority: normalizedPriority,
  });

  return serializeTicket(updatedTicket);
}

// ============================================================
// ADMIN - UPDATE STATUS AND PRIORITY
// ============================================================

export async function updateSupportTicket({
  ticketId,
  adminId,
  status,
  priority,
  ipAddress = null,
}) {
  const normalizedTicketId = assertRequiredText(
    ticketId,
    "Ticket ID"
  );

  const normalizedAdminId = assertRequiredText(
    adminId,
    "Admin ID"
  );

  const existingTicket =
    await prisma.supportTicket.findUnique({
      where: {
        id: normalizedTicketId,
      },
    });

  if (!existingTicket) {
    const error = new Error(
      "Support ticket not found."
    );

    error.statusCode = 404;
    throw error;
  }

  const data = {};
  const auditChanges = {};

  if (status !== undefined) {
    const normalizedStatus = normalizeStatus(status);

    assertValidStatus(normalizedStatus);

    if (normalizedStatus !== existingTicket.status) {
      data.status = normalizedStatus;

      auditChanges.previousStatus =
        existingTicket.status;

      auditChanges.newStatus =
        normalizedStatus;
    }
  }

  if (priority !== undefined) {
    const normalizedPriority = normalizePriority(
      priority
    );

    assertValidPriority(normalizedPriority);

    if (
      normalizedPriority !== existingTicket.priority
    ) {
      data.priority = normalizedPriority;

      auditChanges.previousPriority =
        existingTicket.priority;

      auditChanges.newPriority =
        normalizedPriority;
    }
  }

  if (Object.keys(data).length === 0) {
    return serializeTicket(existingTicket);
  }

  const updatedTicket = await prisma.$transaction(
    async (tx) => {
      const ticket = await tx.supportTicket.update({
        where: {
          id: normalizedTicketId,
        },
        data,
      });

      await createAuditLog({
        adminId: normalizedAdminId,
        action: "UPDATE",
        entityId: normalizedTicketId,
        description:
          "Administrator updated support ticket.",
        metadata: auditChanges,
        ipAddress,
        tx,
      });

      return ticket;
    }
  );

  logger.info("Support ticket updated by administrator", {
    ticketId: normalizedTicketId,
    adminId: normalizedAdminId,
    changes: auditChanges,
  });

  return serializeTicket(updatedTicket);
}

// ============================================================
// ADMIN - RESOLVE TICKET
// ============================================================

export async function resolveSupportTicket({
  ticketId,
  adminId,
  ipAddress = null,
}) {
  return updateSupportTicketStatus({
    ticketId,
    adminId,
    status: "RESOLVED",
    ipAddress,
  });
}

// ============================================================
// ADMIN - CLOSE TICKET
// ============================================================

export async function closeSupportTicket({
  ticketId,
  adminId,
  ipAddress = null,
}) {
  return updateSupportTicketStatus({
    ticketId,
    adminId,
    status: "CLOSED",
    ipAddress,
  });
}

// ============================================================
// ADMIN - REOPEN TICKET
// ============================================================

export async function reopenSupportTicket({
  ticketId,
  adminId,
  ipAddress = null,
}) {
  return updateSupportTicketStatus({
    ticketId,
    adminId,
    status: "OPEN",
    ipAddress,
  });
}

// ============================================================
// SUPPORT STATISTICS
// ============================================================

export async function getSupportStatistics() {
  const [
    total,
    open,
    inProgress,
    resolved,
    closed,
    urgent,
    high,
  ] = await prisma.$transaction([
    prisma.supportTicket.count(),

    prisma.supportTicket.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.supportTicket.count({
      where: {
        status: "IN_PROGRESS",
      },
    }),

    prisma.supportTicket.count({
      where: {
        status: "RESOLVED",
      },
    }),

    prisma.supportTicket.count({
      where: {
        status: "CLOSED",
      },
    }),

    prisma.supportTicket.count({
      where: {
        priority: "URGENT",
      },
    }),

    prisma.supportTicket.count({
      where: {
        priority: "HIGH",
      },
    }),
  ]);

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    urgent,
    high,
  };
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  createSupportTicket,
  getSupportTicket,
  getUserSupportTickets,
  updateCustomerSupportTicket,
  getAllSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
  updateSupportTicketPriority,
  updateSupportTicket,
  resolveSupportTicket,
  closeSupportTicket,
  reopenSupportTicket,
  getSupportStatistics,
};