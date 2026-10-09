import crypto from "crypto";

import prisma from "../config/database.js";
import {
  toDecimal,
  serializeMoney,
} from "../utils/money.js";

/*
 * ============================================================
 * CARD HELPERS
 * ============================================================
 */

const normalizeCardType = (value) => {
  const type = String(value || "VIRTUAL")
    .trim()
    .toUpperCase();

  if (!["VIRTUAL", "PHYSICAL"].includes(type)) {
    const error = new Error("Invalid card type");
    error.statusCode = 400;
    throw error;
  }

  return type;
};

const normalizeCardNetwork = (value) => {
  const network = String(value || "VISA")
    .trim()
    .toUpperCase();

  if (!["VISA", "MASTERCARD"].includes(network)) {
    const error = new Error("Invalid card network");
    error.statusCode = 400;
    throw error;
  }

  return network;
};

const normalizeCardStatus = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const validateUserId = (userId) => {
  if (!userId) {
    const error = new Error(
      "Authenticated user is required",
    );

    error.statusCode = 401;
    throw error;
  }
};

const validateCardId = (cardId) => {
  if (!cardId) {
    const error = new Error("Card ID is required");
    error.statusCode = 400;
    throw error;
  }
};

/*
 * ============================================================
 * SIMULATED CARD CREDENTIAL HELPERS
 * ============================================================
 *
 * These are demo/test credentials for the EpexBank application.
 * They are NOT real payment credentials and cannot be used to
 * make real-world card payments.
 *
 * ============================================================
 */

const randomDigits = (length) => {
  if (!Number.isInteger(length) || length <= 0) {
    return "";
  }

  let result = "";

  while (result.length < length) {
    result += crypto
      .randomInt(0, 10)
      .toString();
  }

  return result.slice(0, length);
};

const calculateLuhnCheckDigit = (numberWithoutCheckDigit) => {
  let sum = 0;
  let shouldDouble = true;

  for (
    let index =
      numberWithoutCheckDigit.length - 1;
    index >= 0;
    index -= 1
  ) {
    let digit = Number(
      numberWithoutCheckDigit[index],
    );

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return String(
    (10 - (sum % 10)) % 10,
  );
};

const generateTestCardNumber = (network) => {
  const normalizedNetwork =
    normalizeCardNetwork(network);

  const prefix =
    normalizedNetwork === "MASTERCARD"
      ? String(
          crypto.randomInt(51, 56),
        )
      : "4";

  const digitsBeforeCheck =
    randomDigits(
      15 - prefix.length - 1,
    );

  const base =
    `${prefix}${digitsBeforeCheck}`;

  const checkDigit =
    calculateLuhnCheckDigit(base);

  return `${base}${checkDigit}`;
};

const generateTestCardNumberWithLastFour = (
  network,
  lastFour,
) => {
  const normalizedNetwork =
    normalizeCardNetwork(network);

  const normalizedLastFour =
    String(lastFour || "")
      .replace(/\D/g, "")
      .padStart(4, "0")
      .slice(-4);

  const prefix =
    normalizedNetwork === "MASTERCARD"
      ? String(
          crypto.randomInt(51, 56),
        )
      : "4";

  /*
   * 15 digits before the Luhn check digit:
   *
   * prefix + random digits + first 3 digits
   * of the existing lastFour
   *
   * Then the final digit is the Luhn check digit.
   */
  const randomLength =
    12 - prefix.length;

  const firstRandomDigits =
    randomDigits(randomLength);

  const base =
    `${prefix}${firstRandomDigits}${normalizedLastFour.slice(0, 3)}`;

  if (base.length !== 15) {
    return generateTestCardNumber(
      normalizedNetwork,
    );
  }

  const checkDigit =
    calculateLuhnCheckDigit(base);

  const generated =
    `${base}${checkDigit}`;

  /*
   * The generated number must end with the
   * existing card's last four digits.
   *
   * If the Luhn check digit doesn't match the
   * existing fourth digit, generate a fresh
   * simulated card number instead.
   *
   * This preserves a valid Luhn number while
   * allowing old records to receive credentials.
   */
  if (
    generated.slice(-4) !==
    normalizedLastFour
  ) {
    return generateTestCardNumber(
      normalizedNetwork,
    );
  }

  return generated;
};

const generateCVV = () => {
  return crypto
    .randomInt(0, 1000)
    .toString()
    .padStart(3, "0");
};

const generateLastFour = (cardNumber) => {
  const digits = String(
    cardNumber || "",
  ).replace(/\D/g, "");

  if (digits.length >= 4) {
    return digits.slice(-4);
  }

  return crypto
    .randomInt(0, 10000)
    .toString()
    .padStart(4, "0");
};

/*
 * ============================================================
 * CARD CREDENTIAL BACKFILL
 * ============================================================
 *
 * Existing cards created before cardNumber/cvv were added to
 * the Prisma model will automatically receive simulated
 * credentials when they are requested.
 *
 * ============================================================
 */

const ensureCardCredentials = async (card) => {
  if (!card) {
    return card;
  }

  let cardNumber =
    card.cardNumber;

  let cvv =
    card.cvv;

  let lastFour =
    card.lastFour;

  if (!cardNumber) {
    cardNumber =
      generateTestCardNumber(
        card.network,
      );
  }

  if (!cvv) {
    cvv = generateCVV();
  }

  lastFour =
    generateLastFour(
      cardNumber,
    );

  if (
    card.cardNumber !== cardNumber ||
    card.cvv !== cvv ||
    card.lastFour !== lastFour
  ) {
    return prisma.card.update({
      where: {
        id: card.id,
      },

      data: {
        cardNumber,
        cvv,
        lastFour,
      },
    });
  }

  return card;
};

/*
 * ============================================================
 * EXPIRY HELPERS
 * ============================================================
 */

const getDefaultExpiry = () => {
  const now = new Date();

  const expiry = new Date(
    now.getFullYear(),
    now.getMonth() + 60,
    1,
  );

  return {
    expiryMonth:
      expiry.getMonth() + 1,

    expiryYear:
      expiry.getFullYear(),
  };
};

const validateExpiry = (
  expiryMonth,
  expiryYear,
) => {
  const month =
    Number(expiryMonth);

  const year =
    Number(expiryYear);

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    const error = new Error(
      "Expiry month must be between 1 and 12",
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isInteger(year) ||
    year < 2026 ||
    year > 2100
  ) {
    const error = new Error(
      "Invalid expiry year",
    );

    error.statusCode = 400;
    throw error;
  }

  return {
    expiryMonth: month,
    expiryYear: year,
  };
};

/*
 * ============================================================
 * CARD LIMIT HELPERS
 * ============================================================
 */

const normalizeLimit = (
  value,
  fieldName,
  allowZero = true,
) => {
  const decimal =
    toDecimal(value ?? "0");

  if (!decimal.isFinite()) {
    const error = new Error(
      `${fieldName} must be a valid amount`,
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    allowZero &&
    decimal.equals(0)
  ) {
    return decimal;
  }

  if (decimal.lessThan(0)) {
    const error = new Error(
      `${fieldName} cannot be negative`,
    );

    error.statusCode = 400;
    throw error;
  }

  return decimal;
};

/*
 * ============================================================
 * SERIALIZATION
 * ============================================================
 */

const serializeCard = (card) => {
  if (!card) {
    return null;
  }

  return {
    id: card.id,

    type: card.type,

    network: card.network,

    /*
     * Demo/test credentials.
     */
    cardNumber:
      card.cardNumber ?? null,

    cvv:
      card.cvv ?? null,

    lastFour:
      card.lastFour,

    maskedNumber:
      `•••• •••• •••• ${card.lastFour}`,

    cardholderName:
      card.cardholderName,

    expiryMonth:
      card.expiryMonth,

    expiryYear:
      card.expiryYear,

    status:
      card.status,

    dailyLimit:
      serializeMoney(
        card.dailyLimit,
      ),

    monthlyLimit:
      serializeMoney(
        card.monthlyLimit,
      ),

    isContactless:
      card.isContactless,

    isOnline:
      card.isOnline,

    createdAt:
      card.createdAt,

    updatedAt:
      card.updatedAt,
  };
};

/*
 * ============================================================
 * AUDIT HELPER
 * ============================================================
 */

const createCardAuditLog = async ({
  tx,
  userId,
  cardId,
  action,
  description,
  metadata = {},
}) => {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      entity: "Card",
      entityId: cardId,
      description,
      metadata,
    },
  });
};

/*
 * ============================================================
 * GET USER CARDS
 * ============================================================
 */

export const getUserCards = async ({
  userId,
  status,
  type,
}) => {
  validateUserId(userId);

  const where = {
    userId,
  };

  if (status) {
    const normalizedStatus =
      normalizeCardStatus(status);

    if (
      ![
        "ACTIVE",
        "FROZEN",
        "BLOCKED",
        "EXPIRED",
        "CANCELLED",
      ].includes(normalizedStatus)
    ) {
      const error = new Error(
        "Invalid card status",
      );

      error.statusCode = 400;
      throw error;
    }

    where.status =
      normalizedStatus;
  }

  if (type) {
    where.type =
      normalizeCardType(type);
  }

  const cards =
    await prisma.card.findMany({
      where,

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

  const cardsWithCredentials =
    await Promise.all(
      cards.map(
        ensureCardCredentials,
      ),
    );

  return {
    cards:
      cardsWithCredentials.map(
        serializeCard,
      ),
  };
};

/*
 * ============================================================
 * GET ONE USER CARD
 * ============================================================
 */

export const getUserCardById = async ({
  userId,
  cardId,
}) => {
  validateUserId(userId);

  validateCardId(cardId);

  let card =
    await prisma.card.findFirst({
      where: {
        id: cardId,
        userId,
      },
    });

  if (!card) {
    const error = new Error(
      "Card not found",
    );

    error.statusCode = 404;
    throw error;
  }

  card =
    await ensureCardCredentials(
      card,
    );

  return {
    card:
      serializeCard(card),
  };
};

/*
 * ============================================================
 * CREATE CARD
 * ============================================================
 */

export const createCard = async ({
  userId,
  type = "VIRTUAL",
  network = "VISA",
  cardholderName,
  expiryMonth,
  expiryYear,
  dailyLimit = "0",
  monthlyLimit = "0",
  isContactless = true,
  isOnline = true,
}) => {
  validateUserId(userId);

  const normalizedType =
    normalizeCardType(type);

  const normalizedNetwork =
    normalizeCardNetwork(network);

  const normalizedName =
    String(
      cardholderName || "",
    ).trim();

  if (!normalizedName) {
    const error = new Error(
      "Cardholder name is required",
    );

    error.statusCode = 400;
    throw error;
  }

  if (normalizedName.length > 120) {
    const error = new Error(
      "Cardholder name cannot exceed 120 characters",
    );

    error.statusCode = 400;
    throw error;
  }

  let expiry;

  if (
    expiryMonth === undefined ||
    expiryYear === undefined
  ) {
    expiry =
      getDefaultExpiry();
  } else {
    expiry =
      validateExpiry(
        expiryMonth,
        expiryYear,
      );
  }

  const normalizedDailyLimit =
    normalizeLimit(
      dailyLimit,
      "Daily limit",
    );

  const normalizedMonthlyLimit =
    normalizeLimit(
      monthlyLimit,
      "Monthly limit",
    );

  if (
    normalizedMonthlyLimit.lessThan(
      normalizedDailyLimit,
    )
  ) {
    const error = new Error(
      "Monthly limit cannot be lower than daily limit",
    );

    error.statusCode = 400;
    throw error;
  }

  /*
   * Ensure the user exists before creating the card.
   */

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        status: true,
      },
    });

  if (!user) {
    const error = new Error(
      "User not found",
    );

    error.statusCode = 404;
    throw error;
  }

  if (user.status !== "ACTIVE") {
    const error = new Error(
      "Your account is not eligible for card issuance",
    );

    error.statusCode = 403;
    throw error;
  }

  /*
   * Generate simulated card credentials.
   */

  const cardNumber =
    generateTestCardNumber(
      normalizedNetwork,
    );

  const lastFour =
    generateLastFour(
      cardNumber,
    );

  const cvv =
    generateCVV();

  const card =
    await prisma.$transaction(
      async (tx) => {
        const createdCard =
          await tx.card.create({
            data: {
              userId,

              type:
                normalizedType,

              network:
                normalizedNetwork,

              cardNumber,

              lastFour,

              cvv,

              cardholderName:
                normalizedName,

              expiryMonth:
                expiry.expiryMonth,

              expiryYear:
                expiry.expiryYear,

              status:
                "ACTIVE",

              dailyLimit:
                normalizedDailyLimit,

              monthlyLimit:
                normalizedMonthlyLimit,

              isContactless:
                Boolean(
                  isContactless,
                ),

              isOnline:
                Boolean(
                  isOnline,
                ),
            },
          });

        await createCardAuditLog({
          tx,

          userId,

          cardId:
            createdCard.id,

          action:
            "CARD_ACTION",

          description:
            "Card created",

          metadata: {
            action:
              "CREATE",

            cardType:
              createdCard.type,

            network:
              createdCard.network,

            lastFour:
              createdCard.lastFour,
          },
        });

        return createdCard;
      },
    );

  return {
    card:
      serializeCard(card),
  };
};

/*
 * ============================================================
 * FREEZE CARD
 * ============================================================
 */

export const freezeCard = async ({
  userId,
  cardId,
}) => {
  validateUserId(userId);
  validateCardId(cardId);

  const result =
    await prisma.$transaction(
      async (tx) => {
        const card =
          await tx.card.findFirst({
            where: {
              id: cardId,
              userId,
            },
          });

        if (!card) {
          const error = new Error(
            "Card not found",
          );

          error.statusCode = 404;
          throw error;
        }

        if (card.status === "FROZEN") {
          return card;
        }

        if (card.status !== "ACTIVE") {
          const error = new Error(
            `A ${card.status.toLowerCase()} card cannot be frozen`,
          );

          error.statusCode = 400;
          throw error;
        }

        const updatedCard =
          await tx.card.update({
            where: {
              id: card.id,
            },

            data: {
              status: "FROZEN",
            },
          });

        await createCardAuditLog({
          tx,
          userId,
          cardId: card.id,
          action: "CARD_ACTION",
          description: "Card frozen",

          metadata: {
            action: "FREEZE",
            previousStatus: card.status,
            newStatus: updatedCard.status,
            lastFour: card.lastFour,
          },
        });

        return updatedCard;
      },
    );

  return {
    card:
      serializeCard(result),
  };
};

/*
 * ============================================================
 * UNFREEZE CARD
 * ============================================================
 */

export const unfreezeCard = async ({
  userId,
  cardId,
}) => {
  validateUserId(userId);
  validateCardId(cardId);

  const result =
    await prisma.$transaction(
      async (tx) => {
        const card =
          await tx.card.findFirst({
            where: {
              id: cardId,
              userId,
            },
          });

        if (!card) {
          const error = new Error(
            "Card not found",
          );

          error.statusCode = 404;
          throw error;
        }

        if (card.status === "ACTIVE") {
          return card;
        }

        if (card.status !== "FROZEN") {
          const error = new Error(
            `A ${card.status.toLowerCase()} card cannot be unfrozen`,
          );

          error.statusCode = 400;
          throw error;
        }

        const updatedCard =
          await tx.card.update({
            where: {
              id: card.id,
            },

            data: {
              status: "ACTIVE",
            },
          });

        await createCardAuditLog({
          tx,
          userId,
          cardId: card.id,
          action: "CARD_ACTION",
          description: "Card unfrozen",

          metadata: {
            action: "UNFREEZE",
            previousStatus: card.status,
            newStatus: updatedCard.status,
            lastFour: card.lastFour,
          },
        });

        return updatedCard;
      },
    );

  return {
    card:
      serializeCard(result),
  };
};

/*
 * ============================================================
 * BLOCK CARD
 * ============================================================
 */

export const blockCard = async ({
  userId,
  cardId,
}) => {
  validateUserId(userId);
  validateCardId(cardId);

  const result =
    await prisma.$transaction(
      async (tx) => {
        const card =
          await tx.card.findFirst({
            where: {
              id: cardId,
              userId,
            },
          });

        if (!card) {
          const error = new Error(
            "Card not found",
          );

          error.statusCode = 404;
          throw error;
        }

        if (card.status === "BLOCKED") {
          return card;
        }

        if (
          [
            "CANCELLED",
            "EXPIRED",
          ].includes(card.status)
        ) {
          const error = new Error(
            `A ${card.status.toLowerCase()} card cannot be blocked`,
          );

          error.statusCode = 400;
          throw error;
        }

        const updatedCard =
          await tx.card.update({
            where: {
              id: card.id,
            },

            data: {
              status: "BLOCKED",
            },
          });

        await createCardAuditLog({
          tx,
          userId,
          cardId: card.id,
          action: "CARD_ACTION",
          description: "Card blocked",

          metadata: {
            action: "BLOCK",
            previousStatus: card.status,
            newStatus: updatedCard.status,
            lastFour: card.lastFour,
          },
        });

        return updatedCard;
      },
    );

  return {
    card:
      serializeCard(result),
  };
};

/*
 * ============================================================
 * CANCEL CARD
 * ============================================================
 */

export const cancelCard = async ({
  userId,
  cardId,
}) => {
  validateUserId(userId);
  validateCardId(cardId);

  const result =
    await prisma.$transaction(
      async (tx) => {
        const card =
          await tx.card.findFirst({
            where: {
              id: cardId,
              userId,
            },
          });

        if (!card) {
          const error = new Error(
            "Card not found",
          );

          error.statusCode = 404;
          throw error;
        }

        if (card.status === "CANCELLED") {
          return card;
        }

        if (card.status === "EXPIRED") {
          const error = new Error(
            "An expired card cannot be cancelled again",
          );

          error.statusCode = 400;
          throw error;
        }

        const updatedCard =
          await tx.card.update({
            where: {
              id: card.id,
            },

            data: {
              status: "CANCELLED",
            },
          });

        await createCardAuditLog({
          tx,
          userId,
          cardId: card.id,
          action: "CARD_ACTION",
          description: "Card cancelled",

          metadata: {
            action: "CANCEL",
            previousStatus: card.status,
            newStatus: updatedCard.status,
            lastFour: card.lastFour,
          },
        });

        return updatedCard;
      },
    );

  return {
    card:
      serializeCard(result),
  };
};

/*
 * ============================================================
 * TOGGLE CONTACTLESS
 * ============================================================
 */

export const setCardContactless = async ({
  userId,
  cardId,
  enabled,
}) => {
  validateUserId(userId);
  validateCardId(cardId);

  if (typeof enabled !== "boolean") {
    const error = new Error(
      "Contactless setting must be true or false",
    );

    error.statusCode = 400;
    throw error;
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const card =
          await tx.card.findFirst({
            where: {
              id: cardId,
              userId,
            },
          });

        if (!card) {
          const error = new Error(
            "Card not found",
          );

          error.statusCode = 404;
          throw error;
        }

        if (
          [
            "BLOCKED",
            "EXPIRED",
            "CANCELLED",
          ].includes(card.status)
        ) {
          const error = new Error(
            "Card controls cannot be changed for this card",
          );

          error.statusCode = 400;
          throw error;
        }

        const updatedCard =
          await tx.card.update({
            where: {
              id: card.id,
            },

            data: {
              isContactless: enabled,
            },
          });

        await createCardAuditLog({
          tx,
          userId,
          cardId: card.id,
          action: "CARD_ACTION",

          description:
            enabled
              ? "Contactless payments enabled"
              : "Contactless payments disabled",

          metadata: {
            action:
              "CONTACTLESS_UPDATE",

            enabled,

            lastFour:
              card.lastFour,
          },
        });

        return updatedCard;
      },
    );

  return {
    card:
      serializeCard(result),
  };
};

/*
 * ============================================================
 * TOGGLE ONLINE PAYMENTS
 * ============================================================
 */

export const setCardOnline = async ({
  userId,
  cardId,
  enabled,
}) => {
  validateUserId(userId);
  validateCardId(cardId);

  if (typeof enabled !== "boolean") {
    const error = new Error(
      "Online payment setting must be true or false",
    );

    error.statusCode = 400;
    throw error;
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const card =
          await tx.card.findFirst({
            where: {
              id: cardId,
              userId,
            },
          });

        if (!card) {
          const error = new Error(
            "Card not found",
          );

          error.statusCode = 404;
          throw error;
        }

        if (
          [
            "BLOCKED",
            "EXPIRED",
            "CANCELLED",
          ].includes(card.status)
        ) {
          const error = new Error(
            "Card controls cannot be changed for this card",
          );

          error.statusCode = 400;
          throw error;
        }

        const updatedCard =
          await tx.card.update({
            where: {
              id: card.id,
            },

            data: {
              isOnline: enabled,
            },
          });

        await createCardAuditLog({
          tx,
          userId,
          cardId: card.id,
          action: "CARD_ACTION",

          description:
            enabled
              ? "Online payments enabled"
              : "Online payments disabled",

          metadata: {
            action:
              "ONLINE_PAYMENTS_UPDATE",

            enabled,

            lastFour:
              card.lastFour,
          },
        });

        return updatedCard;
      },
    );

  return {
    card:
      serializeCard(result),
  };
};

/*
 * ============================================================
 * UPDATE CARD LIMITS
 * ============================================================
 */

export const updateCardLimits = async ({
  userId,
  cardId,
  dailyLimit,
  monthlyLimit,
}) => {
  validateUserId(userId);
  validateCardId(cardId);

  if (
    dailyLimit === undefined &&
    monthlyLimit === undefined
  ) {
    const error = new Error(
      "At least one card limit is required",
    );

    error.statusCode = 400;
    throw error;
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const card =
          await tx.card.findFirst({
            where: {
              id: cardId,
              userId,
            },
          });

        if (!card) {
          const error = new Error(
            "Card not found",
          );

          error.statusCode = 404;
          throw error;
        }

        if (
          [
            "BLOCKED",
            "EXPIRED",
            "CANCELLED",
          ].includes(card.status)
        ) {
          const error = new Error(
            "Limits cannot be changed for this card",
          );

          error.statusCode = 400;
          throw error;
        }

        const nextDailyLimit =
          dailyLimit === undefined
            ? toDecimal(card.dailyLimit)
            : normalizeLimit(
                dailyLimit,
                "Daily limit",
              );

        const nextMonthlyLimit =
          monthlyLimit === undefined
            ? toDecimal(card.monthlyLimit)
            : normalizeLimit(
                monthlyLimit,
                "Monthly limit",
              );

        if (
          nextMonthlyLimit.lessThan(
            nextDailyLimit,
          )
        ) {
          const error = new Error(
            "Monthly limit cannot be lower than daily limit",
          );

          error.statusCode = 400;
          throw error;
        }

        const updatedCard =
          await tx.card.update({
            where: {
              id: card.id,
            },

            data: {
              dailyLimit:
                nextDailyLimit,

              monthlyLimit:
                nextMonthlyLimit,
            },
          });

        await createCardAuditLog({
          tx,
          userId,
          cardId: card.id,
          action: "CARD_ACTION",

          description:
            "Card spending limits updated",

          metadata: {
            action:
              "LIMITS_UPDATE",

            previousDailyLimit:
              serializeMoney(
                card.dailyLimit,
              ),

            previousMonthlyLimit:
              serializeMoney(
                card.monthlyLimit,
              ),

            newDailyLimit:
              serializeMoney(
                updatedCard.dailyLimit,
              ),

            newMonthlyLimit:
              serializeMoney(
                updatedCard.monthlyLimit,
              ),

            lastFour:
              card.lastFour,
          },
        });

        return updatedCard;
      },
    );

  return {
    card:
      serializeCard(result),
  };
};