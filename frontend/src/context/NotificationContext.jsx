import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const NotificationContext = createContext(null);

const DEFAULT_DURATION = 5000;
const MAX_NOTIFICATIONS = 5;

const NOTIFICATION_TYPES = new Set([
  "success",
  "error",
  "warning",
  "info",
]);

const createNotificationId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const normalizeNotification = (notification = {}) => {
  const type = NOTIFICATION_TYPES.has(notification.type)
    ? notification.type
    : "info";

  const message = String(notification.message ?? "").trim();

  if (!message) {
    return null;
  }

  const duration =
    notification.duration === null
      ? null
      : Number.isFinite(Number(notification.duration))
        ? Math.max(0, Number(notification.duration))
        : DEFAULT_DURATION;

  return {
    id: notification.id || createNotificationId(),
    type,
    title: notification.title
      ? String(notification.title).trim()
      : "",
    message,
    duration,
    persistent: Boolean(notification.persistent),
    createdAt: Date.now(),
    data: notification.data ?? null,
  };
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef(new Map());

  const removeNotification = useCallback((id) => {
    if (!id) {
      return;
    }

    const timer = timersRef.current.get(id);

    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    timersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });

    timersRef.current.clear();
    setNotifications([]);
  }, []);

  const addNotification = useCallback(
    (notification) => {
      const normalized = normalizeNotification(notification);

      if (!normalized) {
        return null;
      }

      setNotifications((current) => {
        const duplicate = current.some(
          (existing) =>
            existing.type === normalized.type &&
            existing.message === normalized.message,
        );

        if (duplicate) {
          return current;
        }

        const next = [normalized, ...current];

        return next.slice(0, MAX_NOTIFICATIONS);
      });

      if (
        !normalized.persistent &&
        normalized.duration !== null &&
        normalized.duration > 0 &&
        typeof window !== "undefined"
      ) {
        const timer = window.setTimeout(() => {
          removeNotification(normalized.id);
        }, normalized.duration);

        timersRef.current.set(normalized.id, timer);
      }

      return normalized.id;
    },
    [removeNotification],
  );

  const notify = useMemo(
    () => ({
      add: addNotification,

      success: (message, options = {}) =>
        addNotification({
          ...options,
          type: "success",
          message,
        }),

      error: (message, options = {}) =>
        addNotification({
          ...options,
          type: "error",
          message,
        }),

      warning: (message, options = {}) =>
        addNotification({
          ...options,
          type: "warning",
          message,
        }),

      info: (message, options = {}) =>
        addNotification({
          ...options,
          type: "info",
          message,
        }),
    }),
    [addNotification],
  );

  const updateNotification = useCallback((id, updates = {}) => {
    if (!id) {
      return;
    }

    setNotifications((current) =>
      current.map((notification) => {
        if (notification.id !== id) {
          return notification;
        }

        const next = {
          ...notification,
          ...updates,
        };

        if (updates.type && !NOTIFICATION_TYPES.has(updates.type)) {
          next.type = notification.type;
        }

        if (updates.message !== undefined) {
          next.message = String(updates.message ?? "").trim();
        }

        return next;
      }),
    );
  }, []);

  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });

      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      hasNotifications,
      notificationCount: notifications.length,

      notify,

      addNotification,
      removeNotification,
      updateNotification,
      clearNotifications,

      maxNotifications: MAX_NOTIFICATIONS,
      defaultDuration: DEFAULT_DURATION,
    }),
    [
      notifications,
      hasNotifications,
      notify,
      addNotification,
      removeNotification,
      updateNotification,
      clearNotifications,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotificationContext must be used inside a NotificationProvider.",
    );
  }

  return context;
};

export const useNotifications = useNotificationContext;

export default NotificationContext;