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

const INVESTMENT_ORDER_TYPES = Object.freeze({
  BUY: "BUY",
  SELL: "SELL",
});

const INVESTMENT_ORDER_STATUSES = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

const INVESTMENT_FUNDING_METHODS = Object.freeze({
  BTC: "BTC",
});

const INVESTMENT_STATUSES = Object.freeze({
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_SUBMITTED: "PAYMENT_SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACTIVE: "ACTIVE",
  MATURED: "MATURED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
});

const INVESTMENT_PAYMENT_STATUSES = Object.freeze({
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
});

const MIN_QUANTITY = 0.00000001;
const MAX_QUANTITY = 1_000_000_000;

/* =========================================================
   HELPERS
========================================================= */

function assertUserId(userId) {
  if (!userId || typeof userId !== "string") {
    const error = new Error("A valid user ID is required.");
    error.statusCode = 400;
    throw error;
  }
}

function assertProductId(productId) {
  if (!productId || typeof productId !== "string") {
    const error = new Error(
      "A valid investment product ID is required."
    );
    error.statusCode = 400;
    throw error;
  }
}

function assertPositiveQuantity(quantity) {
  const value = Number(quantity);

  if (!Number.isFinite(value) || value <= 0) {
    const error = new Error("Quantity must be greater than zero.");
    error.statusCode = 400;
    throw error;
  }

  if (value < MIN_QUANTITY) {
    const error = new Error(
      `Quantity must be at least ${MIN_QUANTITY}.`
    );
    error.statusCode = 400;
    throw error;
  }

  if (value > MAX_QUANTITY) {
    const error = new Error(
      `Quantity cannot exceed ${MAX_QUANTITY}.`
    );
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function assertInvestmentAmount(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    const error = new Error(
      "Investment amount must be greater than zero."
    );
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function calculateTotal(quantity, price) {
  const quantityDecimal = toDecimal(quantity);
  const priceDecimal = toDecimal(price);

  return quantityDecimal.mul(priceDecimal);
}

function serializeProduct(product) {
  if (!product) {
    return null;
  }

  return {
    ...product,
    price: serializeMoney(product.price),
  };
}

function serializeHolding(holding) {
  if (!holding) {
    return null;
  }

  return {
    ...holding,
    quantity: serializeMoney(holding.quantity),
    averagePrice: serializeMoney(holding.averagePrice),
    currentValue: serializeMoney(holding.currentValue),
    profitLoss: serializeMoney(holding.profitLoss),
    product: holding.product
      ? serializeProduct(holding.product)
      : undefined,
  };
}

function serializeInvestmentAccount(account) {
  if (!account) {
    return null;
  }

  return {
    ...account,
    cashBalance: serializeMoney(account.cashBalance),
    totalValue: serializeMoney(account.totalValue),
    profitLoss: serializeMoney(account.profitLoss),
    holdings: Array.isArray(account.holdings)
      ? account.holdings.map(serializeHolding)
      : undefined,
  };
}

function serializeOrder(order) {
  if (!order) {
    return null;
  }

  return {
    ...order,
    quantity: serializeMoney(order.quantity),
    price: serializeMoney(order.price),
    total: serializeMoney(order.total),
    product: order.product
      ? serializeProduct(order.product)
      : undefined,
  };
}

function serializeInvestmentPlan(plan) {
  if (!plan) {
    return null;
  }

  return {
    ...plan,
    minimumAmount: serializeMoney(plan.minimumAmount),
    maximumAmount:
      plan.maximumAmount !== null &&
      plan.maximumAmount !== undefined
        ? serializeMoney(plan.maximumAmount)
        : null,
    returnRate: serializeMoney(plan.returnRate),
  };
}

function serializeInvestment(investment) {
  if (!investment) {
    return null;
  }

  return {
    ...investment,

    principal: serializeMoney(investment.principal),

    expectedReturn: serializeMoney(
      investment.expectedReturn
    ),

    totalMaturityValue: serializeMoney(
      investment.totalMaturityValue
    ),

    btcAmount:
      investment.btcAmount !== null &&
      investment.btcAmount !== undefined
        ? serializeMoney(investment.btcAmount)
        : null,

    btcRate:
      investment.btcRate !== null &&
      investment.btcRate !== undefined
        ? serializeMoney(investment.btcRate)
        : null,

    plan: investment.plan
      ? serializeInvestmentPlan(investment.plan)
      : undefined,
  };
}

/* =========================================================
   INVESTMENT ACCOUNT
========================================================= */

/**
 * Get or create the user's investment account.
 *
 * This is intentionally idempotent.
 */
export async function getOrCreateInvestmentAccount(userId) {
  assertUserId(userId);

  const existing = await prisma.investmentAccount.findUnique({
    where: {
      userId,
    },
    include: {
      holdings: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (existing) {
    return serializeInvestmentAccount(existing);
  }

  const account = await prisma.investmentAccount.create({
    data: {
      userId,
      cashBalance: 0,
      totalValue: 0,
      profitLoss: 0,
    },
    include: {
      holdings: {
        include: {
          product: true,
        },
      },
    },
  });

  logger.info("Investment account created", {
    userId,
    investmentAccountId: account.id,
  });

  return serializeInvestmentAccount(account);
}

/**
 * Get the user's investment account.
 */
export async function getInvestmentAccount(userId) {
  assertUserId(userId);

  const account = await prisma.investmentAccount.findUnique({
    where: {
      userId,
    },
    include: {
      holdings: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!account) {
    const error = new Error("Investment account not found.");
    error.statusCode = 404;
    throw error;
  }

  return serializeInvestmentAccount(account);
}

/* =========================================================
   INVESTMENT PRODUCTS
========================================================= */

/**
 * List active investment products.
 */
export async function listInvestmentProducts({
  type,
  page = 1,
  limit = 20,
} = {}) {
  const parsedPage = Math.max(Number(page) || 1, 1);

  const parsedLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const where = {
    isActive: true,
  };

  if (type) {
    where.type = type;
  }

  const [products, total] = await prisma.$transaction([
    prisma.investmentProduct.findMany({
      where,
      orderBy: [
        {
          name: "asc",
        },
        {
          symbol: "asc",
        },
      ],
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
    }),

    prisma.investmentProduct.count({
      where,
    }),
  ]);

  return {
    items: products.map(serializeProduct),

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
}

/**
 * Get one investment product.
 */
export async function getInvestmentProduct(productId) {
  assertProductId(productId);

  const product = await prisma.investmentProduct.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    const error = new Error("Investment product not found.");
    error.statusCode = 404;
    throw error;
  }

  return serializeProduct(product);
}

/* =========================================================
   HOLDINGS
========================================================= */

/**
 * Get all holdings belonging to the authenticated user.
 */
export async function getUserHoldings(userId) {
  assertUserId(userId);

  const account = await prisma.investmentAccount.findUnique({
    where: {
      userId,
    },
  });

  if (!account) {
    const error = new Error("Investment account not found.");
    error.statusCode = 404;
    throw error;
  }

  const holdings = await prisma.investmentHolding.findMany({
    where: {
      investmentAccountId: account.id,
    },
    include: {
      product: true,
    },
    orderBy: {
      currentValue: "desc",
    },
  });

  return holdings.map(serializeHolding);
}

/**
 * Get one holding belonging to the authenticated user.
 */
export async function getUserHolding(userId, holdingId) {
  assertUserId(userId);

  if (!holdingId || typeof holdingId !== "string") {
    const error = new Error("A valid holding ID is required.");
    error.statusCode = 400;
    throw error;
  }

  const account = await prisma.investmentAccount.findUnique({
    where: {
      userId,
    },
  });

  if (!account) {
    const error = new Error("Investment account not found.");
    error.statusCode = 404;
    throw error;
  }

  const holding = await prisma.investmentHolding.findFirst({
    where: {
      id: holdingId,
      investmentAccountId: account.id,
    },
    include: {
      product: true,
    },
  });

  if (!holding) {
    const error = new Error("Investment holding not found.");
    error.statusCode = 404;
    throw error;
  }

  return serializeHolding(holding);
}

/* =========================================================
   BUY ORDER
========================================================= */

/**
 * Create a BUY investment order.
 *
 * The order is created as PENDING and does not pretend that
 * execution happened. Actual execution should be performed
 * by a controlled processing workflow.
 */
export async function createBuyOrder({
  userId,
  productId,
  quantity,
}) {
  assertUserId(userId);
  assertProductId(productId);

  const numericQuantity = assertPositiveQuantity(quantity);

  return prisma.$transaction(
    async (tx) => {
      const product = await tx.investmentProduct.findUnique({
        where: {
          id: productId,
        },
      });

      if (!product) {
        const error = new Error("Investment product not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!product.isActive) {
        const error = new Error(
          "This investment product is currently unavailable."
        );
        error.statusCode = 400;
        throw error;
      }

      const price = toDecimal(product.price);

      const total = calculateTotal(
        numericQuantity,
        price
      );

      const account = await tx.investmentAccount.findUnique({
        where: {
          userId,
        },
      });

      if (!account) {
        const error = new Error(
          "Investment account not found."
        );
        error.statusCode = 404;
        throw error;
      }

      const cashBalance = toDecimal(
        account.cashBalance
      );

      if (cashBalance.lt(total)) {
        const error = new Error(
          "Insufficient investment cash balance."
        );
        error.statusCode = 400;
        throw error;
      }

      const reference =
        await generateInvestmentReference(tx);

      const order = await tx.investmentOrder.create({
        data: {
          reference,
          userId,
          productId,
          type: INVESTMENT_ORDER_TYPES.BUY,
          status: INVESTMENT_ORDER_STATUSES.PENDING,
          quantity: toDecimal(numericQuantity),
          price,
          total,
        },
        include: {
          product: true,
        },
      });

      logger.info("Investment BUY order created", {
        userId,
        productId,
        orderId: order.id,
        reference: order.reference,
        quantity: numericQuantity,
        total: serializeMoney(total),
      });

      return serializeOrder(order);
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   SELL ORDER
========================================================= */

/**
 * Create a SELL investment order.
 *
 * The quantity is checked against the user's current holding.
 * The holding is not reduced until the order is actually processed.
 */
export async function createSellOrder({
  userId,
  productId,
  quantity,
}) {
  assertUserId(userId);
  assertProductId(productId);

  const numericQuantity = assertPositiveQuantity(quantity);

  return prisma.$transaction(
    async (tx) => {
      const product = await tx.investmentProduct.findUnique({
        where: {
          id: productId,
        },
      });

      if (!product) {
        const error = new Error("Investment product not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!product.isActive) {
        const error = new Error(
          "This investment product is currently unavailable."
        );
        error.statusCode = 400;
        throw error;
      }

      const account = await tx.investmentAccount.findUnique({
        where: {
          userId,
        },
      });

      if (!account) {
        const error = new Error(
          "Investment account not found."
        );
        error.statusCode = 404;
        throw error;
      }

      const holding = await tx.investmentHolding.findUnique({
        where: {
          investmentAccountId_productId: {
            investmentAccountId: account.id,
            productId,
          },
        },
      });

      if (!holding) {
        const error = new Error(
          "You do not hold this investment."
        );
        error.statusCode = 400;
        throw error;
      }

      const holdingQuantity = toDecimal(
        holding.quantity
      );

      const sellQuantity = toDecimal(
        numericQuantity
      );

      if (holdingQuantity.lt(sellQuantity)) {
        const error = new Error(
          "Insufficient investment holdings."
        );
        error.statusCode = 400;
        throw error;
      }

      const price = toDecimal(product.price);

      const total = calculateTotal(
        numericQuantity,
        price
      );

      const reference =
        await generateInvestmentReference(tx);

      const order = await tx.investmentOrder.create({
        data: {
          reference,
          userId,
          productId,
          type: INVESTMENT_ORDER_TYPES.SELL,
          status: INVESTMENT_ORDER_STATUSES.PENDING,
          quantity: sellQuantity,
          price,
          total,
        },
        include: {
          product: true,
        },
      });

      logger.info("Investment SELL order created", {
        userId,
        productId,
        orderId: order.id,
        reference: order.reference,
        quantity: numericQuantity,
        total: serializeMoney(total),
      });

      return serializeOrder(order);
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   ORDER PROCESSING
========================================================= */

/**
 * Mark an investment order as PROCESSING.
 */
export async function markOrderProcessing({
  userId,
  orderId,
}) {
  assertUserId(userId);

  if (!orderId || typeof orderId !== "string") {
    const error = new Error("A valid order ID is required.");
    error.statusCode = 400;
    throw error;
  }

  const order = await prisma.investmentOrder.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      product: true,
    },
  });

  if (!order) {
    const error = new Error("Investment order not found.");
    error.statusCode = 404;
    throw error;
  }

  if (
    order.status !==
    INVESTMENT_ORDER_STATUSES.PENDING
  ) {
    const error = new Error(
      `Order cannot move to PROCESSING from ${order.status}.`
    );
    error.statusCode = 409;
    throw error;
  }

  const updated = await prisma.investmentOrder.update({
    where: {
      id: order.id,
    },
    data: {
      status:
        INVESTMENT_ORDER_STATUSES.PROCESSING,
    },
    include: {
      product: true,
    },
  });

  logger.info(
    "Investment order moved to PROCESSING",
    {
      userId,
      orderId: order.id,
      reference: order.reference,
    }
  );

  return serializeOrder(updated);
}

/**
 * Complete an investment BUY or SELL order.
 *
 * BUY:
 * - Deducts investment cash.
 * - Adds quantity to holding.
 * - Recalculates weighted average price.
 *
 * SELL:
 * - Reduces holding quantity.
 * - Adds proceeds to investment cash.
 * - Removes holding when quantity reaches zero.
 *
 * All financial changes happen in one serializable transaction.
 */
export async function completeInvestmentOrder({
  userId,
  orderId,
}) {
  assertUserId(userId);

  if (!orderId || typeof orderId !== "string") {
    const error = new Error("A valid order ID is required.");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const order =
        await tx.investmentOrder.findFirst({
          where: {
            id: orderId,
            userId,
          },
          include: {
            product: true,
          },
        });

      if (!order) {
        const error = new Error(
          "Investment order not found."
        );
        error.statusCode = 404;
        throw error;
      }

      if (
        order.status !==
        INVESTMENT_ORDER_STATUSES.PROCESSING
      ) {
        const error = new Error(
          `Only PROCESSING orders can be completed. Current status: ${order.status}.`
        );
        error.statusCode = 409;
        throw error;
      }

      const account =
        await tx.investmentAccount.findUnique({
          where: {
            userId,
          },
        });

      if (!account) {
        const error = new Error(
          "Investment account not found."
        );
        error.statusCode = 404;
        throw error;
      }

      const quantity = toDecimal(
        order.quantity
      );

      const price = toDecimal(
        order.price
      );

      const total = toDecimal(
        order.total
      );

      const currentCash =
        toDecimal(account.cashBalance);

      if (
        order.type ===
        INVESTMENT_ORDER_TYPES.BUY
      ) {
        if (currentCash.lt(total)) {
          const error = new Error(
            "Insufficient investment cash balance to complete this order."
          );
          error.statusCode = 400;
          throw error;
        }

        const existingHolding =
          await tx.investmentHolding.findUnique({
            where: {
              investmentAccountId_productId: {
                investmentAccountId:
                  account.id,
                productId:
                  order.productId,
              },
            },
          });

        let holding;

        if (existingHolding) {
          const existingQuantity =
            toDecimal(
              existingHolding.quantity
            );

          const existingAveragePrice =
            toDecimal(
              existingHolding.averagePrice
            );

          const newQuantity =
            existingQuantity.add(quantity);

          const existingCost =
            existingQuantity.mul(
              existingAveragePrice
            );

          const newCost =
            quantity.mul(price);

          const newAveragePrice =
            newQuantity.isZero()
              ? toDecimal(0)
              : existingCost
                  .add(newCost)
                  .div(newQuantity);

          const newCurrentValue =
            newQuantity.mul(price);

          const newProfitLoss =
            newCurrentValue.sub(
              newQuantity.mul(
                newAveragePrice
              )
            );

          holding =
            await tx.investmentHolding.update({
              where: {
                id: existingHolding.id,
              },
              data: {
                quantity: newQuantity,
                averagePrice:
                  newAveragePrice,
                currentValue:
                  newCurrentValue,
                profitLoss:
                  newProfitLoss,
              },
              include: {
                product: true,
              },
            });
        } else {
          const currentValue =
            quantity.mul(price);

          holding =
            await tx.investmentHolding.create({
              data: {
                investmentAccountId:
                  account.id,
                productId:
                  order.productId,
                quantity,
                averagePrice:
                  price,
                currentValue,
                profitLoss: 0,
              },
              include: {
                product: true,
              },
            });
        }

        const newCashBalance =
          currentCash.sub(total);

        await tx.investmentAccount.update({
          where: {
            id: account.id,
          },
          data: {
            cashBalance:
              newCashBalance,
          },
        });

        const completed =
          await tx.investmentOrder.update({
            where: {
              id: order.id,
            },
            data: {
              status:
                INVESTMENT_ORDER_STATUSES.COMPLETED,
            },
            include: {
              product: true,
            },
          });

        logger.info(
          "Investment BUY order completed",
          {
            userId,
            orderId: order.id,
            reference: order.reference,
            total:
              serializeMoney(total),
          }
        );

        return {
          order:
            serializeOrder(
              completed
            ),
          holding:
            serializeHolding(
              holding
            ),
        };
      }

      if (
        order.type ===
        INVESTMENT_ORDER_TYPES.SELL
      ) {
        const holding =
          await tx.investmentHolding.findUnique({
            where: {
              investmentAccountId_productId: {
                investmentAccountId:
                  account.id,
                productId:
                  order.productId,
              },
            },
            include: {
              product: true,
            },
          });

        if (!holding) {
          const error = new Error(
            "Investment holding not found."
          );
          error.statusCode = 400;
          throw error;
        }

        const currentQuantity =
          toDecimal(
            holding.quantity
          );

        if (
          currentQuantity.lt(
            quantity
          )
        ) {
          const error = new Error(
            "Insufficient investment holdings to complete this order."
          );
          error.statusCode = 400;
          throw error;
        }

        const remainingQuantity =
          currentQuantity.sub(
            quantity
          );

        if (
          remainingQuantity.isZero()
        ) {
          await tx.investmentHolding.delete({
            where: {
              id: holding.id,
            },
          });
        } else {
          const averagePrice =
            toDecimal(
              holding.averagePrice
            );

          const currentValue =
            remainingQuantity.mul(
              price
            );

          const profitLoss =
            currentValue.sub(
              remainingQuantity.mul(
                averagePrice
              )
            );

          await tx.investmentHolding.update({
            where: {
              id: holding.id,
            },
            data: {
              quantity:
                remainingQuantity,
              currentValue,
              profitLoss,
            },
          });
        }

        const newCashBalance =
          currentCash.add(total);

        await tx.investmentAccount.update({
          where: {
            id: account.id,
          },
          data: {
            cashBalance:
              newCashBalance,
          },
        });

        const completed =
          await tx.investmentOrder.update({
            where: {
              id: order.id,
            },
            data: {
              status:
                INVESTMENT_ORDER_STATUSES.COMPLETED,
            },
            include: {
              product: true,
            },
          });

        logger.info(
          "Investment SELL order completed",
          {
            userId,
            orderId: order.id,
            reference:
              order.reference,
            total:
              serializeMoney(total),
          }
        );

        return {
          order:
            serializeOrder(
              completed
            ),
        };
      }

      const error = new Error(
        `Unsupported investment order type: ${order.type}.`
      );
      error.statusCode = 400;
      throw error;
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/**
 * Fail an investment order.
 *
 * No portfolio balance is modified here because an order is
 * only financially settled when it is completed.
 */
export async function failInvestmentOrder({
  userId,
  orderId,
}) {
  assertUserId(userId);

  if (!orderId || typeof orderId !== "string") {
    const error = new Error("A valid order ID is required.");
    error.statusCode = 400;
    throw error;
  }

  const order =
    await prisma.investmentOrder.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        product: true,
      },
    });

  if (!order) {
    const error = new Error(
      "Investment order not found."
    );
    error.statusCode = 404;
    throw error;
  }

  if (
    ![
      INVESTMENT_ORDER_STATUSES.PENDING,
      INVESTMENT_ORDER_STATUSES.PROCESSING,
    ].includes(order.status)
  ) {
    const error = new Error(
      `Order cannot be failed from ${order.status}.`
    );
    error.statusCode = 409;
    throw error;
  }

  const updated =
    await prisma.investmentOrder.update({
      where: {
        id: order.id,
      },
      data: {
        status:
          INVESTMENT_ORDER_STATUSES.FAILED,
      },
      include: {
        product: true,
      },
    });

  logger.warn(
    "Investment order failed",
    {
      userId,
      orderId: order.id,
      reference: order.reference,
    }
  );

  return serializeOrder(updated);
}

/**
 * Cancel a pending investment order.
 */
export async function cancelInvestmentOrder({
  userId,
  orderId,
}) {
  assertUserId(userId);

  if (!orderId || typeof orderId !== "string") {
    const error = new Error("A valid order ID is required.");
    error.statusCode = 400;
    throw error;
  }

  const order =
    await prisma.investmentOrder.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        product: true,
      },
    });

  if (!order) {
    const error = new Error(
      "Investment order not found."
    );
    error.statusCode = 404;
    throw error;
  }

  if (
    order.status !==
    INVESTMENT_ORDER_STATUSES.PENDING
  ) {
    const error = new Error(
      `Only PENDING orders can be cancelled. Current status: ${order.status}.`
    );
    error.statusCode = 409;
    throw error;
  }

  const updated =
    await prisma.investmentOrder.update({
      where: {
        id: order.id,
      },
      data: {
        status:
          INVESTMENT_ORDER_STATUSES.CANCELLED,
      },
      include: {
        product: true,
      },
    });

  logger.info(
    "Investment order cancelled",
    {
      userId,
      orderId: order.id,
      reference: order.reference,
    }
  );

  return serializeOrder(updated);
}

/* =========================================================
   ORDERS
========================================================= */

/**
 * Get the authenticated user's investment orders.
 */
export async function getUserInvestmentOrders({
  userId,
  status,
  type,
  productId,
  page = 1,
  limit = 20,
}) {
  assertUserId(userId);

  const parsedPage =
    Math.max(Number(page) || 1, 1);

  const parsedLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const where = {
    userId,
  };

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  if (productId) {
    where.productId = productId;
  }

  const [orders, total] =
    await prisma.$transaction([
      prisma.investmentOrder.findMany({
        where,
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip:
          (parsedPage - 1) *
          parsedLimit,
        take: parsedLimit,
      }),

      prisma.investmentOrder.count({
        where,
      }),
    ]);

  return {
    items: orders.map(
      serializeOrder
    ),

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages:
        Math.ceil(
          total / parsedLimit
        ),
    },
  };
}

/**
 * Get one investment order belonging to the authenticated user.
 */
export async function getUserInvestmentOrder({
  userId,
  orderId,
}) {
  assertUserId(userId);

  if (!orderId || typeof orderId !== "string") {
    const error = new Error("A valid order ID is required.");
    error.statusCode = 400;
    throw error;
  }

  const order =
    await prisma.investmentOrder.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        product: true,
      },
    });

  if (!order) {
    const error = new Error(
      "Investment order not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return serializeOrder(order);
}

/* =========================================================
   PORTFOLIO VALUATION
========================================================= */

/**
 * Recalculate portfolio values from current product prices.
 *
 * This updates:
 * - holding currentValue
 * - holding profitLoss
 * - investment account totalValue
 * - investment account profitLoss
 *
 * It does not invent market prices. It uses the prices stored
 * on InvestmentProduct.
 */
export async function refreshInvestmentPortfolio(userId) {
  assertUserId(userId);

  return prisma.$transaction(
    async (tx) => {
      const account =
        await tx.investmentAccount.findUnique({
          where: {
            userId,
          },
          include: {
            holdings: {
              include: {
                product: true,
              },
            },
          },
        });

      if (!account) {
        const error = new Error(
          "Investment account not found."
        );
        error.statusCode = 404;
        throw error;
      }

      let holdingsValue =
        toDecimal(0);

      let totalProfitLoss =
        toDecimal(0);

      const refreshedHoldings = [];

      for (const holding of account.holdings) {
        const quantity =
          toDecimal(
            holding.quantity
          );

        const averagePrice =
          toDecimal(
            holding.averagePrice
          );

        const currentPrice =
          toDecimal(
            holding.product.price
          );

        const currentValue =
          quantity.mul(
            currentPrice
          );

        const profitLoss =
          currentValue.sub(
            quantity.mul(
              averagePrice
            )
          );

        const updatedHolding =
          await tx.investmentHolding.update({
            where: {
              id: holding.id,
            },
            data: {
              currentValue,
              profitLoss,
            },
            include: {
              product: true,
            },
          });

        holdingsValue =
          holdingsValue.add(
            currentValue
          );

        totalProfitLoss =
          totalProfitLoss.add(
            profitLoss
          );

        refreshedHoldings.push(
          updatedHolding
        );
      }

      const cashBalance =
        toDecimal(
          account.cashBalance
        );

      const totalValue =
        cashBalance.add(
          holdingsValue
        );

      const updatedAccount =
        await tx.investmentAccount.update({
          where: {
            id: account.id,
          },
          data: {
            totalValue,
            profitLoss:
              totalProfitLoss,
          },
          include: {
            holdings: {
              include: {
                product: true,
              },
            },
          },
        });

      logger.info(
        "Investment portfolio refreshed",
        {
          userId,
          investmentAccountId:
            account.id,
          totalValue:
            serializeMoney(
              totalValue
            ),
          profitLoss:
            serializeMoney(
              totalProfitLoss
            ),
        }
      );

      return serializeInvestmentAccount(
        updatedAccount
      );
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   FUND INVESTMENT ACCOUNT
========================================================= */

/**
 * Credit investment cash.
 *
 * This function is deliberately kept as an internal service
 * operation. A public deposit route should not blindly expose
 * this function because real money movement must come from a
 * controlled deposit/payment settlement workflow.
 */
export async function creditInvestmentCash({
  userId,
  amount,
}) {
  assertUserId(userId);

  const decimalAmount =
    toDecimal(amount);

  if (decimalAmount.lte(0)) {
    const error = new Error(
      "Credit amount must be greater than zero."
    );
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const account =
        await tx.investmentAccount.findUnique({
          where: {
            userId,
          },
        });

      if (!account) {
        const error = new Error(
          "Investment account not found."
        );
        error.statusCode = 404;
        throw error;
      }

      const newBalance =
        toDecimal(
          account.cashBalance
        ).add(decimalAmount);

      const updated =
        await tx.investmentAccount.update({
          where: {
            id: account.id,
          },
          data: {
            cashBalance:
              newBalance,
          },
        });

      logger.info(
        "Investment cash credited",
        {
          userId,
          investmentAccountId:
            account.id,
          amount:
            serializeMoney(
              decimalAmount
            ),
        }
      );

      return serializeInvestmentAccount(
        updated
      );
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/**
 * Debit investment cash.
 *
 * Intended for controlled internal settlement flows.
 */
export async function debitInvestmentCash({
  userId,
  amount,
}) {
  assertUserId(userId);

  const decimalAmount =
    toDecimal(amount);

  if (decimalAmount.lte(0)) {
    const error = new Error(
      "Debit amount must be greater than zero."
    );
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const account =
        await tx.investmentAccount.findUnique({
          where: {
            userId,
          },
        });

      if (!account) {
        const error = new Error(
          "Investment account not found."
        );
        error.statusCode = 404;
        throw error;
      }

      const currentBalance =
        toDecimal(
          account.cashBalance
        );

      if (
        currentBalance.lt(
          decimalAmount
        )
      ) {
        const error = new Error(
          "Insufficient investment cash balance."
        );
        error.statusCode = 400;
        throw error;
      }

      const newBalance =
        currentBalance.sub(
          decimalAmount
        );

      const updated =
        await tx.investmentAccount.update({
          where: {
            id: account.id,
          },
          data: {
            cashBalance:
              newBalance,
          },
        });

      logger.info(
        "Investment cash debited",
        {
          userId,
          investmentAccountId:
            account.id,
          amount:
            serializeMoney(
              decimalAmount
            ),
        }
      );

      return serializeInvestmentAccount(
        updated
      );
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   FIXED-TERM BTC INVESTMENTS
========================================================= */

/**
 * List active fixed-term investment plans.
 */
export async function getInvestmentPlans({
  page = 1,
  limit = 20,
} = {}) {
  const parsedPage =
    Math.max(Number(page) || 1, 1);

  const parsedLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const where = {
    isActive: true,
  };

  const [plans, total] =
    await prisma.$transaction([
      prisma.investmentPlan.findMany({
        where,
        orderBy: {
          name: "asc",
        },
        skip:
          (parsedPage - 1) *
          parsedLimit,
        take: parsedLimit,
      }),

      prisma.investmentPlan.count({
        where,
      }),
    ]);

  return {
    items: plans.map(
      serializeInvestmentPlan
    ),

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages:
        Math.ceil(
          total / parsedLimit
        ),
    },
  };
}

/**
 * Get one fixed-term investment plan.
 */
export async function getInvestmentPlan(
  planId
) {
  if (
    !planId ||
    typeof planId !== "string"
  ) {
    const error = new Error(
      "A valid investment plan ID is required."
    );
    error.statusCode = 400;
    throw error;
  }

  const plan =
    await prisma.investmentPlan.findUnique({
      where: {
        id: planId,
      },
    });

  if (!plan) {
    const error = new Error(
      "Investment plan not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return serializeInvestmentPlan(
    plan
  );
}

/**
 * Get the currently active BTC payment configuration.
 *
 * EpexBank does NOT generate a BTC wallet here.
 * The BTC address is configured by the business/admin.
 */
export async function getBitcoinPaymentConfig() {
  const config =
    await prisma.investmentPaymentConfig.findFirst({
      where: {
        fundingMethod:
          INVESTMENT_FUNDING_METHODS.BTC,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!config) {
    const error = new Error(
      "Bitcoin investment payments are currently unavailable."
    );
    error.statusCode = 404;
    throw error;
  }

  if (!config.btcAddress) {
    const error = new Error(
      "Bitcoin receiving address has not been configured."
    );
    error.statusCode = 503;
    throw error;
  }

  if (
    config.btcRate === null ||
    config.btcRate === undefined
  ) {
    const error = new Error(
      "Bitcoin exchange rate has not been configured."
    );
    error.statusCode = 503;
    throw error;
  }

  return {
    id: config.id,

    fundingMethod:
      config.fundingMethod,

    btcAddress:
      config.btcAddress,

    btcRate:
      serializeMoney(
        config.btcRate
      ),

    instructions:
      config.instructions,
  };
}

/**
 * Create a fixed-term BTC investment.
 *
 * This creates the investment and payment instructions.
 * It does NOT mark the investment as paid.
 */
export async function createBtcInvestment({
  userId,
  planId,
  amount,
}) {
  assertUserId(userId);

  if (
    !planId ||
    typeof planId !== "string"
  ) {
    const error = new Error(
      "A valid investment plan ID is required."
    );
    error.statusCode = 400;
    throw error;
  }

  const numericAmount =
    assertInvestmentAmount(
      amount
    );

  return prisma.$transaction(
    async (tx) => {
      const plan =
        await tx.investmentPlan.findUnique({
          where: {
            id: planId,
          },
        });

      if (!plan) {
        const error = new Error(
          "Investment plan not found."
        );
        error.statusCode = 404;
        throw error;
      }

      if (!plan.isActive) {
        const error = new Error(
          "This investment plan is currently unavailable."
        );
        error.statusCode = 400;
        throw error;
      }

      const principal =
        toDecimal(
          numericAmount
        );

      const minimumAmount =
        toDecimal(
          plan.minimumAmount
        );

      if (
        principal.lt(
          minimumAmount
        )
      ) {
        const error = new Error(
          `Minimum investment amount is ${serializeMoney(
            minimumAmount
          )} ${plan.currencyCode}.`
        );
        error.statusCode = 400;
        throw error;
      }

      if (
        plan.maximumAmount !== null
      ) {
        const maximumAmount =
          toDecimal(
            plan.maximumAmount
          );

        if (
          principal.gt(
            maximumAmount
          )
        ) {
          const error = new Error(
            `Maximum investment amount is ${serializeMoney(
              maximumAmount
            )} ${plan.currencyCode}.`
          );
          error.statusCode = 400;
          throw error;
        }
      }

      const paymentConfig =
        await tx.investmentPaymentConfig.findFirst({
          where: {
            fundingMethod:
              INVESTMENT_FUNDING_METHODS.BTC,
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (!paymentConfig) {
        const error = new Error(
          "Bitcoin investment payments are currently unavailable."
        );
        error.statusCode = 503;
        throw error;
      }

      if (!paymentConfig.btcAddress) {
        const error = new Error(
          "Bitcoin receiving address has not been configured."
        );
        error.statusCode = 503;
        throw error;
      }

      if (
        paymentConfig.btcRate ===
          null ||
        paymentConfig.btcRate ===
          undefined
      ) {
        const error = new Error(
          "Bitcoin exchange rate has not been configured."
        );
        error.statusCode = 503;
        throw error;
      }

      const btcRate =
        toDecimal(
          paymentConfig.btcRate
        );

      if (btcRate.lte(0)) {
        const error = new Error(
          "Invalid Bitcoin exchange rate configuration."
        );
        error.statusCode = 503;
        throw error;
      }

      /*
       * BTC amount calculation:
       *
       * BTC amount =
       * investment amount / BTC rate
       *
       * Example:
       *
       * Investment = $1,000
       * BTC rate   = $100,000
       *
       * BTC amount = 0.01 BTC
       */
      const btcAmount =
        principal.div(
          btcRate
        );

      const returnRate =
        toDecimal(
          plan.returnRate
        );

      const expectedReturn =
        principal
          .mul(returnRate)
          .div(100);

      const totalMaturityValue =
        principal.add(
          expectedReturn
        );

      const reference =
        await generateInvestmentReference(
          tx
        );

      const investment =
        await tx.investment.create({
          data: {
            reference,

            userId,

            planId,

            principal,

            expectedReturn,

            totalMaturityValue,

            currencyCode:
              plan.currencyCode,

            fundingMethod:
              INVESTMENT_FUNDING_METHODS.BTC,

            status:
              INVESTMENT_STATUSES.PENDING_PAYMENT,

            paymentStatus:
              INVESTMENT_PAYMENT_STATUSES.PENDING,

            btcAddress:
              paymentConfig.btcAddress,

            btcAmount,

            btcRate,
          },

          include: {
            plan: true,
          },
        });

      logger.info(
        "BTC fixed-term investment created",
        {
          userId,
          investmentId:
            investment.id,
          reference:
            investment.reference,
          planId,
          principal:
            serializeMoney(
              principal
            ),
          btcAmount:
            serializeMoney(
              btcAmount
            ),
        }
      );

      return serializeInvestment(
        investment
      );
    },
    {
      isolationLevel:
        "Serializable",
    }
  );
}

/**
 * Get one fixed-term investment belonging
 * to the authenticated user.
 */
export async function getUserInvestment({
  userId,
  investmentId,
}) {
  assertUserId(userId);

  if (
    !investmentId ||
    typeof investmentId !== "string"
  ) {
    const error = new Error(
      "A valid investment ID is required."
    );
    error.statusCode = 400;
    throw error;
  }

  const investment =
    await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId,
      },
      include: {
        plan: true,
      },
    });

  if (!investment) {
    const error = new Error(
      "Investment not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return serializeInvestment(
    investment
  );
}

/**
 * Submit the BTC transaction hash as payment proof.
 *
 * IMPORTANT:
 * Supplying a transaction hash does NOT verify payment.
 * The investment remains under review until an authorized
 * admin verifies the payment.
 */
export async function submitBtcInvestmentPayment({
  userId,
  investmentId,
  transactionHash,
  paymentProofUrl,
  paymentProofName,
  paymentProofMimeType,
  paymentProofSize,
}) {
  assertUserId(userId);

  if (
    !investmentId ||
    typeof investmentId !== "string"
  ) {
    const error = new Error(
      "A valid investment ID is required."
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    !transactionHash ||
    typeof transactionHash !== "string"
  ) {
    const error = new Error(
      "Bitcoin transaction hash is required."
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedHash =
    transactionHash.trim();

  if (
    normalizedHash.length < 20
  ) {
    const error = new Error(
      "Please provide a valid Bitcoin transaction hash."
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    !paymentProofUrl ||
    typeof paymentProofUrl !== "string"
  ) {
    const error = new Error(
      "Payment proof file is required."
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    !paymentProofName ||
    typeof paymentProofName !== "string"
  ) {
    const error = new Error(
      "Payment proof file name is required."
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    !paymentProofMimeType ||
    typeof paymentProofMimeType !== "string"
  ) {
    const error = new Error(
      "Payment proof file type is required."
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    paymentProofSize === undefined ||
    paymentProofSize === null ||
    !Number.isFinite(Number(paymentProofSize)) ||
    Number(paymentProofSize) <= 0
  ) {
    const error = new Error(
      "Payment proof file size is required."
    );
    error.statusCode = 400;
    throw error;
  }

  const investment =
    await prisma.investment.findFirst({
      where: {
        id: investmentId,
        userId,
      },
    });

  if (!investment) {
    const error = new Error(
      "Investment not found."
    );
    error.statusCode = 404;
    throw error;
  }

  if (
    investment.status !==
    INVESTMENT_STATUSES.PENDING_PAYMENT
  ) {
    const error = new Error(
      `Payment cannot be submitted while investment status is ${investment.status}.`
    );
    error.statusCode = 409;
    throw error;
  }

  if (
    investment.paymentStatus !==
    INVESTMENT_PAYMENT_STATUSES.PENDING
  ) {
    const error = new Error(
      "Payment has already been submitted for this investment."
    );
    error.statusCode = 409;
    throw error;
  }

  const existingPayment =
    await prisma.investment.findFirst({
      where: {
        transactionHash:
          normalizedHash,
      },
    });

  if (existingPayment) {
    const error = new Error(
      "This Bitcoin transaction hash has already been submitted."
    );
    error.statusCode = 409;
    throw error;
  }

  const updated =
    await prisma.investment.update({
      where: {
        id: investment.id,
      },

      data: {
        transactionHash:
          normalizedHash,

        paymentProofUrl:
          paymentProofUrl.trim(),

        paymentProofName:
          paymentProofName.trim(),

        paymentProofMimeType:
          paymentProofMimeType.trim(),

        paymentProofSize:
          Number(paymentProofSize),

        paymentStatus:
          INVESTMENT_PAYMENT_STATUSES.SUBMITTED,

        status:
          INVESTMENT_STATUSES.PAYMENT_SUBMITTED,

        paymentSubmittedAt:
          new Date(),
      },

      include: {
        plan: true,
      },
    });

  logger.info(
    "BTC investment payment submitted",
    {
      userId,
      investmentId:
        investment.id,
      reference:
        investment.reference,
      paymentProofName:
        paymentProofName.trim(),
      paymentProofMimeType:
        paymentProofMimeType.trim(),
      paymentProofSize:
        Number(paymentProofSize),
    }
  );

  return serializeInvestment(
    updated
  );
}

/**
 * List the authenticated user's fixed-term investments.
 */
export async function getUserInvestments({
  userId,
  status,
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
    where.status = status;
  }

  const [investments, total] =
    await prisma.$transaction([
      prisma.investment.findMany({
        where,

        include: {
          plan: true,
        },

        orderBy: {
          createdAt: "desc",
        },

        skip:
          (parsedPage - 1) *
          parsedLimit,

        take:
          parsedLimit,
      }),

      prisma.investment.count({
        where,
      }),
    ]);

  return {
    items:
      investments.map(
        serializeInvestment
      ),

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages:
        Math.ceil(
          total / parsedLimit
        ),
    },
  };
}

/* =========================================================
   INTERNAL REFERENCE GENERATOR
========================================================= */

/**
 * Generate a reference that is unique across both:
 *
 * - InvestmentOrder
 * - Investment
 *
 * This prevents collisions between the existing
 * investment order system and the new fixed-term
 * investment system.
 */
async function generateInvestmentReference(tx) {
  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const reference =
      generateReference("INV");

    const existingOrder =
      await tx.investmentOrder.findUnique({
        where: {
          reference,
        },
        select: {
          id: true,
        },
      });

    const existingInvestment =
      await tx.investment.findUnique({
        where: {
          reference,
        },
        select: {
          id: true,
        },
      });

    if (
      !existingOrder &&
      !existingInvestment
    ) {
      return reference;
    }
  }

  const error = new Error(
    "Unable to generate a unique investment reference."
  );

  error.statusCode = 500;

  throw error;
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const investmentService = {
  /* Existing investment account */
  getOrCreateInvestmentAccount,
  getInvestmentAccount,

  /* Existing investment products */
  listInvestmentProducts,
  getInvestmentProduct,

  /* Existing holdings */
  getUserHoldings,
  getUserHolding,

  /* Existing BUY / SELL */
  createBuyOrder,
  createSellOrder,

  /* Existing order processing */
  markOrderProcessing,
  completeInvestmentOrder,
  failInvestmentOrder,
  cancelInvestmentOrder,

  /* Existing orders */
  getUserInvestmentOrders,
  getUserInvestmentOrder,

  /* Existing portfolio */
  refreshInvestmentPortfolio,

  /* Existing investment cash */
  creditInvestmentCash,
  debitInvestmentCash,

  /* New fixed-term BTC investments */
  getInvestmentPlans,
  getInvestmentPlan,
  getBitcoinPaymentConfig,
  createBtcInvestment,
  getUserInvestment,
  getUserInvestments,
  submitBtcInvestmentPayment,
};

export default investmentService;