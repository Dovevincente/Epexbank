import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Info,
  MessageCircle,
  XCircle,
} from "lucide-react";

const getNotificationIcon = (type) => {
  const normalized = String(type ?? "").toUpperCase();

  if (
    normalized.includes("SUCCESS") ||
    normalized.includes("COMPLETED") ||
    normalized.includes("APPROVED")
  ) {
    return CheckCircle2;
  }

  if (
    normalized.includes("ERROR") ||
    normalized.includes("FAILED") ||
    normalized.includes("REJECTED")
  ) {
    return XCircle;
  }

  if (
    normalized.includes("WARNING") ||
    normalized.includes("ALERT")
  ) {
    return AlertCircle;
  }

  if (
    normalized.includes("MESSAGE") ||
    normalized.includes("SUPPORT")
  ) {
    return MessageCircle;
  }

  return Info;
};

const getIconClasses = (type) => {
  const normalized = String(type ?? "").toUpperCase();

  if (
    normalized.includes("SUCCESS") ||
    normalized.includes("COMPLETED") ||
    normalized.includes("APPROVED")
  ) {
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  }

  if (
    normalized.includes("ERROR") ||
    normalized.includes("FAILED") ||
    normalized.includes("REJECTED")
  ) {
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  }

  if (
    normalized.includes("WARNING") ||
    normalized.includes("ALERT")
  ) {
    return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  }

  return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const normalizeNotification = (notification) => ({
  id: notification?.id ?? notification?._id,
  title:
    notification?.title ??
    notification?.subject ??
    notification?.name ??
    "Notification",
  message:
    notification?.message ??
    notification?.body ??
    notification?.description ??
    "",
  type:
    notification?.type ??
    notification?.category ??
    notification?.severity ??
    "INFO",
  isRead: Boolean(
    notification?.isRead ??
      notification?.read ??
      notification?.readAt,
  ),
  createdAt:
    notification?.createdAt ??
    notification?.created_at ??
    notification?.date ??
    notification?.timestamp,
  href:
    notification?.href ??
    notification?.url ??
    notification?.link ??
    null,
});

const NotificationItem = ({
  notification,
  onSelect,
  onMarkRead,
}) => {
  const Icon = getNotificationIcon(notification.type);

  const handleClick = async () => {
    if (!notification.isRead && onMarkRead && notification.id) {
      await onMarkRead(notification);
    }

    if (onSelect) {
      onSelect(notification);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
        notification.isRead
          ? "hover:bg-slate-50 dark:hover:bg-slate-800/60"
          : "bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-500/5 dark:hover:bg-blue-500/10"
      }`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getIconClasses(
          notification.type,
        )}`}
      >
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={`truncate text-sm ${
              notification.isRead
                ? "font-medium text-slate-800 dark:text-slate-200"
                : "font-bold text-slate-900 dark:text-white"
            }`}
          >
            {notification.title}
          </p>

          {!notification.isRead ? (
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600"
              aria-label="Unread"
            />
          ) : null}
        </div>

        {notification.message ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {notification.message}
          </p>
        ) : null}

        {notification.createdAt ? (
          <p className="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {formatDate(notification.createdAt)}
          </p>
        ) : null}
      </div>
    </button>
  );
};

const NotificationPanel = ({
  notifications = [],
  loading = false,
  error = "",
  unreadCount,
  maxItems = 5,
  onSelect,
  onMarkRead,
  onMarkAllRead,
  onViewAll,
  onRetry,
}) => {
  const normalizedNotifications = Array.isArray(notifications)
    ? notifications
        .map(normalizeNotification)
        .filter((notification) => notification.id)
        .slice(0, maxItems)
    : [];

  const calculatedUnread = normalizedNotifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const displayedUnread = Number.isFinite(Number(unreadCount))
    ? Number(unreadCount)
    : calculatedUnread;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Bell size={19} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Notifications
              </h2>

              {displayedUnread > 0 ? (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  {displayedUnread > 99 ? "99+" : displayedUnread}
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Important updates from your Epex Bank account.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {displayedUnread > 0 && onMarkAllRead ? (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="hidden text-xs font-semibold text-blue-600 transition hover:text-blue-700 sm:block dark:text-blue-400 dark:hover:text-blue-300"
            >
              Mark all read
            </button>
          ) : null}

          {onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex animate-pulse gap-3 rounded-xl p-3"
              >
                <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-2 h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-500/5">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Unable to load notifications.
            </p>

            <p className="mt-1 text-xs leading-5 text-red-600/80 dark:text-red-400/70">
              {error}
            </p>

            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : normalizedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Bell size={19} />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              You are all caught up
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
              New account, transfer, payment, security, and service updates
              will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {normalizedNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={onSelect}
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default NotificationPanel;