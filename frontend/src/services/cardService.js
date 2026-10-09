import api from "./api.js";

/**
 * Epex Bank — Card API service
 *
 * Card state belongs to the backend.
 * This service only communicates with the banking API.
 */

const unwrap = (response) => response?.data ?? response;

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

const requireId = (value, label) => {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
};

/* =========================================================
   CARDS
========================================================= */

export const getCards = async (params = {}) => {
  const response = await api.get(
    `/cards${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const listCards = getCards;

export const getCard = async (cardId) => {
  requireId(cardId, "Card ID");

  const response = await api.get(
    `/cards/${encodeURIComponent(cardId)}`,
  );

  return unwrap(response);
};

export const createCard = async (cardData) => {
  if (!cardData || typeof cardData !== "object") {
    throw new Error("Card application information is required.");
  }

  const response = await api.post(
    "/cards",
    cardData,
  );

  return unwrap(response);
};

/* =========================================================
   CARD STATUS / CONTROLS
========================================================= */

export const updateCardStatus = async (
  cardId,
  status,
) => {
  requireId(cardId, "Card ID");

  if (!status) {
    throw new Error("Card status is required.");
  }

  const response = await api.patch(
    `/cards/${encodeURIComponent(cardId)}/status`,
    { status },
  );

  return unwrap(response);
};

export const freezeCard = async (cardId) => {
  requireId(cardId, "Card ID");

  const response = await api.post(
    `/cards/${encodeURIComponent(cardId)}/freeze`,
  );

  return unwrap(response);
};

export const unfreezeCard = async (cardId) => {
  requireId(cardId, "Card ID");

  const response = await api.post(
    `/cards/${encodeURIComponent(cardId)}/unfreeze`,
  );

  return unwrap(response);
};

export const blockCard = async (cardId) => {
  requireId(cardId, "Card ID");

  const response = await api.post(
    `/cards/${encodeURIComponent(cardId)}/block`,
  );

  return unwrap(response);
};

export const activateCard = async (cardId) => {
  requireId(cardId, "Card ID");

  const response = await api.post(
    `/cards/${encodeURIComponent(cardId)}/activate`,
  );

  return unwrap(response);
};

/* =========================================================
   CARD LIMITS
========================================================= */

export const getCardLimits = async (cardId) => {
  requireId(cardId, "Card ID");

  const response = await api.get(
    `/cards/${encodeURIComponent(cardId)}/limits`,
  );

  return unwrap(response);
};

export const updateCardLimits = async (
  cardId,
  limits,
) => {
  requireId(cardId, "Card ID");

  if (!limits || typeof limits !== "object") {
    throw new Error("Card limit information is required.");
  }

  const response = await api.patch(
    `/cards/${encodeURIComponent(cardId)}/limits`,
    limits,
  );

  return unwrap(response);
};

/* =========================================================
   CARD TRANSACTIONS
========================================================= */

export const getCardTransactions = async (
  cardId,
  params = {},
) => {
  requireId(cardId, "Card ID");

  const response = await api.get(
    `/cards/${encodeURIComponent(
      cardId,
    )}/transactions${buildQuery(params)}`,
  );

  return unwrap(response);
};

/* =========================================================
   PIN / SECURITY
========================================================= */

export const changeCardPin = async (
  cardId,
  data,
) => {
  requireId(cardId, "Card ID");

  if (!data || typeof data !== "object") {
    throw new Error("Card PIN information is required.");
  }

  const response = await api.post(
    `/cards/${encodeURIComponent(cardId)}/pin`,
    data,
  );

  return unwrap(response);
};

export const requestReplacementCard = async (
  cardId,
  data = {},
) => {
  requireId(cardId, "Card ID");

  const response = await api.post(
    `/cards/${encodeURIComponent(cardId)}/replacement`,
    data,
  );

  return unwrap(response);
};

/* =========================================================
   ADMIN CARD OPERATIONS
========================================================= */

export const getAdminCards = async (params = {}) => {
  const response = await api.get(
    `/admin/cards${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const getAdminCard = async (cardId) => {
  requireId(cardId, "Card ID");

  const response = await api.get(
    `/admin/cards/${encodeURIComponent(cardId)}`,
  );

  return unwrap(response);
};

export const updateAdminCardStatus = async (
  cardId,
  status,
) => {
  requireId(cardId, "Card ID");

  if (!status) {
    throw new Error("Card status is required.");
  }

  const response = await api.patch(
    `/admin/cards/${encodeURIComponent(cardId)}/status`,
    { status },
  );

  return unwrap(response);
};

/* =========================================================
   ERROR HELPER
========================================================= */

export const getCardErrorMessage = (
  error,
  fallback = "Unable to complete the card request.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getCards,
  listCards,
  getCard,
  createCard,
  updateCardStatus,
  freezeCard,
  unfreezeCard,
  blockCard,
  activateCard,
  getCardLimits,
  updateCardLimits,
  getCardTransactions,
  changeCardPin,
  requestReplacementCard,
  getAdminCards,
  getAdminCard,
  updateAdminCardStatus,
  getCardErrorMessage,
};