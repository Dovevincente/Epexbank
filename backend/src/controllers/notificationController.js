import {
  getUserNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../services/notificationService.js";

const getUserId = (req) => {
  if (!req.user?.id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return req.user.id;
};

const getNotificationId = (req) => {
  const notificationId = String(
    req.params?.notificationId || "",
  ).trim();

  if (!notificationId) {
    const error = new Error(
      "Notification ID is required",
    );
    error.statusCode = 400;
    throw error;
  }

  return notificationId;
};

export const listNotifications = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const notifications =
      await getUserNotifications(
        userId,
        req.query || {},
      );

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return next(error);
  }
};

export const listUnreadNotifications = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const notifications =
      await getUnreadNotifications(userId);

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return next(error);
  }
};

export const markAsRead = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const notificationId =
      getNotificationId(req);

    const notification =
      await markNotificationAsRead(
        userId,
        notificationId,
      );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    return next(error);
  }
};

export const markAllAsRead = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const result =
      await markAllNotificationsAsRead(userId);

    return res.status(200).json({
      success: true,
      message:
        "All notifications marked as read",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const removeNotification = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const notificationId =
      getNotificationId(req);

    const result =
      await deleteNotification(
        userId,
        notificationId,
      );

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
