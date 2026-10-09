import api from "./api.js";

/**
 * Epex Bank — Notification API service
 *
 * This service manages persistent notifications received
 * from the banking backend.
 *
 * The NotificationContext is only the UI notification layer;
 * this service handles server-side notification records.
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
   NOTIFICATIONS
========================================================= */

export const getNotifications = async (
  params = {},
) => {
  const response = await api.get(
    `/notifications${buildQuery(params)}`,
  );

  return unwrap(response);
};

export const listNotifications =
  getNotifications;

export const getNotification = async (
  notificationId,
) => {
  requireId(notificationId, "Notification ID");

  const response = await api.get(
    `/notifications/${encodeURIComponent(
      notificationId,
    )}`,
  );

  return unwrap(response);
};

/* =========================================================
   READ STATE
========================================================= */

export const markNotificationAsRead = async (
  notificationId,
) => {
  requireId(notificationId, "Notification ID");

  const response = await api.patch(
    `/notifications/${encodeURIComponent(
      notificationId,
    )}/read`,
  );

  return unwrap(response);
};

export const markAsRead =
  markNotificationAsRead;

export const markNotificationAsUnread = async (
  notificationId,
) => {
  requireId(notificationId, "Notification ID");

  const response = await api.patch(
    `/notifications/${encodeURIComponent(
      notificationId,
    )}/unread`,
  );

  return unwrap(response);
};

export const markAllNotificationsAsRead =
  async () => {
    const response = await api.patch(
      "/notifications/read-all",
    );

    return unwrap(response);
  };

export const markAllAsRead =
  markAllNotificationsAsRead;

/* =========================================================
   DELETE
========================================================= */

export const deleteNotification = async (
  notificationId,
) => {
  requireId(notificationId, "Notification ID");

  const response = await api.delete(
    `/notifications/${encodeURIComponent(
      notificationId,
    )}`,
  );

  return unwrap(response);
};

/* =========================================================
   UNREAD COUNT
========================================================= */

export const getUnreadNotificationCount =
  async () => {
    const response = await api.get(
      "/notifications/unread-count",
    );

    return unwrap(response);
  };

/* =========================================================
   ERROR HELPER
========================================================= */

export const getNotificationErrorMessage = (
  error,
  fallback = "Unable to load your notifications.",
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
  getNotifications,
  listNotifications,
  getNotification,
  markNotificationAsRead,
  markAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  getNotificationErrorMessage,
};