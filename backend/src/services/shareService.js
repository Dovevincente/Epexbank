import prisma from "../config/database.js";
import {
  toDecimal,
  serializeMoney,
} from "../utils/money.js";
import { generateReference } from "../utils/reference.js";
import logger from "../utils/logger.js";

/* =========================================================
   CONSTANTS
========================================================= */

const ORDER_TYPE = Object.freeze({
  BUY: "BUY",
  SELL: "SELL",
});

const ORDER_STATUS = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

const MIN_QUANTITY = 0.00000001;
const MAX_QUANTITY = 1_000_000_000;
const MAX_SHARE_PRICE = 1_000_000_000;

/* =========================================================
   VALIDATION HELPERS
========================================================= */

function assertUserId(userId) {
  if (!userId || typeof userId !== "string") {
    const error = new Error(
      "A valid user ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertShareId(shareId) {
  if (!shareId || typeof shareId !== "string") {
    const error = new Error(
      "A valid share ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertOrderId(orderId) {
  if (!orderId || typeof orderId !== "string") {
    const error = new Error(
      "A valid share order ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertPositiveQuantity(quantity) {
  const value = Number(quantity);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    const error = new Error(
      "Share quantity must be greater than zero."
    );

    error.statusCode = 400;
    throw error;
  }

  if (value < MIN_QUANTITY) {
    const error = new Error(
      `Share quantity must be at least ${MIN_QUANTITY}.`
    );

    error.statusCode = 400;
    throw error;
  }

  if (value > MAX_QUANTITY) {
    const error = new Error(
      `Share quantity cannot exceed ${MAX_QUANTITY}.`
    );

    error.statusCode = 400;
    throw error;
  }

  return value;
}

function assertPositivePrice(price) {
  const value = Number(price);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    const error = new Error(
      "Share price must be greater than zero."
    );

    error.statusCode = 400;
    throw error;
  }

  if (value > MAX_SHARE_PRICE) {
    const error = new Error(
      `Share price cannot exceed ${MAX_SHARE_PRICE}.`
    );

    error.statusCode = 400;
    throw error;
  }

  return value;
}

function normalizeOptionalString(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized.length > 0
    ? normalized
    : null;
}

/* =========================================================
   SERIALIZATION
========================================================= */

function serializeShare(share) {
  if (!share) {
    return null;
  }

  return {
    ...share,

    currentPrice:
      serializeMoney(
        share.currentPrice
      ),

    totalShares:
      serializeMoney(
        share.totalShares
      ),

    availableShares:
      serializeMoney(
        share.availableShares
      ),
  };
}

function serializeShareOrder(order) {
  if (!order) {
    return null;
  }

  return {
    ...order,

    quantity:
      serializeMoney(
        order.quantity
      ),

    price:
      serializeMoney(
        order.price
      ),

    total:
      serializeMoney(
        order.total
      ),

    share:
      order.share
        ? serializeShare(
            order.share
          )
        : undefined,
  };
}

function serializeDividend(dividend) {
  if (!dividend) {
    return null;
  }

  return {
    ...dividend,

    amountPerShare:
      serializeMoney(
        dividend.amountPerShare
      ),

    share:
      dividend.share
        ? serializeShare(
            dividend.share
          )
        : undefined,
  };
}

/* =========================================================
   SHARE LISTING
========================================================= */

/**
 * List active shares available through Epex Bank.
 */
export async function listShares({
  page = 1,
  limit = 20,
} = {}) {
  const parsedPage =
    Math.max(
      Number(page) || 1,
      1
    );

  const parsedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

  const where = {
    isActive: true,
  };

  const [
    shares,
    total,
  ] = await prisma.$transaction([
    prisma.share.findMany({
      where,

      orderBy: {
        companyName:
          "asc",
      },

      skip:
        (parsedPage - 1) *
        parsedLimit,

      take:
        parsedLimit,
    }),

    prisma.share.count({
      where,
    }),
  ]);

  return {
    items:
      shares.map(
        serializeShare
      ),

    pagination: {
      page:
        parsedPage,

      limit:
        parsedLimit,

      total,

      totalPages:
        Math.ceil(
          total /
            parsedLimit
        ),
    },
  };
}

/**
 * Get one share.
 */
export async function getShare(
  shareId
) {
  assertShareId(
    shareId
  );

  const share =
    await prisma.share.findUnique({
      where: {
        id:
          shareId,
      },
    });

  if (!share) {
    const error = new Error(
      "Share not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeShare(
    share
  );
}

/* =========================================================
   CREATE BUY ORDER
========================================================= */

/**
 * Create a BUY share order.
 *
 * The order is created as PENDING.
 *
 * No share inventory is permanently transferred and no bank
 * account is debited here. Settlement occurs during the
 * controlled processing workflow.
 */
export async function createBuyOrder({
  userId,
  shareId,
  quantity,
}) {
  assertUserId(userId);
  assertShareId(shareId);

  const numericQuantity =
    assertPositiveQuantity(
      quantity
    );

  return prisma.$transaction(
    async (tx) => {
      const share =
        await tx.share.findUnique({
          where: {
            id:
              shareId,
          },
        });

      if (!share) {
        const error = new Error(
          "Share not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (!share.isActive) {
        const error = new Error(
          "This share is currently unavailable."
        );

        error.statusCode = 400;
        throw error;
      }

      const availableShares =
        toDecimal(
          share.availableShares
        );

      const requestedQuantity =
        toDecimal(
          numericQuantity
        );

      if (
        availableShares.lt(
          requestedQuantity
        )
      ) {
        const error = new Error(
          "Insufficient shares available for purchase."
        );

        error.statusCode = 400;
        throw error;
      }

      const price =
        toDecimal(
          assertPositivePrice(
            share.currentPrice
          )
        );

      const total =
        requestedQuantity.mul(
          price
        );

      const reference =
        await generateShareReference(
          tx
        );

      const order =
        await tx.shareOrder.create({
          data: {
            reference,

            userId,

            shareId,

            type:
              ORDER_TYPE.BUY,

            status:
              ORDER_STATUS.PENDING,

            quantity:
              requestedQuantity,

            price,

            total,
          },

          include: {
            share: true,
          },
        });

      logger.info(
        "Share BUY order created",
        {
          userId,
          shareId,
          orderId:
            order.id,
          reference:
            order.reference,
          quantity:
            numericQuantity,
          total:
            serializeMoney(
              total
            ),
        }
      );

      return serializeShareOrder(
        order
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   CREATE SELL ORDER
========================================================= */

/**
 * Create a SELL order.
 *
 * IMPORTANT:
 * The current Prisma schema does not contain a customer
 * ShareHolding model.
 *
 * Therefore, the service cannot honestly determine a
 * customer's current share ownership from the database.
 *
 * This function is intentionally not allowed to create a
 * sell order until a holdings/ownership model exists.
 */
export async function createSellOrder() {
  const error = new Error(
    "Share selling requires a persistent customer share-holdings model. Add ShareHolding to the Prisma schema before enabling SELL orders."
  );

  error.statusCode = 501;

  throw error;
}

/* =========================================================
   ORDER QUERIES
========================================================= */

/**
 * Get a customer's share orders.
 */
export async function getUserShareOrders({
  userId,
  status,
  type,
  shareId,
  page = 1,
  limit = 20,
}) {
  assertUserId(userId);

  const parsedPage =
    Math.max(
      Number(page) || 1,
      1
    );

  const parsedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

  const where = {
    userId,
  };

  if (status) {
    where.status =
      status;
  }

  if (type) {
    where.type =
      type;
  }

  if (shareId) {
    where.shareId =
      shareId;
  }

  const [
    orders,
    total,
  ] = await prisma.$transaction([
    prisma.shareOrder.findMany({
      where,

      include: {
        share: true,
      },

      orderBy: {
        createdAt:
          "desc",
      },

      skip:
        (parsedPage - 1) *
        parsedLimit,

      take:
        parsedLimit,
    }),

    prisma.shareOrder.count({
      where,
    }),
  ]);

  return {
    items:
      orders.map(
        serializeShareOrder
      ),

    pagination: {
      page:
        parsedPage,

      limit:
        parsedLimit,

      total,

      totalPages:
        Math.ceil(
          total /
            parsedLimit
        ),
    },
  };
}

/**
 * Get one customer's share order.
 */
export async function getUserShareOrder({
  userId,
  orderId,
}) {
  assertUserId(userId);
  assertOrderId(
    orderId
  );

  const order =
    await prisma.shareOrder.findFirst({
      where: {
        id:
          orderId,

        userId,
      },

      include: {
        share: true,
      },
    });

  if (!order) {
    const error = new Error(
      "Share order not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeShareOrder(
    order
  );
}

/* =========================================================
   ORDER PROCESSING
========================================================= */

/**
 * Move a pending share order to PROCESSING.
 */
export async function markOrderProcessing({
  orderId,
  adminUserId,
}) {
  assertOrderId(
    orderId
  );

  assertUserId(
    adminUserId
  );

  return prisma.$transaction(
    async (tx) => {
      const order =
        await tx.shareOrder.findUnique({
          where: {
            id:
              orderId,
          },

          include: {
            share: true,
          },
        });

      if (!order) {
        const error = new Error(
          "Share order not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        order.status !==
        ORDER_STATUS.PENDING
      ) {
        const error = new Error(
          `Share order cannot move to PROCESSING from ${order.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const updated =
        await tx.shareOrder.update({
          where: {
            id:
              order.id,
          },

          data: {
            status:
              ORDER_STATUS.PROCESSING,
          },

          include: {
            share: true,
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            order.userId,

          adminUserId,

          action:
            "UPDATE",

          entity:
            "ShareOrder",

          entityId:
            order.id,

          metadata: {
            action:
              "SHARE_ORDER_PROCESSING",

            previousStatus:
              order.status,

            newStatus:
              updated.status,
          },
        },
      });

      logger.info(
        "Share order moved to processing",
        {
          orderId:
            order.id,

          adminUserId,
        }
      );

      return serializeShareOrder(
        updated
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/**
 * Complete a BUY share order.
 *
 * Inventory is reduced atomically.
 *
 * Actual customer payment settlement must be handled by
 * the core banking transaction layer.
 */
export async function completeBuyOrder({
  orderId,
  adminUserId,
}) {
  assertOrderId(
    orderId
  );

  assertUserId(
    adminUserId
  );

  return prisma.$transaction(
    async (tx) => {
      const order =
        await tx.shareOrder.findUnique({
          where: {
            id:
              orderId,
          },

          include: {
            share: true,
          },
        });

      if (!order) {
        const error = new Error(
          "Share order not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        order.type !==
        ORDER_TYPE.BUY
      ) {
        const error = new Error(
          "This operation only completes BUY orders."
        );

        error.statusCode = 400;
        throw error;
      }

      if (
        order.status !==
        ORDER_STATUS.PROCESSING
      ) {
        const error = new Error(
          `Only PROCESSING orders can be completed. Current status: ${order.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const share =
        await tx.share.findUnique({
          where: {
            id:
              order.shareId,
          },
        });

      if (!share) {
        const error = new Error(
          "Share no longer exists."
        );

        error.statusCode = 404;
        throw error;
      }

      if (!share.isActive) {
        const error = new Error(
          "This share is no longer active."
        );

        error.statusCode = 409;
        throw error;
      }

      const availableShares =
        toDecimal(
          share.availableShares
        );

      const quantity =
        toDecimal(
          order.quantity
        );

      if (
        availableShares.lt(
          quantity
        )
      ) {
        const error = new Error(
          "Insufficient shares available to complete this order."
        );

        error.statusCode = 409;
        throw error;
      }

      const newAvailableShares =
        availableShares.sub(
          quantity
        );

      const updatedShare =
        await tx.share.update({
          where: {
            id:
              share.id,
          },

          data: {
            availableShares:
              newAvailableShares,
          },
        });

      const completed =
        await tx.shareOrder.update({
          where: {
            id:
              order.id,
          },

          data: {
            status:
              ORDER_STATUS.COMPLETED,
          },

          include: {
            share: true,
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            order.userId,

          adminUserId,

          action:
            "UPDATE",

          entity:
            "ShareOrder",

          entityId:
            order.id,

          metadata: {
            action:
              "SHARE_BUY_COMPLETED",

            shareId:
              order.shareId,

            quantity:
              serializeMoney(
                quantity
              ),

            total:
              serializeMoney(
                order.total
              ),

            previousAvailableShares:
              serializeMoney(
                availableShares
              ),

            newAvailableShares:
              serializeMoney(
                newAvailableShares
              ),
          },
        },
      });

      logger.security(
        "Share BUY order completed",
        {
          orderId:
            order.id,

          shareId:
            order.shareId,

          adminUserId,

          quantity:
            serializeMoney(
              quantity
            ),
        }
      );

      return {
        order:
          serializeShareOrder(
            completed
          ),

        share:
          serializeShare(
            updatedShare
          ),
      };
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   FAIL ORDER
========================================================= */

export async function failShareOrder({
  orderId,
  adminUserId,
}) {
  assertOrderId(
    orderId
  );

  assertUserId(
    adminUserId
  );

  const order =
    await prisma.shareOrder.findUnique({
      where: {
        id:
          orderId,
      },

      include: {
        share: true,
      },
    });

  if (!order) {
    const error = new Error(
      "Share order not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (
    ![
      ORDER_STATUS.PENDING,
      ORDER_STATUS.PROCESSING,
    ].includes(
      order.status
    )
  ) {
    const error = new Error(
      `Share order cannot be failed from ${order.status}.`
    );

    error.statusCode = 409;
    throw error;
  }

  const updated =
    await prisma.shareOrder.update({
      where: {
        id:
          order.id,
      },

      data: {
        status:
          ORDER_STATUS.FAILED,
      },

      include: {
        share: true,
      },
    });

  await prisma.auditLog.create({
    data: {
      userId:
        order.userId,

      adminUserId,

      action:
        "UPDATE",

      entity:
        "ShareOrder",

      entityId:
        order.id,

      metadata: {
        action:
          "SHARE_ORDER_FAILED",

        previousStatus:
          order.status,

        newStatus:
          updated.status,
      },
    },
  });

  logger.warn(
    "Share order failed",
    {
      orderId:
        order.id,

      adminUserId,
    }
  );

  return serializeShareOrder(
    updated
  );
}

/* =========================================================
   CANCEL ORDER
========================================================= */

export async function cancelShareOrder({
  userId,
  orderId,
}) {
  assertUserId(
    userId
  );

  assertOrderId(
    orderId
  );

  const order =
    await prisma.shareOrder.findFirst({
      where: {
        id:
          orderId,

        userId,
      },

      include: {
        share: true,
      },
    });

  if (!order) {
    const error = new Error(
      "Share order not found."
    );

    error.statusCode = 404;
    throw error;
  }

  if (
    order.status !==
    ORDER_STATUS.PENDING
  ) {
    const error = new Error(
      `Only PENDING share orders can be cancelled. Current status: ${order.status}.`
    );

    error.statusCode = 409;
    throw error;
  }

  const updated =
    await prisma.shareOrder.update({
      where: {
        id:
          order.id,
      },

      data: {
        status:
          ORDER_STATUS.CANCELLED,
      },

      include: {
        share: true,
      },
    });

  logger.info(
    "Share order cancelled",
    {
      userId,
      orderId:
        order.id,
    }
  );

  return serializeShareOrder(
    updated
  );
}

/* =========================================================
   DIVIDENDS
========================================================= */

/**
 * List dividends for a share.
 */
export async function getShareDividends(
  shareId
) {
  assertShareId(
    shareId
  );

  const share =
    await prisma.share.findUnique({
      where: {
        id:
          shareId,
      },
    });

  if (!share) {
    const error = new Error(
      "Share not found."
    );

    error.statusCode = 404;
    throw error;
  }

  const dividends =
    await prisma.dividend.findMany({
      where: {
        shareId,
      },

      include: {
        share: true,
      },

      orderBy: {
        paymentDate:
          "desc",
      },
    });

  return dividends.map(
    serializeDividend
  );
}

/**
 * Get dividends available around a particular payment date.
 */
export async function getUpcomingDividends({
  fromDate = new Date(),
  limit = 20,
}) {
  const parsedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

  const startDate =
    new Date(fromDate);

  if (
    Number.isNaN(
      startDate.getTime()
    )
  ) {
    const error = new Error(
      "Invalid dividend start date."
    );

    error.statusCode = 400;
    throw error;
  }

  const dividends =
    await prisma.dividend.findMany({
      where: {
        paymentDate: {
          gte:
            startDate,
        },

        share: {
          isActive:
            true,
        },
      },

      include: {
        share: true,
      },

      orderBy: {
        paymentDate:
          "asc",
      },

      take:
        parsedLimit,
    });

  return dividends.map(
    serializeDividend
  );
}

/**
 * Create a dividend record for a share.
 *
 * This should be restricted to an authorized admin/system
 * workflow.
 */
export async function createDividend({
  adminUserId,
  shareId,
  amountPerShare,
  recordDate,
  paymentDate,
}) {
  assertUserId(
    adminUserId
  );

  assertShareId(
    shareId
  );

  const numericAmount =
    assertPositivePrice(
      amountPerShare
    );

  const parsedRecordDate =
    new Date(
      recordDate
    );

  const parsedPaymentDate =
    new Date(
      paymentDate
    );

  if (
    Number.isNaN(
      parsedRecordDate.getTime()
    )
  ) {
    const error = new Error(
      "Invalid dividend record date."
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    Number.isNaN(
      parsedPaymentDate.getTime()
    )
  ) {
    const error = new Error(
      "Invalid dividend payment date."
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    parsedPaymentDate <
    parsedRecordDate
  ) {
    const error = new Error(
      "Dividend payment date cannot be before the record date."
    );

    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const share =
        await tx.share.findUnique({
          where: {
            id:
              shareId,
          },
        });

      if (!share) {
        const error = new Error(
          "Share not found."
        );

        error.statusCode = 404;
        throw error;
      }

      const dividend =
        await tx.dividend.create({
          data: {
            shareId,

            amountPerShare:
              toDecimal(
                numericAmount
              ),

            recordDate:
              parsedRecordDate,

            paymentDate:
              parsedPaymentDate,
          },

          include: {
            share: true,
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            share.orders.length > 0
              ? share.orders[0].userId
              : adminUserId,

          adminUserId,

          action:
            "CREATE",

          entity:
            "Dividend",

          entityId:
            dividend.id,

          metadata: {
            action:
              "DIVIDEND_CREATED",

            shareId,

            amountPerShare:
              serializeMoney(
                dividend.amountPerShare
              ),

            recordDate:
              dividend.recordDate,

            paymentDate:
              dividend.paymentDate,
          },
        },
      });

      logger.security(
        "Dividend created",
        {
          dividendId:
            dividend.id,

          shareId,

          adminUserId,
        }
      );

      return serializeDividend(
        dividend
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   ADMIN SHARE MANAGEMENT
========================================================= */

/**
 * Create a new share instrument.
 */
export async function createShare({
  adminUserId,
  symbol,
  companyName,
  description,
  currentPrice,
  currencyCode,
  totalShares,
  availableShares,
}) {
  assertUserId(
    adminUserId
  );

  const normalizedSymbol =
    normalizeOptionalString(
      symbol
    );

  const normalizedCompanyName =
    normalizeOptionalString(
      companyName
    );

  const normalizedCurrencyCode =
    normalizeOptionalString(
      currencyCode
    );

  if (!normalizedSymbol) {
    const error = new Error(
      "Share symbol is required."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!normalizedCompanyName) {
    const error = new Error(
      "Company name is required."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!normalizedCurrencyCode) {
    const error = new Error(
      "Currency code is required."
    );

    error.statusCode = 400;
    throw error;
  }

  const price =
    assertPositivePrice(
      currentPrice
    );

  const total =
    assertPositiveQuantity(
      totalShares
    );

  const available =
    assertPositiveQuantity(
      availableShares
    );

  if (
    Number(available) >
    Number(total)
  ) {
    const error = new Error(
      "Available shares cannot exceed total shares."
    );

    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const existing =
        await tx.share.findUnique({
          where: {
            symbol:
              normalizedSymbol.toUpperCase(),
          },
        });

      if (existing) {
        const error = new Error(
          "A share with this symbol already exists."
        );

        error.statusCode = 409;
        throw error;
      }

      const share =
        await tx.share.create({
          data: {
            symbol:
              normalizedSymbol.toUpperCase(),

            companyName:
              normalizedCompanyName,

            description:
              normalizeOptionalString(
                description
              ),

            currentPrice:
              toDecimal(
                price
              ),

            currencyCode:
              normalizedCurrencyCode.toUpperCase(),

            totalShares:
              toDecimal(
                total
              ),

            availableShares:
              toDecimal(
                available
              ),

            isActive:
              true,
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            adminUserId,

          adminUserId,

          action:
            "CREATE",

          entity:
            "Share",

          entityId:
            share.id,

          metadata: {
            action:
              "SHARE_CREATED",

            symbol:
              share.symbol,
          },
        },
      });

      logger.security(
        "Share instrument created",
        {
          shareId:
            share.id,

          symbol:
            share.symbol,

          adminUserId,
        }
      );

      return serializeShare(
        share
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/**
 * Update the current market price of a share.
 */
export async function updateSharePrice({
  adminUserId,
  shareId,
  currentPrice,
}) {
  assertUserId(
    adminUserId
  );

  assertShareId(
    shareId
  );

  const price =
    assertPositivePrice(
      currentPrice
    );

  return prisma.$transaction(
    async (tx) => {
      const share =
        await tx.share.findUnique({
          where: {
            id:
              shareId,
          },
        });

      if (!share) {
        const error = new Error(
          "Share not found."
        );

        error.statusCode = 404;
        throw error;
      }

      const updated =
        await tx.share.update({
          where: {
            id:
              share.id,
          },

          data: {
            currentPrice:
              toDecimal(
                price
              ),
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            adminUserId,

          adminUserId,

          action:
            "UPDATE",

          entity:
            "Share",

          entityId:
            share.id,

          metadata: {
            action:
              "SHARE_PRICE_UPDATED",

            previousPrice:
              serializeMoney(
                share.currentPrice
              ),

            newPrice:
              serializeMoney(
                updated.currentPrice
              ),
          },
        },
      });

      logger.info(
        "Share price updated",
        {
          shareId:
            share.id,

          adminUserId,
        }
      );

      return serializeShare(
        updated
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/**
 * Enable or disable a share.
 */
export async function setShareActive({
  adminUserId,
  shareId,
  isActive,
}) {
  assertUserId(
    adminUserId
  );

  assertShareId(
    shareId
  );

  if (
    typeof isActive !==
    "boolean"
  ) {
    const error = new Error(
      "isActive must be a boolean."
    );

    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const share =
        await tx.share.findUnique({
          where: {
            id:
              shareId,
          },
        });

      if (!share) {
        const error = new Error(
          "Share not found."
        );

        error.statusCode = 404;
        throw error;
      }

      const updated =
        await tx.share.update({
          where: {
            id:
              share.id,
          },

          data: {
            isActive,
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            adminUserId,

          adminUserId,

          action:
            isActive
              ? "UNBLOCK"
              : "BLOCK",

          entity:
            "Share",

          entityId:
            share.id,

          metadata: {
            action:
              "SHARE_STATUS_CHANGED",

            previousStatus:
              share.isActive,

            newStatus:
              isActive,
          },
        },
      });

      return serializeShare(
        updated
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/* =========================================================
   REFERENCE GENERATOR
========================================================= */

async function generateShareReference(
  tx
) {
  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const reference =
      generateReference(
        "SHR"
      );

    const existing =
      await tx.shareOrder.findUnique({
        where: {
          reference,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      return reference;
    }
  }

  const error = new Error(
    "Unable to generate a unique share order reference."
  );

  error.statusCode = 500;

  throw error;
}

/* =========================================================
   EXPORT
========================================================= */

const shareService = {
  listShares,
  getShare,

  createBuyOrder,
  createSellOrder,

  getUserShareOrders,
  getUserShareOrder,

  markOrderProcessing,
  completeBuyOrder,

  failShareOrder,
  cancelShareOrder,

  getShareDividends,
  getUpcomingDividends,
  createDividend,

  createShare,
  updateSharePrice,
  setShareActive,
};

export default shareService;