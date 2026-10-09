import {
  CheckCircle2,
  Clock3,
  AlertCircle,
  XCircle,
  Ban,
  LoaderCircle,
  Circle,
} from "lucide-react";

const STATUS_CONFIG = {
  COMPLETED: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: CheckCircle2,
  },

  ACTIVE: {
    label: "Active",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: CheckCircle2,
  },

  VERIFIED: {
    label: "Verified",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: CheckCircle2,
  },

  PENDING: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 border-amber-100",
    icon: Clock3,
  },

  PROCESSING: {
    label: "Processing",
    className:
      "bg-blue-50 text-blue-700 border-blue-100",
    icon: LoaderCircle,
  },

  UNDER_REVIEW: {
    label: "Under review",
    className:
      "bg-blue-50 text-blue-700 border-blue-100",
    icon: Clock3,
  },

  FAILED: {
    label: "Failed",
    className:
      "bg-red-50 text-red-700 border-red-100",
    icon: XCircle,
  },

  REJECTED: {
    label: "Rejected",
    className:
      "bg-red-50 text-red-700 border-red-100",
    icon: XCircle,
  },

  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-slate-100 text-slate-600 border-slate-200",
    icon: Ban,
  },

  REVERSED: {
    label: "Reversed",
    className:
      "bg-orange-50 text-orange-700 border-orange-100",
    icon: AlertCircle,
  },

  FROZEN: {
    label: "Frozen",
    className:
      "bg-orange-50 text-orange-700 border-orange-100",
    icon: Ban,
  },

  SUSPENDED: {
    label: "Suspended",
    className:
      "bg-orange-50 text-orange-700 border-orange-100",
    icon: AlertCircle,
  },

  CLOSED: {
    label: "Closed",
    className:
      "bg-slate-100 text-slate-600 border-slate-200",
    icon: Ban,
  },

  NOT_STARTED: {
    label: "Not started",
    className:
      "bg-slate-100 text-slate-600 border-slate-200",
    icon: Circle,
  },
};

const formatFallbackLabel = (status) => {
  if (!status) {
    return "Unknown";
  }

  return String(status)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const StatusBadge = ({
  status,
  showIcon = true,
  size = "sm",
  className = "",
}) => {
  const normalizedStatus =
    String(status || "")
      .trim()
      .toUpperCase();

  const config =
    STATUS_CONFIG[normalizedStatus] || {
      label: formatFallbackLabel(status),
      className:
        "bg-slate-100 text-slate-600 border-slate-200",
      icon: Circle,
    };

  const Icon = config.icon;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        size === "xs"
          ? "px-2 py-1 text-[10px]"
          : "px-2.5 py-1 text-xs",
        config.className,
        className,
      ].join(" ")}
    >
      {showIcon && (
        <Icon
          className={[
            "shrink-0",
            size === "xs"
              ? "h-3 w-3"
              : "h-3.5 w-3.5",
            normalizedStatus === "PROCESSING"
              ? "animate-spin"
              : "",
          ].join(" ")}
        />
      )}

      {config.label}
    </span>
  );
};

export default StatusBadge;