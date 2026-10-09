import { useMemo, useState } from "react";

const SIZE_MAP = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-20 w-20 text-xl",
};

const STATUS_MAP = {
  online: "bg-emerald-500",
  offline: "bg-slate-400",
  busy: "bg-amber-500",
  away: "bg-orange-500",
};

const getInitials = (name = "") => {
  const normalized = String(name).trim();

  if (!normalized) {
    return "EP";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const Avatar = ({
  src = "",
  name = "",
  alt,
  size = "md",
  status,
  className = "",
  fallbackClassName = "",
  loading = "lazy",
}) => {
  const [imageError, setImageError] = useState(false);

  const initials = useMemo(() => getInitials(name), [name]);

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  const accessibleAlt =
    alt || (name ? `${name} profile photo` : "Profile photo");

  return (
    <div
      className={`relative inline-flex shrink-0 ${className}`}
      aria-label={accessibleAlt}
    >
      <div
        className={`flex ${sizeClass} overflow-hidden items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 ${fallbackClassName}`}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={accessibleAlt}
            loading={loading}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>

      {status && STATUS_MAP[status] ? (
        <span
          aria-label={`Status: ${status}`}
          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${STATUS_MAP[status]}`}
        />
      ) : null}
    </div>
  );
};

export default Avatar;