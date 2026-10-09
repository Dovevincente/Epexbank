import prisma from "../config/database.js";

import {
  getUserCards,
  getUserCardById,
  createCard,
  freezeCard,
  unfreezeCard,
  blockCard,
  cancelCard,
  setCardContactless,
  setCardOnline,
  updateCardLimits,
} from "../services/cardService.js";

const getUserId = (req) => {
  if (!req.user?.id) {
    const error = new Error("Authenticated user is required");
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

const getCardId = (req) => {
  const cardId = String(req.params.cardId || "").trim();

  if (!cardId) {
    const error = new Error("Card ID is required");
    error.statusCode = 400;
    throw error;
  }

  return cardId;
};

/* =========================================================
   CARD PRODUCTS
========================================================= */

const CARD_PRODUCTS = [
  {
    id: "virtual-visa",
    name: "Epex Virtual Visa",
    description: "Virtual Visa card for online payments.",
    type: "VIRTUAL",
    network: "VISA",
    currency: "USD",
    issuanceFee: 0,
    status: "ACTIVE",
  },
  {
    id: "physical-visa",
    name: "Epex Visa Card",
    description: "Physical Visa card for everyday payments.",
    type: "PHYSICAL",
    network: "VISA",
    currency: "USD",
    issuanceFee: 0,
    status: "ACTIVE",
  },
  {
    id: "virtual-mastercard",
    name: "Epex Virtual Mastercard",
    description: "Virtual Mastercard for online payments.",
    type: "VIRTUAL",
    network: "MASTERCARD",
    currency: "USD",
    issuanceFee: 0,
    status: "ACTIVE",
  },
  {
    id: "physical-mastercard",
    name: "Epex Mastercard",
    description: "Physical Mastercard for everyday payments.",
    type: "PHYSICAL",
    network: "MASTERCARD",
    currency: "USD",
    issuanceFee: 0,
    status: "ACTIVE",
  },
];

const getCardProduct = (productId) => {
  const normalizedId = String(productId || "").trim();

  return (
    CARD_PRODUCTS.find(
      (product) => product.id === normalizedId,
    ) || null
  );
};

/* =========================================================
   CUSTOMER CARDS
========================================================= */

export const listCards = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const cards = await getUserCards({
      userId,
    });

    return res.status(200).json({
      success: true,
      data: cards,
    });
  } catch (error) {
    return next(error);
  }
};

export const getCard = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const cardId = getCardId(req);

    const card = await getUserCardById({
      userId,
      cardId,
});

    return res.status(200).json({
      success: true,
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   CARD PRODUCTS ENDPOINT
========================================================= */

export const getCardProducts = async (
  req,
  res,
  next,
) => {
  try {
    getUserId(req);

    return res.status(200).json({
      success: true,
      data: CARD_PRODUCTS,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   CARD REQUEST / ISSUANCE
========================================================= */

export const requestCard = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      cardProductId,
      accountId,
    } = req.body || {};

    if (!cardProductId) {
      return res.status(400).json({
        success: false,
        message: "Card product is required",
      });
    }

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Account is required",
      });
    }

    const product = getCardProduct(
      cardProductId,
    );

    if (!product) {
      return res.status(400).json({
        success: false,
        message: "Invalid card product",
      });
    }

    /* -------------------------------------------------------
       Validate the selected account belongs to the user
    ------------------------------------------------------- */

    const account =
      await prisma.account.findFirst({
        where: {
          id: String(accountId),
          userId,
        },
        include: {
          currency: true,
        },
      });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Selected account was not found",
      });
    }

    if (account.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Selected account is not active",
      });
    }

    if (!account.currency?.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "The selected account currency is inactive",
      });
    }

    /* -------------------------------------------------------
       Get customer name
    ------------------------------------------------------- */

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const profileName = [
      user.profile?.firstName,
      user.profile?.middleName,
      user.profile?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const cardholderName =
      profileName ||
      user.email?.split("@")[0] ||
      "Epex Bank Customer";

    /* -------------------------------------------------------
       Create the actual card using existing card service
    ------------------------------------------------------- */

    const result = await createCard({
      userId,
      type: product.type,
      network: product.network,
      cardholderName,
      dailyLimit: "0",
      monthlyLimit: "0",
      isContactless: true,
      isOnline: true,
      ipAddress,
    });

    const reference = `CARDREQ-${Date.now()
      .toString(36)
      .toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    return res.status(201).json({
      success: true,
      message: "Card request submitted successfully",
      request: {
        reference,
        status: "APPROVED",
        cardProductId: product.id,
        cardProduct: product.name,
        accountId: account.id,
        card: result?.card || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   DIRECT CARD ISSUANCE
========================================================= */

export const issueCard = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      type,
      network,
      cardholderName,
      expiryMonth,
      expiryYear,
      dailyLimit,
      monthlyLimit,
    } = req.body || {};

    const card = await createCard({
      userId,
      type,
      network,
      cardholderName,
      expiryMonth,
      expiryYear,
      dailyLimit,
      monthlyLimit,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Card created successfully",
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   CARD STATUS
========================================================= */

export const freezeUserCard = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const cardId = getCardId(req);
    const ipAddress = getRequestIp(req);

    const card = await freezeCard({
      userId,
      cardId,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Card frozen successfully",
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};

export const unfreezeUserCard = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const cardId = getCardId(req);
    const ipAddress = getRequestIp(req);

    const card = await unfreezeCard({
      userId,
      cardId,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Card unfrozen successfully",
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};

export const blockUserCard = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const cardId = getCardId(req);
    const ipAddress = getRequestIp(req);

    const card = await blockCard({
      userId,
      cardId,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Card blocked successfully",
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};

export const cancelUserCard = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const cardId = getCardId(req);
    const ipAddress = getRequestIp(req);

    const card = await cancelCard({
      userId,
      cardId,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Card cancelled successfully",
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   CARD CONTROLS
========================================================= */

export const updateContactless = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const cardId = getCardId(req);
    const ipAddress = getRequestIp(req);

    const { enabled } = req.body || {};

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "enabled must be a boolean",
      });
    }

    const card = await setCardContactless({
      userId,
      cardId,
      enabled,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: `Contactless payments ${
        enabled ? "enabled" : "disabled"
      }`,
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateOnlinePayments = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const cardId = getCardId(req);
    const ipAddress = getRequestIp(req);

    const { enabled } = req.body || {};

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "enabled must be a boolean",
      });
    }

    const card = await setCardOnline({
      userId,
      cardId,
      enabled,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: `Online payments ${
        enabled ? "enabled" : "disabled"
      }`,
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   CARD LIMITS
========================================================= */

export const updateLimits = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const cardId = getCardId(req);
    const ipAddress = getRequestIp(req);

    const {
      dailyLimit,
      monthlyLimit,
    } = req.body || {};

    if (
      dailyLimit === undefined &&
      monthlyLimit === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one card limit must be provided",
      });
    }

    const card = await updateCardLimits({
      userId,
      cardId,
      dailyLimit,
      monthlyLimit,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Card limits updated successfully",
      data: card,
    });
  } catch (error) {
    return next(error);
  }
};