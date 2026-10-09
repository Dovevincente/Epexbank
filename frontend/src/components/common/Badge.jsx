import { CheckCircle2, Clock3, Info, XCircle } from "lucide-react";

const VARIANTS = {
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",

  danger:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20",

  warning:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",

  info:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20",

  neutral:
    "bg-slate-100 text-slate-700 ring-slate-600/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",

  purple:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-400/20",
};

const STATUS_VARIANTS = {
  active: "success",
  approved: "success",
  completed: "success",
  delivered: "success",
  successful: "success",
  verified: "success",
  paid: "success",
  enabled: "success",

  pending: "warning",
  processing: "warning",
  reviewing: "warning",
  requested: "warning",
  awaiting: "warning",
  on_hold: "warning",
  "on hold": "warning",

  failed: "danger",
  rejected: "danger",
  declined: "danger",
  blocked: "danger",
  suspended: "danger",
  cancelled: "danger",
  canceled: "danger",
  overdue: "danger",

  inactive: "neutral",
  closed: "neutral",
  disabled: "neutral",
  draft: "neutral",

  initiated: "info",
  submitted: "info",
  in_transit: "info",
  "in transit": "info",

  admin: "purple",
  customer: "info",
};

const ICONS = {
  success: CheckCircle2,
  danger: XCircle,
  warning: Clock3,
  info: Info,
};

const normalizeStatus = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

const formatLabel = (value) => {
  const text = String(value ?? "").trim();

  if (!text) {
    return "Unknown";
  }

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const Badge = ({
  children,
  variant,
  status,
  size = "sm",
  dot = false,
  icon = true,
  className = "",
}) => {
  const normalizedStatus = normalizeStatus(status);

  const resolvedVariant =
    variant ||
    STATUS_VARIANTS[normalizedStatus] ||
    "neutral";

  const Icon = ICONS[resolvedVariant];

  const label =
    children ??
    (status ? formatLabel(status) : "Unknown");

  const sizeClasses =
    size === "xs"
      ? "px-2 py-0.5 text-[10px]"
      : size === "md"
        ? "px-3 py-1.5 text-sm"
        : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${VARIANTS[resolvedVariant] || VARIANTS.neutral} ${sizeClasses} ${className}`}
    >
      {dot ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
          aria-hidden="true"
        />
      ) : icon && Icon ? (
        <Icon
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
      ) : null}

      <span>{label}</span>
    </span>
  );
};

export default Badge;